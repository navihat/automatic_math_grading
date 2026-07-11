from fastapi.testclient import TestClient

from app.main import app
from app.services.ai.ocr.interface import OCRProvider
from app.services.ai.ocr.models import OCRResult


class DummyProvider(OCRProvider):
    def extract_text(self, image_bytes: bytes, mime_type: str, options=None) -> OCRResult:
        return OCRResult(
            ocr_text="dummy text",
            latex_text="x^2 + y^2",
            confidence=0.88,
            provider="dummy",
            metadata={"source": "test"},
            raw_response={"ok": True},
        )


def test_ocr_extract_route(monkeypatch):
    def fake_provider(name: str):
        return DummyProvider()

    monkeypatch.setattr("app.routes.ocr.get_ocr_provider", fake_provider)

    client = TestClient(app)
    response = client.post(
        "/api/ocr/extract",
        files={"file": ("test.png", b"fakeimagecontent", "image/png")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["ocr_text"] == "dummy text"
    assert data["provider"] == "dummy"
    assert data["confidence"] == 0.88


def test_ocr_extract_invalid_provider(monkeypatch):
    def fake_provider(name: str):
        raise ValueError("Provider not supported")

    monkeypatch.setattr("app.routes.ocr.get_ocr_provider", fake_provider)

    client = TestClient(app)
    response = client.post(
        "/api/ocr/extract?provider=invalid",
        files={"file": ("test.png", b"fakeimagecontent", "image/png")},
    )

    assert response.status_code == 500
    assert "Provider not supported" in response.json()["detail"]
