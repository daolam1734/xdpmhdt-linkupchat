from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
import os

from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.schemas.user import User as UserSchema
from backend.app.schemas.admin import SystemConfigUpdate, SystemConfigResponse
from backend.app.core.config import settings

router = APIRouter()

async def get_current_active_superuser(
    current_user: dict = Depends(get_current_user),
) -> dict:
    if not current_user.get("is_superuser"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

@router.get("/config", response_model=SystemConfigResponse)
async def get_admin_config(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """
    Lấy các cấu hình hệ thống (API keys, vv).
    """
    config = await db["system_configs"].find_one({"type": "api_keys"})
    if not config:
        # Fallback to env settings if not in DB
        return {
            "google_api_key": settings.GOOGLE_API_KEY,
            "openai_api_key": getattr(settings, "OPENAI_API_KEY", "")
        }
    
    return {
        "google_api_key": config.get("google_api_key", settings.GOOGLE_API_KEY),
        "openai_api_key": config.get("openai_api_key", "")
    }

@router.post("/config")
async def update_admin_config(
    config_data: SystemConfigUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """
    Cập nhật cấu hình hệ thống và đồng bộ với môi trường (.env).
    """
    # 1. Cập nhật Database
    configs = {k: v for k, v in config_data.configs.items() if k != "_id"}
    await db["system_configs"].update_one(
        {"type": "api_keys"},
        {"$set": {
            **configs,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": current_user.get("username")
        }},
        upsert=True
    )

    # 2. Cập nhật Settings trong bộ nhớ & ghi đè file .env
    new_google_key = configs.get("google_api_key")
    new_openai_key = configs.get("openai_api_key")
    
    # Cập nhật file .env vật lý
    try:
        env_path = os.path.join(os.getcwd(), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            new_lines = []
            keys_to_update = {
                "GOOGLE_API_KEY": new_google_key,
                "OPENAI_API_KEY": new_openai_key
            }
            updated_keys = set()

            for line in lines:
                matched = False
                for key, val in keys_to_update.items():
                    if line.startswith(f"{key}=") and val is not None:
                        new_lines.append(f"{key}={val}\n")
                        updated_keys.add(key)
                        matched = True
                        if key == "GOOGLE_API_KEY": settings.GOOGLE_API_KEY = val
                        if key == "OPENAI_API_KEY": settings.OPENAI_API_KEY = val
                        break
                if not matched:
                    new_lines.append(line)
            
            # Thêm các key chưa có trong file
            for key, val in keys_to_update.items():
                if key not in updated_keys and val:
                    new_lines.append(f"{key}={val}\n")
                    if key == "GOOGLE_API_KEY": settings.GOOGLE_API_KEY = val
                    if key == "OPENAI_API_KEY": settings.OPENAI_API_KEY = val
            
            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
            print(f"✅ Đã đồng bộ API Keys mới vào file .env và bộ nhớ")
    except Exception as e:
        print(f"⚠️ Lỗi khi cập nhật .env: {e}")

    return {"status": "success"}

@router.get("/stats")
async def get_system_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
) -> Any:
    """
    Lấy thống kê hệ thống.
    """
    total_users = await db["users"].count_documents({})
    total_messages = await db["messages"].count_documents({})
    total_rooms = await db["chat_rooms"].count_documents({})
    
    # Tin nhắn trong 24h qua
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    new_messages = await db["messages"].count_documents({"timestamp": {"$gte": yesterday}})
    
    # Người dùng online
    online_users = await db["users"].count_documents({"is_online": True})

    return {
        "total_users": total_users,
        "total_messages": total_messages,
        "total_rooms": total_rooms,
        "new_messages_24h": new_messages,
        "online_users": online_users
    }

@router.get("/users", response_model=List[UserSchema])
async def get_all_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
) -> Any:
    """
    Danh sách tất cả người dùng (Quản trị).
    """
    users = await db["users"].find().sort("created_at", -1).to_list(length=100)
    return users

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
) -> Any:
    """
    Xóa tài khoản người dùng.
    """
    await db["users"].delete_one({"id": user_id})
    await db["room_members"].delete_many({"user_id": user_id})
    return {"status": "success"}

@router.post("/set-admin/{username}")
async def set_admin_status(
    username: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    # Note: Lần đầu tiên set admin có thể cần thực hiện trực tiếp trong DB 
    # hoặc thông qua tài khoản superuser đầu tiên.
    current_user: dict = Depends(get_current_active_superuser)
) -> Any:
    result = await db["users"].update_one(
        {"username": username},
        {"$set": {"is_superuser": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": f"{username} is now an admin"}
