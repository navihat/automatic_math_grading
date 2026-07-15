from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from src.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _add_column_if_missing(db, table: str, column: str, col_type: str) -> None:
    try:
        db.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            db.commit()
        except Exception:
            db.rollback()


def create_tables():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── users / students password_hash migration ──
        _add_column_if_missing(db, "users", "password_hash", "VARCHAR")
        _add_column_if_missing(db, "students", "password_hash", "VARCHAR")

        # ── assignments image upload ──
        _add_column_if_missing(db, "assignments", "problem_image_url", "VARCHAR(500)")

        # ── results new pipeline columns ──
        _add_column_if_missing(db, "results", "image_quality_json", "JSON")
        _add_column_if_missing(db, "results", "ocr_text", "TEXT")
        _add_column_if_missing(db, "results", "uncertain_symbols", "JSON")
        _add_column_if_missing(db, "results", "ir_json", "JSON")
        _add_column_if_missing(db, "results", "verification_json", "JSON")
        _add_column_if_missing(db, "results", "milestone_json", "JSON")
        _add_column_if_missing(db, "results", "misconception_json", "JSON")
        _add_column_if_missing(db, "results", "feedback_text", "TEXT")
        _add_column_if_missing(db, "results", "total_milestones", "INTEGER DEFAULT 0")
        _add_column_if_missing(db, "results", "needs_review", "BOOLEAN DEFAULT 0")

        # ── submissions multi-image ──
        _add_column_if_missing(db, "submissions", "image_urls", "JSON")

        # ── seed misconceptions ──
        _seed_misconceptions(db)

    finally:
        db.close()


def _seed_misconceptions(db) -> None:
    from src.db.models.misconception import Misconception, MISCONCEPTION_SEED

    existing = db.query(Misconception).count()
    if existing > 0:
        return

    for item in MISCONCEPTION_SEED:
        db.add(Misconception(**item))
    db.commit()
