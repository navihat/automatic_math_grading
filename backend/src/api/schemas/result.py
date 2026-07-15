from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any


class TeacherFeedbackBase(BaseModel):
    final_score: float
    note: Optional[str] = None


class TeacherFeedbackCreate(TeacherFeedbackBase):
    result_id: int
    user_id: int


class TeacherFeedbackUpdate(BaseModel):
    final_score: Optional[float] = None
    note: Optional[str] = None


class TeacherFeedbackResponse(TeacherFeedbackBase):
    id: int
    result_id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResultBase(BaseModel):
    steps_json: Optional[Any] = None
    total_score: int
    total_milestones: int = 0
    confidence: float


class ResultCreate(ResultBase):
    submission_id: int


class ResultUpdate(BaseModel):
    steps_json: Optional[Any] = None
    total_score: Optional[int] = None
    confidence: Optional[float] = None


class ResultResponse(ResultBase):
    id: int
    submission_id: int
    milestone_json: Optional[Any] = None
    misconception_json: Optional[Any] = None
    feedback_text: Optional[str] = None
    needs_review: bool = False
    teacher_feedback_id: Optional[int] = None
    teacher_feedback: Optional[TeacherFeedbackResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResultWithRelations(ResultResponse):
    submission: Optional['SubmissionResponse'] = None
    teacher_feedback: Optional[TeacherFeedbackResponse] = None


from src.api.schemas.submission import SubmissionResponse

ResultWithRelations.model_rebuild()

