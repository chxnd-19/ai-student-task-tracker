from fastapi import APIRouter, Request, HTTPException
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.auth import SignupRequest, LoginRequest
from app.services import auth_service
from app.database.connection import get_db
from app.utils.rate_limit import get_real_ip

router = APIRouter(tags=["Auth"])


@router.get("/test")
def test():
    return {"msg": "auth working"}


@router.post("/signup", status_code=201)
async def signup(payload: SignupRequest, request: Request):
    db = get_db()
    return await auth_service.signup(payload, db, ip=get_real_ip(request))


@router.post("/login")
async def login(payload: LoginRequest, request: Request):
    try:
        db = get_db()
        return await auth_service.login(payload, db, ip=get_real_ip(request))
    except HTTPException:
        raise
    except Exception as e:
        print(f"LOGIN ERROR: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    print("🚀 FORGOT PASSWORD ROUTE HIT!")
    print(f"📧 Email: {payload.email}")
    try:
        db = get_db()
        return await auth_service.forgot_password(payload, db, ip=get_real_ip(request))
    except HTTPException:
        raise
    except Exception as e:
        print(f"FORGOT PASSWORD ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to process request")


@router.post("/reset-password/{token}")
async def reset_password(token: str, payload: ResetPasswordRequest, request: Request):
    try:
        db = get_db()
        return await auth_service.reset_password(token, payload, db, ip=get_real_ip(request))
    except HTTPException:
        raise
    except Exception as e:
        print(f"RESET PASSWORD ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password")
