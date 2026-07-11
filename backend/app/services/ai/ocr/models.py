from typing import Any, Dict, Optional

from pydantic import BaseModel


class OCRResult(BaseModel):
    ocr_text: str
    latex_text: Optional[str] = None
    confidence: float = 0.0
    provider: str
    metadata: Optional[Dict[str, Any]] = None
    raw_response: Optional[Dict[str, Any]] = None

    class Config:
        arbitrary_types_allowed = True
