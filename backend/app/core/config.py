import os
from typing import List

from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "News-based Stock Red Flag Detection API"
    PROJECT_VERSION: str = "1.0.1"

    NAVER_CLIENT_ID: str = os.getenv("NAVER_CLIENT_ID", "")
    NAVER_CLIENT_SECRET: str = os.getenv("NAVER_CLIENT_SECRET", "")

    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")


settings = Settings()
