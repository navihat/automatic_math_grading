import base64
import json
import io
from typing import Optional

from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.rubric import Rubric
from app.schemas.rubric import RubricCreate, RubricUpdate

_client = OpenAI(api_key=settings.OPENAI_API_KEY)

_RUBRIC_PROMPT = (
    "Đây là tiêu chí chấm điểm (rubric) cho bài thi toán. "
    "Hãy trích xuất và trả về JSON với cấu trúc:\n"
    "{\n"
    '  "criteria": [\n'
    '    {"name": "tên tiêu chí", "description": "mô tả", "max_score": số_điểm}\n'
    "  ],\n"
    '  "total_score": tổng_điểm_tối_đa,\n'
    '  "notes": "ghi chú thêm nếu có"\n'
    "}\n"
    "Chỉ trả về JSON thuần, không dùng markdown."
)

# --- nội bộ ---

def _extract_from_image(file_bytes: bytes, media_type: str) -> dict:
    b64 = base64.standard_b64encode(file_bytes).decode()
    response = _client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _RUBRIC_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{b64}"},
                    },
                ],
            }
        ],
    )
    return json.loads(response.choices[0].message.content)


def _extract_from_pdf(file_bytes: bytes) -> dict:
    try:
        from pypdf import PdfReader
    except ImportError:
        raise RuntimeError(
            "Thư viện 'pypdf' chưa được cài. Chạy: uv add pypdf"
        )

    reader = PdfReader(io.BytesIO(file_bytes))
    text = "\n".join(
        page.extract_text() or "" for page in reader.pages
    ).strip()

    if not text:
        raise ValueError(
            "Không thể đọc text từ PDF (có thể là PDF scan). "
            "Vui lòng upload ảnh chụp trang rubric."
        )

    response = _client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "Bạn là trợ lý trích xuất rubric chấm điểm."},
            {"role": "user", "content": f"{_RUBRIC_PROMPT}\n\nNội dung:\n{text}"},
        ],
    )
    return json.loads(response.choices[0].message.content)


# --- public ---

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
SUPPORTED_PDF_TYPE = "application/pdf"
ALLOWED_CONTENT_TYPES = SUPPORTED_IMAGE_TYPES | {SUPPORTED_PDF_TYPE}


def extract_rubric_content(file_bytes: bytes, content_type: str) -> dict:
    """Trích xuất nội dung rubric từ file bytes. Hỗ trợ PDF và ảnh."""
    if content_type == SUPPORTED_PDF_TYPE:
        return _extract_from_pdf(file_bytes)
    return _extract_from_image(file_bytes, content_type)


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
