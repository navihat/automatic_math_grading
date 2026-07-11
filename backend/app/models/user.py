from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, index=True)
    email = Column(String, unique=True)
    password_hash = Column(String, nullable=True)
    name = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 1-n with classes (Teacher owns classes)
    classes = relationship("Class", back_populates="teacher")

    # 1-n with assignments (Teacher creates assignments)
    assignments = relationship("Assignment", back_populates="teacher")

    # 1-n with teacher feedback
    feedbacks = relationship("Teacher_feedback", back_populates="teacher")

    # 1-1 with student profile (for users with role="student")
    student_profile = relationship("Student", back_populates="user", uselist=False)
