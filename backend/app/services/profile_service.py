"""
Profile business logic — get and upsert user profiles.
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.profile import ProfileUpdate
from app.utils.object_id import serialize_doc, is_valid_object_id


def _oid(val: str) -> ObjectId:
    if not is_valid_object_id(str(val)):
        raise HTTPException(400, f"Invalid id: {val}")
    return ObjectId(str(val))


async def get_profile(user: dict, db: AsyncIOMotorDatabase) -> dict:
    profile = await db.profiles.find_one({"userId": _oid(user["id"])})
    return serialize_doc(profile) or {}


async def upsert_profile(payload: ProfileUpdate, user: dict, db: AsyncIOMotorDatabase) -> dict:
    role = user["role"]

    # Build allowed fields based on role
    allowed_common   = ["name", "college", "department"]
    allowed_student  = ["usn", "semester", "year", "overallSGPA", "currentSGPA"]
    allowed_teacher  = ["teacherId", "qualification"]

    allowed = allowed_common + (allowed_student if role == "student" else allowed_teacher)

    update: dict = {}
    data = payload.model_dump(exclude_none=True)
    for field in allowed:
        if field in data:
            update[field] = data[field]

    if not update:
        # Nothing to update — return existing profile
        return await get_profile(user, db)

    now = datetime.now(timezone.utc)
    update["updatedAt"] = now

    result = await db.profiles.find_one_and_update(
        {"userId": _oid(user["id"])},
        {
            "$set":         update,
            "$setOnInsert": {"userId": _oid(user["id"]), "createdAt": now},
        },
        upsert=True,
        return_document=True,
    )
    return serialize_doc(result)
