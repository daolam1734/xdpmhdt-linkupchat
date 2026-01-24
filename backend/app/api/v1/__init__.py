from fastapi import APIRouter
from backend.app.api.v1.endpoints import auth, chat, websocket, rooms, messages, users, uploads, admin, forum

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
api_router.include_router(forum.router, prefix="/forum", tags=["forum"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(uploads.router, prefix="/files", tags=["files"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(websocket.router, tags=["websocket"])
