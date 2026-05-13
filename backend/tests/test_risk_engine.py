from app.ai.risk_engine import (
    detect_risk_factors,
    calculate_risk_score,
    classify_risk_level
)


def test_detect_risk_factors():
    text = "The company is under investigation and faces a lawsuit."

    factors = detect_risk_factors(text)

    assert len(factors) >= 2


def test_calculate_risk_score():
    risk_factors = [
        {
            "category": "legal",
            "keyword": "lawsuit",
            "description": "Legal risk detected."
        }
    ]

    score = calculate_risk_score(
        sentiment_label="negative",
        sentiment_score=0.95,
        risk_factors=risk_factors
    )

    assert score >= 60


def test_classify_risk_level():
    assert classify_risk_level(80) == "High"
    assert classify_risk_level(50) == "Medium"
    assert classify_risk_level(20) == "Low"