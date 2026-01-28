from pydantic import BaseModel
from typing import Dict, Any, Optional

class SystemConfigUpdate(BaseModel):
    configs: Dict[str, Any]

class SystemConfigResponse(BaseModel):
    google_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    ai_enabled: bool = True
    ai_enabled_help: bool = True # Thêm quản lý AI trong Help
    ai_auto_reply: bool = True
    ai_sentiment_analysis: bool = False
    ai_limit_per_user: int = 50
    ai_limit_per_group: int = 200
    ai_system_prompt: str = "Bạn là LinkUp AI, trợ lý ảo thông minh được phát triển để giúp người dùng kết nối. Hãy trả lời thân thiện, chuyên nghiệp và ngắn gọn bằng Tiếng Việt."
    
    # System Settings
    max_message_length: int = 2000
    max_file_size_mb: int = 20
    file_upload_enabled: bool = True
    maintenance_mode: bool = False
    system_notifications_enabled: bool = True

class SupportStatusUpdate(BaseModel):
    status: str # 'ai_processing' | 'waiting' | 'resolved'

class SupportNoteUpdate(BaseModel):
    note: str

class SupportMessageUpdate(BaseModel):
    content: str
