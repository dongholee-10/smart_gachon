import logging
import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def _require_env(key: str) -> str:
    value = os.getenv(key, "")
    if not value:
        raise ValueError(f"환경변수 {key}가 설정되지 않았습니다. .env 파일을 확인하세요.")
    return value


class Settings:
    PROJECT_NAME: str = "News-based Stock Red Flag Detection API"
    PROJECT_VERSION: str = "1.1.0"

    NAVER_CLIENT_ID: str = os.getenv("NAVER_CLIENT_ID", "")
    NAVER_CLIENT_SECRET: str = os.getenv("NAVER_CLIENT_SECRET", "")

    # DB 경로를 절대경로로 고정
    _default_db = f"sqlite:///{Path(__file__).resolve().parents[3] / 'redflag.db'}"
    DATABASE_URL: str = os.getenv("DATABASE_URL", _default_db)

    # JWT_SECRET은 반드시 .env에 설정되어야 함
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRES_MINUTES: int = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

    # LLM (optional)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "").lower()
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    ENABLE_FINBERT: bool = os.getenv("ENABLE_FINBERT", "false").lower() in {"1", "true", "yes", "on"}

    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")

    def validate(self) -> None:
        if not self.JWT_SECRET:
            raise ValueError(
                "JWT_SECRET이 설정되지 않았습니다. "
                ".env 파일에 JWT_SECRET=<강력한_랜덤_문자열> 을 추가하세요."
            )
        if len(self.JWT_SECRET) < 32:
            logger.warning("JWT_SECRET이 32자 미만입니다. 프로덕션에서는 더 긴 시크릿을 사용하세요.")


settings = Settings()
settings.validate()
