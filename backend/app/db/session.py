from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.core.config import settings
import certifi

# Use certifi's bundle for SSL/TLS validation
ca = certifi.where()

# Added timeout and explicit TLS settings to help debug the SSL handshake error
mongodb_url = settings.MONGODB_URL
if not mongodb_url or "<username>" in mongodb_url:
    print("⚠️ CẢNH BÁO: MONGODB_URL chưa được cấu hình chính xác trong file .env")
    # Gán một string hợp lệ giả để tránh crash ngay lập tức khi khởi tạo client (nhưng vẫn sẽ fail khi query)
    mongodb_url = "mongodb://localhost:27017/placeholder"

client = AsyncIOMotorClient(
    mongodb_url,
    tlsCAFile=ca,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    tls=True,
    tz_aware=True
)
db = client[settings.MONGODB_DB]

async def get_db():
    yield db
