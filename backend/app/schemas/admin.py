from pydantic import BaseModel
from typing import Dict, Any, Optional

class SystemConfigUpdate(BaseModel):
    configs: Dict[str, Any]

class SystemConfigResponse(BaseModel):
    google_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    # Thêm các cấu hình khác nếu cần
