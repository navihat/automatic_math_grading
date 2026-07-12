from typing import Optional
import httpx
from sqlalchemy.orm import Session

from src.db.models.rubric import Rubric
from src.api.schemas.rubric import RubricCreate, RubricUpdate
from src.services.ai.rubric_generator import extract_from_image, extract_from_pdf

# --- public ---

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
SUPPORTED_PDF_TYPE = "application/pdf"
ALLOWED_CONTENT_TYPES = SUPPORTED_IMAGE_TYPES | {SUPPORTED_PDF_TYPE}


def _upload_to_temp_storage(file_bytes: bytes) -> str:
    """
    Tải file ảnh tạm thời lên tmpfiles.org để lấy link URL công khai.
    OpenAI ở trên cloud không thể truy cập file cục bộ, nên bắt buộc phải có link public để đọc ảnh.
    Sau này dùng Supabase, bạn chỉ cần thay thế hàm này bằng hàm upload lên Supabase Storage.
    """
    files = {"file": ("temp_rubric_image.png", file_bytes)}
    try:
        response = httpx.post("https://tmpfiles.org/api/v1/upload", files=files)
        response.raise_for_status()
        data = response.json()
        # Convert link xem: https://tmpfiles.org/123456/file.png 
        # Thành link trực tiếp (direct link): https://tmpfiles.org/dl/123456/file.png
        url = data["data"]["url"]
        return url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/")
    except Exception as e:
        raise RuntimeError(f"Không thể upload ảnh lên bộ nhớ tạm. Chi tiết: {e}")


def extract_rubric_content(file_bytes: bytes, content_type: str) -> dict:
    """Trích xuất nội dung rubric từ file bytes. Hỗ trợ PDF và ảnh."""
    if content_type == SUPPORTED_PDF_TYPE:
        # Đối với PDF, chúng ta đọc text locally (không cần upload/download)
        return extract_from_pdf(file_bytes)
    
    # Đối với ảnh, chúng ta upload tạm thời để lấy link công khai cho OpenAI đọc
    file_url = _upload_to_temp_storage(file_bytes)
    return extract_from_image(file_url)


def create_rubric(db: Session, data: RubricCreate) -> Rubric:
    rubric = Rubric(
        title=data.title,
        content=data.content,
        assignment_id=data.assignment_id,
    )
    db.add(rubric)
    db.commit()
    db.refresh(rubric)
    return rubric


def get_rubric_by_id(db: Session, rubric_id: int) -> Optional[Rubric]:
    return db.query(Rubric).filter(Rubric.id == rubric_id).first()


def get_rubrics_by_assignment(db: Session, assignment_id: int) -> list[Rubric]:
    return db.query(Rubric).filter(Rubric.assignment_id == assignment_id).all()


def update_rubric(db: Session, rubric_id: int, data: RubricUpdate) -> Optional[Rubric]:
    rubric = get_rubric_by_id(db, rubric_id)
    if not rubric:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rubric, field, value)
    db.commit()
    db.refresh(rubric)
    return rubric


def delete_rubric(db: Session, rubric_id: int) -> bool:
    rubric = get_rubric_by_id(db, rubric_id)
    if not rubric:
        return False
    db.delete(rubric)
    db.commit()
    return True
