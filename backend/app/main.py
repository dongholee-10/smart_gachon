from fastapi import FastAPI

from app.core.config import settings
from app.api.analyze_router import router as analyze_router
from app.api.news_router import router as news_router
from app.api.report_router import router as report_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=(
        "A FastAPI backend for detecting corporate red flags from financial news "
        "using FinBERT sentiment analysis, rule-based risk scoring, and "
        "LLM-compatible explanation generation."
    )
)

app.include_router(analyze_router)
app.include_router(news_router)
app.include_router(report_router)


@app.get("/")
def root():
    return {
        "message": "News-based Stock Red Flag Detection API is running.",
        "version": settings.PROJECT_VERSION
    }