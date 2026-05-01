"""
Async MongoDB connection using Motor.
The client is created once at startup and reused across all requests.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config.settings import get_settings

settings = get_settings()

# Module-level client — initialised in lifespan, closed on shutdown
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """Open the Motor client. Called from the FastAPI lifespan."""
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    _db = _client[settings.DB_NAME]
    # Ping to verify connectivity at startup
    await _client.admin.command("ping")
    print(f"[DB] Connected to MongoDB: {settings.DB_NAME}")


async def close_db() -> None:
    """Close the Motor client. Called from the FastAPI lifespan."""
    global _client
    if _client:
        _client.close()
        print("[DB] MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    """
    Dependency / helper — returns the active database instance.
    Raises RuntimeError if called before connect_db().
    """
    if _db is None:
        raise RuntimeError("Database not initialised. Call connect_db() first.")
    return _db
