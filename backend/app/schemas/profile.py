"""
Profile request / response schemas.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None

    # Student-only
    usn: Optional[str] = None
    semester: Optional[int] = None
    year: Optional[int] = None
    overallSGPA: Optional[float] = None
    currentSGPA: Optional[float] = None

    # Teacher-only
    teacherId: Optional[str] = None
    qualification: Optional[str] = None

    @field_validator("overallSGPA", "currentSGPA", mode="before")
    @classmethod
    def sgpa_range(cls, v):
        if v is not None:
            v = float(v)
            if not (0 <= v <= 10):
                raise ValueError("SGPA must be between 0 and 10.")
        return v

    @field_validator("semester", mode="before")
    @classmethod
    def semester_range(cls, v):
        if v is not None:
            v = int(v)
            if not (1 <= v <= 8):
                raise ValueError("Semester must be between 1 and 8.")
        return v

    @field_validator("year", mode="before")
    @classmethod
    def year_range(cls, v):
        if v is not None:
            v = int(v)
            if not (1 <= v <= 4):
                raise ValueError("Year must be between 1 and 4.")
        return v


class ProfileOut(BaseModel):
    id: Optional[str] = None
    userId: Optional[str] = None
    name: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    usn: Optional[str] = None
    semester: Optional[int] = None
    year: Optional[int] = None
    overallSGPA: Optional[float] = None
    currentSGPA: Optional[float] = None
    teacherId: Optional[str] = None
    qualification: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
