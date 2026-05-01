"""
Auth business logic — signup and login.
"""
import logging
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.auth import SignupRequest, LoginRequest
from app.utils.password import hash_password, verify_password
from app.utils.jwt import create_access_token
from app.utils.object_id import serialize_doc
from app.config.settings import get_settings
from app.services.activity_service import log_activity

settings = get_settings()
logger   = logging.getLogger(__name__)


async def signup(
    payload: SignupRequest,
    db: AsyncIOMotorDatabase,
    ip: str | None = None,
) -> dict:
    name  = payload.name.strip()[:settings.MAX_NAME_LEN]
    email = payload.email.lower().strip()
    role  = payload.role

    # Duplicate email check
    existing = await db.users.find_one({"email": email})
    if existing:
        logger.warning(f"[auth] Signup failed — email already registered: {email}")
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

    logger.info(f"[auth] New user registered: {email} role={role}")
    await log_activity(db, user["id"], "auth.signup", {"email": email, "role": role}, ip)

    return {
        **user,
        "token": create_access_token(user["id"], user["role"]),
    }


async def login(
    payload: LoginRequest,
    db: AsyncIOMotorDatabase,
    ip: str | None = None,
) -> dict:
    email = payload.email.lower().strip()

    user = await db.users.find_one({"email": email})

    # Generic error — avoids leaking whether the email exists
    if not user or not verify_password(payload.password, user["password"]):
        logger.warning(f"[auth] Failed login attempt for email={email} ip={ip}")
        await log_activity(db, None, "auth.login_failed", {"email": email}, ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Role mismatch — user is trying the wrong login panel
    if payload.role and user["role"] != payload.role:
        logger.warning(
            f"[auth] Role mismatch for {email}: expected={payload.role} actual={user['role']}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"You are not registered as a {payload.role}. Please use the correct login panel.",
        )

    user_out = serialize_doc({k: v for k, v in user.items() if k != "password"})

    logger.info(f"[auth] Login successful: {email} role={user_out['role']} ip={ip}")
    await log_activity(
        db, user_out["id"], "auth.login",
        {"email": email, "role": user_out["role"]}, ip,
    )

    return {
        **user_out,
        "token": create_access_token(user_out["id"], user_out["role"]),
    }
