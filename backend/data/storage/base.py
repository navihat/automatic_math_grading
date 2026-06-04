"""
Interface trừu tượng cho Storage Backend.
Hiện tại dùng LocalStorage, sau này thay bằng SupabaseStorage
chỉ cần đổi 1 dòng trong __init__.py.
"""
from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    def upload(self, file_bytes: bytes, filename: str) -> str:
        """Upload file và trả về URL công khai."""
        ...

    @abstractmethod
    def delete(self, file_url: str) -> bool:
        """Xoá file theo URL. Trả về True nếu xoá thành công."""
        ...

    @abstractmethod
    def get_url(self, file_path: str) -> str:
        """Lấy URL công khai từ file path."""
        ...
