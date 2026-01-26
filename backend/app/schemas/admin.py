from pydantic import BaseModel
from typing import Dict, Any, Optional

class SystemConfigUpdate(BaseModel):
    configs: Dict[str, Any]

class SystemConfigResponse(BaseModel):
    google_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    ai_auto_reply: bool = True
    ai_sentiment_analysis: bool = False
    ai_system_prompt: str = "Bạn là LinkUp AI, trợ lý ảo thông minh được phát triển để giúp người dùng kết nối. Hãy trả lời thân thiện, chuyên nghiệp và ngắn gọn bằng Tiếng Việt."
