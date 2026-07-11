import json
import pytest

from app.services.ai.ocr.adapters.gemini_adapter import GeminiOCRAdapter
from app.services.ai.ocr.exceptions import OCRExtractionError


class DummyResponse:
    def __init__(self, text: str):
        self.text = text


class DummyModels:
    def __init__(self, response_text: str):
        self.response_text = response_text

    def generate_content(self, model, contents, config):
        return DummyResponse(self.response_text)


class DummyClient:
    def __init__(self, response_text: str):
        self.models = DummyModels(response_text)


@pytest.fixture(autouse=True)
def patch_get_gemini_client(monkeypatch):
    def _dummy_client():
        return DummyClient(
            '{"ocr_text":"abc","latex_text":"x^2","confidence":0.9,"metadata":{"foo":"bar"}}'
        )

    monkeypatch.setattr("app.services.ai.ocr.adapters.gemini_adapter.get_gemini_client", _dummy_client)


def test_gemini_adapter_parses_json():
    adapter = GeminiOCRAdapter()
    result = adapter.extract_text(b"image", "image/png")

    assert result.ocr_text == "abc"
    assert result.latex_text == "x^2"
    assert result.confidence == 0.9
    assert result.provider == "gemini"
    assert result.metadata == {"foo": "bar"}


def test_gemini_adapter_raises_invalid_json(monkeypatch):
    def _bad_client():
        return DummyClient("not json")

    monkeypatch.setattr("app.services.ai.ocr.adapters.gemini_adapter.get_gemini_client", _bad_client)

    adapter = GeminiOCRAdapter()
    with pytest.raises(OCRExtractionError):
        adapter.extract_text(b"image", "image/png")
