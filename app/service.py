from app.ai_module import (
    analyze_sentiment,
    detect_risk_factors,
    calculate_risk_score,
    classify_risk_level,
    generate_explanation
)
from app.database import save_result, get_result
from app.news_crawler import fetch_news


def analyze_news(title: str, content: str, ticker: str | None = None) -> dict:
    full_text = title + " " + content

    sentiment = analyze_sentiment(full_text)
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
        risk_factors=risk_factors
    )

    result = {
        "ticker": ticker,
        "title": title,
        "sentiment_label": sentiment["label"],
        "sentiment_score": sentiment["score"],
        "risk_level": risk_level,
        "risk_score": risk_score,
        "risk_factors": risk_factors,
        "explanation": explanation
    }

    saved_result = save_result(result)

    return saved_result


def get_analysis_result(result_id: int):
    return get_result(result_id)


def search_company_news(company: str, display: int = 10) -> list:
    return fetch_news(company, display)


def analyze_company_news(company: str, display: int = 10) -> dict:
    news_list = fetch_news(company, display)

    results = []

    for news in news_list:
        analyzed = analyze_news(
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


def generate_report(result_id: int) -> dict | None:
    result = get_result(result_id)

    if result is None:
        return None

    summary = (
        f"Risk Report for Result ID {result_id}\n\n"
        f"Ticker or Company: {result.get('ticker')}\n"
        f"Title: {result.get('title')}\n"
        f"Sentiment: {result['sentiment_label']} "
        f"({result['sentiment_score']:.2f})\n"
        f"Risk Level: {result['risk_level']}\n"
        f"Risk Score: {result['risk_score']}/100\n\n"
        f"Explanation:\n{result['explanation']}"
    )

    return {
        "result_id": result_id,
        "summary": summary
    }