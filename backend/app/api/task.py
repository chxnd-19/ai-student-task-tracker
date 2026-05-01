"""
Task routes — /api/tasks
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.services import task_service
from app.database.connection import get_db
from app.utils.dependencies import get_current_user, require_teacher, require_student
from app.utils.responses import ok, ok_msg, ok_page, fail
from app.schemas.task import TaskCreate, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


# ── Teacher: list tasks (with optional classId filter) ────────────────────────
# ── Student: list tasks assigned to them ─────────────────────────────────────
@router.get("", summary="List tasks")
async def get_tasks(
    classId: Optional[str] = Query(None),
    sort:    Optional[str] = Query(None),
    page:    int           = Query(1, ge=1),
    limit:   int           = Query(20, ge=1, le=50),
    user:    dict          = Depends(get_current_user),
):
    db     = get_db()
    result = await task_service.get_tasks(
        user, db,
        {"classId": classId, "sort": sort, "page": page, "limit": limit},
    )
    return ok_page(result["data"], result["meta"])


# ── Student: task status summary (overdue count fix) ─────────────────────────
@router.get("/summary", summary="Task status summary for student")
async def get_task_summary(
    classId: Optional[str] = Query(None),
    user:    dict          = Depends(require_student),
):
    db     = get_db()
    counts = await task_service.get_task_summary(user, db, classId)
    return ok(counts)


# ── Teacher: list all students ────────────────────────────────────────────────
@router.get("/students", summary="List all students (teacher only)")
async def get_students(user: dict = Depends(require_teacher)):
    db       = get_db()
    students = await task_service.get_students(db)
    return ok(students)


# ── Teacher: view one student's profile + stats ───────────────────────────────
@router.get("/students/{student_id}", summary="View student profile (teacher only)")
async def get_student_by_id(
    student_id: str,
    user:       dict = Depends(require_teacher),
):
    db   = get_db()
    data = await task_service.get_student_by_id(student_id, user, db)
    return ok(data)


# ── Get single task ───────────────────────────────────────────────────────────
@router.get("/{task_id}", summary="Get task by ID")
async def get_task_by_id(
    task_id: str,
    user:    dict = Depends(get_current_user),
):
    db   = get_db()
    task = await task_service.get_task_by_id(task_id, user, db)
    return ok(task)


# ── Teacher: create task ──────────────────────────────────────────────────────
@router.post("", summary="Create a task (teacher only)", status_code=201)
async def create_task(
    payload: TaskCreate,
    user:    dict = Depends(require_teacher),
):
    db   = get_db()
    task = await task_service.create_task(payload, user, db)
    return ok(task, status=201)


# ── Teacher: update task ──────────────────────────────────────────────────────
@router.put("/{task_id}", summary="Update a task (teacher only)")
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    user:    dict = Depends(require_teacher),
):
    db   = get_db()
    task = await task_service.update_task(task_id, payload, user, db)
    return ok(task)


# ── Teacher: delete task ──────────────────────────────────────────────────────
@router.delete("/{task_id}", summary="Delete a task (teacher only)")
async def delete_task(
    task_id: str,
    user:    dict = Depends(require_teacher),
):
    db = get_db()
    await task_service.delete_task(task_id, user, db)
    return ok_msg("Task deleted successfully.")
