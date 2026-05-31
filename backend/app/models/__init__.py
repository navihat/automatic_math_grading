from app.models.user import User
from app.models.rubric import Rubric
from app.models.classroom import Class, Student, classes_assignments
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.result import Result, Teacher_feedback

__all__ = [
    "User",
    "Rubric",
    "Class",
    "Student",
    "Assignment",
    "Submission",
    "Result",
    "Teacher_feedback",
    "classes_assignments",
]
