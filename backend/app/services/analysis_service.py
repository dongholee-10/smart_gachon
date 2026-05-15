from typing import Optional

from sqlalchemy.orm import Session

from app.ai.explanation_generator import generate_explanation
from app.ai.finbert_analyzer import finbert_analyzer
from app.ai.risk_engine import (
    calculate_risk_score,
    classify_risk_level,
    detect_risk_factors,
)
from app.database.models import AnalysisResult
from app.database.repository import save_analysis_result
from app.services.news_service import fetch_news


def _sentiment_breakdown(label: str, score: float) -> dict:
    remainder = max(0.0, 1.0 - score) / 2
    breakdown = {"positive": remainder, "neutral": remainder, "negative": remainder}
    if label in breakdown:
        breakdown[label] = score
    return breakdown


def _to_response_dict(record: AnalysisResult, sentiment_scores: dict) -> dict:
    return {
        "id": record.id,
        "ticker": record.ticker,
        "title": record.title,
        "content": record.content,
        "sentiment_label": record.sentiment_label,
        "sentiment_score": record.sentiment_score,
        "risk_score": record.risk_score,
        "risk_level": record.risk_level,
        "risk_factors": record.risk_factors,
        "explanation": record.explanation,
        "news_link": record.news_link,
        "score": record.risk_score,
        "reasoning": record.explanation,
        "news_title": record.title,
        "sentiment": sentiment_scores,
    }


def analyze_single_news(
    db: Session,
    title: str,
    content: str,
    ticker: Optional[str] = None,
    news_link: Optional[str] = None,
    user_id: Optional[int] = None,
) -> dict:
    full_text = (title or "") + " " + (content or "")

    sentiment = finbert_analyzer.analyze(full_text)
    risk_factors = detect_risk_factors(full_text)
    risk_score = calculate_risk_score(
        sentiment_label=sentiment["label"],
        sentiment_score=sentiment["score"],
        risk_factors=risk_factors,
    )
    risk_level = classify_risk_level(risk_score)
    explanation = generate_explanation(
        sentiment_label=sentiment["label"],
        sentiment_score=sentiment["score"],
        risk_level=risk_level,
        risk_score=risk_score,
        risk_factors=risk_factors,
        title=title,
        content=content,
    )

    record = save_analysis_result(
        db,
        result={
            "ticker": ticker,
            "title": title,
            "content": content,
            "sentiment_label": sentiment["label"],
            "sentiment_score": sentiment["score"],
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "explanation": explanation,
            "news_link": news_link,
        },
        user_id=user_id,
    )

    return _to_response_dict(record, _sentiment_breakdown(sentiment["label"], sentiment["score"]))


def analyze_company_news(
    db: Session,
    company: str,
    display: int = 10,
    user_id: Optional[int] = None,
) -> dict:
    news_list = fetch_news(company, display)
    results = []
    for news in news_list:
        analyzed = analyze_single_news(
            db=db,
            title=news["title"],
            content=news["description"],
            ticker=company,
            news_link=news.get("link"),
            user_id=user_id,
        )
        results.append(analyzed)
    return {"company": company, "news_count": len(results), "results": results}
