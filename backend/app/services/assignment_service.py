from typing import Optional
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate


def create_assignment(db: Session, data: AssignmentCreate) -> Assignment:
    """Tạo bài tập mới do giáo viên tạo."""
    pass


def get_assignment_by_id(db: Session, assignment_id: int) -> Optional[Assignment]:
    """Lấy bài tập theo ID, kèm rubric và danh sách lớp."""
    pass


def get_assignments_by_teacher(db: Session, user_id: int) -> list[Assignment]:
    """Lấy tất cả bài tập của một giáo viên."""
    pass


def get_assignments_by_class(db: Session, class_id: int) -> list[Assignment]:
    """Lấy tất cả bài tập được giao cho một lớp."""
    pass


def update_assignment(db: Session, assignment_id: int, data: AssignmentUpdate) -> Optional[Assignment]:
    """Cập nhật nội dung hoặc deadline của bài tập."""
    pass


def delete_assignment(db: Session, assignment_id: int) -> bool:
    """Xoá bài tập. Trả về True nếu xoá thành công."""
    pass
