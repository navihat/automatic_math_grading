from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.submission import SubmissionResponse, SubmissionWithRelations
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
    """
    Chấm điểm lại bài làm viết tay đã nộp.
    """
    from app.services.submission_service import get_submission_by_id
    from app.services.ai.step_grader import grade_student_work
    from app.models.result import Result
    from pathlib import Path
    
    submission = get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Bài nộp không tồn tại.")
        
    # Tìm đường dẫn file ảnh
    filename = submission.image_url.split("/")[-1]
    upload_dir = Path(__file__).resolve().parents[2] / "data" / "uploads"
    file_path = upload_dir / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy file ảnh bài nộp trên hệ thống.")
        
    file_bytes = file_path.read_bytes()
    
    # Xác định mime_type
    ext = file_path.suffix.lower()
    content_type = "image/jpeg"
    if ext == ".png":
        content_type = "image/png"
    elif ext == ".webp":
        content_type = "image/webp"
    elif ext == ".gif":
        content_type = "image/gif"
        
    try:
        # Thực hiện OCR riêng trước khi chấm lại
        from app.services.ai.ocr.factory import get_ocr_service
        from app.core.config import settings

        ocr_service = get_ocr_service(settings.OCR_PROVIDER)
        ocr_result = ocr_service.extract_text(image_bytes=file_bytes, mime_type=content_type)

        grading_result = grade_student_work(
            image_bytes=file_bytes,
            mime_type=content_type,
            rubric_content=submission.rubric.content,
            ocr_text=ocr_result.ocr_text,
        )

        # Cập nhật ocr_text của submission
        submission.ocr_text = ocr_result.ocr_text
        
        # Tìm hoặc tạo Result
        result = db.query(Result).filter(Result.submission_id == submission.id).first()
        if not result:
            result = Result(submission_id=submission.id, session_id=submission.session_id)
            db.add(result)
            
        result.steps_json = grading_result.get("steps", {})
        result.total_score = grading_result.get("total_score", 0)
        result.confidence = grading_result.get("confidence", 0.0)
        
        db.commit()
        db.refresh(submission)
        db.refresh(result)
        
        return {
            "submission": {
                "id": submission.id,
                "student_id": submission.student_id,
                "rubric_id": submission.rubric_id,
                "image_url": submission.image_url,
                "ocr_text": submission.ocr_text,
                "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
            },
            "result": {
                "id": result.id,
                "submission_id": result.submission_id,
                "steps_json": result.steps_json,
                "total_score": result.total_score,
                "confidence": result.confidence,
                "created_at": result.created_at.isoformat() if result.created_at else None,
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi chấm bài bằng AI: {e}")


@router.delete("/{submission_id}", status_code=204)
def delete_submission(submission_id: int, db: Session = Depends(get_db)):
    """Xoá submission."""
    if not submission_service.delete_submission(db, submission_id):
        raise HTTPException(status_code=404, detail="Submission không tồn tại.")
