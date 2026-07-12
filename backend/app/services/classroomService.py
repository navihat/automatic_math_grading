from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.classroomModel import Class, Student
from app.schemas.classroomSchema import ClassCreate, ClassUpdate, StudentCreate, StudentUpdate
from app.utils.security import hash_password


# ── Class CRUD ────────────────────────────────────────────────

def create_class(db: Session, data: ClassCreate) -> Class:
    """Tạo lớp học mới."""
    cls = Class(name=data.name, year=data.year, user_id=data.user_id)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


def get_class_by_id(db: Session, class_id: int) -> Optional[Class]:
    """Lấy lớp học theo ID, kèm danh sách học sinh."""
    return db.query(Class).filter(Class.id == class_id).first()


def get_classes_by_teacher(db: Session, user_id: int) -> list[Class]:
    """Lấy tất cả lớp học của một giáo viên."""
    return db.query(Class).filter(Class.user_id == user_id).all()


def update_class(db: Session, class_id: int, data: ClassUpdate) -> Optional[Class]:
    """Cập nhật thông tin lớp học."""
    cls = get_class_by_id(db, class_id)
    if not cls:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cls, field, value)
    db.commit()
    db.refresh(cls)
    return cls


def delete_class(db: Session, class_id: int) -> bool:
    """Xoá lớp học. Trả về True nếu xoá thành công."""
    cls = get_class_by_id(db, class_id)
    if not cls:
        return False
    db.delete(cls)
    db.commit()
    return True


# ── Student CRUD ──────────────────────────────────────────────

def add_student(db: Session, data: StudentCreate) -> Student:
    """Thêm học sinh vào một lớp."""
    password_hash = hash_password(data.student_code)
    user = User(
        role="student",
        email=None,
        name=data.name,
        password_hash=password_hash,
    )
    db.add(user)
    db.flush()

    student = Student(
        user_id=user.id,
        name=data.name,
        student_code=data.student_code,
        password_hash=password_hash,
        class_id=data.class_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def get_student_by_id(db: Session, student_id: int) -> Optional[Student]:
    """Lấy thông tin học sinh theo ID."""
    return db.query(Student).filter(Student.id == student_id).first()


def get_students_by_class(db: Session, class_id: int) -> list[Student]:
    """Lấy danh sách học sinh trong một lớp."""
    return db.query(Student).filter(Student.class_id == class_id).all()


def update_student(db: Session, student_id: int, data: StudentUpdate) -> Optional[Student]:
    """Cập nhật thông tin học sinh."""
    student = get_student_by_id(db, student_id)
    if not student:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
        if field == "name" and student.user:
            student.user.name = value
    db.commit()
    db.refresh(student)
    return student


def remove_student(db: Session, student_id: int) -> bool:
    """Xoá học sinh. Trả về True nếu xoá thành công."""
    student = get_student_by_id(db, student_id)
    if not student:
        return False
    user = student.user
    db.delete(student)
    if user:
        db.delete(user)
    db.commit()
    return True
