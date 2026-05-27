import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

from app.api.analyze_router import router as analyze_router
from app.api.auth_router import router as auth_router
from app.api.chat_router import router as chat_router
from app.api.community_router import router as community_router
from app.api.news_router import router as news_router
from app.api.report_router import router as report_router
from app.api.stocks_router import router as stocks_router
from app.api.watchlist_router import router as watchlist_router
from app.core.config import settings
from app.database.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=(
        "A FastAPI backend for detecting corporate red flags from financial news "
        "using FinBERT sentiment analysis, rule-based risk scoring, and "
        "LLM-compatible explanation generation."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth_router)
app.include_router(analyze_router)
app.include_router(news_router)
app.include_router(report_router)
app.include_router(community_router)
app.include_router(watchlist_router)
app.include_router(stocks_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {
        "message": "News-based Stock Red Flag Detection API is running.",
        "version": settings.PROJECT_VERSION,
    }
