from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MessageBase(BaseModel):
    content: str
    room_id: str

class MessageCreate(MessageBase):
    pass

class MessageRead(MessageBase):
    id: str
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    timestamp: datetime
    is_bot: bool
    is_edited: bool = False
    is_recalled: bool = False
    is_pinned: bool = False
    status: Optional[str] = "sent" # sent, delivered, seen
    reply_to_id: Optional[str] = None
    reply_to_content: Optional[str] = None
    suggestions: Optional[list[str]] = None
    shared_post: Optional[dict] = None

    class Config:
        from_attributes = True
