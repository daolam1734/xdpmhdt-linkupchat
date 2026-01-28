from datetime import timedelta, datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from backend.app.core import security
from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.schemas.user import Token, UserCreate, UserUpdate, User as UserSchema
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    db: AsyncIOMotorDatabase = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = await db["users"].find_one({"username": form_data.username})
    
    if not user or not security.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản này đã bị vô hiệu hóa bởi quản trị viên."
        )

    # Check Maintenance Mode
    from backend.app.core.admin_config import get_system_config
    sys_config = await get_system_config(db)
    if sys_config.get("maintenance_mode", False):
        # Chỉ Admin mới được phép đăng nhập trong lúc bảo trì
        is_staff = user.get("is_superuser") or user.get("role") == "admin"
        if not is_staff:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Hệ thống đang bảo trì để nâng cấp. Vui lòng quay lại sau ít phút."
            )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user["id"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Lấy thông tin profile cá nhân kèm theo thống kê.
    """
    # Tính số tin nhắn đã gửi
    message_count = await db["messages"].count_documents({"sender_id": current_user["id"]})
    
    # Tính số bạn bè
    friend_count = await db["friend_requests"].count_documents({
        "$or": [
            {"from_id": current_user["id"], "status": "accepted"},
            {"to_id": current_user["id"], "status": "accepted"}
        ]
    })
    
    # Cập nhật thông tin vào dict trả về
    # Chuyển đổi _id sang string nếu có và loại bỏ để tránh lỗi serialize
    if "_id" in current_user:
        current_user["_id"] = str(current_user["_id"])
        
    current_user["message_count"] = message_count
    current_user["friend_count"] = friend_count
    
    # Đảm bảo các trường privacy/mới luôn có mặt
    if "blocked_users" not in current_user or current_user["blocked_users"] is None:
        current_user["blocked_users"] = []
    if "show_online_status" not in current_user:
        current_user["show_online_status"] = True
    if "is_online" not in current_user:
        current_user["is_online"] = True
    if "allow_stranger_messages" not in current_user:
        current_user["allow_stranger_messages"] = True
    
    # Đảm bảo role và permissions luôn có (LinkUp RBAC)
    if "role" not in current_user:
        current_user["role"] = "admin" if current_user.get("is_superuser") else "member"
    if "permissions" not in current_user:
        current_user["permissions"] = ["all"] if current_user["role"] == "admin" else []

    # Lấy danh sách những người đã chặn tôi
    blocked_by_query = await db["users"].find({"blocked_users": current_user["id"]}).to_list(length=1000)
    current_user["blocked_by"] = [u["id"] for u in blocked_by_query]
    
    return current_user

@router.patch("/me", response_model=UserSchema)
async def update_user_me(
    *,
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_in: UserUpdate,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Cập nhật thông tin tài khoản hiện tại.
    """
    update_data = {}
    
    if user_in.username and user_in.username != current_user["username"]:
        # Check if exists
        check = await db["users"].find_one({"username": user_in.username})
        if check:
            raise HTTPException(status_code=400, detail="Tên người dùng đã tồn tại.")
        update_data["username"] = user_in.username
    
    if user_in.password:
        update_data["hashed_password"] = security.get_password_hash(user_in.password)
        
    if user_in.avatar_url is not None:
        update_data["avatar_url"] = user_in.avatar_url

    if user_in.full_name is not None:
        update_data["full_name"] = user_in.full_name

    if user_in.email is not None:
        update_data["email"] = user_in.email

    if user_in.phone is not None:
        update_data["phone"] = user_in.phone
        
    if user_in.bio is not None:
        update_data["bio"] = user_in.bio
        
    if user_in.allow_stranger_messages is not None:
        update_data["allow_stranger_messages"] = user_in.allow_stranger_messages
        
    if user_in.show_online_status is not None:
        update_data["show_online_status"] = user_in.show_online_status
        # Notify friends about status change if already online
        if current_user.get("is_online"):
            try:
                from backend.app.api.v1.endpoints.ws.utils import notify_user_status_change
                await notify_user_status_change(current_user["id"], user_in.show_online_status)
            except Exception as e:
                print(f"Error notifying status change: {e}")
    
    if user_in.ai_preferences is not None:
        update_data["ai_preferences"] = user_in.ai_preferences
        
    if user_in.app_settings is not None:
        update_data["app_settings"] = user_in.app_settings
        
    if user_in.ai_settings is not None:
        update_data["ai_settings"] = user_in.ai_settings
    
    if update_data:
        await db["users"].update_one({"id": current_user["id"]}, {"$set": update_data})
        # Update current_user dict for returning
        current_user.update(update_data)
        
    # Thêm thống kê cho kết quả trả về
    # Chuyển đổi _id sang string nếu có và loại bỏ để tránh lỗi serialize
    if "_id" in current_user:
        current_user["_id"] = str(current_user["_id"])
        
    current_user["message_count"] = await db["messages"].count_documents({"sender_id": current_user["id"]})
    current_user["friend_count"] = await db["friend_requests"].count_documents({
        "$or": [
            {"from_id": current_user["id"], "status": "accepted"},
            {"to_id": current_user["id"], "status": "accepted"}
        ]
    })
    
    # Đảm bảo các trường privacy/mới luôn có mặt
    if "blocked_users" not in current_user or current_user["blocked_users"] is None:
        current_user["blocked_users"] = []
    if "show_online_status" not in current_user:
        current_user["show_online_status"] = True
    if "is_online" not in current_user:
        current_user["is_online"] = True
    if "allow_stranger_messages" not in current_user:
        current_user["allow_stranger_messages"] = True
        
    return current_user

@router.post("/signup", response_model=UserSchema)
async def signup(
    *,
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_in: UserCreate
) -> Any:
    user = await db["users"].find_one({"username": user_in.username})
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    db_obj = {
        "id": str(uuid.uuid4()),
        "username": user_in.username,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "hashed_password": security.get_password_hash(user_in.password),
        "avatar_url": None,
        "bio": None,
        "phone": None,
        "allow_stranger_messages": True,
        "is_active": True,
        "is_superuser": False,
        "role": "member",  # LinkUp: User + Role + Permission
        "permissions": [],
        "created_at": datetime.now(timezone.utc)
    }
    await db["users"].insert_one(db_obj)
    return db_obj
