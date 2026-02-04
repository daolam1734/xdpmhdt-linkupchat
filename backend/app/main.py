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

# Cấu hình thư mục lưu trữ tập trung (Centralized Storage)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")       # True static assets (favicon, etc)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")      # Root upload folder
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")    # Public avatars
MESSAGE_DIR = os.path.join(UPLOAD_DIR, "messages")  # Private messages files

# Đảm bảo cấu trúc thư mục tồn tại
for d in [STATIC_DIR, UPLOAD_DIR, AVATAR_DIR, MESSAGE_DIR]:
    if not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

# Mount các thư mục phục vụ tệp tin
# Phục vụ tệp tin trong chat (Fallback cho các URL cũ /static/uploads/...)
@app.get("/static/uploads/{file_name}")
async def serve_old_uploads(file_name: str):
    from fastapi.responses import FileResponse
    # Thử tìm trong thư mục messages
    msg_path = os.path.join(MESSAGE_DIR, file_name)
    if os.path.exists(msg_path):
        return FileResponse(msg_path)
    
    # Thử tìm trong thư mục uploads trực tiếp
    root_path = os.path.join(UPLOAD_DIR, file_name)
    if os.path.exists(root_path):
        return FileResponse(root_path)
        
    raise HTTPException(status_code=404, detail="File not found in fallback storage")

# /static: Phục vụ logo, favicon...
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
# /avatars: Phục vụ ảnh đại diện (Công khai theo Policy mới)
app.mount("/avatars", StaticFiles(directory=AVATAR_DIR), name="avatars")

# Lưu ý: Tin nhắn (/uploads/messages) KHÔNG được mount công khai. 
# Chúng sẽ được phục vụ qua endpoint /api/v1/files/download/{file_id} để kiểm tra Auth.

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import FileResponse
    # Nếu có file favicon.ico trong backend/static thì trả về, 
    # nếu không có thể trả về một icon mặc định hoặc FileResponse cho file khác
    favicon_path = os.path.join(STATIC_DIR, "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    return status.HTTP_204_NO_CONTENT

# Set all CORS enabled origins
origins = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Welcome to Enterprise Chat API"}
