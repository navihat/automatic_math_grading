from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.core.database import Base


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    session_id = Column(String, nullable=False)

    # Layer 1: Image quality (OpenCV heuristics)
    image_quality_json = Column(JSON, nullable=True)
    # Layer 2: OCR (Gemini + self-assessment)
    ocr_text = Column(Text, nullable=True)
    uncertain_symbols = Column(JSON, nullable=True)   # list of uncertain symbol descriptions
    # Layer 3: Step segmentation
    steps_json = Column(JSON, nullable=True)
    # Layer 4: Intermediate Representation
    ir_json = Column(JSON, nullable=True)
    # Layer 5: Symbolic verification (SymPy)
    verification_json = Column(JSON, nullable=True)
    # Layer 6: Milestone rubric achievement
    milestone_json = Column(JSON, nullable=True)
    # Layer 7: Misconception mapping
    misconception_json = Column(JSON, nullable=True)
    # Layer 8: Diagnostic feedback
    feedback_text = Column(Text, nullable=True)

    # Summary fields
    total_score = Column(Integer, nullable=False, default=0)   # milestones achieved
    total_milestones = Column(Integer, nullable=False, default=0)
    confidence = Column(Float, nullable=False, default=0.0)    # image-quality-based
    needs_review = Column(Boolean, nullable=False, default=False)

    teacher_feedback_id = Column(Integer, ForeignKey("teacher_feedback.id"), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    submission = relationship("Submission", back_populates="results", passive_deletes=True)
    teacher_feedback = relationship(
        "Teacher_feedback",
        back_populates="result",
        uselist=False,
        foreign_keys="Teacher_feedback.result_id",
    )


class Teacher_feedback(Base):
    __tablename__ = "teacher_feedback"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("results.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    final_score = Column(Float, nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    result = relationship("Result", back_populates="teacher_feedback", foreign_keys="Teacher_feedback.result_id")
    teacher = relationship("User", back_populates="feedbacks")
