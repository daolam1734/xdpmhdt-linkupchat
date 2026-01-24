from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RoomBase(BaseModel):
    id: str
    name: str
    icon: Optional[str] = "hash"
    type: str = "public"
    updated_at: Optional[datetime] = None
    avatar_url: Optional[str] = None
    is_online: Optional[bool] = False
    last_message: Optional[str] = None
    last_message_id: Optional[str] = None
    last_message_sender: Optional[str] = None
    last_message_at: Optional[datetime] = None

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    class Config:
        from_attributes = True
