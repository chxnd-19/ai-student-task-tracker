"""
Auth routes — /api/auth/signup  /api/auth/login

REGRESSION PROTECTION:
----------------------
1. Environment Limits: Uses settings.is_production to toggle between strict (5/min)
   and relaxed (100/min) limits.
2. Shared Limiter: Imports auth_limiter from app.utils.rate_limit. 
   MUST be the same instance attached to app.state in main.py.
3. IP Context: Passes get_real_ip(request) to services to ensure logs 
   and audit trails reflect the actual client, not the proxy.
"""
from fastapi import APIRouter, Request, HTTPException
from app.schemas.auth import SignupRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.services import auth_service
from app.database.connection import get_db
from app.utils.responses import ok
from app.config.settings import get_settings

settings = get_settings()
router   = APIRouter(tags=["Auth"])

@router.get("/test")
async def test_auth_router():
    """Test route to verify auth router is working"""
    return {"message": "Auth router is working!", "success": True}

# ── Shared limiter — MUST be the same instance as app.state.limiter ───────────
# We create it here with the same key_func; main.py assigns this to app.state.
# Both modules import from the same process so the object identity is preserved
# as long as main.py does:  app.state.limiter = limiter  (which it does).
#
# The @limiter.limit decorator looks up app.state.limiter at call time, so
# the instance used here must match what main.py registers.  We achieve this
# by importing the module-level `limiter` from main after the app is built,
# but that creates a circular import.  The clean solution is to define the
# limiter once in a shared module and import it in both places.
#
# SOLUTION: define the app-level limiter in utils/limiter.py and import it
# in both main.py and auth.py.  This file is the only change needed.

from app.utils.rate_limit import auth_limiter, get_real_ip   # shared instance


# ── Environment-aware rate limit ─────────────────────────────────────────────
limit_value = (
    settings.AUTH_RATE_LIMIT
    if settings.is_production
    else settings.DEV_AUTH_RATE_LIMIT
)

@router.post(
    "/signup",
    summary="Register a new user",
    status_code=201,
    description=(
        f"Rate-limited to **{limit_value}** per IP. "
        "Returns the user object and a JWT token."
    ),
)
async def signup(payload: SignupRequest, request: Request):
    """
    Register a new teacher or student account.
    Returns the user object + JWT token.
    """
    db   = get_db()
    result = await auth_service.signup(payload, db, ip=get_real_ip(request))
    return result


@router.post(
    "/login",
    summary="Login and receive JWT",
    description=(
        f"Rate-limited to **{limit_value}** per IP. "
        "Returns the user object and a JWT token."
    ),
)
async def login(payload: LoginRequest, request: Request):
    """
    Authenticate with email + password (+ optional role check).
    Returns the user object + JWT token.
    """
    try:
        db   = get_db()
        result = await auth_service.login(payload, db, ip=get_real_ip(request))
        return result

    except HTTPException:
        # Re-raise known HTTP errors
        raise

    except Exception as e:
        # Log the real error on the server
        print(f"LOGIN ERROR: {str(e)}")
        # Return a generic 500 to the client
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    """Request a password reset token."""
    print("🚀 FORGOT PASSWORD ROUTE HIT!")
    print(f"📧 Email received: {payload.email}")
    try:
        db = get_db()
        result = await auth_service.forgot_password(payload, db, ip=get_real_ip(request))
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"FORGOT PASSWORD ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process forgot password request"
        )


@router.post(
    "/reset-password/{token}",
    summary="Reset password with token",
    description=(
        f"Rate-limited to **{limit_value}** per IP. "
        "Resets user password using a valid reset token."
    ),
)
@auth_limiter.limit(limit_value)
async def reset_password(token: str, payload: ResetPasswordRequest, request: Request):
    """
    Reset password using a valid reset token.
    Token must be valid and not expired.
    """
    try:
        db = get_db()
        result = await auth_service.reset_password(token, payload, db, ip=get_real_ip(request))
        return result

    except HTTPException:
        # Re-raise known HTTP errors
        raise

    except Exception as e:
        # Log the real error on the server
        print(f"RESET PASSWORD ERROR: {str(e)}")
        # Return a generic 500 to the client
        raise HTTPException(
            status_code=500,
            detail="Failed to reset password"
        )
