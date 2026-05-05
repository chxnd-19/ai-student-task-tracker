"""
Async MongoDB connection using Motor.

STABILITY RULES:
- connect_db() NEVER raises — failures are logged, app continues
- get_db() returns None if DB is unavailable (callers must handle)
- No blocking calls at import time
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel
from app.config.settings import get_settings

settings = get_settings()
logger   = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def _create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Idempotent index creation — safe to call on every startup."""
    collections = [
        (db.users, [
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("role",  ASCENDING)]),
        ]),
        (db.tasks, [
            IndexModel([("createdBy",  ASCENDING)]),
            IndexModel([("classId",    ASCENDING)]),
            IndexModel([("assignedTo", ASCENDING)]),
            IndexModel([("dueDate",    ASCENDING)]),
            IndexModel([("status",     ASCENDING)]),
            IndexModel([("priority",   ASCENDING)]),
            IndexModel([("createdAt",  DESCENDING)]),
            IndexModel([("assignedTo", ASCENDING), ("dueDate", ASCENDING)]),
        ]),
        (db.submissions, [
            IndexModel([("taskId", ASCENDING), ("studentId", ASCENDING)], unique=True),
            IndexModel([("studentId", ASCENDING)]),
            IndexModel([("taskId",    ASCENDING)]),
            IndexModel([("status",    ASCENDING)]),
        ]),
        (db.classes, [
            IndexModel([("teacherId", ASCENDING)]),
            IndexModel([("students",  ASCENDING)]),
            IndexModel([("joinCode",  ASCENDING)], unique=True),
        ]),
        (db.notifications, [
            IndexModel([("userId", ASCENDING), ("createdAt", DESCENDING)]),
            IndexModel([("userId", ASCENDING), ("isRead", ASCENDING)]),
        ]),
        (db.profiles, [
            IndexModel([("userId", ASCENDING)], unique=True),
        ]),
        (db.activity_logs, [
            IndexModel([("userId",    ASCENDING)]),
            IndexModel([("createdAt", DESCENDING)]),
            IndexModel([("action",    ASCENDING)]),
        ]),
    ]
    for collection, indexes in collections:
        try:
            await collection.create_indexes(indexes)
        except Exception as e:
            logger.warning(f"[DB] Index creation skipped for {collection.name}: {e}")
    logger.info("[DB] Indexes verified.")


async def connect_db() -> None:
    """
    Open the Motor client. Called from lifespan.
    NEVER raises — on failure, _db stays None and routes return 503.
    """
    global _client, _db
    try:
        _client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
        _db = _client[settings.DB_NAME]
        await _client.admin.command("ping")
        print(f"✅ Database connected: {settings.DB_NAME}")
        await _create_indexes(_db)
    except Exception as e:
        print(f"⚠️  DB connection failed (app still starts): {e}")
        _client = None
        _db = None


async def close_db() -> None:
    """Close the Motor client on shutdown."""
    global _client
    if _client:
        _client.close()
        print("[DB] Connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    """
    Returns the active DB instance.
    Raises HTTP 503 if DB is unavailable so routes fail gracefully.
    """
    if _db is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Please try again later."
        )
    return _db
