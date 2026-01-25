from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    allow_stranger_messages: Optional[bool] = None
    ai_preferences: Optional[dict] = None

class User(UserBase):
    id: str
    is_active: bool
    is_superuser: bool = False
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    allow_stranger_messages: bool = True
    ai_preferences: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
