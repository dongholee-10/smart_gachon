from typing import Optional

from app.ai.explanation_generator import generate_explanation
from app.ai.finbert_analyzer import finbert_analyzer
from app.ai.risk_engine import (
    calculate_risk_score,
    classify_risk_level,
    detect_risk_factors,
)
from app.database.repository import save_analysis_result
from app.services.news_service import fetch_news


def _sentiment_breakdown(label: str, score: float) -> dict:
    """Approximate 3-way probability dict for the UI's sentiment bar."""
    remainder = max(0.0, 1.0 - score) / 2
    breakdown = {"positive": remainder, "neutral": remainder, "negative": remainder}
    if label in breakdown:
        breakdown[label] = score
    return breakdown


def _decorate(result: dict, sentiment_label: str, sentiment_score: float) -> dict:
    """Add frontend-friendly aliases (score / reasoning / news_title / sentiment)."""
    result["score"] = result["risk_score"]
    result["reasoning"] = result["explanation"]
    result["news_title"] = result["title"]
    result["sentiment"] = _sentiment_breakdown(sentiment_label, sentiment_score)
    return result


def analyze_single_news(
    title: str,
    content: str,
    ticker: Optional[str] = None,
    news_link: Optional[str] = None,
) -> dict:
    """Full AI pipeline for one news article."""
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

    result = {
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
    }

    saved_result = save_analysis_result(result)
    return _decorate(saved_result, sentiment["label"], sentiment["score"])


def analyze_company_news(company: str, display: int = 10) -> dict:
    """Search news by company name and analyze each article."""
    news_list = fetch_news(company, display)
    results = []
    for news in news_list:
        analyzed = analyze_single_news(
            title=news["title"],
            content=news["description"],
            ticker=company,
            news_link=news.get("link"),
        )
        results.append(analyzed)
    return {"company": company, "news_count": len(results), "results": results}
