from typing import Dict

from app.services.ai.ocr.adapters.gemini_adapter import GeminiOCRAdapter
from app.services.ai.ocr.adapters.tesseract_adapter import TesseractOCRAdapter
from app.services.ai.ocr.exceptions import OCRProviderNotFoundError
from app.services.ai.ocr.interface import OCRProvider


def get_ocr_provider(provider_name: str) -> OCRProvider:
    providers: Dict[str, OCRProvider] = {
        "gemini": GeminiOCRAdapter(),
        "tesseract": TesseractOCRAdapter(),
    }

    normalized_name = provider_name.strip().lower()
    if normalized_name not in providers:
        raise OCRProviderNotFoundError(f"OCR provider '{provider_name}' không được hỗ trợ.")

    return providers[normalized_name]


def get_ocr_service(provider_name: str) -> "OCRService":
    from app.services.ai.ocr.service import OCRService

    provider = get_ocr_provider(provider_name)
    return OCRService(provider=provider)
