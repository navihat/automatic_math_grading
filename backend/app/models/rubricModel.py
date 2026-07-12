from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Rubric(Base):
    __tablename__ = 'rubrics'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(JSON, nullable=False)  # Grading criteria stored as JSON
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # n-1 with assignment (Each rubric belongs to one assignment)
    assignment = relationship("Assignment", back_populates="rubric")

    # 1-n with submissions (One rubric used for multiple submissions)
    submissions = relationship("Submission", back_populates="rubric")

    # 1-n with rubric evaluations
    evaluations = relationship("RubricEvaluation", back_populates="rubric")
