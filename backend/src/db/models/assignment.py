from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.core.database import Base


class Assignment(Base):
    __tablename__ = 'assignments'

    id = Column(Integer, primary_key=True, index=True)
    deadline = Column(DateTime(timezone=True), nullable=False)
    problem_text = Column(Text, nullable=False)  # Problem statement/instructions
    type = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # n-1 with teacher (User)
    teacher = relationship("User", back_populates="assignments")

    # 1-1 with rubric (Each assignment has one rubric)
    rubric = relationship("Rubric", back_populates="assignment", uselist=False)

    # n-n with classes (via classes_assignments junction table)
    classes = relationship(
        "Class",
        secondary="classes_assignments",
        back_populates="assignments"
    )
