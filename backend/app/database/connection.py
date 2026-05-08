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
            IndexModel([("profile.usn", ASCENDING)], unique=True, sparse=True),
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
        (db.activity_logs, [
            IndexModel([("userId",    ASCENDING)]),
            IndexModel([("timestamp", DESCENDING)]),
            IndexModel([("action",    ASCENDING)]),
            # Compound index for per-user feed queries (most common access pattern)
            IndexModel([("userId", ASCENDING), ("timestamp", DESCENDING)]),
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

        # ── Confirm which DB we're connected to ──────────────────────────────
        masked_uri = settings.MONGO_URI
        if "@" in masked_uri:
            prefix, rest = masked_uri.split("@", 1)
            scheme = prefix.split("://")[0]
            masked_uri = f"{scheme}://***@{rest}"
        logger.info(f"✅ Database connected: {settings.DB_NAME} ({masked_uri})")

        await _create_indexes(_db)
    except Exception as e:
        logger.error(f"⚠️  DB connection failed (app still starts): {e}")
        _client = None
        _db = None


async def close_db() -> None:
    """Close the Motor client on shutdown."""
    global _client
    if _client:
        _client.close()
        logger.info("[DB] Connection closed.")


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
