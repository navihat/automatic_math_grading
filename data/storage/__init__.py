"""
Storage factory.

To switch to another backend later, implement StorageBackend and replace
LocalStorage here.
"""
from .local_storage import LocalStorage

storage = LocalStorage()
