"""
Activity log routes — /api/activity

GET /api/activity
  - Students: returns their own activity feed (userId = current user)
  - Teachers: returns all activity logs (filterable, paginated)
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.services.activity_service import get_activity_logs
from app.database.connection import get_db
from app.utils.dependencies import get_current_user
from app.utils.responses import ok, ok_page

router = APIRouter(prefix="/activity", tags=["Activity Logs"])


@router.get(
    "",
    summary="Get activity logs",
    description=(
        "**Students** receive their own personal activity feed (task assignments, "
        "submissions, grades, feedback) — scoped to their user ID.\n\n"
        "**Teachers** receive all activity logs with full filter support.\n\n"
        "Sorted by most recent first. Supports `page` / `limit` pagination."
    ),
)
async def list_activity_logs(
    action:    Optional[str]      = Query(None, description="Action prefix filter (teacher only)"),
    date_from: Optional[datetime] = Query(None, description="Include logs on/after this datetime"),
    date_to:   Optional[datetime] = Query(None, description="Include logs on/before this datetime"),
    page:      int                = Query(1,    ge=1,        description="Page number (1-based)"),
    limit:     int                = Query(20,   ge=1, le=200, description="Records per page"),
    user:      dict               = Depends(get_current_user),
):
    db = get_db()

    # Students only see their own feed
    user_id_filter = None if user["role"] == "teacher" else user["id"]

    result = await get_activity_logs(
        db,
        user_id=user_id_filter,
        action=action,
        page=page,
        limit=limit,
        date_from=date_from,
        date_to=date_to,
    )
    return ok_page(result["data"], result["meta"])
