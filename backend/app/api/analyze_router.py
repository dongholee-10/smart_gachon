import logging
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_optional_user
from app.database.models import User
from app.database.repository import get_analysis_result, list_analysis_results
from app.database.session import get_db
from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CompanyAnalyzeRequest,
    CompanyAnalyzeResponse,
)
from app.services.analysis_service import analyze_company_news, analyze_single_news

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["Analyze"])


def _split_text(request: AnalyzeRequest) -> Tuple[str, str]:
    if request.title or request.content:
        return request.title or "", request.content or ""
    if request.text:
        title = request.text[:80]
        return title, request.text
    raise HTTPException(status_code=400, detail="Either 'text' or ('title'+'content') is required.")


@router.post("", response_model=AnalyzeResponse)
def analyze_news(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    title, content = _split_text(request)
    try:
        return analyze_single_news(
            db=db,
            title=title,
            content=content,
            ticker=request.ticker,
            news_link=request.news_link,
            user_id=user.id if user else None,
        )
    except Exception:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail="분석 처리 중 오류가 발생했습니다.")


@router.post("/company", response_model=CompanyAnalyzeResponse)
def analyze_company(
    request: CompanyAnalyzeRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    try:
        return analyze_company_news(
            db=db,
            company=request.company,
            display=request.display,
            user_id=user.id if user else None,
        )
    except Exception:
        logger.exception("Company analysis failed")
        raise HTTPException(status_code=500, detail="분석 처리 중 오류가 발생했습니다.")


@router.get("/results/{result_id}", response_model=AnalyzeResponse)
def get_result(
    result_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = get_analysis_result(db, result_id)
    if record is None or record.user_id != user.id:
        raise HTTPException(status_code=404, detail="Result not found")
    return AnalyzeResponse.model_validate(record)


@router.get("/history", response_model=List[AnalyzeResponse])
def history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0, description="건너뛸 레코드 수"),
    limit: int = Query(20, ge=1, le=100, description="반환할 레코드 수"),
):
    records = list_analysis_results(db, user_id=user.id, skip=skip, limit=limit)
    return [AnalyzeResponse.model_validate(r) for r in records]
