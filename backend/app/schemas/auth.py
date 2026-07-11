from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str  # Email (giáo viên) hoặc student_code (học sinh)
    password: str

class LoginResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    username: str  # email hoặc student_code
    role: str      # "teacher" hoặc "student"
    token: str     # UUID session token
    class_id: Optional[int] = None  # Chỉ dành cho học sinh
