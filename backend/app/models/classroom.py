from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base

# Junction table for n-n relationship between classes and assignments
classes_assignments = Table(
    'classes_assignments',
    Base.metadata,
    Column('class_id', Integer, ForeignKey('classes.id'), primary_key=True),
    Column('assignment_id', Integer, ForeignKey('assignments.id'), primary_key=True),
)


class Class(Base):
    __tablename__ = 'classes'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    year = Column(Integer, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # n-1 with teacher (User)
    teacher = relationship("User", back_populates="classes")

    # 1-n with students
    students = relationship("Student", back_populates="class_obj")

    # n-n with assignments (via classes_assignments junction table)
    assignments = relationship(
        "Assignment",
        secondary=classes_assignments,
        back_populates="classes"
    )


class Student(Base):
    __tablename__ = 'students'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    student_code = Column(String, index=True, unique=True)
    password_hash = Column(String, nullable=True)
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # n-1 with class
    class_obj = relationship("Class", back_populates="students")

    # 1-n with submissions
    submissions = relationship("Submission", back_populates="student")
