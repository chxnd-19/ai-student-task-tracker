"""
Profile routes — /api/profile
"""
from fastapi import APIRouter, Depends

from app.schemas.profile import ProfileUpdate
from app.services import profile_service
from app.database.connection import get_db
from app.utils.dependencies import get_current_user
from app.utils.responses import ok

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", summary="Get current user's profile")
async def get_profile(user: dict = Depends(get_current_user)):
    db      = get_db()
    profile = await profile_service.get_profile(user, db)
    return ok(profile)


@router.put("", summary="Create or update profile")
async def upsert_profile(
    payload: ProfileUpdate,
    user:    dict = Depends(get_current_user),
):
    db      = get_db()
    profile = await profile_service.upsert_profile(payload, user, db)
    return ok(profile)
