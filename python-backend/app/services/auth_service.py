"""
Auth business logic — signup and login.
"""
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.auth import SignupRequest, LoginRequest
from app.utils.password import hash_password, verify_password
from app.utils.jwt import create_access_token
from app.utils.object_id import serialize_doc
from app.config.settings import get_settings

settings = get_settings()


async def signup(payload: SignupRequest, db: AsyncIOMotorDatabase) -> dict:
    name  = payload.name.strip()[:settings.MAX_NAME_LEN]
    email = payload.email.lower().strip()
    role  = payload.role

    # Duplicate email check
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    hashed = hash_password(payload.password)
    result = await db.users.insert_one(
        {"name": name, "email": email, "password": hashed, "role": role}
    )

    user = await db.users.find_one({"_id": result.inserted_id}, {"password": 0})
    user = serialize_doc(user)

    return {
        **user,
        "token": create_access_token(user["id"], user["role"]),
    }


async def login(payload: LoginRequest, db: AsyncIOMotorDatabase) -> dict:
    email = payload.email.lower().strip()

    user = await db.users.find_one({"email": email})

    # Generic error — avoids leaking whether the email exists
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Role mismatch — user is trying the wrong login panel
    if payload.role and user["role"] != payload.role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"You are not registered as a {payload.role}. Please use the correct login panel.",
        )

    user_out = serialize_doc({k: v for k, v in user.items() if k != "password"})
    return {
        **user_out,
        "token": create_access_token(user_out["id"], user_out["role"]),
    }
