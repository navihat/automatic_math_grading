"""
Diagnostic pipeline: entry points used by the API routes.

  run()        — new submission: store images, run all stages, persist Submission + Result
  reanalyze()  — re-run all stages on an existing submission's stored images

Stage implementations live in `stages/`, orchestration in `orchestrator.py`,
DB / storage I/O in `persistence.py`.

Raises:
    ValueError: rubric / submission / image not found (→ HTTP 4xx)
    RuntimeError: a stage failed (StageError) (→ HTTP 500)
"""
import uuid

from sqlalchemy.orm import Session

from src.db.models.result import Result
from src.db.models.submission import Submission
from src.services.pipeline import persistence
from src.services.pipeline.orchestrator import execute


def run(
    db: Session,
    file_items: list[tuple[bytes, str]],
    student_id: int,
    rubric_id: int,
) -> dict:
    """Full diagnostic pipeline for a new submission (file_items in page order, max 5)."""
    rubric = persistence.get_rubric(db, rubric_id)
    ctx = persistence.build_context(db, rubric, file_items)
    image_urls = persistence.store_images(file_items)

    execute(ctx)

    session_id = str(uuid.uuid4())
    submission = Submission(
        student_id=student_id,
        rubric_id=rubric_id,
        session_id=session_id,
        image_url=image_urls[0],
        image_urls=image_urls,
        ocr_text=ctx.ocr_text,
    )
    db.add(submission)
    db.flush()

    result = Result(submission_id=submission.id, session_id=session_id)
    persistence.write_result(result, ctx)
    db.add(result)
    db.commit()
    db.refresh(submission)
    db.refresh(result)
    return persistence.serialize(submission, result)


def reanalyze(db: Session, submission_id: int) -> dict:
    """Re-run the pipeline on an existing submission's stored images."""
    submission = persistence.get_submission(db, submission_id)
    rubric = persistence.get_rubric(db, submission.rubric_id)
    images = persistence.load_submission_images(submission)
    ctx = persistence.build_context(db, rubric, images)

    execute(ctx)

    submission.ocr_text = ctx.ocr_text
    result = db.query(Result).filter(Result.submission_id == submission_id).first()
    if not result:
        result = Result(submission_id=submission.id, session_id=submission.session_id)
        db.add(result)
    persistence.write_result(result, ctx)

    db.commit()
    db.refresh(submission)
    db.refresh(result)
    return persistence.serialize(submission, result)
