from typing import Any, Dict, Optional

from app.services.ai.ocr.interface import OCRProvider
from app.services.ai.ocr.models import OCRResult
from app.services.ai.ocr.exceptions import OCRExtractionError
from app.core.logging import get_logger

logger = get_logger(__name__)


class OCRService:
    def __init__(self, provider: OCRProvider):
        self.provider = provider

    def extract_text(
        self,
        image_bytes: bytes,
        mime_type: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> OCRResult:
        logger.info("OCRService: extract_text called with provider=%s", self.provider.__class__.__name__)
        try:
            result = self.provider.extract_text(image_bytes=image_bytes, mime_type=mime_type, options=options)
        except Exception as exc:
            logger.exception("OCRService: capture error from provider")
            raise OCRExtractionError(str(exc)) from exc

        if not result.ocr_text:
            logger.warning("OCRService: provider returned empty OCR text")

        return result
