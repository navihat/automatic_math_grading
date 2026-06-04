from typing import Optional
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.classroom import Class
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate


def create_assignment(db: Session, data: AssignmentCreate) -> Assignment:
    """Tạo bài tập mới do giáo viên tạo."""
    assignment = Assignment(
        deadline=data.deadline,
        problem_text=data.problem_text,
        type=data.type,
        user_id=data.user_id,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def get_assignment_by_id(db: Session, assignment_id: int) -> Optional[Assignment]:
    """Lấy bài tập theo ID, kèm rubric và danh sách lớp."""
    return db.query(Assignment).filter(Assignment.id == assignment_id).first()


def get_assignments_by_teacher(db: Session, user_id: int) -> list[Assignment]:
    """Lấy tất cả bài tập của một giáo viên."""
    return db.query(Assignment).filter(Assignment.user_id == user_id).all()


def get_assignments_by_class(db: Session, class_id: int) -> list[Assignment]:
    """Lấy tất cả bài tập được giao cho một lớp."""
    return (
        db.query(Assignment)
        .join(Assignment.classes)
        .filter(Class.id == class_id)
        .all()
    )


def update_assignment(db: Session, assignment_id: int, data: AssignmentUpdate) -> Optional[Assignment]:
    """Cập nhật nội dung hoặc deadline của bài tập."""
    assignment = get_assignment_by_id(db, assignment_id)
    if not assignment:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)
    db.commit()
    db.refresh(assignment)
    return assignment


def delete_assignment(db: Session, assignment_id: int) -> bool:
    """Xoá bài tập. Trả về True nếu xoá thành công."""
    assignment = get_assignment_by_id(db, assignment_id)
    if not assignment:
        return False
    db.delete(assignment)
    db.commit()
    return True
