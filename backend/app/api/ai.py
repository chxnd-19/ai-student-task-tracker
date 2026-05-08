"""
AI Study Intelligence routes — /api/ai

All routes are student-only. They reuse the existing task service to fetch
tasks, then apply pure-Python scoring/planning logic from ai_service.py.

No external AI/ML libraries are used.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
import logging

from app.database.connection import get_db
from app.utils.dependencies import require_student
from app.utils.responses import ok
from app.services import task_service
from app.utils.object_id import is_valid_object_id
from bson import ObjectId
from app.services.ai_service import (
    calculate_priority,
    generate_daily_plan,
    generate_insights,
)

logger = logging.getLogger(__name__)

def _oid(val: str) -> ObjectId:
    return ObjectId(str(val)) if is_valid_object_id(str(val)) else None

router = APIRouter(prefix="/ai", tags=["AI Study Intelligence"])


# ── Shared helper ─────────────────────────────────────────────────────────────
async def _get_student_tasks(user: dict, db, class_id: str | None) -> list[dict]:
    """
    Fetch all tasks for the student (up to 200), attach ai_score, then strip
    any task the student has already submitted.

    A submitted task requires no further study — scheduling it would be
    logically incorrect and confusing to the student.
    """
    result = await task_service.get_tasks(
        user, db,
        {"classId": class_id, "sort": None, "page": 1, "limit": 200},
    )
    tasks = result.get("data", [])

    # ── Fetch submitted task IDs for this student ─────────────────────────────
    submitted_task_ids: set[str] = set()
    try:
        cursor = db.submissions.find(
            {"studentId": _oid(user["id"])},
            {"taskId": 1},
        )
        async for doc in cursor:
            if doc.get("taskId"):
                submitted_task_ids.add(str(doc["taskId"]))
    except Exception:
        pass  # non-fatal — if this fails, we just don't filter

    total_fetched = len(tasks)

    # ── Filter: remove submitted tasks ───────────────────────────────────────
    # Also remove tasks whose top-level status field is "submitted" or
    # "completed" (belt-and-suspenders — covers both DB patterns).
    _DONE_STATUSES = {"submitted", "completed", "graded"}

    tasks = [
        t for t in tasks
        if str(t.get("_id") or t.get("id", "")) not in submitted_task_ids
        and (t.get("status") or "").lower() not in _DONE_STATUSES
        and not t.get("submitted", False)
    ]

    filtered_count = total_fetched - len(tasks)
    logger.debug(
        f"[AI PLAN] total={total_fetched} | filtered={filtered_count} | schedulable={len(tasks)}"
    )

    # ── Attach ai_score to every remaining task ───────────────────────────────
    for task in tasks:
        task["ai_score"] = calculate_priority(task, user_behavior={})

    return tasks


# ── GET /api/ai/priority ──────────────────────────────────────────────────────
@router.get(
    "/priority",
    summary="Get AI priority scores for student tasks",
    description=(
        "Returns all tasks for the authenticated student with an `ai_score` field "
        "attached. Score is computed from urgency (days until due), importance "
        "(priority field), and a default behavior score. "
        "Tasks are sorted by `ai_score` descending."
    ),
    responses={
        200: {"description": "Tasks with ai_score, sorted highest first"},
        403: {"description": "Teacher role cannot access this endpoint"},
    },
)
async def get_priority(
    classId: Optional[str] = Query(None, description="Scope to a specific class"),
    user:    dict           = Depends(require_student),
):
    db    = get_db()
    tasks = await _get_student_tasks(user, db, classId)
    # Exclude closed tasks from suggestions — they cannot be acted on
    from datetime import datetime, timezone as _tz
    now_utc = datetime.now(_tz.utc)
    from app.services.ai_service import _is_closed
    tasks = [t for t in tasks if not _is_closed(t, now_utc)]
    tasks.sort(key=lambda t: t.get("ai_score", 0), reverse=True)
    return ok(tasks)


# ── GET /api/ai/plan ──────────────────────────────────────────────────────────
@router.get(
    "/plan",
    summary="Generate a daily study plan",
    description=(
        "Scores all student tasks and builds a time-blocked study schedule "
        "for the top-5 highest-priority tasks. "
        "Schedule starts at 09:00, each block is 1.5 hours with 15-minute breaks."
    ),
    responses={
        200: {"description": "List of time blocks: task_id, title, start, end, ai_score"},
        403: {"description": "Teacher role cannot access this endpoint"},
    },
)
async def get_plan(
    classId: Optional[str] = Query(None, description="Scope to a specific class"),
    user:    dict           = Depends(require_student),
):
    from datetime import datetime, timezone
    db    = get_db()
    tasks = await _get_student_tasks(user, db, classId)

    # ── Recency: find the most recently submitted task for this student ────────
    last_worked_id: str | None = None
    try:
        last_sub = await db.submissions.find_one(
            {"studentId": _oid(user["id"])},
            sort=[("submittedAt", -1)],
            projection={"taskId": 1},
        )
        if last_sub and last_sub.get("taskId"):
            last_worked_id = str(last_sub["taskId"])
    except Exception:
        pass

    plan         = generate_daily_plan(tasks, last_worked_task_id=last_worked_id)
    from zoneinfo import ZoneInfo
    generated_at = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()

    return ok({"generated_at": generated_at, "plan": plan})


# ── GET /api/ai/insights ──────────────────────────────────────────────────────
@router.get(
    "/insights",
    summary="Get AI study insights and warnings",
    description=(
        "Analyses the student's task list and returns actionable insight strings. "
        "Detects: overdue overload (≥2 overdue), priority overload (≥3 high-priority). "
        "Returns an encouragement message when no issues are found."
    ),
    responses={
        200: {"description": "List of insight strings"},
        403: {"description": "Teacher role cannot access this endpoint"},
    },
)
async def get_insights(
    classId: Optional[str] = Query(None, description="Scope to a specific class"),
    user:    dict           = Depends(require_student),
):
    db       = get_db()
    tasks    = await _get_student_tasks(user, db, classId)
    insights = generate_insights(tasks)
    return ok(insights)
