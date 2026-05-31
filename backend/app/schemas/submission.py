from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class SubmissionBase(BaseModel):
    image_url: str
    ocr_text: Optional[str] = None


class SubmissionCreate(SubmissionBase):
    student_id: int
    rubric_id: int


class SubmissionUpdate(BaseModel):
    image_url: Optional[str] = None
    ocr_text: Optional[str] = None


class SubmissionResponse(SubmissionBase):
    id: int
    student_id: int
    rubric_id: int
    submitted_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubmissionWithRelations(SubmissionResponse):
    student: Optional['StudentResponse'] = None
    rubric: Optional['RubricResponse'] = None
    results: List['ResultResponse'] = []
