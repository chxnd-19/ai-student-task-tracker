"""
AI Study Intelligence routes — /api/ai

All routes are student-only. They reuse the existing task service to fetch
tasks, then apply pure-Python scoring/planning logic from ai_service.py.

No external AI/ML libraries are used.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.database.connection import get_db
from app.utils.dependencies import require_student
from app.utils.responses import ok
from app.services import task_service
from app.services.ai_service import (
    calculate_priority,
    generate_daily_plan,
    generate_insights,
)

router = APIRouter(prefix="/ai", tags=["AI Study Intelligence"])


# ── Shared helper ─────────────────────────────────────────────────────────────
async def _get_student_tasks(user: dict, db, class_id: str | None) -> list[dict]:
    """
    Fetch all tasks for the student (up to 200) and attach ai_score to each.
    Reuses the existing task_service.get_tasks — no duplicated logic.
    """
    result = await task_service.get_tasks(
        user, db,
        {"classId": class_id, "sort": None, "page": 1, "limit": 200},
    )
    tasks = result.get("data", [])

    # Attach ai_score to every task in-place
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
    db    = get_db()
    tasks = await _get_student_tasks(user, db, classId)
    plan  = generate_daily_plan(tasks)
    return ok(plan)


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
