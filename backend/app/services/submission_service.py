from typing import Optional
from sqlalchemy.orm import Session

from app.models.submission import Submission
from app.schemas.submission import SubmissionCreate, SubmissionUpdate


def create_submission(db: Session, data: SubmissionCreate, session_id: str) -> Submission:
    """Tạo submission mới (bài nộp của học sinh) và lưu vào DB."""
    pass


def get_submission_by_id(db: Session, submission_id: int) -> Optional[Submission]:
    """Lấy submission theo ID, kèm relations (student, rubric, results)."""
    pass


def get_submissions_by_rubric(db: Session, rubric_id: int) -> list[Submission]:
    """Lấy tất cả submissions dùng cùng một rubric."""
    pass


def get_submissions_by_student(db: Session, student_id: int) -> list[Submission]:
    """Lấy tất cả submissions của một học sinh."""
    pass


def update_submission(db: Session, submission_id: int, data: SubmissionUpdate) -> Optional[Submission]:
    """Cập nhật thông tin submission (ví dụ: ocr_text sau khi extract xong)."""
    pass


def delete_submission(db: Session, submission_id: int) -> bool:
    """Xoá submission. Trả về True nếu xoá thành công."""
    pass
