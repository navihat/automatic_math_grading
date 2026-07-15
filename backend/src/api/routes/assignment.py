from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.api.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentResponse
from src.api.schemas.classroom import ClassResponse
from src.services import assignment as assignment_service
from data.storage import storage

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


class ClassLinkRequest(BaseModel):
    class_id: int

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


@router.get("/{assignment_id}/classes", response_model=List[ClassResponse])
def get_linked_classes(assignment_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách lớp đã được gán cho bài tập."""
    assignment = assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Bài tập không tồn tại.")
    return assignment_service.get_linked_classes(db, assignment_id)


@router.post("/{assignment_id}/classes", status_code=201)
def link_class(assignment_id: int, body: ClassLinkRequest, db: Session = Depends(get_db)):
    """Gán bài tập cho một lớp."""
    ok = assignment_service.link_class(db, assignment_id, body.class_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Bài tập hoặc lớp không tồn tại.")
    return {"message": "Đã gán bài tập cho lớp."}


@router.delete("/{assignment_id}/classes/{class_id}", status_code=204)
def unlink_class(assignment_id: int, class_id: int, db: Session = Depends(get_db)):
    """Gỡ bài tập khỏi một lớp."""
    ok = assignment_service.unlink_class(db, assignment_id, class_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Liên kết không tồn tại.")


@router.post("/{assignment_id}/problem-image", response_model=AssignmentResponse)
async def upload_problem_image(
    assignment_id: int,
    file: UploadFile = File(..., description="Ảnh đề bài (JPEG, PNG, WebP)"),
    db: Session = Depends(get_db),
):
    """Upload ảnh đề bài cho bài tập, thay thế ảnh cũ nếu có."""
    assignment = assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Bài tập không tồn tại.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Định dạng '{file.content_type}' không hỗ trợ. Chấp nhận: JPEG, PNG, WebP.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="File vượt quá giới hạn 10 MB.")

    # Xoá ảnh cũ nếu có
    if assignment.problem_image_url:
        storage.delete(assignment.problem_image_url)

    image_url = storage.upload(file_bytes, f"problem.{file.content_type.split('/')[-1]}")
    return assignment_service.set_problem_image(db, assignment_id, image_url)


@router.delete("/{assignment_id}/problem-image", response_model=AssignmentResponse)
def delete_problem_image(assignment_id: int, db: Session = Depends(get_db)):
    """Xoá ảnh đề bài."""
    assignment = assignment_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Bài tập không tồn tại.")
    if assignment.problem_image_url:
        storage.delete(assignment.problem_image_url)
    return assignment_service.set_problem_image(db, assignment_id, None)
