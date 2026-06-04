from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.submission import SubmissionResponse
from app.services import submission_service
from app.services.grading_orchestrator import grade_submission

router = APIRouter(prefix="/submissions", tags=["submissions"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/grade")
async def submit_and_grade(
    file: UploadFile = File(..., description="Ảnh bài làm viết tay của học sinh"),
    student_id: int = Form(..., description="ID học sinh"),
    rubric_id: int = Form(..., description="ID rubric để chấm điểm"),
    db: Session = Depends(get_db),
):
    """
    Upload ảnh bài làm, chạy AI chấm điểm, lưu kết quả vào DB.
    Trả về submission + result trong một response.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Định dạng '{file.content_type}' không được hỗ trợ. Chấp nhận: JPEG, PNG, GIF, WebP.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File vượt quá giới hạn 10 MB.")

    try:
        return grade_submission(
            db=db,
            file_bytes=file_bytes,
            content_type=file.content_type,
            student_id=student_id,
            rubric_id=rubric_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rubric/{rubric_id}", response_model=List[SubmissionResponse])
def get_submissions_by_rubric(rubric_id: int, db: Session = Depends(get_db)):
    """Lấy tất cả bài nộp theo rubric."""
    return submission_service.get_submissions_by_rubric(db, rubric_id)


@router.get("/student/{student_id}", response_model=List[SubmissionResponse])
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


@router.delete("/{submission_id}", status_code=204)
def delete_submission(submission_id: int, db: Session = Depends(get_db)):
    """Xoá submission."""
    if not submission_service.delete_submission(db, submission_id):
        raise HTTPException(status_code=404, detail="Submission không tồn tại.")
