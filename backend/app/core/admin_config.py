from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.app.core.config import settings

async def get_system_api_key(db: AsyncIOMotorDatabase, provider: str = "google") -> str:
    """
    Lấy API key từ database, nếu không có thì lấy từ settings (env).
    provider: 'google' hoặc 'openai'
    """
    config = await db["system_configs"].find_one({"type": "api_keys"})
    if not config:
        if provider == "google":
            return settings.GOOGLE_API_KEY
        return getattr(settings, "OPENAI_API_KEY", "")
    
    if provider == "google":
        return config.get("google_api_key") or settings.GOOGLE_API_KEY
    elif provider == "openai":
        return config.get("openai_api_key") or getattr(settings, "OPENAI_API_KEY", "")
    
    return ""

async def get_system_config(db: AsyncIOMotorDatabase) -> dict:
    """
    Lấy toàn bộ cấu hình hệ thống.
    """
    config = await db["system_configs"].find_one({"type": "api_keys"})
    if not config:
        return {
            "ai_auto_reply": True,
            "ai_system_prompt": "Bạn là LinkUp AI Assistant, một trợ lý ảo thông minh."
        }
    return config
