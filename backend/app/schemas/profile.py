"""
Profile request / response schemas.
"""
from typing import Optional
from pydantic import BaseModel, field_validator, EmailStr

class StudentProfileUpdate(BaseModel):
    college_name: Optional[str] = None
    usn: Optional[str] = None
    full_name: Optional[str] = None
    semester: Optional[int] = None
    year: Optional[int] = None
    department: Optional[str] = None
    overall_sgpa: Optional[float] = None

    @field_validator("overall_sgpa")
    @classmethod
    def sgpa_range(cls, v):
        if v is not None:
            if not (0 <= v <= 10):
                raise ValueError("SGPA must be between 0 and 10.")
        return v

    @field_validator("semester")
    @classmethod
    def semester_range(cls, v):
        if v is not None:
            if not (1 <= v <= 8):
                raise ValueError("Semester must be between 1 and 8.")
        return v

    @field_validator("year")
    @classmethod
    def year_range(cls, v):
        if v is not None:
            if not (1 <= v <= 4):
                raise ValueError("Year must be between 1 and 4.")
        return v

class InstructorProfileUpdate(BaseModel):
    college_name: Optional[str] = None
    full_name: Optional[str] = None
    qualification: Optional[str] = None
    department: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("contact_number")
    @classmethod
    def validate_contact(cls, v):
        if v is not None:
            # Basic validation: check if it contains digits and length is reasonable
            digits = "".join(filter(str.isdigit, v))
            if not (10 <= len(digits) <= 15):
                raise ValueError("Contact number must be between 10 and 15 digits.")
        return v
