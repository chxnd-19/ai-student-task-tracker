"""
Auth request / response schemas.
"""
from typing import Literal
from pydantic import BaseModel, EmailStr, field_validator


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["teacher", "student"] = "student"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required.")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal["teacher", "student"] | None = None


class AuthUserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    token: str

    class Config:
        populate_by_name = True
