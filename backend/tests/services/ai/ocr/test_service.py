import pytest

from app.services.ai.ocr.service import OCRService
from app.services.ai.ocr.models import OCRResult
from app.services.ai.ocr.interface import OCRProvider
from app.services.ai.ocr.exceptions import OCRExtractionError


class DummyOCRProvider(OCRProvider):
    def extract_text(self, image_bytes: bytes, mime_type: str, options=None) -> OCRResult:
        return OCRResult(
            ocr_text="test",
            latex_text="x^2",
            confidence=0.95,
            provider="dummy",
            metadata={"dummy": True},
            raw_response={"ok": True},
        )


class FailingProvider(OCRProvider):
    def extract_text(self, image_bytes: bytes, mime_type: str, options=None) -> OCRResult:
        raise RuntimeError("provider failed")


def test_ocr_service_returns_result():
    service = OCRService(provider=DummyOCRProvider())
    result = service.extract_text(b"image", "image/png")

    assert result.ocr_text == "test"
    assert result.latex_text == "x^2"
    assert result.confidence == 0.95
    assert result.provider == "dummy"


def test_ocr_service_raises_ocr_extraction_error():
    service = OCRService(provider=FailingProvider())

    with pytest.raises(OCRExtractionError):
        service.extract_text(b"image", "image/png")
