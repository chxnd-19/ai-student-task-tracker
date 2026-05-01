"""
Notification schemas.
"""
from datetime import datetime
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    userId: str
    message: str
    type: str
    isRead: bool
    createdAt: datetime

    class Config:
        populate_by_name = True


class NotificationsListOut(BaseModel):
    notifications: list[NotificationOut]
    unreadCount: int
