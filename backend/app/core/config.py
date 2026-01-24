import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise Chat App"
    API_V1_STR: str = "/api/v1"
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "7963d57b018599426f432742468a356220796b42b9d363d6f73e4811a4369f9e")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # MongoDB Atlas
    MONGODB_URL: str = os.getenv("MONGODB_URL", "")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "linkupchat")

    # Gemini
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
