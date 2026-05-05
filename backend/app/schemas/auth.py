from typing import Literal
from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)
    role: Literal["teacher", "student"] = "student"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal["teacher", "student"] | None = None


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=6, max_length=72)


class AuthUserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    token: str

    class Config:
        populate_by_name = True
