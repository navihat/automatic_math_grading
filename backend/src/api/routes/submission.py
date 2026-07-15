from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from src.core.config import UPLOAD_DIR
from src.core.database import get_db
from src.api.schemas.submission import SubmissionResponse, SubmissionWithRelations
from src.services import submission as submission_service
from src.services import pipeline

router = APIRouter(prefix="/submissions", tags=["submissions"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_FILES = 5


@router.post("/grade")
async def submit_and_grade(
    files: List[UploadFile] = File(..., description="Ảnh bài làm viết tay (tối đa 5 trang)"),
    student_id: int = Form(..., description="ID học sinh"),
    rubric_id: int = Form(..., description="ID rubric để chấm điểm"),
    db: Session = Depends(get_db),
):
    """Upload nhiều ảnh bài làm và chạy full diagnostic pipeline."""
    if not files:
        raise HTTPException(status_code=422, detail="Vui lòng chọn ít nhất 1 ảnh.")
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=422, detail=f"Tối đa {MAX_FILES} ảnh mỗi lần nộp.")

    file_items: list[tuple[bytes, str]] = []
    for f in files:
        if f.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Định dạng '{f.content_type}' không được hỗ trợ. Chấp nhận: JPEG, PNG, GIF, WebP.",
            )
        data = await f.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File '{f.filename}' vượt quá giới hạn 10 MB.")
        file_items.append((data, f.content_type))

    try:
        return pipeline.run(db=db, file_items=file_items, student_id=student_id, rubric_id=rubric_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rubric/{rubric_id}", response_model=List[SubmissionWithRelations])
def get_submissions_by_rubric(rubric_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả bài nộp theo rubric."""
    return submission_service.get_submissions_by_rubric(db, rubric_id)


@router.get("/student/{student_id}", response_model=List[SubmissionWithRelations])
def get_submissions_by_student(student_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả bài nộp của một học sinh."""
    return submission_service.get_submissions_by_student(db, student_id)


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(submission_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết submission."""
    submission = submission_service.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission không tồn tại.")
    return submission


@router.post("/{submission_id}/regrade")
async def regrade_submission(submission_id: int, db: Session = Depends(get_db)):
    """Phân tích lại bài nộp đã có bằng full diagnostic pipeline."""
    try:
        return pipeline.reanalyze(db, submission_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{submission_id}", status_code=204)
def delete_submission(submission_id: int, db: Session = Depends(get_db)):
    """Xoá submission."""
    if not submission_service.delete_submission(db, submission_id):
        raise HTTPException(status_code=404, detail="Submission không tồn tại.")
