"""
Activity log routes — /api/activity
Teacher-only: paginated, filterable activity log viewer for auditing.

VALIDATED : page / limit pagination with meta
EXTENDED  : date_from / date_to range filtering
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.services.activity_service import get_activity_logs
from app.database.connection import get_db
from app.utils.dependencies import require_teacher
from app.utils.responses import ok_page

router = APIRouter(prefix="/activity", tags=["Activity Logs"])


@router.get(
    "",
    summary="Get paginated activity logs (teacher only)",
    description=(
        "Returns activity log entries sorted by **most recent first**.\n\n"
        "**Filters**\n"
        "- `action` — prefix match (e.g. `task` matches `task.create`, `task.delete`)\n"
        "- `date_from` / `date_to` — ISO-8601 UTC datetimes (e.g. `2024-01-01T00:00:00Z`)\n\n"
        "**Pagination**: `page` (1-based) · `limit` (1–200, default 20)"
    ),
)
async def list_activity_logs(
    action:    Optional[str]      = Query(None, description="Action prefix, e.g. 'task' or 'auth'"),
    date_from: Optional[datetime] = Query(None, description="Include logs on/after this UTC datetime"),
    date_to:   Optional[datetime] = Query(None, description="Include logs on/before this UTC datetime"),
    page:      int                = Query(1,    ge=1,        description="Page number (1-based)"),
    limit:     int                = Query(20,   ge=1, le=200, description="Records per page"),
    user:      dict               = Depends(require_teacher),
):
    db     = get_db()
    result = await get_activity_logs(
        db,
        action=action,
        page=page,
        limit=limit,
        date_from=date_from,
        date_to=date_to,
    )
    return ok_page(result["data"], result["meta"])
