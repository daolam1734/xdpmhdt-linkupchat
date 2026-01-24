from pydantic import BaseModel
from typing import Optional

class RoomBase(BaseModel):
    name: str
    type: str = "public" # public, private, ai

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: str

    class Config:
        from_attributes = True
