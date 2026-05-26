from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import NewsSearchResponse
from app.services.news_service import fetch_latest_news, fetch_news

router = APIRouter(prefix="/news", tags=["News"])


@router.get("/latest", response_model=NewsSearchResponse)
def get_latest_news(
    display: int = Query(5, ge=1, le=20, description="Number of latest news items to return"),
):
    """Fetch the latest stock market news without a specific query (shown on home screen)."""
    try:
        news_list = fetch_latest_news(display=display)
        return {"news": news_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=NewsSearchResponse)
@router.get("/search", response_model=NewsSearchResponse)
def search_news(
    query: str = Query(..., min_length=1, max_length=100, description="Company or stock keyword"),
    display: int = Query(10, ge=1, le=50, description="Number of news items to request"),
):
    """Search recent stock-related news from Naver News API."""
    try:
        news_list = fetch_news(query=query, display=display)
        return {"news": news_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
