"""
Offline rubric authoring: generate milestone rubric from the problem statement (image or text).

Not part of the per-submission pipeline — the teacher reviews and locks the milestones
before any submission is analysed against them.
"""
import json
import logging

from google.genai import types

from src.core.config import settings
from src.services.ai.client import get_gemini_client
from src.services.ai.json_utils import parse_llm_json

logger = logging.getLogger(__name__)


_MILESTONE_PROMPT = """Bạn là giáo viên toán THCS. Phân tích đề bài và tạo danh sách MILESTONE (mốc suy luận) để chấm điểm lời giải học sinh.

## QUY TẮC PHÂN TÍCH CẤU TRÚC ĐỀ BÀI:

**Trường hợp 1 – Một câu có sub-questions (a, b, c, d) dùng CÙNG PHƯƠNG PHÁP:**
→ Tạo 1 bộ milestone chung cho PHƯƠNG PHÁP GIẢI. Không lặp lại từng câu.
→ Để `question_group` là `null` cho tất cả milestone.
→ Ví dụ: "Giải các phương trình: a) 2x+3=7, b) x-5=2" → chung 1 milestone "Chuyển vế và tính x".

**Trường hợp 2 – Nhiều câu KHÁC phương pháp (Câu 1: phương trình, Câu 2: bất đẳng thức):**
→ Tạo milestone riêng cho từng câu, đặt `question_group` = tên câu ("Câu 1", "Câu 2"...).
→ Mỗi nhóm có 2–5 milestone.

## YÊU CẦU MILESTONE:
- Mô tả BƯỚC SUY LUẬN / PHƯƠNG PHÁP, KHÔNG phải giá trị số cụ thể.
- Milestone phải solution-agnostic (đúng cho nhiều cách giải khác nhau).
- Thứ tự logic của lời giải.
- Mỗi milestone: id (m1, m2... hoặc q1_m1, q2_m1...), name (ngắn ≤ 8 từ), description (rõ ràng).

Trả về JSON thuần:
{
  "milestones": [
    {"id": "m1", "name": "...", "description": "...", "question_group": null}
  ]
}"""


def generate_milestones(
    problem_text: str = "",
    image_bytes: bytes | None = None,
    image_mime: str = "image/jpeg",
) -> list[dict]:
    """
    Sinh milestone từ ảnh đề bài (ưu tiên) hoặc text.
    Tự động phát hiện cấu trúc (1 câu / nhiều câu / sub-questions).
    """
    client = get_gemini_client()

    if image_bytes:
        contents = [
            types.Part.from_bytes(data=image_bytes, mime_type=image_mime),
            _MILESTONE_PROMPT,
        ]
    else:
        contents = [f"ĐỀ BÀI:\n{problem_text}\n\n{_MILESTONE_PROMPT}"]

    response = client.models.generate_content(
        model=settings.GEMINI_DIAGNOSTIC_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )

    if not response.text:
        logger.error("Gemini trả về response rỗng cho generate_milestones")
        raise ValueError("AI không trả về kết quả. Kiểm tra lại GEMINI_API_KEY.")

    try:
        data = parse_llm_json(response.text)
    except json.JSONDecodeError as e:
        logger.error("Không parse được JSON từ Gemini: %s\nRaw: %s", e, response.text[:500])
        raise ValueError(f"AI trả về định dạng không hợp lệ: {e}")

    milestones = data.get("milestones", [])
    for m in milestones:
        m.setdefault("question_group", None)
    return milestones
