from typing import Optional
from sqlalchemy.orm import Session

from app.models.classroom import Class, Student
from app.schemas.classroom import ClassCreate, ClassUpdate, StudentCreate, StudentUpdate


# --- Class ---

def create_class(db: Session, data: ClassCreate) -> Class:
    """Tạo lớp học mới."""
    pass


def get_class_by_id(db: Session, class_id: int) -> Optional[Class]:
    """Lấy lớp học theo ID, kèm danh sách học sinh."""
    pass


def get_classes_by_teacher(db: Session, user_id: int) -> list[Class]:
    """Lấy tất cả lớp học của một giáo viên."""
    pass


def update_class(db: Session, class_id: int, data: ClassUpdate) -> Optional[Class]:
    """Cập nhật thông tin lớp học."""
    pass


def delete_class(db: Session, class_id: int) -> bool:
    """Xoá lớp học. Trả về True nếu xoá thành công."""
    pass


# --- Student ---

def add_student(db: Session, data: StudentCreate) -> Student:
    """Thêm học sinh vào một lớp."""
    pass


def get_student_by_id(db: Session, student_id: int) -> Optional[Student]:
    """Lấy thông tin học sinh theo ID."""
    pass


def get_students_by_class(db: Session, class_id: int) -> list[Student]:
    """Lấy danh sách học sinh trong một lớp."""
    pass


def update_student(db: Session, student_id: int, data: StudentUpdate) -> Optional[Student]:
    """Cập nhật thông tin học sinh."""
    pass


def remove_student(db: Session, student_id: int) -> bool:
    """Xoá học sinh. Trả về True nếu xoá thành công."""
    pass
