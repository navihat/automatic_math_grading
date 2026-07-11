import json
from typing import Any, Dict, Optional

from google.genai import types

from app.services.ai.ocr.interface import OCRProvider
from app.services.ai.ocr.models import OCRResult
from app.services.ai.ocr.exceptions import OCRExtractionError
from app.services.ai.cilent import get_gemini_client


_PROMPT = """Bạn là một hệ thống OCR toán học.
Nhận đầu vào là ảnh handwritten math, trích xuất toàn bộ nội dung viết tay; nếu có công thức toán học, chuyển sang LaTeX.
Trả về JSON sau:
{
  "ocr_text": "...",
  "latex_text": "...",
  "confidence": số,
  "metadata": { ... }
}
"""


class GeminiOCRAdapter(OCRProvider):
    def extract_text(
        self,
        image_bytes: bytes,
        mime_type: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> OCRResult:
        client = get_gemini_client()
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-preview-05-20",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    _PROMPT,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            payload = self._parse_response(response.text)
        except Exception as exc:
            raise OCRExtractionError(f"Gemini OCR failed: {exc}") from exc

        return OCRResult(
            ocr_text=payload.get("ocr_text", ""),
            latex_text=payload.get("latex_text"),
            confidence=payload.get("confidence", 0.0),
            provider="gemini",
            metadata=payload.get("metadata", {}),
            raw_response=payload,
        )

    @staticmethod
    def _parse_response(text: str) -> Dict[str, Any]:
        result = text.strip()
        if result.startswith("```"):
            lines = result.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            result = "\n".join(lines)
        try:
            return json.loads(result)
        except json.JSONDecodeError as exc:
            raise OCRExtractionError("Gemini OCR returned invalid JSON") from exc
