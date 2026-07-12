from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


class UserBase(BaseModel):
    role: str
    email: EmailStr
    name: str


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    role: Optional[str] = None
    name: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserWithRelations(UserResponse):
    classes: List['ClassResponse'] = []
    assignments: List['AssignmentResponse'] = []
    feedbacks: List['TeacherFeedbackResponse'] = []


from src.api.schemas.classroom import ClassResponse
from src.api.schemas.assignment import AssignmentResponse
from src.api.schemas.result import TeacherFeedbackResponse

UserWithRelations.model_rebuild()

