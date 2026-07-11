from typing import Any, Dict, Optional

from app.services.ai.ocr.interface import OCRProvider
from app.services.ai.ocr.models import OCRResult
from app.services.ai.ocr.exceptions import OCRExtractionError


class TesseractOCRAdapter(OCRProvider):
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
                "Tesseract OCR provider yêu cầu pytesseract và Pillow."
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
