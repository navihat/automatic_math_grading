"""
Grading Orchestrator – Pipeline xử lý chấm điểm tự động.

Flow: Nhận ảnh → Lưu file → Gọi AI chấm → Lưu Submission + Result → Trả kết quả
"""
import uuid

from sqlalchemy.orm import Session

from app.models.rubric import Rubric
from app.models.submission import Submission
from app.models.result import Result
from data.storage import storage
from app.services.ai.step_grader import grade_student_work


def grade_submission(
    db: Session,
    file_bytes: bytes,
    content_type: str,
    student_id: int,
    rubric_id: int,
) -> dict:
    """
    Pipeline chấm điểm hoàn chỉnh:
    1. Lấy rubric từ DB
    2. Lưu ảnh bài làm qua Storage Backend
    3. Gọi AI chấm điểm
    4. Tạo bản ghi Submission + Result
    5. Trả về kết quả tổng hợp cho Frontend

    Raises:
        ValueError: Rubric không tồn tại
        RuntimeError: Lỗi AI hoặc lưu file
    """
    # 1. Lấy rubric
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise ValueError(f"Rubric ID={rubric_id} không tồn tại.")

    # 2. Lưu ảnh bài làm
    ext = content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    image_url = storage.upload(file_bytes, f"submission.{ext}")

    # 3. Gọi AI chấm điểm
    session_id = str(uuid.uuid4())
    try:
        grading_result = grade_student_work(
            image_bytes=file_bytes,
            mime_type=content_type,
            rubric_content=rubric.content,
        )
    except Exception as e:
        raise RuntimeError(f"Lỗi khi chấm điểm bằng AI: {e}")

    # 4. Tạo Submission
    submission = Submission(
        student_id=student_id,
        rubric_id=rubric_id,
        session_id=session_id,
        image_url=image_url,
        ocr_text=grading_result.get("ocr_text", ""),
    )
    db.add(submission)
    db.flush()  # Lấy submission.id mà chưa commit

    # 5. Tạo Result
    result = Result(
        submission_id=submission.id,
        session_id=session_id,
        steps_json=grading_result.get("steps", {}),
        total_score=grading_result.get("total_score", 0),
        confidence=grading_result.get("confidence", 0.0),
    )
    db.add(result)
    db.commit()
    db.refresh(submission)
    db.refresh(result)

    # 6. Trả kết quả tổng hợp
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
        },
    }
