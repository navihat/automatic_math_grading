from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.rubric import RubricCreate, RubricResponse, RubricUpdate
from app.services import rubric_service

router = APIRouter(prefix="/rubrics", tags=["rubrics"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=RubricResponse, status_code=201)
async def upload_rubric_file(
    file: UploadFile = File(..., description="File PDF hoặc ảnh chứa rubric"),
    title: str = Form(..., description="Tiêu đề rubric"),
    assignment_id: int = Form(..., description="ID của bài tập"),
    db: Session = Depends(get_db),
):
    """
    Upload file PDF hoặc ảnh (JPEG, PNG, GIF, WebP) chứa rubric chấm điểm.
    Hệ thống sẽ dùng AI để trích xuất nội dung và lưu vào DB.
    """
    if file.content_type not in rubric_service.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Định dạng '{file.content_type}' không được hỗ trợ. "
                "Chấp nhận: PDF, JPEG, PNG, GIF, WebP."
            ),
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File vượt quá giới hạn 10 MB.",
        )

    try:
        content = rubric_service.extract_rubric_content(file_bytes, file.content_type)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    data = RubricCreate(title=title, content=content, assignment_id=assignment_id)
    return rubric_service.create_rubric(db, data)


@router.post("/", response_model=RubricResponse, status_code=201)
def create_rubric(data: RubricCreate, db: Session = Depends(get_db)):
    """Tạo rubric thủ công bằng JSON (không cần upload file)."""
    return rubric_service.create_rubric(db, data)


@router.get("/assignment/{assignment_id}", response_model=List[RubricResponse])
def get_rubrics_by_assignment(assignment_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả rubric thuộc một bài tập."""
    return rubric_service.get_rubrics_by_assignment(db, assignment_id)


@router.get("/{rubric_id}", response_model=RubricResponse)
def get_rubric(rubric_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết một rubric theo ID."""
    rubric = rubric_service.get_rubric_by_id(db, rubric_id)
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric không tồn tại.")
    return rubric


@router.put("/{rubric_id}", response_model=RubricResponse)
def update_rubric(rubric_id: int, data: RubricUpdate, db: Session = Depends(get_db)):
    """Cập nhật tiêu đề hoặc nội dung rubric."""
    rubric = rubric_service.update_rubric(db, rubric_id, data)
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric không tồn tại.")
    return rubric


@router.delete("/{rubric_id}", status_code=204)
def delete_rubric(rubric_id: int, db: Session = Depends(get_db)):
    """Xoá rubric theo ID."""
    if not rubric_service.delete_rubric(db, rubric_id):
        raise HTTPException(status_code=404, detail="Rubric không tồn tại.")
