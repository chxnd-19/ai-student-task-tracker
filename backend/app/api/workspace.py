"""
Workspace routes — /api/classes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.schemas.class_ import ClassCreate, JoinClassRequest
from app.services import class_service
from app.database.connection import get_db
from app.utils.dependencies import require_teacher, require_student, get_current_user
from app.utils.responses import ok, ok_list, ok_msg

# Prefix is /classes, main.py adds /api
router = APIRouter(prefix="/classes", tags=["Classes"])

@router.get("", summary="Get user's classes (unified)")
async def get_classes(user: dict = Depends(get_current_user)):
    try:
        db = get_db()
        if user.get("role") == "teacher":
            classes = await class_service.get_my_classes(user, db)
        else:
            classes = await class_service.get_joined_classes(user, db)
        return ok_list(classes)
    except Exception as e:
        print(f"FETCH CLASSES ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch classes")


@router.post("", summary="Create a class (teacher only)", status_code=201)
async def create_class(
    payload: ClassCreate,
    user:    dict = Depends(require_teacher),
):
    try:
        db  = get_db()
        cls = await class_service.create_class(payload, user, db)
        return ok(cls, status=201)
    except Exception as e:
        print(f"CREATE CLASS ERROR: {e}")
        raise HTTPException(status_code=500, detail="Class creation failed")

@router.get("/my", summary="Get teacher's owned classes")
async def get_my_classes(user: dict = Depends(require_teacher)):
    try:
        db = get_db()
        classes = await class_service.get_my_classes(user, db)
        return ok_list(classes)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch classes")

@router.get("/joined", summary="Get student's joined classes")
async def get_joined_classes(user: dict = Depends(require_student)):
    try:
        db = get_db()
        classes = await class_service.get_joined_classes(user, db)
        return ok_list(classes)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch joined classes")

@router.post("/join", summary="Join a class (student only)")
async def join_class(
    payload: JoinClassRequest,
    user:    dict = Depends(require_student),
):
    try:
        db  = get_db()
        cls = await class_service.join_class(payload.code, user, db)
        return ok(cls)
    except HTTPException as he:
        print(f"JOIN CLASS HTTP ERROR: {he.detail}")
        raise
    except Exception as e:
        print(f"JOIN CLASS GENERIC ERROR: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{class_id}", summary="Delete a class (teacher only)")
async def delete_class(
    class_id: str,
    user:     dict = Depends(require_teacher),
):
    try:
        db = get_db()
        await class_service.delete_class(class_id, user, db)
        return ok_msg("Class deleted.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete class")
