from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: str
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    timestamp: datetime

class PostBase(BaseModel):
    title: str
    content: str
    tags: List[str] = []

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class Post(PostBase):
    id: str
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    timestamp: datetime
    likes: List[str] = []  # List of user IDs
    comment_count: int = 0
    is_liked: bool = False

class PostDetail(Post):
    comments: List[Comment] = []
