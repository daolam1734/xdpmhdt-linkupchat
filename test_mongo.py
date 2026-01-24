
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import sys

async def test_connection():
    uri = "mongodb+srv://linkup-chat:linkupchat@linkupchat.2ettabh.mongodb.net/linkupchat"
    print(f"Testing connection to: {uri}")
    print(f"Python version: {sys.version}")
    
    client = AsyncIOMotorClient(
        uri, 
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=5000
    )
    
    try:
        # The ismaster command is cheap and does not require auth.
        await client.admin.command('ismaster')
        print("✅ Success! Connection established.")
    except Exception as e:
        print(f"❌ Failed! Error: {e}")
        print("\nPossible solutions:")
        print("1. IP Whitelist: Go to Atlas -> Network Access -> Add 0.0.0.0/0 (for testing).")
        print("2. DNS: Ensure your network allows SRV record lookups.")
        print("3. Credentials: Check if 'linkup-chat' and 'linkupchat' are correct.")

if __name__ == "__main__":
    asyncio.run(test_connection())
