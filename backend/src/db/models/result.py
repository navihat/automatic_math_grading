from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.core.database import Base


class Result(Base):
    __tablename__ = 'results'

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey('submissions.id'), nullable=False)
    session_id = Column(String, nullable=False)
    steps_json = Column(JSON, nullable=False)  # AI grading steps/process
    total_score = Column(Integer, nullable=False)  # AI calculated score
    confidence = Column(Float, nullable=False)  # Confidence level of AI grading
    teacher_feedback_id = Column(Integer, ForeignKey('teacher_feedback.id'), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # n-1 with submission
    submission = relationship("Submission", back_populates="results")

    # 1-1 with teacher feedback (optional - teacher can provide feedback)
    teacher_feedback = relationship("Teacher_feedback", back_populates="result", uselist=False, foreign_keys="Teacher_feedback.result_id")


class Teacher_feedback(Base):
    __tablename__ = 'teacher_feedback'

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey('results.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    final_score = Column(Float, nullable=False)  # Teacher's final score (can override AI)
    note = Column(String, nullable=True)  # Teacher's feedback/comments
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # n-1 with result
    result = relationship("Result", back_populates="teacher_feedback", foreign_keys="Teacher_feedback.result_id")

    # n-1 with teacher (User)
    teacher = relationship("User", back_populates="feedbacks")
