from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.api.schemas.classroom import (
    ClassCreate, ClassUpdate, ClassResponse,
    StudentCreate, StudentUpdate, StudentResponse,
)
from src.services import classroom as classroom_service

router = APIRouter(prefix="/classes", tags=["classes"])


# ── Class endpoints ───────────────────────────────────────────

@router.post("/", response_model=ClassResponse, status_code=201)
def create_class(data: ClassCreate, db: Session = Depends(get_db)):
    """Tạo lớp học mới."""
    return classroom_service.create_class(db, data)


@router.get("/teacher/{user_id}", response_model=List[ClassResponse])
def get_classes_by_teacher(user_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả lớp học của một giáo viên."""
    return classroom_service.get_classes_by_teacher(db, user_id)


@router.get("/{class_id}", response_model=ClassResponse)
def get_class(class_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết một lớp học."""
    cls = classroom_service.get_class_by_id(db, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")
    return cls


@router.put("/{class_id}", response_model=ClassResponse)
def update_class(class_id: int, data: ClassUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin lớp học."""
    cls = classroom_service.update_class(db, class_id, data)
    if not cls:
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")
    return cls


@router.delete("/{class_id}", status_code=204)
def delete_class(class_id: int, db: Session = Depends(get_db)):
    """Xoá lớp học."""
    if not classroom_service.delete_class(db, class_id):
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")


# ── Student endpoints ─────────────────────────────────────────

@router.post("/{class_id}/students", response_model=StudentResponse, status_code=201)
def add_student(class_id: int, data: StudentCreate, db: Session = Depends(get_db)):
    """Thêm học sinh vào một lớp. class_id trong URL sẽ ghi đè class_id trong body."""
    adjusted = StudentCreate(
        name=data.name,
        student_code=data.student_code,
        class_id=class_id,
    )
    return classroom_service.add_student(db, adjusted)


@router.get("/{class_id}/students", response_model=List[StudentResponse])
def get_students_by_class(class_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách học sinh trong một lớp."""
    return classroom_service.get_students_by_class(db, class_id)


@router.put("/students/{student_id}", response_model=StudentResponse)
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin học sinh."""
    student = classroom_service.update_student(db, student_id, data)
    if not student:
        raise HTTPException(status_code=404, detail="Học sinh không tồn tại.")
    return student


@router.delete("/students/{student_id}", status_code=204)
def remove_student(student_id: int, db: Session = Depends(get_db)):
    """Xoá học sinh."""
    if not classroom_service.remove_student(db, student_id):
        raise HTTPException(status_code=404, detail="Học sinh không tồn tại.")
