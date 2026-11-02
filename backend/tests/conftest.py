import os

# src.core.config requires DATABASE_URL at import time; tests never touch the DB.
os.environ.setdefault("DATABASE_URL", "sqlite://")
