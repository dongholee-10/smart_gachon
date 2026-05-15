from typing import List, Optional

from sqlalchemy.orm import Session

from app.database.models import AnalysisResult


def save_analysis_result(db: Session, result: dict) -> AnalysisResult:
    record = AnalysisResult(
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


def list_analysis_results(db: Session, limit: int = 50) -> List[AnalysisResult]:
    return (
        db.query(AnalysisResult)
        .order_by(AnalysisResult.created_at.desc())
        .limit(limit)
        .all()
    )
