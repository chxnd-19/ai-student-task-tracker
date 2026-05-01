"""
ObjectId helpers for converting MongoDB documents to JSON-serialisable dicts.
"""
from bson import ObjectId
from typing import Any


def to_str(oid: Any) -> str:
    """Convert ObjectId → str. Pass-through for anything else."""
    return str(oid) if isinstance(oid, ObjectId) else oid


def serialize_doc(doc: dict | None) -> dict | None:
    """
    Recursively convert all ObjectId values in a MongoDB document to strings
    and rename '_id' → 'id' for frontend compatibility.
    """
    if doc is None:
        return None

    result = {}
    for key, value in doc.items():
        # Rename _id → id
        out_key = "id" if key == "_id" else key

        if isinstance(value, ObjectId):
            result[out_key] = str(value)
        elif isinstance(value, dict):
            result[out_key] = serialize_doc(value)
        elif isinstance(value, list):
            result[out_key] = [
                serialize_doc(item) if isinstance(item, dict)
                else str(item) if isinstance(item, ObjectId)
                else item
                for item in value
            ]
        else:
            result[out_key] = value

    return result


def is_valid_object_id(oid: str) -> bool:
    """Return True if the string is a valid 24-hex ObjectId."""
    try:
        ObjectId(oid)
        return True
    except Exception:
        return False
