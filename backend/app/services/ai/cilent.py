from google.genai import Client
from app.core.config import settings

_client = None

def get_gemini_client() -> Client:
    """Khởi tạo lazy OpenAI Client để tránh crash server khi thiếu API key ở startup."""
    global _client
    if _client is None:
        _client = Client(api_key=settings.GEMINI_API_KEY or None)
    return _client
