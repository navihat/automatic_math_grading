from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.core.config import UPLOAD_DIR, settings
from src.core.database import SessionLocal, create_tables
from src.db.models.user import User
from src.api.routes.rubric import router as rubric_router
from src.api.routes.classroom import router as classroom_router
from src.api.routes.assignment import router as assignment_router
from src.api.routes.submission import router as submission_router
from src.api.routes.review import router as review_router
from src.api.routes.auth import router as auth_router
from src.api.routes.analysis import router as analysis_router
from src.utils.security import hash_password

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: tạo bảng, seed user mặc định, tạo thư mục uploads."""
    # Tạo bảng nếu chưa có
    create_tables()

    # Tạo thư mục uploads
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Seed giáo viên demo mặc định
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.id == 1).first():
            db.add(User(
                id=1,
                role="teacher",
                email="teacher@demo.com",
                name="Giáo viên Demo",
                password_hash=hash_password("admin123")
            ))
            db.commit()
    finally:
        db.close()

    yield  # ── App chạy ──


app = FastAPI(
    title="Automatic Math Grading",
    description="Hệ thống chấm điểm bài toán viết tay tự động",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (ảnh bài nộp)
app.mount("/static/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Register routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(rubric_router, prefix=settings.API_PREFIX)
app.include_router(classroom_router, prefix=settings.API_PREFIX)
app.include_router(assignment_router, prefix=settings.API_PREFIX)
app.include_router(submission_router, prefix=settings.API_PREFIX)
app.include_router(review_router, prefix=settings.API_PREFIX)
app.include_router(analysis_router, prefix=settings.API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
