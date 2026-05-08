"""
Activity log service.

Records significant user actions to the `activity_logs` collection.
All writes are fire-and-forget — failures are swallowed so they never
interrupt the main request flow.

Schema:
  {
    userId:    ObjectId,
    action:    str,          # e.g. "auth.login", "task.create", "submission.submit"
    detail:    dict,         # action-specific metadata
    ip:        str | None,
    createdAt: datetime (UTC),
  }
"""
import re
import logging
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


async def create_activity(
    db: AsyncIOMotorDatabase,
    user_id: str | ObjectId,
    activity_type: str,
    message: str,
    metadata: dict | None = None,
) -> None:
    """
    Create a student-facing activity entry.

    This is the primary function for writing to the activity feed.
    Uses IST timezone for timestamps (matches the rest of the app).
    Never raises — fire-and-forget.

    Parameters
    ----------
    user_id       : the student (or user) who should see this activity
    activity_type : e.g. "task_created", "submission", "graded", "feedback"
    message       : human-readable description shown in the feed
    metadata      : optional structured data (taskId, score, etc.)
    """
    try:
        from zoneinfo import ZoneInfo
        uid = ObjectId(str(user_id)) if not isinstance(user_id, ObjectId) else user_id

        await db.activity_logs.insert_one({
            "userId":    uid,
            "action":    activity_type,
            "message":   message,
            "metadata":  metadata or {},
            "timestamp": datetime.now(ZoneInfo("Asia/Kolkata")),
        })
    except Exception as exc:
        logger.warning(f"[create_activity] Failed for type={activity_type!r}: {exc}")


async def log_activity(
    db: AsyncIOMotorDatabase,
    user_id: str | ObjectId | None,
    action: str,
    metadata: dict | None = None,
    ip: str | None = None,
    workspace_id: str | None = None,
) -> dict | None:
    """
    Write an activity log entry and optionally emit a real-time event.
    Returns the created activity object (serialized) or None on failure.
    """
    try:
        from app.utils.object_id import serialize_doc
        uid = None
        if user_id:
            uid = ObjectId(str(user_id)) if not isinstance(user_id, ObjectId) else user_id

        # Fetch user name if possible for better display
        user_name = "Someone"
        if uid:
            user = await db.users.find_one({"_id": uid}, {"name": 1})
            if user:
                user_name = user.get("name", "Someone")

        activity = {
            "userId":    uid,
            "userName":  user_name,  # Added for frontend display convenience
            "action":    action,
            "metadata":  metadata or {},
            "ip":        ip,
            "timestamp": datetime.now(timezone.utc),
        }

        # Insert into DB
        await db.activity_logs.insert_one(activity)
        
        # Serialize for return and emission
        activity_data = serialize_doc(activity)

        # Real-time emission if workspace context exists
        if workspace_id:
            from app.services.socket_service import sio
            try:
                await sio.emit(
                    "activity",
                    activity_data,
                    room=f"workspace:{workspace_id}",
                )
            except Exception as e:
                logger.error(f"[socket] Failed to emit activity: {e}")

        return activity_data

    except Exception as exc:
        logger.warning(f"[activity_log] Failed to write log for action={action!r}: {exc}")
        return None


async def get_activity_logs(
    db: AsyncIOMotorDatabase,
    user_id: str | None = None,
    action: str | None = None,
    page: int = 1,
    limit: int = 20,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> dict:
    """
    Retrieve paginated activity logs sorted by createdAt DESC.

    Parameters
    ----------
    user_id : str | None
        Filter to a specific user's actions.
    action : str | None
        Prefix filter — "task" matches "task.create", "task.delete", etc.
    page : int
        1-based page number (clamped to >= 1).
    limit : int
        Records per page (clamped to 1–200).
    date_from : datetime | None
        EXTENDED — include only logs created at or after this UTC datetime.
    date_to : datetime | None
        EXTENDED — include only logs created at or before this UTC datetime.

    Returns
    -------
    dict:
        data : list[dict]   — serialised log documents
        meta : {
            page       : int,
            limit      : int,
            total      : int,   — total matching documents
            totalPages : int,   — 0 when total == 0
        }
    """
    from app.utils.object_id import serialize_doc

    # ── Build filter ──────────────────────────────────────────────────────────
    filt: dict = {}

    if user_id:
        try:
            filt["userId"] = ObjectId(user_id)
        except Exception:
            return {
                "data": [],
                "meta": {"page": page, "limit": limit, "total": 0, "totalPages": 0},
            }

    if action:
        # Prefix match: "task" → /^task/i  (matches task.create, task.delete, …)
        filt["action"] = re.compile(f"^{re.escape(action)}", re.IGNORECASE)

    # EXTENDED: date-range filter on timestamp
    if date_from or date_to:
        date_filt: dict = {}
        if date_from:
            df = date_from if date_from.tzinfo else date_from.replace(tzinfo=timezone.utc)
            date_filt["$gte"] = df
        if date_to:
            dt = date_to if date_to.tzinfo else date_to.replace(tzinfo=timezone.utc)
            date_filt["$lte"] = dt
        filt["timestamp"] = date_filt

    # ── Pagination ────────────────────────────────────────────────────────────
    page  = max(1, page)
    limit = max(1, min(limit, 200))
    skip  = (page - 1) * limit

    # ── Query ─────────────────────────────────────────────────────────────────
    total  = await db.activity_logs.count_documents(filt)
    cursor = db.activity_logs.find(filt).sort("timestamp", -1).skip(skip).limit(limit)
    docs   = [serialize_doc(doc) async for doc in cursor]

    # totalPages is 0 when there are no results (avoids misleading "page 1 of 1")
    total_pages = 0 if total == 0 else -(-total // limit)  # ceiling division

    return {
        "data": docs,
        "meta": {
            "page":       page,
            "limit":      limit,
            "total":      total,
            "totalPages": total_pages,
        },
    }
