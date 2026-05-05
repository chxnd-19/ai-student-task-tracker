"""
Notification routes — /api/notifications
"""
from fastapi import APIRouter, Depends

from app.services import notification_service
from app.database.connection import get_db
from app.utils.dependencies import get_current_user
from app.utils.responses import ok

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", summary="Get notifications for current user")
async def get_notifications(user: dict = Depends(get_current_user)):
    db   = get_db()
    data = await notification_service.get_notifications(user, db)
    return ok(data)


# IMPORTANT: /read-all must be registered BEFORE /{notif_id}/read
# so FastAPI doesn't treat "read-all" as a notif_id path parameter.
@router.patch("/read-all", summary="Mark all notifications as read")
async def mark_all_read(user: dict = Depends(get_current_user)):
    db   = get_db()
    data = await notification_service.mark_all_read(user, db)
    return ok(data)


@router.patch("/{notif_id}/read", summary="Mark a notification as read")
async def mark_read(
    notif_id: str,
    user:     dict = Depends(get_current_user),
):
    db   = get_db()
    data = await notification_service.mark_read(notif_id, user, db)
    return ok(data)
