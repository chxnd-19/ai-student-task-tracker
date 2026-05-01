"""
FastAPI dependency functions.

- get_current_user  : verifies JWT, returns user dict
- require_teacher   : asserts role == 'teacher'
- require_student   : asserts role == 'student'
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, ExpiredSignatureError
from bson import ObjectId

from app.utils.jwt import decode_access_token
from app.utils.object_id import serialize_doc
from app.database.connection import get_db

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """
    Decode the Bearer JWT and return the authenticated user document.
    Raises 401 on any auth failure.
    """
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized. Invalid token.",
        )

    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized. Invalid token payload.",
        )

    db = get_db()
    user = await db.users.find_one(
        {"_id": ObjectId(user_id)},
        {"password": 0},  # never return the hash
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )

    return serialize_doc(user)


def require_teacher(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that enforces teacher role."""
    if user.get("role") != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. This action requires the teacher role.",
        )
    return user


def require_student(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that enforces student role."""
    if user.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. This action requires the student role.",
        )
    return user
