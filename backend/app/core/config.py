# backend/app/core/config.py

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "FAILSAFE"
    DEBUG: bool = True

    # Model artifacts path
    MODELS_DIR: str = os.path.join(
        os.path.dirname(__file__),   # core/
        "..",                         # app/
        "..",                         # backend/
        "ml", "models"
    )

    class Config:
        env_file = os.path.join(
            os.path.dirname(__file__),
            "..", "..", ".env"
        )
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance — reads .env once and reuses.
    lru_cache ensures we don't re-read the file on every request.
    """
    return Settings()