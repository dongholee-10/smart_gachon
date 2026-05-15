from typing import Optional

from app.database.repository import get_analysis_result


def generate_report(result_id: int) -> Optional[dict]:
    """Generate summarized risk report from saved analysis result."""
    result = get_analysis_result(result_id)
    if result is None:
        return None

    risk_factors = result.get("risk_factors", [])
    if risk_factors:
        factors_text = ", ".join(
            f"{factor['category']}({factor['keyword']})" for factor in risk_factors
        )
    else:
        factors_text = "No major red flag factors detected"

    summary = (
        f"Risk Report\n\n"
        f"Result ID: {result_id}\n"
        f"Ticker or Company: {result.get('ticker')}\n"
        f"Title: {result.get('title')}\n\n"
        f"Sentiment Analysis:\n"
        f"- Label: {result.get('sentiment_label')}\n"
        f"- Confidence Score: {result.get('sentiment_score'):.2f}\n\n"
        f"Risk Analysis:\n"
        f"- Risk Score: {result.get('risk_score')}/100\n"
        f"- Risk Level: {result.get('risk_level')}\n"
        f"- Risk Factors: {factors_text}\n\n"
        f"Explanation:\n"
        f"{result.get('explanation')}\n"
    )

    level = result.get("risk_level")
    if level == "High":
        recommendation = (
            "즉각적인 리스크 검토가 필요합니다. 해당 종목에 대한 신규 투자는 자제하고 "
            "기존 포지션 점검을 권장합니다."
        )
    elif level == "Medium":
        recommendation = (
            "중간 수준의 리스크가 감지되었습니다. 추가 정보 확인 후 신중한 투자 판단을 권장합니다."
        )
    else:
        recommendation = (
            "현재 뉴스 기준으로 낮은 위험 수준입니다. 시장 변화에 대한 지속적인 모니터링을 권장합니다."
        )

    return {
        "result_id": result_id,
        "summary": summary,
        "recommendation": recommendation,
    }
