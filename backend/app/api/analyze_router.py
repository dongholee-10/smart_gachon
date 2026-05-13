from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CompanyAnalyzeRequest,
    CompanyAnalyzeResponse
)
from app.services.analysis_service import (
    analyze_single_news,
    analyze_company_news
)
from app.database.repository import get_analysis_result

router = APIRouter(prefix="/analyze", tags=["Analyze"])


@router.post("", response_model=AnalyzeResponse)
def analyze_news(request: AnalyzeRequest):
    """
    Analyze a single news article.
    """
    try:
        result = analyze_single_news(
            title=request.title,
            content=request.content,
            ticker=request.ticker
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/company", response_model=CompanyAnalyzeResponse)
def analyze_company(request: CompanyAnalyzeRequest):
    """
    Search recent company news and analyze each news article.
    """
    try:
        result = analyze_company_news(
            company=request.company,
            display=request.display
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{result_id}", response_model=AnalyzeResponse)
def get_result(result_id: int):
    """
    Retrieve saved analysis result by ID.
    """
    result = get_analysis_result(result_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Result not found")

    return result