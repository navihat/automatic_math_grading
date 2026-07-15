"""
Call 1 of the pipeline: OCR + Step Segmentation + Intermediate Representation.

Single Gemini call returns all three layers to minimise API round-trips.
Gemini also self-reports symbols it is uncertain about (Solution 1 for confidence).

Also provides TesseractOCRAdapter as a fallback for plain-text OCR.
"""
import json
from typing import Any, Dict, Optional

from pydantic import BaseModel
from google.genai import types
from src.services.ai.client import get_gemini_client


# ── Models ───────────────────────────────────────────────────────────────────

class OCRResult(BaseModel):
    ocr_text: str
    latex_text: Optional[str] = None
    confidence: float = 0.0
    provider: str
    metadata: Optional[Dict[str, Any]] = None
    raw_response: Optional[Dict[str, Any]] = None

    class Config:
        arbitrary_types_allowed = True


# ── Exceptions ────────────────────────────────────────────────────────────────

class OCRExtractionError(RuntimeError):
    """Lỗi khi gọi dịch vụ OCR bên ngoài hoặc parse kết quả."""


class OCRProviderNotFoundError(ValueError):
    """Tên provider OCR không được hỗ trợ."""


# ── Full extraction (Gemini) ──────────────────────────────────────────────────

_FORMAT = """{
  "ocr_text": "toàn bộ nội dung viết tay, công thức dạng LaTeX",
  "uncertain_symbols": [
    "mô tả ký hiệu/đoạn bạn không chắc chắn, ví dụ: 'ký hiệu dòng 2 có thể là x hoặc ×'"
  ],
  "steps": [
    {
      "step_no": 1,
      "raw_text": "văn bản gốc của bước này",
      "latex": "biểu diễn LaTeX của bước"
    }
  ],
  "ir": [
    {
      "step_no": 1,
      "lhs": "vế trái dạng sympy-parseable (dùng ** cho lũy thừa, * cho nhân)",
      "rhs": "vế phải dạng sympy-parseable",
      "operation": "loại thao tác: equation|simplify|substitute|solve|arithmetic|other",
      "relation_to_prev": null
    }
  ]
}"""

_PROMPT = """Bạn là hệ thống phân tích lời giải toán viết tay. Hãy thực hiện 4 nhiệm vụ sau với ảnh đã cho:

1. **OCR**: Trích xuất toàn bộ nội dung viết tay, công thức toán ở dạng LaTeX.
2. **Tự đánh giá**: Liệt kê các ký hiệu hoặc đoạn bạn KHÔNG CHẮC CHẮN (chữ khó đọc, ký hiệu mờ, nhiều cách đọc). Nếu chắc chắn tất cả, để mảng rỗng [].
3. **Tách bước**: Mỗi dòng/bước giải là một phần tử trong mảng `steps`.
4. **Intermediate Representation (IR)**: Với mỗi bước, trích xuất:
   - `lhs`/`rhs`: hai vế của phương trình/biểu thức, dạng Python-SymPy parseable (dùng `**` cho lũy thừa, `*` cho nhân, `sqrt()` cho căn).
   - `operation`: loại thao tác toán học.
   - `relation_to_prev`: step_no của bước trước mà bước này xuất phát từ (null nếu là bước đầu).
   - Nếu bước không phải phương trình (ví dụ: câu văn, lời giải thích), để lhs/rhs là chuỗi rỗng "".

Trả về JSON thuần (không markdown) đúng cấu trúc:
{format}

Chỉ trả JSON, không có text nào khác."""


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        lines = lines[1:] if lines[0].startswith("```") else lines
        lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
        text = "\n".join(lines).strip()
    decoder = json.JSONDecoder()
    result, _ = decoder.raw_decode(text)
    return result


def extract(images: list[tuple[bytes, str]]) -> dict:
    """
    Run OCR + step segmentation + IR extraction in one Gemini call.

    Args:
        images: list of (image_bytes, mime_type) in page order.

    Returns:
        {
          "ocr_text": str,
          "uncertain_symbols": list[str],
          "steps": list[dict],
          "ir": list[dict]
        }
    """
    client = get_gemini_client()
    parts: list = [types.Part.from_bytes(data=b, mime_type=m) for b, m in images]
    parts.append(_PROMPT.format(format=_FORMAT))
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=parts,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )

    result = _parse_json(response.text)
    result.setdefault("ocr_text", "")
    result.setdefault("uncertain_symbols", [])
    result.setdefault("steps", [])
    result.setdefault("ir", [])
    return result


# ── Tesseract adapter (plain-text fallback) ───────────────────────────────────

class TesseractOCRAdapter:
    """Tesseract-based OCR, chỉ trả plain text (không có steps/IR)."""

    def extract_text(
        self,
        image_bytes: bytes,
        mime_type: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> OCRResult:
        try:
            import pytesseract
            from PIL import Image
            import io
        except ImportError as exc:
            raise OCRExtractionError(
                "Tesseract OCR yêu cầu pytesseract và Pillow."
            ) from exc

        try:
            image = Image.open(io.BytesIO(image_bytes))
            config = (options or {}).get("config", "")
            ocr_text = pytesseract.image_to_string(image, config=config)
        except Exception as exc:
            raise OCRExtractionError(f"Tesseract OCR failed: {exc}") from exc

        return OCRResult(
            ocr_text=ocr_text.strip(),
            latex_text=None,
            confidence=0.0,
            provider="tesseract",
            metadata={"mime_type": mime_type},
            raw_response={"source": "tesseract"},
        )
