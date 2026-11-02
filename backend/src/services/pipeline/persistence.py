"""DB / storage I/O around the pipeline: load inputs, store images, write Result, serialize."""
from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from data.storage import storage
from src.core.config import UPLOAD_DIR
from src.db.models.misconception import Misconception
from src.db.models.result import Result
from src.db.models.rubric import Rubric
from src.db.models.submission import Submission
from src.services.pipeline.context import ImageItem, PipelineContext

_MIME_BY_EXT = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}


def get_rubric(db: Session, rubric_id: int) -> Rubric:
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise ValueError(f"Rubric ID={rubric_id} không tồn tại.")
    return rubric


def get_submission(db: Session, submission_id: int) -> Submission:
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise ValueError(f"Submission ID={submission_id} không tồn tại.")
    return submission


def build_context(db: Session, rubric: Rubric, images: list[ImageItem]) -> PipelineContext:
    catalog = [
        {"code": m.code, "name": m.name, "description": m.description}
        for m in db.query(Misconception).all()
    ]
    return PipelineContext(
        images=images,
        problem_statement=rubric.content.get("problem_statement", ""),
        milestones=rubric.content.get("milestones", []),
        misconception_catalog=catalog,
    )


def store_images(images: list[ImageItem]) -> list[str]:
    urls = []
    for img_bytes, content_type in images:
        ext = content_type.split("/")[-1].replace("jpeg", "jpg")
        urls.append(storage.upload(img_bytes, f"submission.{ext}"))
    return urls


def load_submission_images(submission: Submission) -> list[ImageItem]:
    urls = submission.image_urls or ([submission.image_url] if submission.image_url else [])
    if not urls:
        raise ValueError("Không tìm thấy file ảnh bài nộp.")

    images: list[ImageItem] = []
    for url in urls:
        filename = url.split("/")[-1]
        file_path = UPLOAD_DIR / filename
        if not file_path.exists():
            raise ValueError(f"Không tìm thấy file ảnh: {filename}")
        content_type = _MIME_BY_EXT.get(Path(filename).suffix.lower(), "image/jpeg")
        images.append((file_path.read_bytes(), content_type))
    return images


def write_result(result: Result, ctx: PipelineContext) -> None:
    result.image_quality_json = ctx.image_quality
    result.ocr_text = ctx.ocr_text
    result.uncertain_symbols = ctx.uncertain_symbols
    result.steps_json = ctx.steps
    result.ir_json = ctx.ir
    result.verification_json = ctx.verification
    result.milestone_json = ctx.milestone_results
    result.misconception_json = ctx.misconceptions
    result.feedback_text = ctx.feedback
    result.total_score = ctx.total_score
    result.total_milestones = len(ctx.milestones)
    result.confidence = ctx.confidence
    result.needs_review = ctx.needs_review


def serialize(submission: Submission, result: Result) -> dict:
    image_urls = submission.image_urls or ([submission.image_url] if submission.image_url else [])
    return {
        "submission": {
            "id": submission.id,
            "student_id": submission.student_id,
            "rubric_id": submission.rubric_id,
            "image_url": image_urls[0] if image_urls else None,
            "image_urls": image_urls,
            "ocr_text": submission.ocr_text,
            "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        },
        "result": {
            "id": result.id,
            "submission_id": result.submission_id,
            "image_quality": result.image_quality_json,
            "uncertain_symbols": result.uncertain_symbols,
            "steps": result.steps_json,
            "ir": result.ir_json,
            "verification": result.verification_json,
            "milestones": result.milestone_json,
            "misconceptions": result.misconception_json,
            "feedback": result.feedback_text,
            "total_score": result.total_score,
            "total_milestones": result.total_milestones,
            "confidence": result.confidence,
            "needs_review": result.needs_review,
            "created_at": result.created_at.isoformat() if result.created_at else None,
        },
    }
