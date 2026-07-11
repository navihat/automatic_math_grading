from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from app.services.ai.ocr.models import OCRResult


class OCRProvider(ABC):
    @abstractmethod
    def extract_text(
        self,
        image_bytes: bytes,
        mime_type: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> OCRResult:
        raise NotImplementedError
