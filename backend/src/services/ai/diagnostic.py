"""
Call 2 of the pipeline: Milestone checking + Misconception mapping + Feedback generation.

Single Gemini call that receives the rubric milestones, IR, and verification results,
then returns milestone achievement, misconception detections, and diagnostic feedback.
"""
import json
import logging
from google.genai import types
from src.core.config import settings
from src.services.ai.client import get_gemini_client
from src.services.ai.json_utils import parse_llm_json

logger = logging.getLogger(__name__)

_FORMAT = """{
  "milestones": [
    {
      "id": "m1",
      "name": "tên milestone",
      "achieved": true,
      "evidence": "giải thích ngắn tại sao đạt hoặc chưa đạt"
    }
  ],
  "misconceptions": [
    {
      "code": "MÃ_MISCONCEPTION",
      "name": "tên misconception",
      "step_no": 2,
      "confidence": "high|medium|low",
      "detail": "giải thích cụ thể lỗi này trong bài làm"
    }
  ],
  "feedback": "phản hồi chẩn đoán tự nhiên bằng tiếng Việt, xưng hô 'em', nêu rõ bước sai và cách sửa",
  "needs_review": false
}"""

_PROMPT = """Bạn là giáo viên toán phân tích lời giải của học sinh. Dựa vào thông tin dưới đây, hãy thực hiện 3 nhiệm vụ:

## ĐỀ BÀI:
{problem_statement}

## MILESTONE RUBRIC (các mốc suy luận cần đạt):
{milestones_json}

## LỜI GIẢI ĐÃ TRÍCH XUẤT (IR từng bước):
{ir_json}

## KẾT QUẢ KIỂM CHỨNG TỪNG BƯỚC (SymPy):
{verification_json}

## DANH MỤC MISCONCEPTION (dùng để ánh xạ lỗi):
{misconceptions_catalog}

---
### NHIỆM VỤ:

1. **MILESTONE**: Với mỗi milestone trong rubric, xác định học sinh đã đạt hay chưa, dựa trên IR và kết quả verifier.

2. **MISCONCEPTION**: Với mỗi bước sai (is_valid=false trong verifier), ánh xạ lỗi vào danh mục misconception đã cho. Chỉ dùng `code` từ danh mục. Nếu không khớp với bất kỳ mã nào, để trống mảng.

3. **FEEDBACK**: Viết phản hồi chẩn đoán bằng tiếng Việt tự nhiên (3–6 câu), xưng "em", chỉ rõ bước sai, lý do sai, và gợi ý sửa.

4. **NEEDS_REVIEW**: Đặt `needs_review: true` nếu OCR có ký hiệu không chắc chắn, hoặc verifier trả về `is_valid: null`, hoặc lời giải quá khác thường.

Trả về JSON thuần (không markdown) đúng cấu trúc:
{format}

Chỉ trả JSON, không có text nào khác."""


def analyze(
    problem_statement: str,
    milestones: list[dict],
    ir_steps: list[dict],
    verification: list[dict],
    misconceptions_catalog: list[dict],
    uncertain_symbols: list[str],
) -> dict:
    """
    Combined milestone check + misconception mapping + feedback generation.

    Returns:
        {
          "milestones": list[dict],
          "misconceptions": list[dict],
          "feedback": str,
          "needs_review": bool
        }
    """
    # Add uncertain_symbols to context if present
    extra_context = ""
    if uncertain_symbols:
        items = "; ".join(uncertain_symbols)
        extra_context = f"\n\n**OCR CÓ KÝ HIỆU KHÔNG CHẮC CHẮN**: {items}. Hãy đặt needs_review=true."

    # Build compact catalog for prompt (avoid bloating context)
    catalog_lines = [
        f"- {m['code']}: {m['name']} — {m['description']}"
        for m in misconceptions_catalog
    ]

    prompt = _PROMPT.format(
        problem_statement=problem_statement or "(không có đề bài)",
        milestones_json=json.dumps(milestones, ensure_ascii=False, indent=2),
        ir_json=json.dumps(ir_steps, ensure_ascii=False, indent=2),
        verification_json=json.dumps(verification, ensure_ascii=False, indent=2),
        misconceptions_catalog="\n".join(catalog_lines),
        format=_FORMAT,
    ) + extra_context

    client = get_gemini_client()
    response = client.models.generate_content(
        model=settings.GEMINI_DIAGNOSTIC_MODEL,
        contents=[prompt],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )

    if not response.text:
        logger.error("Gemini trả về response rỗng cho analyze")
        raise ValueError("AI không trả về kết quả. Kiểm tra lại GEMINI_API_KEY.")

    try:
        result = parse_llm_json(response.text)
    except json.JSONDecodeError as e:
        logger.error("Không parse được JSON từ Gemini: %s\nRaw: %s", e, response.text[:500])
        raise ValueError(f"AI trả về định dạng không hợp lệ: {e}")
    result.setdefault("milestones", [])
    result.setdefault("misconceptions", [])
    result.setdefault("feedback", "")
    result.setdefault("needs_review", bool(uncertain_symbols))
    return result

