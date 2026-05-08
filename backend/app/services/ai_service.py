"""
AI service — two responsibilities:

1. Study Intelligence (pure Python, no external APIs)
   calculate_priority()   — urgency/importance score for a task
   generate_daily_plan()  — time-blocked study schedule
   generate_insights()    — overdue/overload warnings

2. Submission Grading (Gemini API, called as BackgroundTask)
   analyze_submission()   — grades a submission and persists the result
"""
import logging
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# ── Priority weights ──────────────────────────────────────────────────────────
_IMPORTANCE_MAP = {"low": 3, "medium": 6, "high": 10}


# ─────────────────────────────────────────────────────────────────────────────
# STUDY INTELLIGENCE
# ─────────────────────────────────────────────────────────────────────────────

def calculate_priority(task: dict, user_behavior: dict | None = None) -> float:
    """
    Score = (urgency × 0.5) + (importance × 0.3) + (behavior × 0.2)

    urgency    — 0–10, based on days until due date
    importance — mapped from task priority field (low=3, medium=6, high=10)
    behavior   — user's historical delay score (default 5 if unknown)
    """
    if user_behavior is None:
        user_behavior = {}

    now = datetime.now(timezone.utc)
    due = task.get("dueDate")
    if due:
        if isinstance(due, str):
            try:
                due = datetime.fromisoformat(due.replace("Z", "+00:00"))
            except ValueError:
                due = None
        if due and due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)

    if due:
        days_left = (due - now).days
        urgency   = max(0.0, min(10.0, 10.0 - days_left))
    else:
        urgency = 5.0

    priority_str = (task.get("priority") or "medium").lower()
    importance   = float(_IMPORTANCE_MAP.get(priority_str, 6))
    behavior     = max(0.0, min(10.0, float(user_behavior.get("delay_score", 5))))

    return round((urgency * 0.5) + (importance * 0.3) + (behavior * 0.2), 2)


