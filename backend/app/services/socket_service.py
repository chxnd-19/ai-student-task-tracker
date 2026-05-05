"""
Socket.IO service — real-time event bus.

Event types emitted to workspace rooms:
  activity       — someone performed an action (join, submit, etc.)
  task_created   — a new task was published to the class
  task_updated   — an existing task was modified
  task_deleted   — a task was removed
  notification   — a new in-app notification for a specific user

Client rooms:
  workspace:{workspace_id}  — all members of a class
  user:{user_id}            — personal room for per-user notifications
"""
import logging
from datetime import datetime, timezone

import socketio

logger = logging.getLogger(__name__)

# ── Server ────────────────────────────────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',   # restrict to FRONTEND_URL in production
)
sio_app = socketio.ASGIApp(sio)


# ── Connection lifecycle ──────────────────────────────────────────────────────
@sio.event
async def connect(sid, environ):
    logger.info(f"[socket] connected: {sid}")


@sio.event
async def disconnect(sid):
    logger.info(f"[socket] disconnected: {sid}")


# ── Room management ───────────────────────────────────────────────────────────
@sio.event
async def join_workspace(sid, data):
    """Client joins a workspace room to receive class-level events."""
    workspace_id = data.get('workspaceId')
    if workspace_id:
        room = f"workspace:{workspace_id}"
        await sio.enter_room(sid, room)
        logger.info(f"[socket] {sid} joined room {room}")
    else:
        logger.warning(f"[socket] {sid} tried to join workspace without ID")


@sio.event
async def join_user_room(sid, data):
    """Client joins their personal room to receive per-user notifications."""
    user_id = data.get('userId')
    if user_id:
        room = f"user:{user_id}"
        await sio.enter_room(sid, room)
        logger.info(f"[socket] {sid} joined personal room {room}")


# ── Emit helpers ──────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def emit_activity(workspace_id: str, action: str, user_name: str, details: dict | None = None) -> None:
    """Broadcast a human-readable activity event to a workspace room."""
    if not workspace_id:
        return
    try:
        await sio.emit(
            "activity",
            {
                "action":    action,
                "userName":  user_name,
                "details":   details or {},
                "timestamp": _now(),
            },
            room=f"workspace:{workspace_id}",
        )
    except Exception as exc:
        logger.error(f"[socket] emit_activity failed: {exc}")


async def emit_task_created(workspace_id: str, task: dict) -> None:
    """Notify all class members that a new task was published."""
    if not workspace_id:
        return
    try:
        await sio.emit(
            "task_created",
            {"task": task, "timestamp": _now()},
            room=f"workspace:{workspace_id}",
        )
    except Exception as exc:
        logger.error(f"[socket] emit_task_created failed: {exc}")


async def emit_task_updated(workspace_id: str, task: dict) -> None:
    """Notify all class members that a task was updated."""
    if not workspace_id:
        return
    try:
        await sio.emit(
            "task_updated",
            {"task": task, "timestamp": _now()},
            room=f"workspace:{workspace_id}",
        )
    except Exception as exc:
        logger.error(f"[socket] emit_task_updated failed: {exc}")


async def emit_task_deleted(workspace_id: str, task_id: str) -> None:
    """Notify all class members that a task was removed."""
    if not workspace_id:
        return
    try:
        await sio.emit(
            "task_deleted",
            {"taskId": task_id, "timestamp": _now()},
            room=f"workspace:{workspace_id}",
        )
    except Exception as exc:
        logger.error(f"[socket] emit_task_deleted failed: {exc}")


async def emit_notification(user_id: str, notification: dict) -> None:
    """Push a notification to a specific user's personal room."""
    if not user_id:
        return
    try:
        await sio.emit(
            "notification",
            {"notification": notification, "timestamp": _now()},
            room=f"user:{user_id}",
        )
    except Exception as exc:
        logger.error(f"[socket] emit_notification failed: {exc}")
