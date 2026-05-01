"""
Flask Analytics Microservice
────────────────────────────
Standalone service that provides analytics and notification simulation.
Runs independently on port 5001.

Start:
  cd flask_service
  pip install -r requirements.txt
  python app.py

Endpoints:
  GET  /health
  GET  /analytics/overview?teacher_id=<id>
  GET  /analytics/student/<student_id>
  POST /notifications/simulate
"""
import os
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")])

# ── MongoDB (sync PyMongo — Flask is sync) ────────────────────────────────────
_MONGO_URI = os.getenv("MONGO_URI", "")
_DB_NAME   = os.getenv("DB_NAME", "taskdb")

_client: MongoClient | None = None


def get_db():
    global _client
    if _client is None:
        _client = MongoClient(_MONGO_URI)
    return _client[_DB_NAME]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _str(oid) -> str:
    return str(oid) if isinstance(oid, ObjectId) else oid


def _serialize(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        key = "id" if k == "_id" else k
        if isinstance(v, ObjectId):
            out[key] = str(v)
        elif isinstance(v, datetime):
            out[key] = v.isoformat()
        elif isinstance(v, dict):
            out[key] = _serialize(v)
        elif isinstance(v, list):
            out[key] = [
                _serialize(i) if isinstance(i, dict)
                else str(i) if isinstance(i, ObjectId)
                else i.isoformat() if isinstance(i, datetime)
                else i
                for i in v
            ]
        else:
            out[key] = v
    return out


def ok(data, status=200):
    return jsonify({"success": True, "data": data}), status


def fail(message, status=400):
    return jsonify({"success": False, "message": message}), status


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({"success": True, "service": "flask-analytics", "status": "ok"})


@app.get("/analytics/overview")
def analytics_overview():
    """
    Platform-wide overview stats.
    Optional query param: teacher_id — scope to a specific teacher's classes.
    """
    db         = get_db()
    teacher_id = request.args.get("teacher_id")

    try:
        task_filter = {}
        if teacher_id:
            task_filter["createdBy"] = ObjectId(teacher_id)

        total_users    = db.users.count_documents({})
        total_students = db.users.count_documents({"role": "student"})
        total_teachers = db.users.count_documents({"role": "teacher"})
        total_tasks    = db.tasks.count_documents(task_filter)
        total_subs     = db.submissions.count_documents({})
        total_classes  = db.classes.count_documents(
            {"teacherId": ObjectId(teacher_id)} if teacher_id else {}
        )

        # Submission status breakdown
        on_time = db.submissions.count_documents({"status": "submitted"})
        late    = db.submissions.count_documents({"status": "late"})

        # Overdue: tasks with no submission and past due date
        now       = datetime.now(timezone.utc)
        all_tasks = list(db.tasks.find(task_filter, {"_id": 1, "dueDate": 1, "assignedTo": 1}))
        sub_task_ids = {s["taskId"] for s in db.submissions.find({}, {"taskId": 1})}

        overdue_count = 0
        for task in all_tasks:
            due = task.get("dueDate")
            if due:
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                if now > due and task["_id"] not in sub_task_ids:
                    overdue_count += len(task.get("assignedTo", []))

        return ok({
            "users": {
                "total":    total_users,
                "students": total_students,
                "teachers": total_teachers,
            },
            "tasks": {
                "total":   total_tasks,
                "classes": total_classes,
            },
            "submissions": {
                "total":   total_subs,
                "onTime":  on_time,
                "late":    late,
                "overdue": overdue_count,
            },
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        return fail(str(e), 500)


@app.get("/analytics/student/<student_id>")
def student_analytics(student_id: str):
    """
    Detailed analytics for a single student.
    """
    db = get_db()
    try:
        oid     = ObjectId(student_id)
        student = db.users.find_one({"_id": oid, "role": "student"}, {"name": 1, "email": 1})
        if not student:
            return fail("Student not found.", 404)

        subs    = list(db.submissions.find({"studentId": oid}))
        tasks   = list(db.tasks.find({"assignedTo": oid}, {"_id": 1, "dueDate": 1, "title": 1}))
        now     = datetime.now(timezone.utc)

        sub_map = {str(s["taskId"]): s for s in subs}
        stats   = {"total": len(tasks), "submitted": 0, "onTime": 0, "late": 0, "overdue": 0, "pending": 0}

        for task in tasks:
            sub = sub_map.get(str(task["_id"]))
            due = task.get("dueDate")
            if due and due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if not sub:
                stats["overdue" if due and now > due else "pending"] += 1
            else:
                stats["submitted"] += 1
                sub_at = sub.get("submittedAt")
                if sub_at and sub_at.tzinfo is None:
                    sub_at = sub_at.replace(tzinfo=timezone.utc)
                stats["late" if sub_at and due and sub_at > due else "onTime"] += 1

        # Submission rate
        rate = round((stats["submitted"] / stats["total"]) * 100) if stats["total"] > 0 else 0

        return ok({
            "student":        _serialize(student),
            "stats":          stats,
            "submissionRate": rate,
            "resubmits":      sum(1 for s in subs if len(s.get("versions", [])) > 1),
        })
    except Exception as e:
        return fail(str(e), 500)


@app.post("/notifications/simulate")
def simulate_notification():
    """
    Simulate sending a notification to a user.
    Body: { userId, message, type }
    Stores it in the notifications collection.
    """
    db   = get_db()
    body = request.get_json(silent=True) or {}

    user_id = body.get("userId")
    message = body.get("message", "").strip()
    type_   = body.get("type", "assignment")

    if not user_id or not message:
        return fail("userId and message are required.")

    try:
        result = db.notifications.insert_one({
            "userId":    ObjectId(user_id),
            "message":   message,
            "type":      type_,
            "isRead":    False,
            "createdAt": datetime.now(timezone.utc),
        })
        return ok({"notificationId": str(result.inserted_id)}, 201)
    except Exception as e:
        return fail(str(e), 500)


@app.get("/analytics/class/<class_id>")
def class_analytics(class_id: str):
    """
    Submission analytics for a specific class.
    Includes per-task completion rate and overdue percentage.
    """
    db = get_db()
    try:
        cls = db.classes.find_one({"_id": ObjectId(class_id)})
        if not cls:
            return fail("Class not found.", 404)

        tasks          = list(db.tasks.find({"classId": ObjectId(class_id)}))
        task_ids       = [t["_id"] for t in tasks]
        subs           = list(db.submissions.find({"taskId": {"$in": task_ids}}))
        total_students = len(cls.get("students", []))
        now            = datetime.now(timezone.utc)
        task_stats     = []

        for task in tasks:
            t_subs    = [s for s in subs if str(s["taskId"]) == str(task["_id"])]
            submitted = len(t_subs)
            late      = sum(1 for s in t_subs if s.get("status") == "late")
            missed    = max(0, total_students - submitted)
            rate      = round((submitted / total_students) * 100) if total_students > 0 else 0

            due = task.get("dueDate")
            if due and due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            overdue_count = missed if (due and now > due) else 0
            overdue_pct   = round((overdue_count / total_students) * 100) if total_students > 0 else 0

            task_stats.append({
                "taskId":         str(task["_id"]),
                "title":          task.get("title", ""),
                "dueDate":        due.isoformat() if due else None,
                "submitted":      submitted,
                "late":           late,
                "onTime":         submitted - late,
                "missed":         missed,
                "completionRate": rate,
                "overdueCount":   overdue_count,
                "overduePercent": overdue_pct,
            })

        avg_completion    = round(sum(t["completionRate"] for t in task_stats) / len(task_stats)) if task_stats else 0
        avg_overdue_pct   = round(sum(t["overduePercent"] for t in task_stats) / len(task_stats)) if task_stats else 0

        return ok({
            "className":         cls.get("name"),
            "totalStudents":     total_students,
            "totalTasks":        len(tasks),
            "avgCompletionRate": avg_completion,
            "avgOverduePercent": avg_overdue_pct,
            "tasks":             task_stats,
        })
    except Exception as e:
        return fail(str(e), 500)


@app.get("/analytics/completion-rates")
def completion_rates():
    """
    Platform-wide completion rate and overdue percentage across all tasks.
    Optional: ?teacher_id=<id> to scope to one teacher's tasks.
    """
    db         = get_db()
    teacher_id = request.args.get("teacher_id")

    try:
        task_filter = {}
        if teacher_id:
            task_filter["createdBy"] = ObjectId(teacher_id)

        tasks    = list(db.tasks.find(task_filter, {"_id": 1, "dueDate": 1, "assignedTo": 1}))
        task_ids = [t["_id"] for t in tasks]
        subs     = list(db.submissions.find({"taskId": {"$in": task_ids}}, {"taskId": 1, "status": 1}))
        now      = datetime.now(timezone.utc)

        sub_task_ids    = {str(s["taskId"]) for s in subs}
        total_assigned  = sum(len(t.get("assignedTo", [])) for t in tasks)
        total_submitted = len(subs)
        total_late      = sum(1 for s in subs if s.get("status") == "late")

        overdue = 0
        for task in tasks:
            if str(task["_id"]) in sub_task_ids:
                continue
            due = task.get("dueDate")
            if due:
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                if now > due:
                    overdue += len(task.get("assignedTo", []))

        completion_rate = round((total_submitted / total_assigned) * 100) if total_assigned > 0 else 0
        overdue_pct     = round((overdue / total_assigned) * 100) if total_assigned > 0 else 0
        late_pct        = round((total_late / total_submitted) * 100) if total_submitted > 0 else 0

        return ok({
            "totalAssigned":  total_assigned,
            "totalSubmitted": total_submitted,
            "totalLate":      total_late,
            "totalOverdue":   overdue,
            "completionRate": completion_rate,
            "overduePercent": overdue_pct,
            "latePercent":    late_pct,
            "generatedAt":    datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        return fail(str(e), 500)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.getenv("FLASK_PORT", 5001))
    debug = os.getenv("ENVIRONMENT", "development") == "development"
    print(f"[Flask Analytics] Starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
