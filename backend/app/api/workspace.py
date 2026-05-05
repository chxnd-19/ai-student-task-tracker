"""
Workspace (Class) routes — /api/classes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException

from app.schemas.class_ import ClassCreate, JoinClassRequest
from app.services import class_service
from app.database.connection import get_db
from app.utils.dependencies import require_teacher, require_student, get_current_user
from app.utils.responses import ok, ok_list, ok_msg

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/classes", tags=["Classes"])


@router.get(
    "",
    summary="Get user's classes",
    description=(
        "Returns classes for the authenticated user. "
        "**Teachers** receive classes they own (with student roster). "
        "**Students** receive classes they have joined (with teacher info)."
    ),
    responses={
        200: {"description": "List of class objects"},
        401: {"description": "Missing or invalid JWT"},
    },
)
async def get_classes(user: dict = Depends(get_current_user)):
    db = get_db()
    if user.get("role") == "teacher":
        classes = await class_service.get_my_classes(user, db)
    else:
        classes = await class_service.get_joined_classes(user, db)
    return ok_list(classes)


@router.post(
    "",
    summary="Create a class (teacher only)",
    description=(
        "Creates a new class with a randomly generated 6-character join code. "
        "The authenticated teacher becomes the owner."
    ),
    status_code=201,
    responses={
        201: {"description": "Created class object with join code"},
        403: {"description": "Student role cannot create classes"},
        422: {"description": "Validation error — name and subject are required"},
    },
)
async def create_class(
    payload: ClassCreate,
    user:    dict = Depends(require_teacher),
):
    db  = get_db()
    cls = await class_service.create_class(payload, user, db)
    return ok(cls, status=201)


@router.get(
    "/my",
    summary="Get teacher's owned classes",
    description="Returns only classes owned by the authenticated teacher, with full student roster.",
    responses={
        200: {"description": "List of owned class objects"},
        403: {"description": "Student role cannot access this endpoint"},
    },
)
async def get_my_classes(user: dict = Depends(require_teacher)):
    db      = get_db()
    classes = await class_service.get_my_classes(user, db)
    return ok_list(classes)


@router.get(
    "/joined",
    summary="Get student's joined classes",
    description="Returns classes the authenticated student has joined, with teacher info populated.",
    responses={
        200: {"description": "List of joined class objects"},
        403: {"description": "Teacher role cannot access this endpoint"},
    },
)
async def get_joined_classes(user: dict = Depends(require_student)):
    db      = get_db()
    classes = await class_service.get_joined_classes(user, db)
    return ok_list(classes)


@router.post(
    "/join",
    summary="Join a class by code (student only)",
    description=(
        "Adds the authenticated student to a class using a 6-character join code. "
        "Emits a real-time Socket.IO event to the class room."
    ),
    responses={
        200: {"description": "Updated class object"},
        400: {"description": "Already a member of this class"},
        403: {"description": "Teacher role cannot join classes"},
        404: {"description": "Invalid join code"},
    },
)
async def join_class(
    payload: JoinClassRequest,
    user:    dict = Depends(require_student),
):
    db  = get_db()
    cls = await class_service.join_class(payload.code, user, db)
    return ok(cls)


@router.delete(
    "/{class_id}",
    summary="Delete a class (teacher only)",
    description="Permanently deletes a class. Only the owning teacher can delete it.",
    responses={
        200: {"description": "Success message"},
        403: {"description": "Student role cannot delete classes"},
        404: {"description": "Class not found or not owned by this teacher"},
    },
)
async def delete_class(
    class_id: str,
    user:     dict = Depends(require_teacher),
):
    db = get_db()
    await class_service.delete_class(class_id, user, db)
    return ok_msg("Class deleted.")
