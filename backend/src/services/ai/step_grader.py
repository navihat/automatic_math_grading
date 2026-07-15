"""
AI Step Grader – Chấm điểm bài toán viết tay theo rubric bằng Gemini API.

Input: ảnh bài làm + rubric JSON
Output: OCR text, điểm từng tiêu chí, tổng điểm, độ tự tin
"""
import json

from google.genai import types

from src.services.ai.client import get_gemini_client

# ── Định dạng JSON mong muốn từ AI ──────────────────────────
_FORMAT_OUTPUT = """{
  "ocr_text": "toàn bộ nội dung viết tay trích xuất được, công thức toán ở dạng LaTeX",
  "steps": {
    "criteria_scores": [
      {
        "criterion_name": "tên tiêu chí",
        "max_score": 5,
        "awarded_score": 4,
        "reasoning": "giải thích lý do cho điểm"
      }
    ],
    "overall_feedback": "nhận xét tổng thể về bài làm"
  },
  "total_score": 8,
  "confidence": 0.85
}"""

_GRADING_PROMPT_TEMPLATE = """Bạn là một giáo viên toán đang chấm bài viết tay của học sinh.

## OCR EXTRACTED TEXT:
{ocr_text}

## RUBRIC (Tiêu chí chấm điểm):
{rubric_json}

## NHIỆM VỤ:
1. Dùng nội dung OCR đã trích xuất ở trên làm tham chiếu.
2. **Chấm điểm**: Đối chiếu bài làm với TỪNG tiêu chí trong rubric và cho điểm cụ thể.
3. **Giải thích**: Với mỗi tiêu chí, nêu rõ lý do tại sao cho điểm đó (bước nào đúng, bước nào sai, thiếu gì).
4. **Tổng điểm**: Tính tổng điểm từ các tiêu chí.
5. **Độ tự tin**: Ước lượng mức độ tự tin của bạn về kết quả chấm (0.0 đến 1.0). Nếu chữ viết tay khó đọc hoặc ảnh mờ, hạ confidence.

## YÊU CẦU OUTPUT:
Trả về JSON thuần (không dùng markdown), đúng cấu trúc sau:
{format_output}

Lưu ý:
- total_score phải bằng tổng awarded_score của tất cả criteria.
- awarded_score không được vượt quá max_score của tiêu chí tương ứng.
- Chỉ trả JSON, không có text nào khác bao bọc."""


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


def grade_student_work(
    image_bytes: bytes,
    mime_type: str,
    rubric_content: dict,
    ocr_text: str | None = None,
) -> dict:
    """
    Gọi Gemini API để chấm bài viết tay.

    Args:
        image_bytes: Dữ liệu ảnh bài làm (raw bytes)
        mime_type: MIME type (image/jpeg, image/png, ...)
        rubric_content: Dict chứa tiêu chí chấm điểm (từ Rubric.content)
        ocr_text: Nếu có, văn bản OCR đã trích xuất từ ảnh.

    Returns:
        Dict chứa ocr_text, steps, total_score, confidence
    """
    rubric_json = json.dumps(rubric_content, ensure_ascii=False, indent=2)
    prompt = _GRADING_PROMPT_TEMPLATE.format(
        rubric_json=rubric_json,
        format_output=_FORMAT_OUTPUT,
        ocr_text=ocr_text or "",
    )

    client = get_gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    result = _parse_json(response.text)

    if ocr_text:
        result.setdefault("ocr_text", ocr_text)

    result.setdefault("ocr_text", "")
    result.setdefault("steps", {"criteria_scores": [], "overall_feedback": ""})
    result.setdefault("total_score", 0)
    result.setdefault("confidence", 0.0)

    return result
