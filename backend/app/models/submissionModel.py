from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Submission(Base):
    __tablename__ = 'submissions'

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    rubric_id = Column(Integer, ForeignKey('rubrics.id'), nullable=False)
    session_id = Column(String, nullable=False)
    image_url = Column(String, nullable=False)  # Student's work image
    ocr_text = Column(Text)  # Extracted text from OCR
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # n-1 with student
    student = relationship("Student", back_populates="submissions")

    # n-1 with rubric
    rubric = relationship("Rubric", back_populates="submissions")

    # 1-n with results (One submission can have multiple grading results)
    results = relationship("Result", back_populates="submission")
