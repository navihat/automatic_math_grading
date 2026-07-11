from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class RubricEvaluation(Base):
    __tablename__ = 'rubric_evaluations'

    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer, ForeignKey('rubrics.id'), nullable=False)
    submission_id = Column(Integer, ForeignKey('submissions.id'), nullable=False)
    evaluator_type = Column(String(50), nullable=False, default='auto')
    total_score = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    feedback_summary = Column(Text, nullable=True)
    raw_context = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    rubric = relationship('Rubric', back_populates='evaluations')
    submission = relationship('Submission')
    criterion_evaluations = relationship('CriterionEvaluation', back_populates='rubric_evaluation', cascade='all, delete-orphan')


class CriterionEvaluation(Base):
    __tablename__ = 'criterion_evaluations'

    id = Column(Integer, primary_key=True, index=True)
    rubric_evaluation_id = Column(Integer, ForeignKey('rubric_evaluations.id'), nullable=False)
    criterion_name = Column(String(255), nullable=False)
    criterion_id = Column(Integer, nullable=True)
    awarded_score = Column(Integer, nullable=False)
    reasoning = Column(Text, nullable=True)
    matched = Column(Boolean, nullable=False, default=False)
    metadata = Column(JSON, nullable=True)

    rubric_evaluation = relationship('RubricEvaluation', back_populates='criterion_evaluations')
