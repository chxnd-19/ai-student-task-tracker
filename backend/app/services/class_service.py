"""
Class business logic — create, list, join, delete.
"""
import secrets
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.class_ import ClassCreate
from app.utils.object_id import serialize_doc, is_valid_object_id


def _oid(val: str) -> ObjectId:
    if not is_valid_object_id(str(val)):
        raise HTTPException(400, f"Invalid id: {val}")
    return ObjectId(str(val))


def _generate_join_code() -> str:
    """6-character uppercase alphanumeric join code."""
    return secrets.token_hex(3).upper()


async def create_class(payload: ClassCreate, user: dict, db: AsyncIOMotorDatabase) -> dict:
    name    = payload.name.strip()
    subject = payload.subject.strip()
    if not name:
        raise HTTPException(400, "Class name is required.")
    if not subject:
        raise HTTPException(400, "Subject is required.")

    # Ensure unique join code
    for _ in range(10):
        code = _generate_join_code()
        if not await db.classes.find_one({"joinCode": code}):
            break

    now = datetime.now(timezone.utc)
    doc = {
        "name":        name,
        "subject":     subject,
        "description": payload.description.strip(),
        "teacherId":   _oid(user["id"]),
        "students":    [],
        "joinCode":    code,
        "createdAt":   now,
        "updatedAt":   now,
    }
    result = await db.classes.insert_one(doc)
    cls    = await db.classes.find_one({"_id": result.inserted_id})
    return serialize_doc(cls)


async def get_my_classes(user: dict, db: AsyncIOMotorDatabase) -> list:
    cursor  = db.classes.find({"teacherId": _oid(user["id"])})
    classes = [serialize_doc(c) async for c in cursor]

    # Populate students
    for cls in classes:
        populated = []
        for sid in cls.get("students", []):
            if is_valid_object_id(str(sid)):
                u = await db.users.find_one({"_id": ObjectId(str(sid))}, {"name": 1, "email": 1})
                if u:
                    populated.append({"_id": str(u["_id"]), "name": u["name"], "email": u["email"]})
        cls["students"] = populated
    return classes


async def get_joined_classes(user: dict, db: AsyncIOMotorDatabase) -> list:
    cursor  = db.classes.find({"students": _oid(user["id"])})
    classes = [serialize_doc(c) async for c in cursor]

    for cls in classes:
        tid = cls.get("teacherId")
        if tid and is_valid_object_id(str(tid)):
            t = await db.users.find_one({"_id": ObjectId(str(tid))}, {"name": 1, "email": 1})
            if t:
                cls["teacherId"] = {"id": str(t["_id"]), "name": t["name"], "email": t["email"]}
    return classes


async def join_class(join_code: str, user: dict, db: AsyncIOMotorDatabase) -> dict:
    code = join_code.strip().upper()
    if not code:
        raise HTTPException(400, "Join code is required.")

    cls = await db.classes.find_one({"joinCode": code})
    if not cls:
        raise HTTPException(404, "Invalid join code. Please check and try again.")

    student_oid = _oid(user["id"])
    if student_oid in cls.get("students", []):
        raise HTTPException(400, "You have already joined this class.")

    await db.classes.update_one(
        {"_id": cls["_id"]},
        {"$push": {"students": student_oid}, "$set": {"updatedAt": datetime.now(timezone.utc)}},
    )
    updated = await db.classes.find_one({"_id": cls["_id"]})
    return serialize_doc(updated)


async def delete_class(class_id: str, user: dict, db: AsyncIOMotorDatabase) -> None:
    result = await db.classes.delete_one({"_id": _oid(class_id), "teacherId": _oid(user["id"])})
    if result.deleted_count == 0:
        raise HTTPException(404, "Class not found.")
