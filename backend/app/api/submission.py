"""
Submission routes — /api/submissions
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form
from typing import Optional

from app.services import submission_service
from app.database.connection import get_db
from app.utils.dependencies import get_current_user, require_teacher, require_student
from app.utils.responses import ok

router = APIRouter(prefix="/api/submissions", tags=["Submissions"])


# ── Student: submit or resubmit a task ───────────────────────────────────────
@router.post("", summary="Submit a task (student only)", status_code=201)
async def submit_task(
    taskId:         str            = Form(...),
    textSubmission: Optional[str]  = Form(None),
    file:           Optional[UploadFile] = File(None),
    user:           dict           = Depends(require_student),
):
    db  = get_db()
    sub = await submission_service.submit_task(taskId, textSubmission, file, user, db)
    return ok(sub, status=201)


# ── Teacher: view all submissions for a task ──────────────────────────────────
@router.get("/task/{task_id}", summary="Get submissions for a task (teacher only)")
async def get_submissions_for_task(
    task_id: str,
    user:    dict = Depends(require_teacher),
):
    db   = get_db()
    subs = await submission_service.get_submissions_for_task(task_id, user, db)
    return ok(subs)


# ── Student: view own submissions ─────────────────────────────────────────────
@router.get("/my", summary="Get my submissions (student only)")
async def get_my_submissions(user: dict = Depends(require_student)):
    db   = get_db()
    subs = await submission_service.get_my_submissions(user, db)
    return ok(subs)


# ── Teacher: class-level analytics ───────────────────────────────────────────
@router.get("/analytics/class/{class_id}", summary="Class analytics (teacher only)")
async def get_class_analytics(
    class_id: str,
    user:     dict = Depends(require_teacher),
):
    db   = get_db()
    data = await submission_service.get_class_analytics(class_id, user, db)
    return ok(data)


# ── Student: own analytics ────────────────────────────────────────────────────
@router.get("/analytics/student", summary="Student analytics (student only)")
async def get_student_analytics(user: dict = Depends(require_student)):
    db   = get_db()
    data = await submission_service.get_student_analytics(user, db)
    return ok(data)


# ── Student: deadline reminders ───────────────────────────────────────────────
@router.get("/reminders", summary="Deadline reminders (student only)")
async def get_reminders(user: dict = Depends(require_student)):
    db   = get_db()
    data = await submission_service.get_reminders(user, db)
    return ok(data)
