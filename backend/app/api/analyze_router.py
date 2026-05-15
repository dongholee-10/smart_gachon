from typing import Tuple

from fastapi import APIRouter, HTTPException

from app.database.repository import get_analysis_result
from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CompanyAnalyzeRequest,
    CompanyAnalyzeResponse,
)
from app.services.analysis_service import analyze_company_news, analyze_single_news

router = APIRouter(prefix="/analyze", tags=["Analyze"])


def _split_text(request: AnalyzeRequest) -> Tuple[str, str]:
    """Accept either {title, content} or a single {text} blob."""
    if request.title or request.content:
        return request.title or "", request.content or ""
    if request.text:
        title = request.text[:80]
        return title, request.text
    raise HTTPException(status_code=400, detail="Either 'text' or ('title'+'content') is required.")


@router.post("", response_model=AnalyzeResponse)
def analyze_news(request: AnalyzeRequest):
    """Analyze a single news article."""
    title, content = _split_text(request)
    try:
        return analyze_single_news(
            title=title,
            content=content,
            ticker=request.ticker,
            news_link=request.news_link,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/company", response_model=CompanyAnalyzeResponse)
def analyze_company(request: CompanyAnalyzeRequest):
    """Search recent company news and analyze each article."""
    try:
        return analyze_company_news(company=request.company, display=request.display)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{result_id}", response_model=AnalyzeResponse)
def get_result(result_id: int):
    """Retrieve saved analysis result by ID."""
    result = get_analysis_result(result_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
