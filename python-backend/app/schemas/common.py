"""
Shared response wrappers and base types used across all schemas.
"""
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, field_validator
from bson import ObjectId

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T


class MessageResponse(BaseModel):
    success: bool = True
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    message: str


class PaginationMeta(BaseModel):
    page: int
    totalPages: int
    total: int
    limit: int


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    meta: PaginationMeta


def str_object_id(v: Any) -> str:
    """Convert ObjectId → str for JSON serialisation."""
    if isinstance(v, ObjectId):
        return str(v)
    return v
