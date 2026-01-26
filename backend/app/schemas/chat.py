from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RoomBase(BaseModel):
    name: str
    type: str = "public" # public, private, ai

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: str
    last_message: Optional[str] = None
    last_message_id: Optional[str] = None
    last_message_sender: Optional[str] = None
    last_message_at: Optional[datetime] = None
    is_pinned: Optional[bool] = False
    has_unread: Optional[bool] = False
    unread_count: Optional[int] = 0
    other_user_id: Optional[str] = None
    avatar_url: Optional[str] = None
    is_online: Optional[bool] = False
    blocked_by_other: Optional[bool] = False

    class Config:
        from_attributes = True
