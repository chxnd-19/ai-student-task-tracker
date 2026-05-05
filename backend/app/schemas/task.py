"""
Task request / response schemas.
"""
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, field_validator


class TaskCreate(BaseModel):
    title: str
    subject: str
    dueDate: str          # ISO date string from frontend
    description: str = ""
    submissionType: Literal["text", "file"] = "text"
    priority: Literal["low", "medium", "high"] = "medium"
    classId: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title is required.")
        return v

    @field_validator("subject")
    @classmethod
    def subject_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Subject is required.")
        return v

    @field_validator("dueDate")
    @classmethod
    def due_date_valid(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("Deadline must be a valid date.")
        return v


class TaskUpdate(TaskCreate):
    pass


class TaskOut(BaseModel):
    id: str
    title: str
    subject: str
    description: str = ""
    status: str
    dueDate: datetime
    submissionType: str
    classId: Optional[str] = None
    createdBy: dict | str
    assignedTo: list = []
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


class TaskSummary(BaseModel):
    pending: int = 0
    submitted: int = 0
    overdue: int = 0
    late: int = 0
