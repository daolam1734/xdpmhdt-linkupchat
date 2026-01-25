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
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user["id"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: dict = Depends(get_current_user)) -> Any:
    """
    Lấy thông tin profile cá nhân.
    """
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
        
    if user_in.bio is not None:
        update_data["bio"] = user_in.bio
        
    if user_in.allow_stranger_messages is not None:
        update_data["allow_stranger_messages"] = user_in.allow_stranger_messages
    
    if user_in.ai_preferences is not None:
        update_data["ai_preferences"] = user_in.ai_preferences
    
    if update_data:
        await db["users"].update_one({"id": current_user["id"]}, {"$set": update_data})
        # Update current_user dict for returning
        current_user.update(update_data)
        
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
        "hashed_password": security.get_password_hash(user_in.password),
        "avatar_url": None,
        "bio": None,
        "allow_stranger_messages": True,
        "is_active": True,
        "is_superuser": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db["users"].insert_one(db_obj)
    return db_obj
