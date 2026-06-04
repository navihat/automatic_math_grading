"""
Local file system storage backend.
Lưu file vào thư mục backend/data/uploads/ và phục vụ qua /static/uploads/.
"""
import uuid
from pathlib import Path

from .base import StorageBackend

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"


class LocalStorage(StorageBackend):
    def __init__(self):
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    def upload(self, file_bytes: bytes, filename: str) -> str:
        """Lưu file vào disk, trả về URL tĩnh."""
        ext = Path(filename).suffix or ".png"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = UPLOAD_DIR / unique_name
        file_path.write_bytes(file_bytes)
        return f"/static/uploads/{unique_name}"

    def delete(self, file_url: str) -> bool:
        """Xoá file khỏi disk theo URL."""
        filename = file_url.split("/")[-1]
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()
            return True
        return False

    def get_url(self, file_path: str) -> str:
        """URL đã là path tĩnh, trả về nguyên."""
        return file_path
