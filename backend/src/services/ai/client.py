from google.genai import Client
from google.genai.types import HttpOptions
from src.core.config import settings

_client = None

def get_gemini_client() -> Client:
    global _client
    if _client is None:
        _client = Client(
            api_key=settings.GEMINI_API_KEY or None,
            http_options=HttpOptions(timeout=60000),
        )
    return _client
