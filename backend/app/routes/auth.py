import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.classroom import Student
from app.schemas.auth import LoginRequest, LoginResponse
from app.utils.security import verify_password, hash_password

router = APIRouter(prefix="/auth", tags=["auth"])


def ensure_student_user(student: Student, db: Session) -> User:
    """Create or sync the User account backing a student profile."""
    if student.user:
        user = student.user
        user.role = "student"
        user.name = student.name
        if not user.password_hash and student.password_hash:
            user.password_hash = student.password_hash
        return user

    user = User(
        role="student",
        email=None,
        name=student.name,
        password_hash=student.password_hash,
    )
    db.add(user)
    db.flush()
    student.user_id = user.id
    return user

@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Xác thực thông tin đăng nhập:
    - Tìm kiếm Giáo viên theo Email.
    - Tìm kiếm Học sinh theo Mã học sinh (Student Code).
    """
    username = data.username.strip()
    password = data.password

    # 1. Thử đăng nhập dưới vai trò Giáo viên
    teacher = db.query(User).filter(User.email == username).first()
    if teacher:
        # Nếu chưa có password_hash (do dữ liệu cũ), mật khẩu mặc định là 'admin123'
        if not teacher.password_hash:
            if password == "admin123" or password == "teacher123":
                teacher.password_hash = hash_password(password)
                db.commit()
                db.refresh(teacher)
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Mật khẩu giáo viên không chính xác."
                )
        
        if verify_password(password, teacher.password_hash):
            return LoginResponse(
                id=teacher.id,
                user_id=teacher.id,
                name=teacher.name,
                username=teacher.email,
                role="teacher",
                token=str(uuid.uuid4())
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mật khẩu giáo viên không chính xác."
            )

    # 2. Thử đăng nhập dưới vai trò Học sinh
    student = db.query(Student).filter(Student.student_code == username).first()
    if student:
        user = ensure_student_user(student, db)

        # Nếu chưa có password_hash, mật khẩu mặc định chính là student_code
        if not user.password_hash:
            if password == student.student_code:
                user.password_hash = hash_password(password)
                student.password_hash = user.password_hash
                db.commit()
                db.refresh(student)
                db.refresh(user)
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Mật khẩu học sinh không chính xác."
                )

        if verify_password(password, user.password_hash):
            if student.password_hash != user.password_hash:
                student.password_hash = user.password_hash
                db.commit()
            return LoginResponse(
                id=student.id,
                user_id=user.id,
                name=student.name,
                username=student.student_code,
                role=user.role,
                token=str(uuid.uuid4()),
                class_id=student.class_id
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mật khẩu học sinh không chính xác."
            )

    # 3. Không tìm thấy tài khoản
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Tài khoản hoặc mật khẩu không chính xác."
    )
