from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class StudentBase(BaseModel):
    name: str
    student_code: str


class StudentCreate(StudentBase):
    class_id: int


class StudentUpdate(BaseModel):
    name: Optional[str] = None


class StudentResponse(StudentBase):
    id: int
    class_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClassBase(BaseModel):
    name: str
    year: int


class ClassCreate(ClassBase):
    user_id: int


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    year: Optional[int] = None


class ClassResponse(ClassBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClassWithRelations(ClassResponse):
    students: List[StudentResponse] = []
    assignments: List['AssignmentResponse'] = []


from src.api.schemas.assignment import AssignmentResponse

ClassWithRelations.model_rebuild()