def _parse_due(due_raw) -> datetime | None:
    """Parse a dueDate field (str or datetime) to a UTC-aware datetime."""
    if due_raw is None:
        return None
    if isinstance(due_raw, datetime):
        return due_raw if due_raw.tzinfo else due_raw.replace(tzinfo=timezone.utc)
    if isinstance(due_raw, str):
        try:
            dt = datetime.fromisoformat(due_raw.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def _composite_score(task: dict, now: datetime, last_worked_id: str | None) -> float:
    """
    Composite scheduling score (higher = schedule sooner).

    score = ai_score * 0.6
          + urgency_weight * 0.3
          - recency_penalty * 0.1
          + hash_variation        ← deterministic, no random()

    urgency_weight:
      overdue  → min(3, abs(days_left) * 0.7)   — capped so overdue doesn't dominate
      upcoming → max(0, 2 - days_left * 0.3)     — fades as deadline recedes
      no date  → 0

    recency_penalty:
      2 if this task was the last one worked on (avoid repeating top task)

    hash_variation:
      (hash(task_id) % 10) * 0.03  — stable across calls, differs per task
    """
    ai_score = float(task.get("ai_score") or 0)

    due = _parse_due(task.get("dueDate"))
    if due:
        days_left = (due - now).days
        if days_left < 0:                                    # overdue
            urgency_weight = min(3.0, abs(days_left) * 0.7)
        else:                                                # upcoming
            urgency_weight = max(0.0, 2.0 - days_left * 0.3)
    else:
        urgency_weight = 0.0

    task_id = str(task.get("_id") or task.get("id") or "")
    recency_penalty = 2.0 if (last_worked_id and task_id == last_worked_id) else 0.0

    hash_variation = (hash(task_id) % 10) * 0.03

    # Step 2: time-based variation — shifts slightly each 5-min window
    # Uses current_minute so the score changes on refresh without randomness
    time_variation = (now.minute % 5) * 0.05

    return (
        ai_score         * 0.6
        + urgency_weight * 0.3
        - recency_penalty * 0.1
        + hash_variation
        + time_variation
    )


def _is_closed(task: dict, now: datetime) -> bool:
    """
    A task is considered closed (cannot be submitted) when ANY of:
      1. task.is_submission_closed == True  (explicit teacher lock)
      2. now > dueDate AND task.allow_late != True  (deadline passed, no late allowed)

    Defaults safely when fields are absent:
      - is_submission_closed missing → False
      - allow_late missing           → False  (strict: treat as no late allowed)
      - dueDate missing              → False  (no deadline = never auto-closed)
    """
    if task.get("is_submission_closed") is True:
        return True

    due = _parse_due(task.get("dueDate"))
    if due is not None:
        due_aware = due if due.tzinfo else due.replace(tzinfo=timezone.utc)
        now_aware = now if now.tzinfo else now.replace(tzinfo=timezone.utc)
        if now_aware > due_aware and not task.get("allow_late", False):
            return True

    return False


def _balance_by_difficulty(tasks: list[dict], max_tasks: int) -> list[dict]:
    """
    Interleave high / medium / low tasks so the plan never chains
    the same difficulty level (e.g. HIGH → HIGH → HIGH).

    Algorithm: round-robin pop from each bucket until max_tasks reached.
    """
    high   = [t for t in tasks if (t.get("priority") or "medium").lower() == "high"]
    medium = [t for t in tasks if (t.get("priority") or "medium").lower() == "medium"]
    low    = [t for t in tasks if (t.get("priority") or "medium").lower() == "low"]

    result: list[dict] = []
    while len(result) < max_tasks and (high or medium or low):
        if high:   result.append(high.pop(0))
        if len(result) >= max_tasks: break
        if medium: result.append(medium.pop(0))
        if len(result) >= max_tasks: break
        if low:    result.append(low.pop(0))

    return result[:max_tasks]


# ── Preferred reschedule slots (hour, minute) in IST ─────────────────────────
_RESCHEDULE_SLOTS: list[tuple[int, int]] = [
    (8, 0), (10, 0), (14, 0), (16, 0), (19, 0)
]


def _find_reschedule_slot(
    now: "datetime",
    duration_min: int,
    occupied: list[tuple["datetime", "datetime"]],
) -> tuple["datetime", str]:
    """
    Find the first available reschedule slot for an overdue task.

    Algorithm:
      1. Try each slot on TODAY (if now.hour < 22 — leaves at least 2 h buffer).
      2. If no today slot works, try each slot on TOMORROW.
      3. Fallback: tomorrow 08:00 (should never be reached given 5 slots).

    A slot is valid when:
      - slot_start > now  (not in the past)
      - slot_start does not overlap any existing plan block
        (overlap = slot_start < block_end AND slot_end > block_start)

    Returns (slot_datetime, reason_string).
    """
    from datetime import timedelta

    def _overlaps(start: "datetime", end: "datetime") -> bool:
        for blk_start, blk_end in occupied:
            if start < blk_end and end > blk_start:
                return True
        return False

    # Try today first (only if before 22:00 — avoids late-night suggestions)
    if now.hour < 22:
        for h, m in _RESCHEDULE_SLOTS:
            candidate = now.replace(hour=h, minute=m, second=0, microsecond=0)
            if candidate <= now:
                continue                          # slot already passed today
            end = candidate + timedelta(minutes=duration_min)
            if not _overlaps(candidate, end):
                return candidate, "Next available slot today"

    # Try tomorrow
    tomorrow = now + timedelta(days=1)
    for h, m in _RESCHEDULE_SLOTS:
        candidate = tomorrow.replace(hour=h, minute=m, second=0, microsecond=0)
        end = candidate + timedelta(minutes=duration_min)
        if not _overlaps(candidate, end):
            return candidate, "Next available slot tomorrow"

    # Hard fallback (all 10 slots occupied — extremely unlikely)
    fallback = (now + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
    return fallback, "Next available slot tomorrow"


def generate_daily_plan(
    tasks: list[dict],
    last_worked_task_id: str | None = None,
) -> list[dict]:
    """
    Adaptive, time-aware study plan.

    Task classification (evaluated in order — closed wins over overdue):
      closed  → is_submission_closed OR (past due AND allow_late=False)
      overdue → past due but still submittable (allow_late=True)
      active  → future due date, or no due date

    Closed tasks are NEVER scheduled. They are appended as type="closed".
    Overdue tasks are NEVER in the normal flow. They get a dynamic reschedule slot.
    Only active tasks are time-blocked.

    Base time rules:
      hour >= 21  → tomorrow 08:00  (never schedule late-night work)
      otherwise   → now rounded up to next 5-min boundary
    """
    from datetime import timedelta
    from zoneinfo import ZoneInfo

    IST = ZoneInfo("Asia/Kolkata")
    now = datetime.now(IST)
    # Use UTC-naive now for _is_closed comparison (it handles tz internally)
    now_utc = datetime.now(timezone.utc)

    _DURATION = {"high": 60, "medium": 45, "low": 30}
    _BREAKS   = [5, 10, 5, 5, 5]

    # ── Safety filter: strip submitted / completed tasks ─────────────────────
    # _get_student_tasks already does this, but guard here too so the planner
    # is correct regardless of how it's called.
    _DONE = {"submitted", "completed", "graded"}
    tasks = [
        t for t in tasks
        if (t.get("status") or "").lower() not in _DONE
        and not t.get("submitted", False)
    ]

    # ── Three-way split: closed / overdue / active ────────────────────────────
    closed_tasks:  list[dict] = []
    overdue_tasks: list[dict] = []
    active_tasks:  list[dict] = []

    for task in tasks:
        if _is_closed(task, now_utc):
            closed_tasks.append(task)
            continue
        due = _parse_due(task.get("dueDate"))
        if due is not None:
            due_ist = due.astimezone(IST)
            if due_ist < now:
                overdue_tasks.append(task)
                continue
        active_tasks.append(task)

    # ── Define base_time (the earliest valid start) ───────────────────────────
    is_tomorrow = now.hour >= 21

    if is_tomorrow:
        base_time = (now + timedelta(days=1)).replace(
            hour=8, minute=0, second=0, microsecond=0
        )
    else:
        extra_min = (5 - now.minute % 5) % 5
        if extra_min == 0:
            extra_min = 5
        base_time = now.replace(second=0, microsecond=0) + timedelta(minutes=extra_min)

    current_time = base_time

    # ── Time-of-day task limit ────────────────────────────────────────────────
    h = base_time.hour
    if is_tomorrow or 5 <= h < 12:
        max_tasks = 5
    elif 12 <= h < 17:
        max_tasks = 4
    elif 17 <= h < 21:
        max_tasks = 3
    else:
        max_tasks = 2

    # ── Composite scoring + difficulty balancing (active tasks only) ──────────
    scored   = sorted(active_tasks, key=lambda t: _composite_score(t, now, last_worked_task_id), reverse=True)
    balanced = _balance_by_difficulty(scored, max_tasks)

    plan: list[dict] = []

    # occupied tracks (start_dt, end_dt) for overlap-aware overdue slot-finding
    occupied: list[tuple[datetime, datetime]] = []

    # ── Schedule active tasks ─────────────────────────────────────────────────
    for i, task in enumerate(balanced):

        # Hard block: cursor must never be in the past
        if current_time < now:
            current_time = now + timedelta(minutes=5)
            extra = (5 - current_time.minute % 5) % 5
            current_time = current_time.replace(second=0, microsecond=0) + timedelta(minutes=extra)

        pri      = (task.get("priority") or "medium").lower()
        duration = _DURATION.get(pri, 45)
        end_time = current_time + timedelta(minutes=duration)

        start_str = _fmt_12h(current_time.hour, current_time.minute)
        end_str   = _fmt_12h(end_time.hour,     end_time.minute)

        diff_min   = (current_time - now).total_seconds() / 60
        starts_now = (not is_tomorrow) and (i == 0) and (0 <= diff_min <= 10)

        plan.append({
            "type":       "active",
            "task_id":    task.get("_id") or task.get("id", ""),
            "title":      task.get("title", "Untitled"),
            "subject":    task.get("subject", ""),
            "ai_score":   round(float(task.get("ai_score") or 0), 2),
            "priority":   pri,
            "duration":   duration,
            "start":      start_str,
            "end":        end_str,
            "starts_now": starts_now,
            "day":        "tomorrow" if is_tomorrow else "today",
        })

        occupied.append((current_time, end_time))

        brk          = _BREAKS[i] if i < len(_BREAKS) else 5
        current_time = end_time + timedelta(minutes=brk)

    # ── Overdue entries — intelligent slot selection ──────────────────────────
    for task in overdue_tasks:
        pri      = (task.get("priority") or "medium").lower()
        duration = _DURATION.get(pri, 45)

        slot_dt, reason = _find_reschedule_slot(now, duration, occupied)
        occupied.append((slot_dt, slot_dt + timedelta(minutes=duration)))

        slot_day           = "today" if slot_dt.date() == now.date() else "tomorrow"
        suggested_time_str = _fmt_12h(slot_dt.hour, slot_dt.minute)

        plan.append({
            "type":           "overdue",
            "task_id":        task.get("_id") or task.get("id", ""),
            "title":          task.get("title", "Untitled"),
            "subject":        task.get("subject", ""),
            "ai_score":       round(float(task.get("ai_score") or 0), 2),
            "priority":       pri,
            "duration":       duration,
            "start":          None,
            "end":            None,
            "starts_now":     False,
            "day":            "overdue",
            "message":        "Task missed. Needs rescheduling.",
            "suggested_time": f"{slot_day.capitalize()} {suggested_time_str}",
            "reason":         reason,
        })

    # ── Closed entries — informational only, never scheduled ─────────────────
    for task in closed_tasks:
        pri = (task.get("priority") or "medium").lower()
        plan.append({
            "type":     "closed",
            "task_id":  task.get("_id") or task.get("id", ""),
            "title":    task.get("title", "Untitled"),
            "subject":  task.get("subject", ""),
            "ai_score": round(float(task.get("ai_score") or 0), 2),
            "priority": pri,
            "duration": _DURATION.get(pri, 45),
            "start":    None,
            "end":      None,
            "starts_now": False,
            "day":      "closed",
            "message":  "Submission closed. This task can no longer be completed.",
        })

    return plan


def _fmt_12h(hour: int, minute: int) -> str:
    """Convert 24-hour hour/minute to 12-hour AM/PM string, e.g. '9:00 AM'."""
    hour = hour % 24
    period = "AM" if hour < 12 else "PM"
    h12    = hour % 12 or 12
    return f"{h12}:{minute:02d} {period}"


def generate_insights(tasks: list[dict]) -> list[str]:
    """
    Condition-based insights — never static.

    Conditions checked (in order):
      no tasks          → encouragement
      few tasks (< 2)   → prompt to add more
      closed ≥ 1        → warn that some tasks cannot be completed
      overdue ≥ 2       → urgent warning
      high priority ≥ 3 → overload warning
      all submitted     → positive completion message
      all pending       → neutral nudge
      mixed             → on-track message
    """
    if not tasks:
        return ["No tasks found. Enjoy your free time! 🎉"]

    if len(tasks) < 2:
        return [
            "📋 Add more tasks to get a smarter, personalised study plan.",
            "✅ You're off to a good start — keep adding assignments as they come in.",
        ]

    now = datetime.now(timezone.utc)
    closed    = 0
    overdue   = 0
    high_pri  = 0
    submitted = 0
    pending   = 0

    for task in tasks:
        due          = _parse_due(task.get("dueDate"))
        is_submitted = bool(task.get("submitted"))

        if _is_closed(task, now):
            closed += 1
            # Closed tasks don't count as pending or submitted for progress purposes
            continue

        if is_submitted:
            submitted += 1
        else:
            pending += 1
            if due and now > due:
                overdue += 1

        if (task.get("priority") or "").lower() == "high":
            high_pri += 1

    insights: list[str] = []

    # Closed tasks warning — highest priority signal
    if closed >= 2:
        insights.append(
            f"🚫 {closed} tasks are closed and can no longer be completed. "
            "Focus on your remaining open tasks."
        )
    elif closed == 1:
        insights.append(
            "🚫 1 task is closed and can no longer be completed. "
            "Focus on your remaining open tasks."
        )

    # Overdue warning
    if overdue >= 2:
        insights.append(
            f"⚠️ You have {overdue} overdue tasks — prioritize them first before starting new work."
        )
    elif overdue == 1:
        insights.append(
            "⚠️ You have 1 overdue task — prioritize it first before starting new work."
        )

    # High-priority overload
    if high_pri >= 3:
        insights.append(
            f"🔥 {high_pri} high-priority tasks detected. "
            "Break them into focused sessions to avoid burnout."
        )

    # All submitted — positive
    if submitted == len(tasks) - closed and pending == 0 and submitted > 0:
        insights.append("🎉 All open tasks submitted! Great work — you're fully caught up.")
        return insights

    # All pending — neutral nudge
    if pending == len(tasks) - closed and submitted == 0:
        insights.append(
            "📌 All tasks are still pending. "
            "Start with the highest-priority item to build momentum."
        )

    # Mixed / on-track (only if no warnings were added)
    if not insights:
        total_scoreable = submitted + pending
        pct = round((submitted / total_scoreable) * 100) if total_scoreable else 0
        if pct >= 75:
            insights.append(f"✅ {pct}% complete — you're almost there! Keep it up.")
        elif pct >= 40:
            insights.append(f"✅ {pct}% done. Good progress — stay consistent.")
        else:
            insights.append("✅ You're on track! Work through your plan one task at a time.")

    return insights


# ─────────────────────────────────────────────────────────────────────────────
# SUBMISSION GRADING  (Gemini — called as BackgroundTask)
# ─────────────────────────────────────────────────────────────────────────────

async def analyze_submission(submission_id: str, db: AsyncIOMotorDatabase) -> None:
    """
    Background task: grade a submission with Gemini and persist the result.

    Stored fields on the submission document:
      aiFeedback.score        int 0–100
      aiFeedback.feedback     str
      aiFeedback.strengths    list[str]
      aiFeedback.improvements list[str]
      aiFeedback.graded_by    "AI"
      aiFeedback.status       "completed" | "failed"

    Never raises — failures are logged and the submission is marked "failed".
    """
    from app.services.ai_grading_service import grade_submission

    try:
        # ── STEP 9: Run AI grading ONLY ONCE per submission ───────────────────
        # Check if already successfully graded — skip to avoid wasting quota.
        # Re-grade only if status is "pending" (in-flight) or "failed" (retry).
        existing = await db.submissions.find_one(
            {"_id": ObjectId(submission_id)},
            {"aiFeedback": 1},
        )
        if existing:
            existing_status = (existing.get("aiFeedback") or {}).get("status")
            if existing_status == "completed":
                logger.info(
                    f"[AI] submission={submission_id} already graded — skipping"
                )
                return

        logger.info(f"[AI] grading started  submission={submission_id}")

        # Mark as pending immediately so the student sees a spinner
        await db.submissions.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {"aiFeedback.status": "pending"}},
        )

        submission = await db.submissions.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            logger.error(f"[ai_service] Submission {submission_id} not found")
            return

        task = await db.tasks.find_one({"_id": submission["taskId"]}) or {}

        result = await grade_submission(submission, task)

        await db.submissions.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {
                "aiFeedback": {
                    "score":        result.score,
                    "grade":        result.grade,
                    "feedback":     result.feedback,
                    "strengths":    result.strengths,
                    "improvements": result.improvements,
                    "suggestions":  result.suggestions,
                    "rubric":       result.rubric,
                    "confidence":   result.confidence,
                    "graded_by":    result.graded_by,
                    "status":       result.status,
                },
                # finalGrade mirrors aiFeedback until teacher overrides
                "finalGrade": {
                    "score":      result.score,
                    "grade":      result.grade,
                    "feedback":   result.feedback,
                    "graded_by":  result.graded_by,
                    "status":     result.status,
                },
                "reviewedByTeacher": False,
            }},
        )

        logger.info(
            f"[ai_service] Graded submission={submission_id} "
            f"score={result.score} status={result.status}"
        )
        logger.info(f"[AI] grading completed  submission={submission_id}  score={result.score}  grade={result.grade}")

        # Activity entry for the student — only on success
        if result.status == "completed":
            try:
                from app.services.activity_service import create_activity
                student_id = submission.get("studentId")
                task_title = task.get("title", "an assignment")
                await create_activity(
                    db, student_id,
                    "graded",
                    f"AI graded your submission for '{task_title}': {result.score}/100",
                    {
                        "taskTitle": task_title,
                        "taskId":    str(submission.get("taskId", "")),
                        "score":     result.score,
                        "userName":  "AI Grader",
                    },
                )
            except Exception:
                pass   # fire-and-forget

    except Exception as exc:
        logger.exception(f"[ai_service] Unexpected error for submission={submission_id}: {exc}")
        try:
            await db.submissions.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": {"aiFeedback.status": "failed"}},
            )
        except Exception:
            pass
