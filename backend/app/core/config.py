from pathlib import Path
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    API_PREFIX: str = "/api"
    DEBUG: bool = False

    DATABASE_URL: str
    ALLOWED_ORIGINS: str = ""

    GEMINI_API_KEY: str = ""

    @field_validator("ALLOWED_ORIGINS")
    def parse_allowed_origins(cls, v: str) -> List[str]:
        return [origin.strip() for origin in v.split(",") if origin.strip()] if v else []

    @model_validator(mode="after")
    def normalize_sqlite_path(self):
        prefix = "sqlite:///./"
        if self.DATABASE_URL.startswith(prefix):
            db_path = BACKEND_DIR / self.DATABASE_URL[len(prefix):]
            self.DATABASE_URL = f"sqlite:///{db_path.as_posix()}"
        return self

    class Config:
        env_file = BACKEND_DIR / ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
