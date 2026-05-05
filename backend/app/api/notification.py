"""
Notification routes — /api/notifications
"""
from fastapi import APIRouter, Depends

from app.services import notification_service
from app.database.connection import get_db
from app.utils.dependencies import get_current_user
from app.utils.responses import ok

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    summary="Get notifications for current user",
    description=(
        "Returns the 50 most recent notifications for the authenticated user, "
        "sorted by creation date descending. Includes read/unread status."
    ),
    responses={
        200: {"description": "List of notification objects"},
        401: {"description": "Missing or invalid JWT"},
    },
)
async def get_notifications(user: dict = Depends(get_current_user)):
    db   = get_db()
    data = await notification_service.get_notifications(user, db)
    return ok(data)


# IMPORTANT: /read-all must be registered BEFORE /{notif_id}/read
# so FastAPI doesn't treat "read-all" as a notif_id path parameter.
@router.patch(
    "/read-all",
    summary="Mark all notifications as read",
    description="Sets `isRead = true` on all unread notifications for the authenticated user.",
    responses={
        200: {"description": "Updated count"},
        401: {"description": "Missing or invalid JWT"},
    },
)
async def mark_all_read(user: dict = Depends(get_current_user)):
    db   = get_db()
    data = await notification_service.mark_all_read(user, db)
    return ok(data)


@router.patch(
    "/{notif_id}/read",
    summary="Mark a single notification as read",
    description="Sets `isRead = true` on a specific notification. Only the owner can mark it.",
    responses={
        200: {"description": "Updated notification object"},
        404: {"description": "Notification not found"},
    },
)
async def mark_read(
    notif_id: str,
    user:     dict = Depends(get_current_user),
):
    db   = get_db()
    data = await notification_service.mark_read(notif_id, user, db)
    return ok(data)
