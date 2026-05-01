"""
Async MongoDB connection using Motor.
The client is created once at startup and reused across all requests.
Indexes are created here so they exist before any request is served.
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel
from app.config.settings import get_settings

settings = get_settings()
logger   = logging.getLogger(__name__)

# Module-level client — initialised in lifespan, closed on shutdown
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def _create_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Idempotent index creation.
    Motor's create_indexes is a no-op if the index already exists with the
    same key pattern and options, so this is safe to call on every startup.
    """
    # ── users ─────────────────────────────────────────────────────────────────
    await db.users.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True, name="email_unique"),
        IndexModel([("role",  ASCENDING)],               name="role"),
    ])

    # ── tasks ─────────────────────────────────────────────────────────────────
    await db.tasks.create_indexes([
        IndexModel([("createdBy",  ASCENDING)],  name="createdBy"),
        IndexModel([("classId",    ASCENDING)],  name="classId"),
        IndexModel([("assignedTo", ASCENDING)],  name="assignedTo"),
        IndexModel([("dueDate",    ASCENDING)],  name="dueDate"),
        IndexModel([("createdAt",  DESCENDING)], name="createdAt_desc"),
        # Compound: student dashboard query (assignedTo + dueDate)
        IndexModel(
            [("assignedTo", ASCENDING), ("dueDate", ASCENDING)],
            name="assignedTo_dueDate",
        ),
    ])

    # ── submissions ───────────────────────────────────────────────────────────
    await db.submissions.create_indexes([
        IndexModel(
            [("taskId", ASCENDING), ("studentId", ASCENDING)],
            unique=True,
            name="taskId_studentId_unique",
        ),
        IndexModel([("studentId", ASCENDING)], name="studentId"),
        IndexModel([("taskId",    ASCENDING)], name="taskId"),
        IndexModel([("status",    ASCENDING)], name="status"),
    ])

    # ── classes ───────────────────────────────────────────────────────────────
    await db.classes.create_indexes([
        IndexModel([("teacherId", ASCENDING)], name="teacherId"),
        IndexModel([("students",  ASCENDING)], name="students"),
        IndexModel([("joinCode",  ASCENDING)], unique=True, name="joinCode_unique"),
    ])

    # ── notifications ─────────────────────────────────────────────────────────
    await db.notifications.create_indexes([
        IndexModel(
            [("userId", ASCENDING), ("createdAt", DESCENDING)],
            name="userId_createdAt",
        ),
        IndexModel(
            [("userId", ASCENDING), ("isRead", ASCENDING)],
            name="userId_isRead",
        ),
    ])

    # ── profiles ──────────────────────────────────────────────────────────────
    await db.profiles.create_indexes([
        IndexModel([("userId", ASCENDING)], unique=True, name="userId_unique"),
    ])

    # ── activity_logs ─────────────────────────────────────────────────────────
    await db.activity_logs.create_indexes([
        IndexModel([("userId",    ASCENDING)],  name="userId"),
        IndexModel([("createdAt", DESCENDING)], name="createdAt_desc"),
        IndexModel([("action",    ASCENDING)],  name="action"),
    ])

    logger.info("[DB] Indexes verified / created.")


async def connect_db() -> None:
    """Open the Motor client and create indexes. Called from the FastAPI lifespan."""
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    _db     = _client[settings.DB_NAME]
    # Ping to verify connectivity at startup
    await _client.admin.command("ping")
    logger.info(f"[DB] Connected to MongoDB: {settings.DB_NAME}")
    await _create_indexes(_db)


async def close_db() -> None:
    """Close the Motor client. Called from the FastAPI lifespan."""
    global _client
    if _client:
        _client.close()
        logger.info("[DB] MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    """
    Dependency / helper — returns the active database instance.
    Raises RuntimeError if called before connect_db().
    """
    if _db is None:
        raise RuntimeError("Database not initialised. Call connect_db() first.")
    return _db
