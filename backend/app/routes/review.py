from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.result import (
    ResultResponse,
    TeacherFeedbackCreate, TeacherFeedbackUpdate, TeacherFeedbackResponse,
)
from app.services import result_service

router = APIRouter(prefix="/results", tags=["results"])


@router.get("/submission/{submission_id}", response_model=List[ResultResponse])
def get_results_by_submission(submission_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả kết quả chấm của một submission."""
    return result_service.get_results_by_submission(db, submission_id)


@router.get("/{result_id}", response_model=ResultResponse)
def get_result(result_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết kết quả chấm."""
    result = result_service.get_result_by_id(db, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Kết quả không tồn tại.")
    return result


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
