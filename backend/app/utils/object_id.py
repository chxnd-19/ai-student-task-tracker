"""
ObjectId + datetime helpers for converting MongoDB documents to
JSON-serialisable dicts.

serialize_doc handles:
  - ObjectId  → str
  - datetime  → ISO-8601 str
  - _id       → id  (frontend compatibility)
  - nested dicts and lists (recursive)
"""
from bson import ObjectId
from datetime import datetime
from typing import Any


def to_str(oid: Any) -> str:
    """Convert ObjectId → str. Pass-through for anything else."""
    return str(oid) if isinstance(oid, ObjectId) else oid


def to_object_id(oid: Any) -> ObjectId:
    """Convert string to ObjectId. Returns input if already an ObjectId."""
    if isinstance(oid, ObjectId):
        return oid
    try:
        return ObjectId(str(oid))
    except Exception:
        raise ValueError(f"Invalid ObjectId format: {oid}")


def _convert_value(value: Any) -> Any:
    """Convert a single value to a JSON-safe type."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        # Always emit UTC ISO-8601 with 'Z' suffix so the frontend
        # can parse it with new Date(str) without timezone ambiguity.
        if value.tzinfo is None:
            return value.isoformat() + "Z"
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, dict):
        return serialize_doc(value)
    if isinstance(value, list):
        return [_convert_value(item) for item in value]
    return value


def serialize_doc(doc: dict | None) -> dict | None:
    """
    Recursively convert a MongoDB document to a JSON-serialisable dict.
    Provides '_id' as a string and renames '_id' → 'id' for frontend compatibility.
    """
    if doc is None:
        return None

    result: dict = {}
    for key, value in doc.items():
        if key == "_id":
            val_str = str(value)
            result["id"] = val_str
            result["_id"] = val_str
        else:
            result[key] = _convert_value(value)

    return result


def is_valid_object_id(oid: str) -> bool:
    """Return True if the string is a valid 24-hex ObjectId."""
    try:
        ObjectId(oid)
        return True
    except Exception:
        return False
