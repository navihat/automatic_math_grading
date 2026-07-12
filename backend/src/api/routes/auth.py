import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.db.models.user import User
from src.db.models.classroom import Student
from src.api.schemas.auth import LoginRequest, LoginResponse
from src.utils.security import verify_password, hash_password

router = APIRouter(prefix="/auth", tags=["auth"])

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
        # Nếu chưa có password_hash, mật khẩu mặc định chính là student_code
        if not student.password_hash:
            if password == student.student_code:
                student.password_hash = hash_password(password)
                db.commit()
                db.refresh(student)
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Mật khẩu học sinh không chính xác."
                )

        if verify_password(password, student.password_hash):
            return LoginResponse(
                id=student.id,
                name=student.name,
                username=student.student_code,
                role="student",
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
