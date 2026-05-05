import socketio
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # In production, restrict to FRONTEND_URL
)

# ASGI application for Socket.IO
sio_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    logger.info(f"Socket.IO client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Socket.IO client disconnected: {sid}")

@sio.event
async def join_workspace(sid, data):
    workspace_id = data.get('workspaceId')
    if workspace_id:
        await sio.enter_room(sid, workspace_id)
        logger.info(f"Client {sid} joined room: {workspace_id}")
    else:
        logger.warning(f"Client {sid} attempted to join workspace without ID")

async def emit_activity(workspace_id, action, user_name, details=None):
    """
    Emit a real-time activity event to a specific workspace room.
    """
    if not workspace_id:
        return

    event_data = {
        "action": action,
        "userName": user_name,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        await sio.emit("activity", event_data, room=str(workspace_id))
        logger.info(f"Live activity emitted to workspace {workspace_id}: {action}")
    except Exception as e:
        logger.error(f"Failed to emit socket activity: {e}")
