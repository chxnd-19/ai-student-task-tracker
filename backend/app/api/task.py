"""
Task routes — /api/tasks

Role matrix:
  GET    /tasks              → teacher (own tasks) | student (assigned tasks)
  GET    /tasks/summary      → student only
  GET    /tasks/students     → teacher only
  GET    /tasks/students/:id → teacher only
  GET    /tasks/:id          → teacher | student
  POST   /tasks              → teacher only
  PUT    /tasks/:id          → teacher only
  DELETE /tasks/:id          → teacher only
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.services import task_service
from app.database.connection import get_db
from app.utils.dependencies import get_current_user, require_teacher, require_student
from app.utils.responses import ok, ok_list, ok_msg, ok_page

from app.schemas.task import TaskCreate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get(
    "",
    summary="List tasks",
    description=(
        "Returns tasks for the authenticated user. "
        "**Teachers** see tasks they created (optionally filtered by `classId`). "
        "**Students** see tasks assigned to them. "
        "Supports pagination via `page` / `limit` and sorting via `sort=deadline`."
    ),
    responses={
        200: {"description": "Paginated task list with metadata"},
        401: {"description": "Missing or invalid JWT"},
        503: {"description": "Database unavailable"},
    },
)
async def get_tasks(
    classId: Optional[str] = Query(None,  description="Filter by class ID"),
    sort:    Optional[str] = Query(None,  description="Sort order: `deadline` or omit for newest-first"),
    page:    int           = Query(1,     ge=1,  description="Page number (1-based)"),
    limit:   int           = Query(20,    ge=1, le=50, description="Results per page (max 50)"),
    user:    dict          = Depends(get_current_user),
):
    db     = get_db()
    result = await task_service.get_tasks(
        user, db,
        {"classId": classId, "sort": sort, "page": page, "limit": limit},
    )
    return ok_page(result["data"], result["meta"])


@router.get(
    "/summary",
    summary="Task status summary (student only)",
    description=(
        "Returns counts of tasks grouped by status: `pending`, `submitted`, `overdue`, `late`. "
        "Results are cached per student per class for 60 seconds."
    ),
    responses={
        200: {"description": "Status counts object"},
        403: {"description": "Teacher role cannot access this endpoint"},
    },
)
async def get_task_summary(
    classId: Optional[str] = Query(None, description="Scope summary to a specific class"),
    user:    dict          = Depends(require_student),
):
    db     = get_db()
    counts = await task_service.get_task_summary(user, db, classId)
    return ok(counts)


@router.get(
    "/students",
    summary="List students (teacher only)",
    description="Returns all students, optionally scoped to a specific workspace/class.",
    responses={
        200: {"description": "List of student objects"},
        403: {"description": "Student role cannot access this endpoint"},
    },
)
async def get_students(
    workspaceId: Optional[str] = Query(None, description="Filter students by class membership"),
    user:        dict          = Depends(require_teacher),
):
    db       = get_db()
    students = await task_service.get_students(db, workspaceId)
    return ok_list(students)


@router.get(
    "/students/{student_id}",
    summary="View student profile and stats (teacher only)",
    description="Returns a student's profile, submission history, and performance stats for tasks created by this teacher.",
    responses={
        200: {"description": "Student profile with stats"},
        404: {"description": "Student not found"},
    },
)
async def get_student_by_id(
    student_id: str,
    user:       dict = Depends(require_teacher),
):
    db   = get_db()
    data = await task_service.get_student_by_id(student_id, user, db)
    return ok(data)


@router.get(
    "/{task_id}",
    summary="Get task by ID",
    description="Returns a single task. Teachers can only access their own tasks; students can only access tasks assigned to them.",
    responses={
        200: {"description": "Task object"},
        404: {"description": "Task not found or access denied"},
    },
)
async def get_task_by_id(
    task_id: str,
    user:    dict = Depends(get_current_user),
):
    db   = get_db()
    task = await task_service.get_task_by_id(task_id, user, db)
    return ok(task)


@router.post(
    "",
    summary="Create a task (teacher only)",
    description=(
        "Creates a new assignment and assigns it to all students in the specified class. "
        "Sends in-app notifications to each assigned student. "
        "Emits a real-time Socket.IO event to the class room."
    ),
    status_code=201,
    responses={
        201: {"description": "Created task object"},
        403: {"description": "Student role cannot create tasks"},
        404: {"description": "Class not found or not owned by this teacher"},
        422: {"description": "Validation error — check title, subject, dueDate"},
    },
)
async def create_task(
    payload: TaskCreate,
    user:    dict = Depends(require_teacher),
):
    db   = get_db()
    task = await task_service.create_task(payload, user, db)
    return ok(task, status=201)


@router.put(
    "/{task_id}",
    summary="Update a task (teacher only)",
    description="Updates task fields. Re-syncs `assignedTo` from the class roster. Invalidates the summary cache for all affected students.",
    responses={
        200: {"description": "Updated task object"},
        404: {"description": "Task not found or not owned by this teacher"},
    },
)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    user:    dict = Depends(require_teacher),
):
    db   = get_db()
    task = await task_service.update_task(task_id, payload, user, db)
    return ok(task)


@router.delete(
    "/{task_id}",
    summary="Delete a task (teacher only)",
    description="Permanently deletes a task and invalidates the summary cache for all previously assigned students.",
    responses={
        200: {"description": "Success message"},
        404: {"description": "Task not found or not owned by this teacher"},
    },
)
async def delete_task(
    task_id: str,
    user:    dict = Depends(require_teacher),
):
    db = get_db()
    await task_service.delete_task(task_id, user, db)
    return ok_msg("Task deleted successfully.")
