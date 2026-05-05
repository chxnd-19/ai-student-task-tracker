"""
AI Study Intelligence service — pure Python, no external ML libraries.

Functions
---------
calculate_priority(task, user_behavior)
    Scores a task 0–10 based on urgency, importance, and user behavior.

generate_daily_plan(tasks)
    Builds a time-blocked study schedule for the top-5 highest-scored tasks.

generate_insights(tasks)
    Detects overdue overload and priority overload, returns warning strings.
"""
from datetime import datetime, timezone


# ── Priority weights ──────────────────────────────────────────────────────────
_IMPORTANCE_MAP = {"low": 3, "medium": 6, "high": 10}


def calculate_priority(task: dict, user_behavior: dict | None = None) -> float:
    """
    Score = (urgency × 0.5) + (importance × 0.3) + (behavior × 0.2)

    urgency    — 0–10, based on days until due date (capped at 10)
    importance — mapped from task priority field (low=3, medium=6, high=10)
    behavior   — user's historical delay score (default 5 if unknown)

    Returns a float rounded to 2 decimal places.
    """
    if user_behavior is None:
        user_behavior = {}

    # ── Urgency: days remaining ───────────────────────────────────────────────
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
        urgency = max(0.0, 10.0 - days_left)
        urgency = min(urgency, 10.0)          # cap at 10
    else:
        urgency = 5.0                          # unknown deadline → neutral

    # ── Importance: priority field ────────────────────────────────────────────
    priority_str = (task.get("priority") or "medium").lower()
    importance   = float(_IMPORTANCE_MAP.get(priority_str, 6))

    # ── Behavior: user delay score ────────────────────────────────────────────
    behavior = float(user_behavior.get("delay_score", 5))
    behavior = max(0.0, min(behavior, 10.0))  # clamp 0–10

    score = (urgency * 0.5) + (importance * 0.3) + (behavior * 0.2)
    return round(score, 2)


def generate_daily_plan(tasks: list[dict]) -> list[dict]:
    """
    Build a time-blocked study plan for the top-5 highest ai_score tasks.

    Schedule starts at 09:00.
    Each task block = 1.5 hours (90 minutes).
    15-minute break between blocks.

    Returns a list of dicts:
        task_id, title, subject, ai_score, start (HH:MM), end (HH:MM)
    """
    # Sort by ai_score descending; fall back to 0 if missing
    sorted_tasks = sorted(tasks, key=lambda t: t.get("ai_score", 0), reverse=True)
    top_tasks    = sorted_tasks[:5]

    plan   = []
    hour   = 9
    minute = 0

    for task in top_tasks:
        start_str = f"{hour:02d}:{minute:02d}"

        # Add 90 minutes
        end_minute = minute + 90
        end_hour   = hour + end_minute // 60
        end_minute = end_minute % 60
        end_str    = f"{end_hour:02d}:{end_minute:02d}"

        plan.append({
            "task_id":  task.get("_id") or task.get("id", ""),
            "title":    task.get("title", "Untitled"),
            "subject":  task.get("subject", ""),
            "ai_score": task.get("ai_score", 0),
            "start":    start_str,
            "end":      end_str,
        })

        # Advance cursor: 90 min block + 15 min break
        total_advance = 90 + 15
        minute += total_advance
        hour   += minute // 60
        minute  = minute % 60

    return plan


def generate_insights(tasks: list[dict]) -> list[str]:
    """
    Scan tasks and return a list of human-readable warning strings.

    Rules:
      ≥ 2 overdue tasks  → overdue warning
      ≥ 3 high-priority  → overload warning
      0 tasks            → encouragement message
    """
    if not tasks:
        return ["No tasks found. Enjoy your free time! 🎉"]

    now      = datetime.now(timezone.utc)
    overdue  = 0
    high_pri = 0

    for task in tasks:
        # Count overdue (no submission, past due date)
        if not task.get("submitted"):
            due = task.get("dueDate")
            if due:
                if isinstance(due, str):
                    try:
                        due = datetime.fromisoformat(due.replace("Z", "+00:00"))
                    except ValueError:
                        due = None
                if due:
                    if due.tzinfo is None:
                        due = due.replace(tzinfo=timezone.utc)
                    if now > due:
                        overdue += 1

        # Count high priority
        if (task.get("priority") or "").lower() == "high":
            high_pri += 1

    insights = []

    if overdue >= 2:
        insights.append(
            f"⚠️ You have {overdue} overdue tasks. "
            "Prioritise these immediately to avoid further penalties."
        )

    if high_pri >= 3:
        insights.append(
            f"🔥 You have {high_pri} high-priority tasks. "
            "Consider breaking them into smaller sessions to avoid burnout."
        )

    if not insights:
        insights.append("✅ You're on track! Keep up the great work.")

    return insights
