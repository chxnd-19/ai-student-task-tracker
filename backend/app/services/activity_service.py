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


async def log_activity(
    db: AsyncIOMotorDatabase,
    user_id: str | ObjectId | None,
    action: str,
    detail: dict | None = None,
    ip: str | None = None,
) -> None:
    """
    Write an activity log entry.  Never raises — safe to call anywhere.
    """
    try:
        uid = None
        if user_id:
            uid = ObjectId(str(user_id)) if not isinstance(user_id, ObjectId) else user_id

        await db.activity_logs.insert_one({
            "userId":    uid,
            "action":    action,
            "detail":    detail or {},
            "ip":        ip,
            "createdAt": datetime.now(timezone.utc),
        })
    except Exception as exc:
        logger.warning(f"[activity_log] Failed to write log for action={action!r}: {exc}")


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

    # EXTENDED: date-range filter on createdAt
    if date_from or date_to:
        date_filt: dict = {}
        if date_from:
            df = date_from if date_from.tzinfo else date_from.replace(tzinfo=timezone.utc)
            date_filt["$gte"] = df
        if date_to:
            dt = date_to if date_to.tzinfo else date_to.replace(tzinfo=timezone.utc)
            date_filt["$lte"] = dt
        filt["createdAt"] = date_filt

    # ── Pagination ────────────────────────────────────────────────────────────
    page  = max(1, page)
    limit = max(1, min(limit, 200))
    skip  = (page - 1) * limit

    # ── Query ─────────────────────────────────────────────────────────────────
    total  = await db.activity_logs.count_documents(filt)
    cursor = db.activity_logs.find(filt).sort("createdAt", -1).skip(skip).limit(limit)
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
