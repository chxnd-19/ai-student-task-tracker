"""
Auth business logic — signup and login.

Error handling contract:
  - HTTPException is raised for expected failures (bad credentials, duplicate email).
  - Unexpected exceptions are caught, logged with full context, and re-raised
    as a generic HTTP 500 so the caller never sees a raw traceback.
"""
import logging
import secrets
import time
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.auth import SignupRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
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
    """
    Register a new user with strict flow control.
    1. Validation
    2. Password Hashing
    3. Wrapped Database Insertion
    4. JWT Generation
    5. Clean Success Response
    """
    # 1. Validation (Outside try/except)
    name  = payload.name.strip()[:settings.MAX_NAME_LEN]
    email = payload.email.lower().strip()
    role  = payload.role

    # Check for existing email
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists",
        )

    # 2. Preparation (Hashing)
    hashed = hash_password(payload.password)
    user_to_insert = {
        "name": name,
        "email": email,
        "password": hashed,
        "role": role
    }

    # 3. Database Insertion (Wrapped ONLY risky part)
    try:
        result = await db.users.insert_one(user_to_insert)
        user_id = str(result.inserted_id)
        logger.info(f"[auth] User created: {user_id}")
    except Exception as exc:
        logger.exception(f"[auth] DB Insert failed for {email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during registration"
        )

    # 4. JWT and Data Preparation
    user_data = {
        "id": user_id,
        "name": name,
        "email": email,
        "role": role
    }
    jwt_token = create_access_token(user_id, role)

    # 5. Non-critical background tasks (wrapped separately)
    try:
        await log_activity(
            db, user_id, "auth.signup",
            {"email": email, "role": role}, ip
        )
    except Exception:
        pass  # Activity logging is non-critical

    return {
        "success": True,
        "user": user_data,
        "token": jwt_token
    }


async def login(
    payload: LoginRequest,
    db: AsyncIOMotorDatabase,
    ip: str | None = None,
) -> dict:
    """
    Authenticate a user with proper role validation.

    Security notes:
      - Uses specific error messages for better UX
      - Validates role mismatch with clear messaging
      - verify_password never raises (see password.py), so bcrypt errors
        are treated as wrong-password, not server errors.
      - Any unexpected exception is caught and returned as a clean 500.
    """
    try:
        email = payload.email.lower().strip()

        # Find user by exact normalised email
        user = await db.users.find_one({"email": email})

        # Fallback — case-insensitive regex search catches emails stored with wrong casing
        if not user:
            user = await db.users.find_one(
                {"email": {"$regex": f"^{email}$", "$options": "i"}}
            )
            if user:
                # Normalise the stored email so future exact lookups work
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"email": email}},
                )
                user["email"] = email

        # Email not found after both attempts
        if not user:
            logger.warning(f"[auth] Login failed — no account for email={email} ip={ip}")

            # ── Optional: check activity_logs for a recent email-change hint ──
            # If the user changed their email, the old address may be in the audit log.
            hint_email: str | None = None
            try:
                log_entry = await db.activity_logs.find_one(
                    {
                        "action": "auth.settings_email_change",
                        "metadata.old_email": email,
                    },
                    sort=[("timestamp", -1)],
                )
                if log_entry:
                    new_email: str = log_entry.get("metadata", {}).get("new_email", "")
                    if new_email and new_email != email:
                        # Mask: keep first 2 chars + domain, hide the rest
                        local, _, domain = new_email.partition("@")
                        masked = local[:2] + "***@" + domain if len(local) > 2 else "***@" + domain
                        hint_email = masked
            except Exception:
                pass  # audit log is optional — never block login on this

            try:
                await log_activity(db, None, "auth.login_failed", {"email": email, "reason": "user_not_found"}, ip)
            except Exception:
                pass

            detail_msg = (
                "No account found with this email. "
                "Check if you mistyped your email or sign up again."
            )
            headers: dict = {}
            if hint_email:
                headers["X-Email-Hint"] = hint_email

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail_msg,
                headers=headers or None,
            )

        # Role mismatch — checked BEFORE password for a clear error message
        if payload.role and user["role"] != payload.role:
            actual_display   = "Instructor" if user["role"] == "teacher" else "Student"
            selected_display = "Instructor" if payload.role == "teacher" else "Student"
            logger.warning(
                f"[auth] Role mismatch for {email}: "
                f"selected={payload.role} actual={user['role']} ip={ip}"
            )
            try:
                await log_activity(db, user.get("_id"), "auth.login_failed", {
                    "email": email,
                    "reason": "role_mismatch",
                    "selected_role": payload.role,
                    "actual_role": user["role"],
                }, ip)
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Account exists as {actual_display}, not {selected_display}."
                ),
                headers={"X-Actual-Role": user["role"]},
            )

        # Password check — only reached when email + role are both valid
        if not verify_password(payload.password, user["password"]):
            logger.warning(f"[auth] Invalid password for email={email} ip={ip}")
            try:
                await log_activity(db, None, "auth.login_failed", {"email": email, "reason": "invalid_password"}, ip)
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

        logger.info(f"[auth] Login successful: {email} role={user['role']!r} ip={ip}")
        user_out = serialize_doc({k: v for k, v in user.items() if k != "password"})
        try:
            await log_activity(
                db, user_out["id"], "auth.login",
                {"email": email, "role": user_out["role"]}, ip,
            )
        except Exception:
            pass  # Activity logging is non-critical

        return {
            "success": True,
            "user": user_out,
            "token": create_access_token(user_out["id"], user_out["role"]),
        }

    except HTTPException:
        # Re-raise expected HTTP errors unchanged
        raise
    except Exception as exc:
        logger.exception(f"[auth] Unexpected error during login for email={payload.email} ip={ip}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again.",
        )


