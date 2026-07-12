from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class AssignmentBase(BaseModel):
    deadline: datetime
    problem_text: str
    type: str


class AssignmentCreate(AssignmentBase):
    user_id: int


class AssignmentUpdate(BaseModel):
    deadline: Optional[datetime] = None
    problem_text: Optional[str] = None
    type: Optional[str] = None


class AssignmentResponse(AssignmentBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssignmentWithRelations(AssignmentResponse):
    rubric: Optional['RubricResponse'] = None
    classes: List['ClassResponse'] = []


from src.api.schemas.rubric import RubricResponse
from src.api.schemas.classroom import ClassResponse

AssignmentWithRelations.model_rebuild()

