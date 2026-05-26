from typing import Optional

from sqlalchemy.orm import Session

from app.database.repository import get_analysis_result


def generate_report(db: Session, result_id: int) -> Optional[dict]:
    result = get_analysis_result(db, result_id)
    if result is None:
        return None

    risk_factors = result.risk_factors or []
    if risk_factors:
        factors_text = ", ".join(
            f"{factor['category']}({factor['keyword']})" for factor in risk_factors
        )
    else:
        factors_text = "No major red flag factors detected"

    summary = (
        f"Risk Report\n\n"
        f"Result ID: {result.id}\n"
        f"Ticker or Company: {result.ticker}\n"
        f"Title: {result.title}\n\n"
        f"Sentiment Analysis:\n"
        f"- Label: {result.sentiment_label}\n"
        f"- Confidence Score: {result.sentiment_score:.2f}\n\n"
        f"Risk Analysis:\n"
        f"- Risk Score: {result.risk_score}/100\n"
        f"- Risk Level: {result.risk_level}\n"
        f"- Risk Factors: {factors_text}\n\n"
        f"Explanation:\n"
        f"{result.explanation}\n"
    )

    if result.risk_level == "High":
        recommendation = (
            "즉각적인 리스크 검토가 필요합니다. 해당 종목에 대한 신규 투자는 자제하고 "
            "기존 포지션 점검을 권장합니다."
        )
    elif result.risk_level == "Medium":
        recommendation = (
            "중간 수준의 리스크가 감지되었습니다. 추가 정보 확인 후 신중한 투자 판단을 권장합니다."
        )
    else:
        recommendation = (
            "현재 뉴스 기준으로 낮은 위험 수준입니다. 시장 변화에 대한 지속적인 모니터링을 권장합니다."
        )

    return {
        "result_id": result.id,
        "summary": summary,
        "recommendation": recommendation,
    }
