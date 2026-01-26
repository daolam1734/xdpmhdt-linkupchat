from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from backend.app.core.config import settings
from backend.app.api.v1 import api_router
from backend.app.db.init_db import init_db

app = FastAPI(
    title="LinkUp API",
    description="""
    Hệ thống LinkUp: Nền tảng kết nối cộng đồng và Trí tuệ nhân tạo.
    
    ### Chat nhanh – Kết nối thật – AI hỗ trợ
    """,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.on_event("startup")
async def startup_event():
    await init_db()

# Cấu hình thư mục static để phục vụ tệp tin tải lên
STATIC_DIR = "backend/static"
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Welcome to Enterprise Chat API"}