async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncIOMotorDatabase,
    ip: str | None = None,
) -> dict:
    """
    Generate a password reset token.
    - If user exists  → returns reset_url in response (dev mode)
    - If user missing → returns generic success (no enumeration)
    Always returns 200 — never reveals whether the email is registered.
    """
    try:
        email = payload.email.lower().strip()
        user  = await db.users.find_one({"email": email})
        
        if user:
            # Generate secure reset token
            reset_token = secrets.token_urlsafe(32)
            expires_at  = int(time.time()) + (15 * 60)  # 15 minutes

            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "resetPasswordToken":   reset_token,
                    "resetPasswordExpires": expires_at,
                }},
            )

            reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token}"
            logger.info(f"[auth] Password reset link generated for {email}")
            if not settings.is_production:
                # Dev-only: print reset link to console since no email service is configured
                print("=" * 60)
                print(f"[DEV] PASSWORD RESET LINK — {email}")
                print(f"[DEV] {reset_url}")
                print("=" * 60)

            try:
                await log_activity(
                    db, str(user["_id"]), "auth.forgot_password",
                    {"email": email}, ip
                )
            except Exception:
                pass

            return {
                "success":   True,
                "message":   "Reset link generated",
                "reset_url": reset_url,
            }
        else:
            logger.warning(f"[auth] Forgot password attempt for non-existent email: {email}")
            try:
                await log_activity(db, None, "auth.forgot_password_failed", {"email": email}, ip)
            except Exception:
                pass

            # No reset_url — don't reveal whether the email exists
            return {
                "success": True,
                "message": "If this email exists, a reset link has been generated.",
            }
        
    except Exception as exc:
        logger.exception(f"[auth] Unexpected error during forgot password for {payload.email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request. Please try again.",
        )


async def reset_password(
    token: str,
    payload: ResetPasswordRequest,
    db: AsyncIOMotorDatabase,
    ip: str | None = None,
) -> dict:
    """
    Reset user password using valid token.
    """
    try:
        current_time = int(time.time())
        
        # Find user with valid reset token
        user = await db.users.find_one({
            "resetPasswordToken": token,
            "resetPasswordExpires": {"$gt": current_time}
        })
        
        if not user:
            logger.warning(f"[auth] Invalid or expired reset token: {token[:8]}...")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )
        
        # Hash new password
        hashed_password = hash_password(payload.password)
        
        # Update user password and clear reset token
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"password": hashed_password},
                "$unset": {
                    "resetPasswordToken": "",
                    "resetPasswordExpires": ""
                }
            }
        )
        
        logger.info(f"[auth] Password reset successful for user: {user['email']}")

        try:
            await log_activity(
                db, str(user["_id"]), "auth.password_reset",
                {"email": user["email"]}, ip
            )
        except Exception:
            pass
        
        return {
            "success": True,
            "message": "Password reset successful. You can now login with your new password."
        }
        
    except HTTPException:
        # Re-raise expected HTTP errors
        raise
    except Exception as exc:
        logger.exception(f"[auth] Unexpected error during password reset: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password. Please try again.",
        )
