from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.api.schemas.result import (
    ResultResponse,
    TeacherFeedbackCreate, TeacherFeedbackUpdate, TeacherFeedbackResponse,
)
from src.services import result as result_service

router = APIRouter(prefix="/results", tags=["results"])


@router.get("/submission/{submission_id}", response_model=List[ResultResponse])
def get_results_by_submission(submission_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả kết quả chấm của một submission."""
    return result_service.get_results_by_submission(db, submission_id)


@router.get("/{result_id}")
def get_result(result_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết kết quả chấm (bao gồm toàn bộ pipeline data)."""
    result = result_service.get_result_by_id(db, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Kết quả không tồn tại.")
    return {
        "id": result.id,
        "submission_id": result.submission_id,
        "session_id": result.session_id,
        "image_quality": result.image_quality_json,
        "ocr_text": result.ocr_text,
        "uncertain_symbols": result.uncertain_symbols,
        "steps": result.steps_json,
        "ir": result.ir_json,
        "verification": result.verification_json,
        "milestones": result.milestone_json,
        "misconceptions": result.misconception_json,
        "feedback": result.feedback_text,
        "total_score": result.total_score,
        "total_milestones": result.total_milestones,
        "confidence": result.confidence,
        "needs_review": result.needs_review,
        "teacher_feedback": {
            "id": result.teacher_feedback.id,
            "final_score": result.teacher_feedback.final_score,
            "note": result.teacher_feedback.note,
        } if result.teacher_feedback else None,
        "created_at": result.created_at.isoformat() if result.created_at else None,
    }


@router.post("/feedback", response_model=TeacherFeedbackResponse, status_code=201)
def add_teacher_feedback(data: TeacherFeedbackCreate, db: Session = Depends(get_db)):
    """Giáo viên thêm phản hồi/điểm chỉnh sửa cho kết quả AI."""
    return result_service.add_teacher_feedback(db, data)


@router.put("/feedback/{feedback_id}", response_model=TeacherFeedbackResponse)
def update_teacher_feedback(
    feedback_id: int, data: TeacherFeedbackUpdate, db: Session = Depends(get_db)
):
    """Cập nhật phản hồi của giáo viên."""
    feedback = result_service.update_teacher_feedback(db, feedback_id, data)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback không tồn tại.")
    return feedback
