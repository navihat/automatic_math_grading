import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def settings_env(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", settings.GEMINI_API_KEY or "test-key")
