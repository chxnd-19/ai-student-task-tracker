"""
Services package — re-export all service modules for clean imports.
"""
from app.services import (
    auth_service,
    task_service,
    submission_service,
    class_service,
    notification_service,
    profile_service,
    activity_service,
)

__all__ = [
    "auth_service",
    "task_service",
    "submission_service",
    "class_service",
    "notification_service",
    "profile_service",
    "activity_service",
]
