"""
Class routes — /api/classes
"""
from fastapi import APIRouter, Depends

from app.schemas.class_ import ClassCreate, JoinClassRequest
from app.services import class_service
from app.database.connection import get_db
from app.utils.dependencies import require_teacher, require_student
from app.utils.responses import ok, ok_msg

router = APIRouter(prefix="/api/classes", tags=["Classes"])


# ── Teacher: create a class ───────────────────────────────────────────────────
@router.post("", summary="Create a class (teacher only)", status_code=201)
async def create_class(
    payload: ClassCreate,
    user:    dict = Depends(require_teacher),
):
    db  = get_db()
    cls = await class_service.create_class(payload, user, db)
    return ok(cls, status=201)


# ── Teacher: list own classes ─────────────────────────────────────────────────
@router.get("/my", summary="Get teacher's classes")
async def get_my_classes(user: dict = Depends(require_teacher)):
    db      = get_db()
    classes = await class_service.get_my_classes(user, db)
    return ok(classes)


# ── Student: list joined classes ──────────────────────────────────────────────
@router.get("/joined", summary="Get student's joined classes")
async def get_joined_classes(user: dict = Depends(require_student)):
    db      = get_db()
    classes = await class_service.get_joined_classes(user, db)
    return ok(classes)


# ── Student: join a class via code ────────────────────────────────────────────
@router.post("/join", summary="Join a class (student only)")
async def join_class(
    payload: JoinClassRequest,
    user:    dict = Depends(require_student),
):
    db  = get_db()
    cls = await class_service.join_class(payload.joinCode, user, db)
    return ok(cls)


# ── Teacher: delete a class ───────────────────────────────────────────────────
@router.delete("/{class_id}", summary="Delete a class (teacher only)")
async def delete_class(
    class_id: str,
    user:     dict = Depends(require_teacher),
):
    db = get_db()
    await class_service.delete_class(class_id, user, db)
    return ok_msg("Class deleted.")
