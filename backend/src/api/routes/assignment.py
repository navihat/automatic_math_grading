from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.api.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentResponse
from src.services import assignment as assignment_service

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.post("/", response_model=AssignmentResponse, status_code=201)
def create_assignment(data: AssignmentCreate, db: Session = Depends(get_db)):
    """Tạo bài tập mới."""
    return assignment_service.create_assignment(db, data)


@router.get("/teacher/{user_id}", response_model=List[AssignmentResponse])
def get_assignments_by_teacher(user_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả bài tập của một giáo viên."""
    return assignment_service.get_assignments_by_teacher(db, user_id)


@router.get("/class/{class_id}", response_model=List[AssignmentResponse])
def get_assignments_by_class(class_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả bài tập được giao cho một lớp."""
    return assignment_service.get_assignments_by_class(db, class_id)


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết bài tập."""
    assignment = assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Bài tập không tồn tại.")
    return assignment


@router.put("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(assignment_id: int, data: AssignmentUpdate, db: Session = Depends(get_db)):
    """Cập nhật bài tập."""
    assignment = assignment_service.update_assignment(db, assignment_id, data)
    if not assignment:
        raise HTTPException(status_code=404, detail="Bài tập không tồn tại.")
    return assignment


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    """Xoá bài tập."""
    if not assignment_service.delete_assignment(db, assignment_id):
        raise HTTPException(status_code=404, detail="Bài tập không tồn tại.")
