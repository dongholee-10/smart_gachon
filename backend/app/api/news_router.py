from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import NewsItem
from app.services.news_service import fetch_news

router = APIRouter(prefix="/news", tags=["News"])


@router.get("/search", response_model=list[NewsItem])
def search_news(
    query: str = Query(..., description="Company or stock keyword"),
    display: int = Query(10, description="Number of news items to request")
):
    """
    Search recent stock-related news from Naver News API.
    """
    try:
        news_list = fetch_news(query=query, display=display)
        return news_list

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))