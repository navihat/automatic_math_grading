"""
Pipeline orchestrator: runs all layers in sequence and returns a unified result dict.

Flow:
  image_bytes
    → [Layer 0] image_quality  (OpenCV, local)
    → [Layer 1-3] ocr_extractor (Gemini call 1: OCR + step seg + IR)
    → [Layer 4] symbolic verifier (SymPy, local)
    → [Layer 5-7] diagnostic (Gemini call 2: milestones + misconceptions + feedback)
"""
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from src.db.models.rubric import Rubric
from src.db.models.submission import Submission
from src.db.models.result import Result
from src.db.models.misconception import Misconception
from data.storage import storage

from src.services import image_quality as iq
from src.services.ai import ocr_extractor
from src.services.symbolic import verifier as sym_verifier
from src.services.ai import diagnostic as diag_service


def run(
    db: Session,
    file_items: list[tuple[bytes, str]],
    student_id: int,
    rubric_id: int,
) -> dict:
    """
    Full diagnostic pipeline.

    Args:
        file_items: list of (file_bytes, content_type) in page order (max 5).

    Raises:
        ValueError: rubric not found
        RuntimeError: AI or storage error
    """
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise ValueError(f"Rubric ID={rubric_id} không tồn tại.")

    milestones = rubric.content.get("milestones", [])
    problem_statement = rubric.content.get("problem_statement", "")

    # ── Layer 0: Image quality (use first image) ─────────────────────────────
    quality = iq.assess(file_items[0][0])

    # ── Save all images ───────────────────────────────────────────────────────
    image_urls = []
    for img_bytes, content_type in file_items:
        ext = content_type.split("/")[-1].replace("jpeg", "jpg")
        url = storage.upload(img_bytes, f"submission.{ext}")
        image_urls.append(url)

    # ── Layer 1-3: OCR + step segmentation + IR ──────────────────────────────
    try:
        ocr_result = ocr_extractor.extract(file_items)
    except Exception as e:
        raise RuntimeError(f"Lỗi OCR: {e}")

    ocr_text = ocr_result["ocr_text"]
    uncertain_symbols = ocr_result["uncertain_symbols"]
    steps = ocr_result["steps"]
    ir_steps = ocr_result["ir"]

    # ── Layer 4: Symbolic verification ───────────────────────────────────────
    verification = sym_verifier.verify_all(ir_steps)

    # ── Layer 5-7: Milestone + misconception + feedback ───────────────────────
    catalog = [
        {"code": m.code, "name": m.name, "description": m.description}
        for m in db.query(Misconception).all()
    ]
    try:
        diag = diag_service.analyze(
            problem_statement=problem_statement,
            milestones=milestones,
            ir_steps=ir_steps,
            verification=verification,
            misconceptions_catalog=catalog,
            uncertain_symbols=uncertain_symbols,
        )
    except Exception as e:
        raise RuntimeError(f"Lỗi phân tích diagnostic: {e}")

    achieved = sum(1 for m in diag["milestones"] if m.get("achieved"))
    needs_review = diag["needs_review"] or not quality["is_acceptable"]

    # ── Persist ──────────────────────────────────────────────────────────────
    session_id = str(uuid.uuid4())

    submission = Submission(
        student_id=student_id,
        rubric_id=rubric_id,
        session_id=session_id,
        image_url=image_urls[0],
        image_urls=image_urls,
        ocr_text=ocr_text,
    )
    db.add(submission)
    db.flush()

    result = Result(
        submission_id=submission.id,
        session_id=session_id,
        image_quality_json=quality,
        ocr_text=ocr_text,
        uncertain_symbols=uncertain_symbols,
        steps_json=steps,
        ir_json=ir_steps,
        verification_json=verification,
        milestone_json=diag["milestones"],
        misconception_json=diag["misconceptions"],
        feedback_text=diag["feedback"],
        total_score=achieved,
        total_milestones=len(milestones),
        confidence=quality["confidence"],
        needs_review=needs_review,
    )
    db.add(result)
    db.commit()
    db.refresh(submission)
    db.refresh(result)

    return _serialize(submission, result)


def reanalyze(db: Session, submission_id: int) -> dict:
    """Re-run the pipeline on an existing submission's stored image."""
    from src.core.config import UPLOAD_DIR

    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise ValueError(f"Submission ID={submission_id} không tồn tại.")

    rubric = db.query(Rubric).filter(Rubric.id == submission.rubric_id).first()
    if not rubric:
        raise ValueError(f"Rubric ID={submission.rubric_id} không tồn tại.")

    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    urls = submission.image_urls or ([submission.image_url] if submission.image_url else [])
    if not urls:
        raise ValueError("Không tìm thấy file ảnh bài nộp.")

    file_items: list[tuple[bytes, str]] = []
    for url in urls:
        filename = url.split("/")[-1]
        file_path = UPLOAD_DIR / filename
        if not file_path.exists():
            raise ValueError(f"Không tìm thấy file ảnh: {filename}")
        img_bytes = file_path.read_bytes()
        ext = Path(filename).suffix.lower()
        content_type = mime_map.get(ext, "image/jpeg")
        file_items.append((img_bytes, content_type))

    milestones = rubric.content.get("milestones", [])
    problem_statement = rubric.content.get("problem_statement", "")

    quality = iq.assess(file_items[0][0])

    try:
        ocr_result = ocr_extractor.extract(file_items)
    except Exception as e:
        raise RuntimeError(f"Lỗi OCR: {e}")

    ocr_text = ocr_result["ocr_text"]
    uncertain_symbols = ocr_result["uncertain_symbols"]
    steps = ocr_result["steps"]
    ir_steps = ocr_result["ir"]

    verification = sym_verifier.verify_all(ir_steps)

    catalog = [
        {"code": m.code, "name": m.name, "description": m.description}
        for m in db.query(Misconception).all()
    ]
    try:
        diag = diag_service.analyze(
            problem_statement=problem_statement,
            milestones=milestones,
            ir_steps=ir_steps,
            verification=verification,
            misconceptions_catalog=catalog,
            uncertain_symbols=uncertain_symbols,
        )
    except Exception as e:
        raise RuntimeError(f"Lỗi phân tích diagnostic: {e}")

    achieved = sum(1 for m in diag["milestones"] if m.get("achieved"))
    needs_review = diag["needs_review"] or not quality["is_acceptable"]

    submission.ocr_text = ocr_text
    result = db.query(Result).filter(Result.submission_id == submission_id).first()
    if not result:
        result = Result(submission_id=submission.id, session_id=submission.session_id)
        db.add(result)

    result.image_quality_json = quality
    result.ocr_text = ocr_text
    result.uncertain_symbols = uncertain_symbols
    result.steps_json = steps
    result.ir_json = ir_steps
    result.verification_json = verification
    result.milestone_json = diag["milestones"]
    result.misconception_json = diag["misconceptions"]
    result.feedback_text = diag["feedback"]
    result.total_score = achieved
    result.total_milestones = len(milestones)
    result.confidence = quality["confidence"]
    result.needs_review = needs_review

    db.commit()
    db.refresh(submission)
    db.refresh(result)
    return _serialize(submission, result)


def _serialize(submission: Submission, result: Result) -> dict:
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
