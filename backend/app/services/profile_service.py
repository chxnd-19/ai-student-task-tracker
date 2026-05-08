"""
Profile business logic — get and update user profiles.
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.utils.object_id import is_valid_object_id, serialize_doc

def _oid(val: str) -> ObjectId:
    if not is_valid_object_id(str(val)):
        raise HTTPException(400, f"Invalid id: {val}")
    return ObjectId(str(val))

async def get_profile(user_id: str, db: AsyncIOMotorDatabase) -> dict:
    """
    Fetch user and return role + profile (default empty object if missing).
    Includes student stats if the user is a student.
    """
    u = await db.users.find_one({"_id": _oid(user_id)})
    if not u:
        raise HTTPException(404, "User not found")
    
    role = u.get("role", "student")
    profile = u.get("profile", {})
    
    # If the user is a student, include academic stats
    stats = None
    if role == "student":
        total     = await db.tasks.count_documents({"assignedTo": _oid(user_id)})
        submitted = await db.submissions.count_documents({"studentId": _oid(user_id)})
        late      = await db.submissions.count_documents({"studentId": _oid(user_id), "status": "late"})
        
        # Submissions that exist
        sub_task_ids = [s["taskId"] async for s in db.submissions.find({"studentId": _oid(user_id)}, {"taskId": 1})]
        
        # Tasks due in past and NOT submitted
        overdue   = await db.tasks.count_documents({
            "assignedTo": _oid(user_id),
            "dueDate": {"$lt": datetime.now(timezone.utc)},
            "_id": {"$nin": sub_task_ids}
        })
        stats = {
            "total": total,
            "submitted": submitted,
            "late": late,
            "overdue": overdue
        }

    return {
        "user": {
            "id": str(u["_id"]),
            "name": u.get("name"),
            "email": u.get("email"),
            "role": role
        },
        "profile": profile,
        "stats": stats
    }

async def update_profile(user_id: str, payload: dict, db: AsyncIOMotorDatabase) -> dict:
    """
    $set provided fields under `profile.*`.
    $unset fields explicitly set to None so cleared fields are removed from MongoDB.
    """
    set_data:   dict = {}
    unset_data: dict = {}

    for key, value in payload.items():
        if value is None:
            # Explicitly cleared — remove from MongoDB so it doesn't ghost back
            unset_data[f"profile.{key}"] = ""
        else:
            set_data[f"profile.{key}"] = value

    if not set_data and not unset_data:
        return await get_profile(user_id, db)

    update_op: dict = {}
    if set_data:
        update_op["$set"] = set_data
    if unset_data:
        update_op["$unset"] = unset_data

    result = await db.users.find_one_and_update(
        {"_id": _oid(user_id)},
        update_op,
        return_document=True,
    )

    if not result:
        raise HTTPException(404, "User not found")

    return {
        "role":    result.get("role"),
        "profile": result.get("profile", {}),
    }
