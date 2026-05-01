"""
Class request / response schemas.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ClassCreate(BaseModel):
    name: str
    subject: str
    description: str = ""


class JoinClassRequest(BaseModel):
    joinCode: str


class ClassOut(BaseModel):
    id: str
    name: str
    subject: str
    description: str = ""
    teacherId: str | dict
    students: list = []
    joinCode: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True
