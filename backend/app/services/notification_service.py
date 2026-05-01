"""
Notification business logic.
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.object_id import serialize_doc, is_valid_object_id


def _oid(val: str) -> ObjectId:
    if not is_valid_object_id(str(val)):
        raise HTTPException(400, f"Invalid id: {val}")
    return ObjectId(str(val))


async def get_notifications(user: dict, db: AsyncIOMotorDatabase) -> dict:
    cursor = db.notifications.find(
        {"userId": _oid(user["id"])}
    ).sort("createdAt", -1).limit(20)

    notifications = [serialize_doc(n) async for n in cursor]
    unread_count  = sum(1 for n in notifications if not n.get("isRead"))
    return {"notifications": notifications, "unreadCount": unread_count}


async def mark_read(notif_id: str, user: dict, db: AsyncIOMotorDatabase) -> dict:
    result = await db.notifications.find_one_and_update(
        {"_id": _oid(notif_id), "userId": _oid(user["id"])},
        {"$set": {"isRead": True}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Notification not found.")
    return serialize_doc(result)


async def mark_all_read(user: dict, db: AsyncIOMotorDatabase) -> dict:
    await db.notifications.update_many(
        {"userId": _oid(user["id"]), "isRead": False},
        {"$set": {"isRead": True}},
    )
    return {"message": "All notifications marked as read."}


async def create_notification(
    user_id: str | ObjectId,
    message: str,
    type_: str,
    db: AsyncIOMotorDatabase,
) -> None:
    """Internal helper — fire-and-forget notification creation."""
    try:
        uid = ObjectId(str(user_id)) if not isinstance(user_id, ObjectId) else user_id
        await db.notifications.insert_one({
            "userId":    uid,
            "message":   message,
            "type":      type_,
            "isRead":    False,
            "createdAt": datetime.now(timezone.utc),
        })
    except Exception:
        pass  # Non-critical — never raise
