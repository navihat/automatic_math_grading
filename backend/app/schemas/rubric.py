from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class RubricBase(BaseModel):
    title: str
    content: Dict[str, Any]


class RubricCreate(RubricBase):
    assignment_id: int


class RubricUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[Dict[str, Any]] = None


class RubricResponse(RubricBase):
    id: int
    assignment_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None  # None khi mới tạo, có giá trị sau lần update đầu

    class Config:
        from_attributes = True


class RubricWithRelations(RubricResponse):
    submissions: List['SubmissionResponse'] = []
