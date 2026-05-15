import os
from typing import List

from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "News-based Stock Red Flag Detection API"
    PROJECT_VERSION: str = "1.0.2"

    NAVER_CLIENT_ID: str = os.getenv("NAVER_CLIENT_ID", "")
    NAVER_CLIENT_SECRET: str = os.getenv("NAVER_CLIENT_SECRET", "")

    # LLM (optional). If none configured, falls back to template explanations.
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "").lower()  # "openai" | "anthropic" | ""
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")

    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")


settings = Settings()
