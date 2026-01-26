from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.core.config import settings
from backend.app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(
    db: AsyncIOMotorDatabase = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await db["users"].find_one({"id": user_id})
    if user is None:
        raise credentials_exception
        
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Tài khoản đã bị vô hiệu hóa."
        )
        
    return user

async def get_current_active_superuser(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Giữ lại để tương thích ngược, kiểm tra quyền admin dựa trên role.
    """
    role = current_user.get("role", "member")
    if role != "admin" and not current_user.get("is_superuser"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền quản trị viên."
        )
    return current_user

def check_permissions(required_permissions: List[str]):
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        user_perms = current_user.get("permissions", [])
        if "all" in user_perms or current_user.get("role") == "admin":
            return current_user
            
        for perm in required_permissions:
            if perm not in user_perms:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Thiếu quyền: {perm}"
                )
        return current_user
    return permission_checker
