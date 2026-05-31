from app.schemas.user import (
    UserBase, UserCreate, UserUpdate, UserResponse, UserWithRelations
)
from app.schemas.classroom import (
    StudentBase, StudentCreate, StudentUpdate, StudentResponse,
    ClassBase, ClassCreate, ClassUpdate, ClassResponse, ClassWithRelations
)
from app.schemas.assignment import (
    AssignmentBase, AssignmentCreate, AssignmentUpdate,
    AssignmentResponse, AssignmentWithRelations
)
from app.schemas.rubric import (
    RubricBase, RubricCreate, RubricUpdate, RubricResponse, RubricWithRelations
)
from app.schemas.submission import (
    SubmissionBase, SubmissionCreate, SubmissionUpdate,
    SubmissionResponse, SubmissionWithRelations
)
from app.schemas.result import (
    ResultBase, ResultCreate, ResultUpdate, ResultResponse, ResultWithRelations,
    TeacherFeedbackBase, TeacherFeedbackCreate, TeacherFeedbackUpdate,
    TeacherFeedbackResponse
)

__all__ = [
    # User
    "UserBase", "UserCreate", "UserUpdate", "UserResponse", "UserWithRelations",
    # Classroom
    "StudentBase", "StudentCreate", "StudentUpdate", "StudentResponse",
    "ClassBase", "ClassCreate", "ClassUpdate", "ClassResponse", "ClassWithRelations",
    # Assignment
    "AssignmentBase", "AssignmentCreate", "AssignmentUpdate",
    "AssignmentResponse", "AssignmentWithRelations",
    # Rubric
    "RubricBase", "RubricCreate", "RubricUpdate", "RubricResponse", "RubricWithRelations",
    # Submission
    "SubmissionBase", "SubmissionCreate", "SubmissionUpdate",
    "SubmissionResponse", "SubmissionWithRelations",
    # Result
    "ResultBase", "ResultCreate", "ResultUpdate", "ResultResponse", "ResultWithRelations",
    "TeacherFeedbackBase", "TeacherFeedbackCreate", "TeacherFeedbackUpdate",
    "TeacherFeedbackResponse",
]
