"""
Submission routes — /api/submissions
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, Body
from typing import Optional

from app.services import submission_service, ai_service
from app.database.connection import get_db
from app.utils.dependencies import get_current_user, require_teacher, require_student
from app.utils.responses import ok

router = APIRouter(prefix="/submissions", tags=["Submissions"])


@router.post(
    "",
    summary="Submit an assignment (student only)",
    description=(
        "Creates or updates a submission for a task. "
        "Accepts either a text body or a file upload (multipart/form-data). "
        "Triggers AI feedback analysis as a background task after submission."
    ),
    status_code=201,
    responses={
        201: {"description": "Created submission object"},
        403: {"description": "Teacher role cannot submit assignments"},
        404: {"description": "Task not found or not assigned to this student"},
    },
)
async def submit_task(
    background_tasks: BackgroundTasks,
    taskId:           str                   = Form(...,  description="ID of the task being submitted"),
    textSubmission:   Optional[str]         = Form(None, description="Text content of the submission"),
    file:             Optional[UploadFile]  = File(None, description="File attachment (PDF, DOCX, etc.)"),
    user:             dict                  = Depends(require_student),
):
    db  = get_db()
    sub = await submission_service.submit_task(taskId, textSubmission, file, user, db)
    if sub and sub.get("id"):
        background_tasks.add_task(ai_service.analyze_submission, sub["id"], db)
    return ok(sub, status=201)


@router.get(
    "/task/{task_id}",
    summary="Get submissions for a task (teacher only)",
    description="Returns all student submissions for a specific task, including AI feedback if available.",
    responses={
        200: {"description": "List of submission objects"},
        403: {"description": "Student role cannot view all submissions"},
        404: {"description": "Task not found"},
    },
)
async def get_submissions_for_task(
    task_id: str,
    user:    dict = Depends(require_teacher),
):
    db   = get_db()
    subs = await submission_service.get_submissions_for_task(task_id, user, db)
    return ok(subs)


@router.get(
    "/my",
    summary="Get my submissions (student only)",
    description="Returns all submissions made by the authenticated student across all tasks.",
    responses={
        200: {"description": "List of submission objects"},
        403: {"description": "Teacher role cannot access this endpoint"},
    },
)
async def get_my_submissions(user: dict = Depends(require_student)):
    db   = get_db()
    subs = await submission_service.get_my_submissions(user, db)
    return ok(subs)


@router.get(
    "/analytics/class/{class_id}",
    summary="Class-level submission analytics (teacher only)",
    description=(
        "Returns per-task analytics for a class: submission counts, late counts, "
        "average AI scores, and pending counts."
    ),
    responses={
        200: {"description": "Analytics object keyed by task ID"},
        403: {"description": "Student role cannot access class analytics"},
    },
)
async def get_class_analytics(
    class_id: str,
    user:     dict = Depends(require_teacher),
):
    db   = get_db()
    data = await submission_service.get_class_analytics(class_id, user, db)
    return ok(data)


@router.get(
    "/analytics/student",
    summary="Student's own analytics (student only)",
    description="Returns the authenticated student's submission history, on-time rate, and AI score trends.",
    responses={
        200: {"description": "Student analytics object"},
        403: {"description": "Teacher role cannot access this endpoint"},
    },
)
async def get_student_analytics(user: dict = Depends(require_student)):
    db   = get_db()
    data = await submission_service.get_student_analytics(user, db)
    return ok(data)


@router.get(
    "/reminders",
    summary="Upcoming deadline reminders (student only)",
    description="Returns tasks due within the next 48 hours that the student has not yet submitted.",
    responses={
        200: {"description": "List of upcoming task objects"},
        403: {"description": "Teacher role cannot access this endpoint"},
    },
)
async def get_reminders(user: dict = Depends(require_student)):
    db   = get_db()
    data = await submission_service.get_reminders(user, db)
    return ok(data)


@router.post(
    "/{submission_id}/retry-grading",
    summary="Retry AI grading for a failed submission (teacher only)",
    description=(
        "Re-triggers AI grading for a submission whose aiFeedback.status is 'failed'. "
        "Clears the failed status so analyze_submission will run again. "
        "Only the teacher who owns the task can trigger this."
    ),
    responses={
        200: {"description": "Grading re-triggered"},
        403: {"description": "Not authorised"},
        404: {"description": "Submission not found"},
        409: {"description": "Submission already graded — retry not needed"},
    },
)
async def retry_grading(
    submission_id:    str,
    background_tasks: BackgroundTasks,
    user:             dict = Depends(require_teacher),
):
    db  = get_db()
    sub = await submission_service.reset_grading_status(submission_id, user, db)
    background_tasks.add_task(ai_service.analyze_submission, submission_id, db)
    return ok(sub)


@router.put(
    "/{submission_id}/grade",
    summary="Override AI grade (teacher only)",
    description=(
        "Allows a teacher to override the AI-generated grade. "
        "Updates `aiFeedback.score`, `aiFeedback.feedback`, and sets `graded_by = 'teacher'`. "
        "The teacher must own the task the submission belongs to."
    ),
    responses={
        200: {"description": "Updated submission with teacher grade"},
        403: {"description": "Student role cannot grade submissions"},
        404: {"description": "Submission not found or not owned by this teacher"},
    },
)
async def grade_submission(
    submission_id: str,
    payload:       dict = Body(..., examples={
        "override": {
            "summary": "Teacher grade override",
            "value": {
                "score":    85,
                "feedback": "Good work overall. The analysis was thorough.",
            }
        }
    }),
    user:          dict = Depends(require_teacher),
):
    db   = get_db()
    data = await submission_service.override_grade(submission_id, payload, user, db)
    return ok(data)
