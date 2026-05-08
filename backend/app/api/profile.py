"""
Profile routes — /api/profile
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.profile import StudentProfileUpdate, InstructorProfileUpdate
from app.services import profile_service
from app.database.connection import get_db
from app.utils.dependencies import get_current_user, require_teacher
from app.utils.responses import ok

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", summary="Get current user's profile")
async def get_profile(user: dict = Depends(get_current_user)):
    db   = get_db()
    data = await profile_service.get_profile(user["id"], db)
    return ok(data)


@router.get("/{user_id}", summary="Get specific user's profile (Instructor only)")
async def get_user_profile(
    user_id: str,
    user:    dict = Depends(require_teacher),
):
    db   = get_db()
    data = await profile_service.get_profile(user_id, db)
    return ok(data)


@router.put("", summary="Update user profile")
async def update_profile(
    request: Request,
    user:    dict = Depends(get_current_user),
):
    db   = get_db()
    role = user.get("role")
    
    # Get raw payload
    payload = await request.json()
    
    # Validate with the correct schema but keep None values so the service
    # can $unset cleared fields in MongoDB (exclude_none would silently drop them)
    try:
        if role == "teacher" or role == "instructor":
            validated_data = InstructorProfileUpdate(**payload).model_dump(exclude_unset=True)
        else:
            validated_data = StudentProfileUpdate(**payload).model_dump(exclude_unset=True)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
        
    updated_profile = await profile_service.update_profile(user["id"], validated_data, db)
    return ok(updated_profile)
