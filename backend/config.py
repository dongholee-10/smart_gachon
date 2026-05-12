from dotenv import load_dotenv
import os

# ⭐ 절대 경로로 강제 로딩
load_dotenv(dotenv_path="./.env")

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")