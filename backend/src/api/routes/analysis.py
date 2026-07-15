import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from src.core.config import UPLOAD_DIR
from src.core.database import get_db
from src.db.models.assignment import Assignment
from src.services import pipeline
from src.services.ai.diagnostic import generate_milestones

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_FILES = 5


@router.post("/submit")
async def submit_for_analysis(
    files: List[UploadFile] = File(..., description="Ảnh bài làm (tối đa 5 trang, theo thứ tự)"),
    student_id: int = Form(...),
    rubric_id: int = Form(...),
    db: Session = Depends(get_db),
):
    """
    Chạy toàn bộ pipeline chẩn đoán cho bài làm nhiều trang.
    OCR → Step segmentation → IR → Symbolic verification → Milestone → Misconception → Feedback
    """
    if not files:
        raise HTTPException(status_code=422, detail="Vui lòng chọn ít nhất 1 ảnh.")
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=422, detail=f"Tối đa {MAX_FILES} ảnh mỗi lần nộp.")

    file_items: list[tuple[bytes, str]] = []
    for f in files:
        if f.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Định dạng '{f.content_type}' không hỗ trợ. Chấp nhận: JPEG, PNG, WebP.",
            )
        data = await f.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File '{f.filename}' vượt quá giới hạn 10 MB.")
        file_items.append((data, f.content_type))

    try:
        return pipeline.run(
            db=db,
            file_items=file_items,
            student_id=student_id,
            rubric_id=rubric_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


_IMAGE_MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}


@router.post("/generate-milestones")
async def gen_milestones(body: dict, db: Session = Depends(get_db)):
    """
    Sinh milestone từ ảnh đề bài (nếu có) hoặc problem_text.
    Nhận: {assignment_id: int} hoặc {problem_text: str}.
    """
    assignment_id = body.get("assignment_id")
    image_bytes: bytes | None = None
    image_mime = "image/jpeg"
    problem_text = ""

    if assignment_id:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Bài tập không tồn tại.")
        problem_text = assignment.problem_text or ""

        if assignment.problem_image_url:
            filename = assignment.problem_image_url.split("/")[-1]
            file_path = UPLOAD_DIR / filename
            if file_path.exists():
                image_bytes = file_path.read_bytes()
                ext = Path(filename).suffix.lower()
                image_mime = _IMAGE_MIME.get(ext, "image/jpeg")
    else:
        problem_text = body.get("problem_text", "").strip()

    if not image_bytes and not problem_text:
        raise HTTPException(status_code=422, detail="Cần ảnh đề bài hoặc problem_text.")

    try:
        milestones = generate_milestones(
            problem_text=problem_text,
            image_bytes=image_bytes,
            image_mime=image_mime,
        )
        return {"milestones": milestones}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi sinh milestone: {e}")
