from app.ai.finbert_analyzer import finbert_analyzer
from app.ai.risk_engine import (
    detect_risk_factors,
    calculate_risk_score,
    classify_risk_level
)
from app.ai.explanation_generator import generate_explanation
from app.database.repository import save_analysis_result
from app.services.news_service import fetch_news


def analyze_single_news(
    title: str,
    content: str,
    ticker: str | None = None
) -> dict:
    """
    Full AI pipeline for one news article.
    """
    full_text = title + " " + content

    sentiment = finbert_analyzer.analyze(full_text)

    risk_factors = detect_risk_factors(full_text)

    risk_score = calculate_risk_score(
        sentiment_label=sentiment["label"],
        sentiment_score=sentiment["score"],
        risk_factors=risk_factors
    )

    risk_level = classify_risk_level(risk_score)

    explanation = generate_explanation(
        sentiment_label=sentiment["label"],
        sentiment_score=sentiment["score"],
        risk_level=risk_level,
        risk_score=risk_score,
        risk_factors=risk_factors
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
        "explanation": explanation
    }

    saved_result = save_analysis_result(result)

    return saved_result


def analyze_company_news(company: str, display: int = 10) -> dict:
    """
    Search news by company name and analyze each article.
    """
    news_list = fetch_news(company, display)

    results = []

    for news in news_list:
        analyzed = analyze_single_news(
            title=news["title"],
            content=news["description"],
            ticker=company
        )
        results.append(analyzed)

    return {
        "company": company,
        "news_count": len(results),
        "results": results
    }