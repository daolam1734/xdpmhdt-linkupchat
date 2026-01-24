from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.core.config import settings
import certifi

# Use certifi's bundle for SSL/TLS validation
ca = certifi.where()

# Added timeout and explicit TLS settings to help debug the SSL handshake error
client = AsyncIOMotorClient(
    settings.MONGODB_URL,
    tlsCAFile=ca,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    tls=True,
    tz_aware=True
)
db = client[settings.MONGODB_DB]

async def get_db():
    yield db
