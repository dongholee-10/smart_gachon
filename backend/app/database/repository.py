from typing import List, Optional

from sqlalchemy.orm import Session

from app.database.models import AnalysisResult


def save_analysis_result(db: Session, result: dict, user_id: Optional[int] = None) -> AnalysisResult:
    record = AnalysisResult(
        user_id=user_id,
        ticker=result.get("ticker"),
        title=result["title"],
        content=result["content"],
        sentiment_label=result["sentiment_label"],
        sentiment_score=result["sentiment_score"],
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        risk_factors=result.get("risk_factors", []),
        explanation=result["explanation"],
        news_link=result.get("news_link"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_analysis_result(db: Session, result_id: int) -> Optional[AnalysisResult]:
    return db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()


def list_analysis_results(db: Session, user_id: Optional[int] = None, limit: int = 50) -> List[AnalysisResult]:
    query = db.query(AnalysisResult)
    if user_id is not None:
        query = query.filter(AnalysisResult.user_id == user_id)
    return query.order_by(AnalysisResult.created_at.desc()).limit(limit).all()
