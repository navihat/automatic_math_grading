"""
Abstract interface for storage backends.
"""
from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    def upload(self, file_bytes: bytes, filename: str) -> str:
        """Upload a file and return its public URL."""
        ...

    @abstractmethod
    def delete(self, file_url: str) -> bool:
        """Delete a file by URL. Returns True when deleted."""
        ...

    @abstractmethod
    def get_url(self, file_path: str) -> str:
        """Return a public URL for a stored file path."""
        ...
