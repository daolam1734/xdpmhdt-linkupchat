from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class RoomBase(BaseModel):
    id: str
    name: str
    icon: Optional[str] = "hash"
    type: str = "public"
    other_user_id: Optional[str] = None
    updated_at: Optional[datetime] = None
    avatar_url: Optional[str] = None
    is_online: Optional[bool] = False
    is_pinned: Optional[bool] = False
    last_message: Optional[str] = None
    last_message_id: Optional[str] = None
    last_message_sender: Optional[str] = None
    last_message_at: Optional[datetime] = None
    blocked_by_other: bool = False
    support_status: Optional[str] = None
    support_note: Optional[str] = None

class RoomCreate(RoomBase):
    pass

class GroupCreate(BaseModel):
    name: str
    member_ids: List[str]

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class AddMembers(BaseModel):
    member_ids: List[str]

class MemberRoleUpdate(BaseModel):
    role: str

class Room(RoomBase):
    class Config:
        from_attributes = True
