import json
import io
import httpx
from google.genai import types
from src.services.ai.client import get_gemini_client

# Định dạng output mong muốn (dưới dạng chuỗi template JSON)
format_output = """{
  "criteria": [
    {"name": "tên tiêu chí", "description": "mô tả", "max_score": số_điểm}
  ],
  "total_score": tổng_điểm_tối_đa,
  "notes": "ghi chú thêm nếu có"
}"""

_RUBRIC_PROMPT = (
    "Đây là tiêu chí chấm điểm (rubric) cho bài thi toán. "
    "Hãy trích xuất và trả về JSON với cấu trúc:\n"
    "Trích xuất đầy đủ nội dung bạn nhìn thấy được, không bỏ xót. Các công thức toán học đưa về dạng latex"
    "{format_output}\n"
    "Chỉ trả về JSON thuần, không dùng markdown."
)


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    result, _ = json.JSONDecoder().raw_decode(text)
    return result


def extract_from_image(image_url: str) -> dict:
    """Gọi Gemini API để trích xuất rubric từ link ảnh (ví dụ link từ Supabase Storage)."""
    # 1. Tải ảnh từ URL về bộ nhớ (vì Gemini API không hỗ trợ đọc trực tiếp link https:// thông qua URI)
    try:
        resp = httpx.get(image_url)
        resp.raise_for_status()
        file_bytes = resp.content
        # Lấy định dạng ảnh từ HTTP Header (image/png, image/jpeg, v.v.)
        media_type = resp.headers.get("Content-Type", "image/png")
    except Exception as e:
        raise RuntimeError(f"Không thể tải ảnh từ URL: {image_url}. Chi tiết: {e}")

    client = get_gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(
                data=file_bytes,
                mime_type=media_type,
            ),
            _RUBRIC_PROMPT.format(format_output=format_output),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    return _parse_json(response.text)


def extract_from_pdf(file_bytes: bytes) -> dict:
    """Gọi Gemini API gửi thẳng file PDF (hỗ trợ cả PDF thường và PDF scan)."""
    client = get_gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(
                data=file_bytes,
                mime_type="application/pdf",
            ),
            _RUBRIC_PROMPT.format(format_output=format_output),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    return _parse_json(response.text)