import pytest

from app.services.ai.ocr.factory import get_ocr_provider
from app.services.ai.ocr.exceptions import OCRProviderNotFoundError


def test_get_ocr_provider_gemini():
    provider = get_ocr_provider("gemini")
    assert provider.__class__.__name__ == "GeminiOCRAdapter"


def test_get_ocr_provider_tesseract():
    provider = get_ocr_provider("tesseract")
    assert provider.__class__.__name__ == "TesseractOCRAdapter"


def test_get_ocr_provider_invalid():
    with pytest.raises(OCRProviderNotFoundError):
        get_ocr_provider("unknown")
