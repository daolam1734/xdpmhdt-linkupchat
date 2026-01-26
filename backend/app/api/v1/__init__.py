from fastapi import APIRouter
from backend.app.api.v1.endpoints import auth, chat, rooms, messages, users, uploads, admin
from backend.app.api.v1.endpoints.ws import router as ws_router

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(uploads.router, prefix="/files", tags=["files"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(ws_router, tags=["websocket"])
