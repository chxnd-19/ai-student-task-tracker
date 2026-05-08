"""
Submission business logic — submit, view, analytics, reminders.
"""
import logging
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from pathlib import Path
import aiofiles
import uuid

from app.utils.object_id import serialize_doc, is_valid_object_id
from app.config.settings import get_settings
from app.services.activity_service import log_activity

settings = get_settings()
logger   = logging.getLogger(__name__)


def _score_to_grade(score: int) -> str:
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "F"


def _oid(val: str) -> ObjectId:
    if not is_valid_object_id(str(val)):
        raise HTTPException(400, f"Invalid id: {val}")
    return ObjectId(str(val))


async def _save_upload(file: UploadFile) -> str:
    """Save an uploaded file to UPLOAD_DIR and return the relative URL."""
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)

    ext      = Path(file.filename or "upload").suffix or ".pdf"
    filename = f"{int(datetime.now().timestamp() * 1000)}-{uuid.uuid4().hex[:8]}{ext}"
    dest     = upload_path / filename

    async with aiofiles.open(dest, "wb") as f:
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(400, f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit.")
        await f.write(content)

    return f"/uploads/{filename}"


# ── POST /api/submissions ──────────────────────────────────────────────────────
async def submit_task(
    task_id: str,
    text_submission: str | None,
    file: UploadFile | None,
    user: dict,
    db: AsyncIOMotorDatabase,
) -> dict:
    task = await db.tasks.find_one({"_id": _oid(task_id), "assignedTo": _oid(user["id"])})
    if not task:
        raise HTTPException(404, "Task not found or not assigned to you.")

    now      = datetime.now(timezone.utc)
    due      = task["dueDate"]
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
    is_late  = now > due
    file_url = None

    sub_type = task.get("submissionType", "text")
    if sub_type == "file":
        if not file:
            raise HTTPException(400, "This task requires a PDF file upload.")
        file_url = await _save_upload(file)
    else:
        if not text_submission or not text_submission.strip():
            raise HTTPException(400, "Text submission is required.")

    version_entry = {
        "textSubmission": text_submission.strip() if text_submission else None,
        "fileUrl":        file_url,
        "submittedAt":    now,
    }

    set_fields: dict = {
        "status":      "late" if is_late else "submitted",
        "submittedAt": now,
        "updatedAt":   now,
    }
    if text_submission:
        set_fields["textSubmission"] = text_submission.strip()
    if file_url:
        set_fields["fileUrl"] = file_url

    # NOTE: $setOnInsert must NOT include "versions" — $push already touches
    # that field and MongoDB raises ConflictingUpdateOperators if two operators
    # reference the same path in a single update call.
    # $push on a missing field creates the array automatically, so no
    # initialisation is needed here.
    logger.debug(f"[submission] saving task={task_id!r} student={user['id']!r}")

    try:
        result = await db.submissions.find_one_and_update(
            {"taskId": _oid(task_id), "studentId": _oid(user["id"])},
            {
                "$set": set_fields,
                "$push": {"versions": version_entry},
                "$setOnInsert": {
                    "taskId":    _oid(task_id),
                    "studentId": _oid(user["id"]),
                    "createdAt": now,
                },
            },
            upsert=True,
            return_document=True,
        )
    except Exception as exc:
        logger.exception(f"[submission] DB update failed task={task_id!r}: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Submission could not be saved: {exc}",
        )

    logger.info(f"[submission] saved id={result.get('_id')!r}")

    # Notify teacher
    task_doc = await db.tasks.find_one({"_id": _oid(task_id)}, {"createdBy": 1, "title": 1})
    if task_doc and task_doc.get("createdBy"):
        student_name = user.get("name", "A student")
        await db.notifications.insert_one({
            "userId":    task_doc["createdBy"],
            "message":   f"{student_name} submitted '{task_doc['title']}'",
            "type":      "submission",
            "isRead":    False,
            "createdAt": now,
        })

    logger.info(
        f"[submission] Student={user['id']!r} submitted task={task_id!r} "
        f"status={'late' if is_late else 'on-time'}"
    )

    # Fetch class name for activity metadata
    class_name = None
    if task.get("classId"):
        cls_doc = await db.classes.find_one({"_id": task["classId"]}, {"name": 1})
        if cls_doc:
            class_name = cls_doc.get("name")

    # Persist to activity log (this also emits "activity" socket event)
    from app.services.activity_service import create_activity, log_activity
    # Student's own feed entry
    await create_activity(
        db, user["id"],
        "submission",
        f"You submitted '{task.get('title', 'an assignment')}'",
        {
            "taskTitle": task.get("title", ""),
            "taskId":    task_id,
            "className": class_name,
            "userName":  user.get("name", ""),
        },
    )
    # Workspace-level activity (for socket broadcast to class room)
    await log_activity(
        db, user["id"], "submission.submit",
        {"taskTitle": task.get("title", ""), "className": class_name, "userName": user.get("name", "")},
        workspace_id=str(task["classId"]) if task.get("classId") else None
    )
    
    return serialize_doc(result)


# ── GET /api/submissions/task/:taskId ──────────────────────────────────────────
async def get_submissions_for_task(task_id: str, user: dict, db: AsyncIOMotorDatabase) -> list:
    task = await db.tasks.find_one({"_id": _oid(task_id), "createdBy": _oid(user["id"])})
    if not task:
        raise HTTPException(404, "Task not found.")

    cursor = db.submissions.find({"taskId": _oid(task_id)})
    subs   = [serialize_doc(s) async for s in cursor]

    # Populate studentId
    for sub in subs:
        sid = sub.get("studentId")
        if sid and is_valid_object_id(str(sid)):
            u = await db.users.find_one({"_id": ObjectId(str(sid))}, {"name": 1, "email": 1, "profile": 1})
            if u:
                sub["studentId"] = {
                    "id":      str(u["_id"]),
                    "name":    u.get("name"),
                    "email":   u.get("email"),
                    "profile": u.get("profile", {})
                }
    return subs


# ── GET /api/submissions/my ────────────────────────────────────────────────────
async def get_my_submissions(user: dict, db: AsyncIOMotorDatabase) -> list:
    cursor = db.submissions.find({"studentId": _oid(user["id"])})
    subs   = [serialize_doc(s) async for s in cursor]

    for sub in subs:
        tid = sub.get("taskId")
        if tid and is_valid_object_id(str(tid)):
            t = await db.tasks.find_one(
                {"_id": ObjectId(str(tid))},
                {"title": 1, "subject": 1, "dueDate": 1, "submissionType": 1},
            )
            if t:
                sub["taskId"] = serialize_doc(t)
    return subs


# ── GET /api/submissions/analytics/class/:classId ─────────────────────────────
async def get_class_analytics(class_id: str, user: dict, db: AsyncIOMotorDatabase) -> dict:
    cls = await db.classes.find_one({"_id": _oid(class_id), "teacherId": _oid(user["id"])})
    if not cls:
        raise HTTPException(404, "Class not found.")

    tasks = await db.tasks.find(
        {"classId": _oid(class_id), "createdBy": _oid(user["id"])}
    ).to_list(length=None)

    if not tasks:
        return {"tasks": [], "summary": {
            "totalTasks": 0, "totalStudents": len(cls.get("students", [])),
            "avgCompletion": 0, "totalLate": 0, "totalSubmissions": 0,
        }}

    task_ids       = [t["_id"] for t in tasks]
    all_subs       = await db.submissions.find({"taskId": {"$in": task_ids}}).to_list(length=None)
    total_students = len(cls.get("students", []))

    task_stats = []
    for task in tasks:
        subs      = [s for s in all_subs if str(s["taskId"]) == str(task["_id"])]
        submitted = len(subs)
        late      = sum(1 for s in subs if s.get("status") == "late")
        on_time   = submitted - late
        missed    = max(0, total_students - submitted)
        rate      = round((submitted / total_students) * 100) if total_students > 0 else 0

        # Average AI/teacher score — from aiFeedback.score on each submission
        graded_scores = [
            s["aiFeedback"]["score"]
            for s in subs
            if isinstance(s.get("aiFeedback"), dict)
            and s["aiFeedback"].get("status") == "completed"
            and s["aiFeedback"].get("score") is not None
        ]
        avg_score = round(sum(graded_scores) / len(graded_scores), 1) if graded_scores else None

        logger.debug(
            f"[analytics] task={task['_id']}  "
            f"submissions={submitted}  pending={missed}  "
            f"completion={rate}%  avgScore={avg_score}"
        )

        task_stats.append({
            "taskId":         str(task["_id"]),
            "title":          task["title"],
            "subject":        task["subject"],
            "dueDate":        task["dueDate"].isoformat() if hasattr(task["dueDate"], "isoformat") else str(task["dueDate"]),
            "totalStudents":  total_students,
            # canonical field names — frontend reads these directly
            "submitted":      submitted,
            "onTime":         on_time,
            "late":           late,
            "missed":         missed,
            "completionRate": rate,
            "averageScore":   avg_score,   # None when no graded submissions yet
        })

    avg_completion    = round(sum(t["completionRate"] for t in task_stats) / len(task_stats)) if task_stats else 0
    total_late        = sum(t["late"] for t in task_stats)
    total_submissions = sum(t["submitted"] for t in task_stats)

    return {
        "tasks": task_stats,
        "summary": {
            "totalTasks":       len(tasks),
            "totalStudents":    total_students,
            "avgCompletion":    avg_completion,
            "totalLate":        total_late,
            "totalSubmissions": total_submissions,
        },
    }


# ── GET /api/submissions/analytics/student ────────────────────────────────────
async def get_student_analytics(user: dict, db: AsyncIOMotorDatabase) -> dict:
    subs = await db.submissions.find({"studentId": _oid(user["id"])}).to_list(length=None)
    total     = len(subs)
    on_time   = sum(1 for s in subs if s.get("status") == "submitted")
    late      = sum(1 for s in subs if s.get("status") == "late")
    resubmits = sum(1 for s in subs if len(s.get("versions", [])) > 1)
    return {"total": total, "onTime": on_time, "late": late, "resubmits": resubmits, "submissions": [serialize_doc(s) for s in subs]}


# ── POST /api/submissions/:id/retry-grading ───────────────────────────────────
async def reset_grading_status(
    submission_id: str,
    user: dict,
    db: AsyncIOMotorDatabase,
) -> dict:
    """
    Clear a failed aiFeedback so analyze_submission will re-run.
    Only the teacher who owns the task may trigger this.
    """
    sub = await db.submissions.find_one({"_id": _oid(submission_id)})
    if not sub:
        raise HTTPException(404, "Submission not found.")

    task = await db.tasks.find_one({
        "_id": sub["taskId"],
        "createdBy": _oid(user["id"]),
    })
    if not task:
        raise HTTPException(403, "You do not own the task for this submission.")

    current_status = (sub.get("aiFeedback") or {}).get("status")
    if current_status == "completed":
        raise HTTPException(409, "Submission is already graded. Retry not needed.")

    result = await db.submissions.find_one_and_update(
        {"_id": _oid(submission_id)},
        {"$set": {
            "aiFeedback.status":   "pending",
            "aiFeedback.feedback": "Re-evaluation in progress…",
        }},
        return_document=True,
    )
    return serialize_doc(result)


# ── PUT /api/submissions/:id/grade ────────────────────────────────────────────
async def override_grade(
    submission_id: str,
    payload: dict,
    user: dict,
    db: AsyncIOMotorDatabase,
) -> dict:
    """
    Teacher override for AI grading.
    Validates the teacher owns the task, then updates aiFeedback fields.
    """
    sub = await db.submissions.find_one({"_id": _oid(submission_id)})
    if not sub:
        raise HTTPException(404, "Submission not found.")

    # Verify the teacher owns the task this submission belongs to
    task = await db.tasks.find_one({
        "_id": sub["taskId"],
        "createdBy": _oid(user["id"]),
    })
    if not task:
        raise HTTPException(403, "You do not own the task for this submission.")

    score    = payload.get("score")
    feedback = payload.get("feedback", "").strip()

    if score is None:
        raise HTTPException(400, "score is required.")
    try:
        score = int(score)
        if not (0 <= score <= 100):
            raise ValueError
    except (ValueError, TypeError):
        raise HTTPException(400, "score must be an integer between 0 and 100.")

    update = {
        # Keep original AI feedback intact — only update the override fields
        "aiFeedback.score":       score,
        "aiFeedback.feedback":    feedback,
        "aiFeedback.graded_by":   "teacher",
        "aiFeedback.status":      "completed",
        # finalGrade is the authoritative grade shown to students
        "finalGrade": {
            "score":      score,
            "grade":      _score_to_grade(score),
            "feedback":   feedback,
            "graded_by":  "teacher",
            "status":     "completed",
        },
        "reviewedByTeacher": True,
        "updatedAt":         datetime.now(timezone.utc),
    }
    if "strengths" in payload:
        update["aiFeedback.strengths"] = [str(s) for s in payload["strengths"]]
    if "improvements" in payload:
        update["aiFeedback.improvements"] = [str(s) for s in payload["improvements"]]
    if "suggestions" in payload:
        update["aiFeedback.suggestions"] = [str(s) for s in payload["suggestions"]]

    result = await db.submissions.find_one_and_update(
        {"_id": _oid(submission_id)},
        {"$set": update},
        return_document=True,
    )

    logger.info(
        f"[submission] Teacher={user['id']!r} overrode grade for "
        f"submission={submission_id!r} score={score}"
    )

    # Activity entry for the student
    try:
        from app.services.activity_service import create_activity
        student_id = sub.get("studentId")
        task_title = task.get("title", "an assignment")
        await create_activity(
            db, student_id,
            "feedback",
            f"Teacher added feedback on '{task_title}': {score}/100",
            {
                "taskTitle": task_title,
                "taskId":    str(sub.get("taskId", "")),
                "score":     score,
                "userName":  user.get("name", "Instructor"),
            },
        )
    except Exception:
        pass   # fire-and-forget

    return serialize_doc(result)


# ── GET /api/submissions/reminders ────────────────────────────────────────────
async def get_reminders(user: dict, db: AsyncIOMotorDatabase) -> list:
    tasks = await db.tasks.find({"assignedTo": _oid(user["id"])}).to_list(length=None)
    if not tasks:
        return []

    submitted_ids = {
        str(s["taskId"])
        async for s in db.submissions.find({"studentId": _oid(user["id"])}, {"taskId": 1})
    }

    now       = datetime.now(timezone.utc)
    reminders = []

    for task in tasks:
        if str(task["_id"]) in submitted_ids:
            continue
        due = task["dueDate"]
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)

        diff_ms  = (due - now).total_seconds() * 1000
        diff_hrs = round(diff_ms / 3_600_000)
        is_over  = diff_ms < 0

        if is_over:
            urgency = "overdue"
        elif diff_hrs < 24:
            urgency = "urgent"
        elif diff_hrs < 72:
            urgency = "soon"
        else:
            urgency = "normal"

        reminders.append({
            "taskId":    str(task["_id"]),
            "title":     task["title"],
            "subject":   task["subject"],
            "dueDate":   due.isoformat(),
            "classId":   str(task["classId"]) if task.get("classId") else None,
            "urgency":   urgency,
            "hoursLeft": None if is_over else diff_hrs,
        })

    urgency_order = {"overdue": 0, "urgent": 1, "soon": 2, "normal": 3}
    reminders.sort(key=lambda r: (urgency_order[r["urgency"]], r["dueDate"]))
    return reminders
