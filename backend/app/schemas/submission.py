"""
Submission request / response schemas.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SubmissionCreate(BaseModel):
    taskId: str
    textSubmission: Optional[str] = None


class VersionEntry(BaseModel):
    textSubmission: Optional[str] = None
    fileUrl: Optional[str] = None
    submittedAt: datetime


class AIFeedback(BaseModel):
    summary: str
    suggestions: list[str]
    score: int
    status: str  # pending, completed, failed


class SubmissionOut(BaseModel):
    id: str
    taskId: str | dict
    studentId: str | dict
    textSubmission: Optional[str] = None
    fileUrl: Optional[str] = None
    status: str
    submittedAt: datetime
    aiFeedback: Optional[AIFeedback] = None
    versions: list[VersionEntry] = []
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


# ── Analytics ─────────────────────────────────────────────────────────────────

class TaskAnalyticsStat(BaseModel):
    taskId: str
    title: str
    subject: str
    dueDate: datetime
    totalStudents: int
    submitted: int
    onTime: int
    late: int
    missed: int
    completionRate: int


class ClassAnalyticsSummary(BaseModel):
    totalTasks: int
    totalStudents: int
    avgCompletion: int
    totalLate: int
    totalSubmissions: int


class ClassAnalyticsOut(BaseModel):
    tasks: list[TaskAnalyticsStat]
    summary: ClassAnalyticsSummary


class StudentAnalyticsOut(BaseModel):
    total: int
    onTime: int
    late: int
    resubmits: int
    submissions: list


# ── Reminders ─────────────────────────────────────────────────────────────────

class ReminderOut(BaseModel):
    taskId: str
    title: str
    subject: str
    dueDate: datetime
    classId: Optional[str] = None
    urgency: str
    hoursLeft: Optional[int] = None
