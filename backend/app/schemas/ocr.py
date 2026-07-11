from typing import Dict, Optional

from pydantic import BaseModel


class OCRResponse(BaseModel):
    ocr_text: str
    latex_text: Optional[str] = None
    confidence: float
    provider: str
    metadata: Optional[Dict[str, Optional[str]]] = None
    raw_response: Optional[Dict[str, Optional[str]]] = None

    class Config:
        from_attributes = True
