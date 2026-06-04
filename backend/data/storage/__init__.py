"""
Storage factory.
Để chuyển sang Supabase sau này, chỉ cần:
  1. Tạo file supabase_storage.py implement StorageBackend
  2. Đổi dòng import bên dưới từ LocalStorage → SupabaseStorage
"""
from .local_storage import LocalStorage

# ── Đổi backend tại đây ──────────────────────────────────────
# from .supabase_storage import SupabaseStorage
# storage = SupabaseStorage()
storage = LocalStorage()
