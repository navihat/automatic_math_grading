from typing import Optional
from sqlalchemy.orm import Session

from app.models.result import Result, Teacher_feedback
from app.schemas.result import ResultCreate, TeacherFeedbackCreate, TeacherFeedbackUpdate


def create_result(db: Session, data: ResultCreate, session_id: str) -> Result:
    """Lưu kết quả chấm điểm AI vào DB."""
    result = Result(
        submission_id=data.submission_id,
        session_id=session_id,
        steps_json=data.steps_json,
        total_score=data.total_score,
        confidence=data.confidence,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def get_result_by_id(db: Session, result_id: int) -> Optional[Result]:
    """Lấy kết quả chấm theo ID, kèm teacher_feedback nếu có."""
    return db.query(Result).filter(Result.id == result_id).first()


def get_results_by_submission(db: Session, submission_id: int) -> list[Result]:
    """Lấy tất cả kết quả chấm của một submission."""
    return db.query(Result).filter(Result.submission_id == submission_id).all()


def add_teacher_feedback(db: Session, data: TeacherFeedbackCreate) -> Teacher_feedback:
    """
    Giáo viên thêm phản hồi/điểm chỉnh sửa cho một kết quả AI.
    Tạo bản ghi Teacher_feedback và liên kết với Result.
    """
    feedback = Teacher_feedback(
        result_id=data.result_id,
        user_id=data.user_id,
        final_score=data.final_score,
        note=data.note,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def update_teacher_feedback(
    db: Session, feedback_id: int, data: TeacherFeedbackUpdate
) -> Optional[Teacher_feedback]:
    """Cập nhật phản hồi của giáo viên (điểm cuối, ghi chú)."""
    feedback = (
        db.query(Teacher_feedback)
        .filter(Teacher_feedback.id == feedback_id)
        .first()
    )
    if not feedback:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(feedback, field, value)
    db.commit()
    db.refresh(feedback)
    return feedback
