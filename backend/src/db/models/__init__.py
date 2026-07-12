from src.db.models.user import User
from src.db.models.rubric import Rubric
from src.db.models.classroom import Class, Student, classes_assignments
from src.db.models.assignment import Assignment
from src.db.models.submission import Submission
from src.db.models.result import Result, Teacher_feedback

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
