from typing import Optional
from sqlalchemy.orm import Session

from app.models.result import Result, Teacher_feedback
from app.schemas.result import ResultCreate, TeacherFeedbackCreate, TeacherFeedbackUpdate


def create_result(db: Session, data: ResultCreate, session_id: str) -> Result:
    """Lưu kết quả chấm điểm AI vào DB."""
    pass


def get_result_by_id(db: Session, result_id: int) -> Optional[Result]:
    """Lấy kết quả chấm theo ID, kèm teacher_feedback nếu có."""
    pass


def get_results_by_submission(db: Session, submission_id: int) -> list[Result]:
    """Lấy tất cả kết quả chấm của một submission."""
    pass


def add_teacher_feedback(db: Session, data: TeacherFeedbackCreate) -> Teacher_feedback:
    """
    Giáo viên thêm phản hồi/điểm chỉnh sửa cho một kết quả AI.
    Tạo bản ghi Teacher_feedback và liên kết với Result.
    """
    pass


def update_teacher_feedback(
    db: Session, feedback_id: int, data: TeacherFeedbackUpdate
) -> Optional[Teacher_feedback]:
    """Cập nhật phản hồi của giáo viên (điểm cuối, ghi chú)."""
    pass
