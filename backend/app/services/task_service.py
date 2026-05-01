"""
Task business logic — CRUD, summary, student listing.
"""
import logging
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.task import TaskCreate, TaskUpdate
from app.utils.object_id import serialize_doc, is_valid_object_id
from app.utils.cache import summary_cache
from app.config.settings import get_settings
from app.services.activity_service import log_activity

settings = get_settings()
logger   = logging.getLogger(__name__)

# ── Cache key helper ──────────────────────────────────────────────────────────
def _summary_cache_key(user_id: str, class_id: str | None) -> str:
    """Unique cache key per student + optional class scope."""
    return f"summary:{user_id}:{class_id or 'all'}"


def _to_start_of_day_utc(date_str: str) -> datetime:
    """Parse an ISO date string and floor it to midnight UTC."""
    dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


def _oid(val: str) -> ObjectId:
    if not is_valid_object_id(val):
        raise HTTPException(status_code=400, detail=f"Invalid id: {val}")
    return ObjectId(val)


# ── GET /api/tasks ─────────────────────────────────────────────────────────────
async def get_tasks(user: dict, db: AsyncIOMotorDatabase, query_params: dict) -> dict:
    sort_field = "dueDate" if query_params.get("sort") == "deadline" else "createdAt"
    sort_dir   = 1 if sort_field == "dueDate" else -1

    try:
        page  = max(1, int(query_params.get("page", 1)))
        limit = min(settings.PAGINATION_MAX_LIMIT,
                    max(1, int(query_params.get("limit", settings.PAGINATION_DEFAULT_LIMIT))))
    except (ValueError, TypeError):
        page, limit = 1, settings.PAGINATION_DEFAULT_LIMIT

    skip = (page - 1) * limit

    if user["role"] == "teacher":
        filt: dict = {"createdBy": _oid(user["id"])}
        if query_params.get("classId"):
            filt["classId"] = _oid(query_params["classId"])
    else:
        # Student path
        if query_params.get("classId"):
            cls = await db.classes.find_one(
                {"_id": _oid(query_params["classId"]), "students": _oid(user["id"])}
            )
            if not cls:
                raise HTTPException(404, "Class not found or you are not a member.")
            filt = {"classId": _oid(query_params["classId"])}
        else:
            filt = {"assignedTo": _oid(user["id"])}

    total = await db.tasks.count_documents(filt)
    cursor = db.tasks.find(filt).sort(sort_field, sort_dir).skip(skip).limit(limit)
    tasks  = [serialize_doc(t) async for t in cursor]

    # Populate createdBy name/email inline
    for task in tasks:
        if task.get("createdBy") and is_valid_object_id(str(task["createdBy"])):
            u = await db.users.find_one(
                {"_id": ObjectId(str(task["createdBy"]))}, {"name": 1, "email": 1}
            )
            if u:
                task["createdBy"] = {"id": str(u["_id"]), "name": u["name"], "email": u["email"]}

    return {
        "data": tasks,
        "meta": {
            "page":       page,
            "totalPages": 0 if total == 0 else -(-total // limit),  # 0 when empty
            "total":      total,
            "limit":      limit,
        },
    }


# ── GET /api/tasks/:id ─────────────────────────────────────────────────────────
async def get_task_by_id(task_id: str, user: dict, db: AsyncIOMotorDatabase) -> dict:
    if user["role"] == "teacher":
        filt = {"_id": _oid(task_id), "createdBy": _oid(user["id"])}
    else:
        filt = {"_id": _oid(task_id), "assignedTo": _oid(user["id"])}

    task = await db.tasks.find_one(filt)
    if not task:
        raise HTTPException(404, "Task not found.")
    return serialize_doc(task)


# ── POST /api/tasks ────────────────────────────────────────────────────────────
async def create_task(payload: TaskCreate, user: dict, db: AsyncIOMotorDatabase) -> dict:
    assigned_to: list[ObjectId] = []
    class_id = None

    if payload.classId:
        cls = await db.classes.find_one(
            {"_id": _oid(payload.classId), "teacherId": _oid(user["id"])}
        )
        if not cls:
            raise HTTPException(404, "Class not found or you do not own it.")
        class_id    = cls["_id"]
        assigned_to = cls.get("students", [])
    else:
        # Legacy: assign to all students
        cursor = db.users.find({"role": "student"}, {"_id": 1})
        assigned_to = [s["_id"] async for s in cursor]

    doc = {
        "title":          payload.title.strip()[:settings.MAX_TITLE_LEN],
        "subject":        payload.subject.strip()[:settings.MAX_SUBJECT_LEN],
        "description":    payload.description.strip()[:settings.MAX_DESCRIPTION_LEN],
        "status":         "pending",
        "dueDate":        _to_start_of_day_utc(payload.dueDate),
        "createdBy":      _oid(user["id"]),
        "classId":        class_id,
        "assignedTo":     assigned_to,
        "submissionType": payload.submissionType,
        "createdAt":      datetime.now(timezone.utc),
        "updatedAt":      datetime.now(timezone.utc),
    }
    result = await db.tasks.insert_one(doc)
    task   = await db.tasks.find_one({"_id": result.inserted_id})

    # Notify assigned students
    if assigned_to:
        notifications = [
            {
                "userId":    sid,
                "message":   f"New assignment: {doc['title']}",
                "type":      "assignment",
                "isRead":    False,
                "createdAt": datetime.now(timezone.utc),
            }
            for sid in assigned_to
        ]
        await db.notifications.insert_many(notifications)

    logger.info(
        f"[task] Created task={str(result.inserted_id)!r} "
        f"title={doc['title']!r} by teacher={user['id']!r}"
    )
    await log_activity(
        db, user["id"], "task.create",
        {"taskId": str(result.inserted_id), "title": doc["title"]},
    )
    # Invalidate summary cache for all students assigned to this task
    for sid in assigned_to:
        summary_cache.invalidate_prefix(f"summary:{str(sid)}:")
    return serialize_doc(task)


# ── PUT /api/tasks/:id ─────────────────────────────────────────────────────────
async def update_task(task_id: str, payload: TaskUpdate, user: dict, db: AsyncIOMotorDatabase) -> dict:
    existing = await db.tasks.find_one({"_id": _oid(task_id), "createdBy": _oid(user["id"])})
    if not existing:
        raise HTTPException(404, "Task not found.")

    # Re-sync assignedTo
    if existing.get("classId"):
        cls = await db.classes.find_one({"_id": existing["classId"]})
        assigned_to = cls.get("students", []) if cls else existing.get("assignedTo", [])
    else:
        cursor = db.users.find({"role": "student"}, {"_id": 1})
        assigned_to = [s["_id"] async for s in cursor]

    update_doc = {
        "title":          payload.title.strip()[:settings.MAX_TITLE_LEN],
        "subject":        payload.subject.strip()[:settings.MAX_SUBJECT_LEN],
        "description":    payload.description.strip()[:settings.MAX_DESCRIPTION_LEN],
        "dueDate":        _to_start_of_day_utc(payload.dueDate),
        "submissionType": payload.submissionType,
        "assignedTo":     assigned_to,
        "updatedAt":      datetime.now(timezone.utc),
    }
    await db.tasks.update_one({"_id": _oid(task_id)}, {"$set": update_doc})
    task = await db.tasks.find_one({"_id": _oid(task_id)})
    logger.info(f"[task] Updated task={task_id!r} by teacher={user['id']!r}")
    await log_activity(db, user["id"], "task.update", {"taskId": task_id})
    # Invalidate summary cache for all affected students
    for sid in assigned_to:
        summary_cache.invalidate_prefix(f"summary:{str(sid)}:")
    return serialize_doc(task)


# ── DELETE /api/tasks/:id ──────────────────────────────────────────────────────
async def delete_task(task_id: str, user: dict, db: AsyncIOMotorDatabase) -> None:
    # Fetch assignedTo before deleting so we can invalidate their caches
    existing = await db.tasks.find_one(
        {"_id": _oid(task_id), "createdBy": _oid(user["id"])},
        {"assignedTo": 1},
    )
    result = await db.tasks.delete_one({"_id": _oid(task_id), "createdBy": _oid(user["id"])})
    if result.deleted_count == 0:
        raise HTTPException(404, "Task not found.")
    logger.info(f"[task] Deleted task={task_id!r} by teacher={user['id']!r}")
    await log_activity(db, user["id"], "task.delete", {"taskId": task_id})
    # Invalidate summary cache for all previously assigned students
    if existing:
        for sid in existing.get("assignedTo", []):
            summary_cache.invalidate_prefix(f"summary:{str(sid)}:")


# ── GET /api/tasks/students ────────────────────────────────────────────────────
async def get_students(db: AsyncIOMotorDatabase) -> list:
    cursor = db.users.find({"role": "student"}, {"name": 1, "email": 1})
    return [serialize_doc(s) async for s in cursor]


# ── GET /api/tasks/students/:id ────────────────────────────────────────────────
async def get_student_by_id(student_id: str, teacher: dict, db: AsyncIOMotorDatabase) -> dict:
    student = await db.users.find_one(
        {"_id": _oid(student_id), "role": "student"},
        {"name": 1, "email": 1, "createdAt": 1},
    )
    if not student:
        raise HTTPException(404, "Student not found.")

    profile = await db.profiles.find_one({"userId": _oid(student_id)})

    # Tasks this teacher assigned to this student
    assigned = await db.tasks.find(
        {"assignedTo": _oid(student_id), "createdBy": _oid(teacher["id"])},
        {"_id": 1, "dueDate": 1},
    ).to_list(length=None)

    task_ids = [t["_id"] for t in assigned]
    subs = await db.submissions.find(
        {"studentId": _oid(student_id), "taskId": {"$in": task_ids}},
        {"taskId": 1, "submittedAt": 1, "status": 1},
    ).to_list(length=None)

    now = datetime.now(timezone.utc)
    stats = {"total": len(assigned), "submitted": 0, "onTime": 0, "late": 0, "overdue": 0}
    sub_map = {str(s["taskId"]): s for s in subs}

    for task in assigned:
        sub = sub_map.get(str(task["_id"]))
        if not sub:
            due = task["dueDate"]
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if now > due:
                stats["overdue"] += 1
        else:
            stats["submitted"] += 1
            stats["late" if sub["status"] == "late" else "onTime"] += 1

    return {
        "student": serialize_doc(student),
        "profile": serialize_doc(profile) or {},
        "stats":   stats,
    }


# ── GET /api/tasks/summary ─────────────────────────────────────────────────────
async def get_task_summary(user: dict, db: AsyncIOMotorDatabase, class_id: str | None) -> dict:
    """
    Correct overdue logic:
    - Only tasks assigned to this student
    - pending  : not submitted AND due_date >= now
    - overdue  : not submitted AND due_date <  now
    - submitted: submitted AND submittedAt <= dueDate
    - late     : submitted AND submittedAt >  dueDate

    UPGRADE: Results are cached per (user_id, class_id) for CACHE_TTL_SECONDS.
    Cache is invalidated automatically when tasks are created, updated, or deleted.
    """
    cache_key = _summary_cache_key(user["id"], class_id)

    # ── Cache hit ─────────────────────────────────────────────────────────────
    cached = summary_cache.get(cache_key)
    if cached is not None:
        logger.debug(f"[cache] summary HIT for user={user['id']!r} class={class_id!r}")
        return cached

    # ── Cache miss — compute ──────────────────────────────────────────────────
    logger.debug(f"[cache] summary MISS for user={user['id']!r} class={class_id!r}")

    if class_id:
        cls = await db.classes.find_one(
            {"_id": _oid(class_id), "students": _oid(user["id"])}
        )
        if not cls:
            return {"pending": 0, "submitted": 0, "overdue": 0, "late": 0}
        task_filt = {"classId": _oid(class_id), "assignedTo": _oid(user["id"])}
    else:
        task_filt = {"assignedTo": _oid(user["id"])}

    tasks = await db.tasks.find(task_filt, {"_id": 1, "dueDate": 1}).to_list(length=None)
    if not tasks:
        result = {"pending": 0, "submitted": 0, "overdue": 0, "late": 0}
        summary_cache.set(cache_key, result)
        return result

    task_ids = [t["_id"] for t in tasks]
    subs = await db.submissions.find(
        {"studentId": _oid(user["id"]), "taskId": {"$in": task_ids}},
        {"taskId": 1, "submittedAt": 1},
    ).to_list(length=None)

    sub_map = {str(s["taskId"]): s for s in subs}
    now     = datetime.now(timezone.utc)
    counts  = {"pending": 0, "submitted": 0, "overdue": 0, "late": 0}

    for task in tasks:
        due = task["dueDate"]
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        sub = sub_map.get(str(task["_id"]))
        if not sub:
            counts["overdue" if now > due else "pending"] += 1
        else:
            sub_at = sub["submittedAt"]
            if sub_at.tzinfo is None:
                sub_at = sub_at.replace(tzinfo=timezone.utc)
            counts["late" if sub_at > due else "submitted"] += 1

    # ── Store in cache ────────────────────────────────────────────────────────
    summary_cache.set(cache_key, counts)
    return counts
