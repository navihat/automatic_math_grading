from typing import Optional
from sqlalchemy.orm import Session

from src.db.models.submission import Submission
from src.api.schemas.submission import SubmissionCreate, SubmissionUpdate


def create_submission(db: Session, data: SubmissionCreate, session_id: str) -> Submission:
    """Tạo submission mới (bài nộp của học sinh) và lưu vào DB."""
    submission = Submission(
        student_id=data.student_id,
        rubric_id=data.rubric_id,
        session_id=session_id,
        image_url=data.image_url,
        ocr_text=data.ocr_text,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def get_submission_by_id(db: Session, submission_id: int) -> Optional[Submission]:
    """Lấy submission theo ID, kèm relations (student, rubric, results)."""
    return db.query(Submission).filter(Submission.id == submission_id).first()


def get_submissions_by_rubric(db: Session, rubric_id: int) -> list[Submission]:
    """Lấy tất cả submissions dùng cùng một rubric."""
    return db.query(Submission).filter(Submission.rubric_id == rubric_id).all()


def get_submissions_by_student(db: Session, student_id: int) -> list[Submission]:
    """Lấy tất cả submissions của một học sinh."""
    return db.query(Submission).filter(Submission.student_id == student_id).all()


def update_submission(db: Session, submission_id: int, data: SubmissionUpdate) -> Optional[Submission]:
    """Cập nhật thông tin submission (ví dụ: ocr_text sau khi extract xong)."""
    submission = get_submission_by_id(db, submission_id)
    if not submission:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(submission, field, value)
    db.commit()
    db.refresh(submission)
    return submission


def delete_submission(db: Session, submission_id: int) -> bool:
    """Xoá submission. Trả về True nếu xoá thành công."""
    submission = get_submission_by_id(db, submission_id)
    if not submission:
        return False
    db.delete(submission)
    db.commit()
    return True
