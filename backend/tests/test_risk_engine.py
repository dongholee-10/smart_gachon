from app.ai.risk_engine import (
    classify_risk_level,
    calculate_risk_score,
    detect_risk_factors,
)


def test_detect_risk_factors():
    text = "The company is under investigation and faces a lawsuit."
    factors = detect_risk_factors(text)
    assert len(factors) >= 2


def test_score_is_continuous():
    """확신도가 다르면 점수도 달라야 — 이산 step 만 나오던 옛 로직 회귀 방지."""
    factors = [{"category": "legal", "keyword": "lawsuit", "description": ""}]
    low = calculate_risk_score("negative", 0.55, factors)
    mid = calculate_risk_score("negative", 0.80, factors)
    high = calculate_risk_score("negative", 0.95, factors)
    assert low < mid < high
    assert all(0 <= s <= 100 for s in (low, mid, high))


def test_diversity_outweighs_repetition():
    """같은 카테고리 5개보다 5개 카테고리 1개씩이 더 위험해야."""
    same_cat = [{"category": "legal", "keyword": f"kw{i}", "description": ""} for i in range(5)]
    diverse = [
        {"category": "legal", "keyword": "lawsuit", "description": ""},
        {"category": "regulatory", "keyword": "조사", "description": ""},
        {"category": "financial", "keyword": "파산", "description": ""},
        {"category": "management", "keyword": "횡령", "description": ""},
        {"category": "market", "keyword": "급락", "description": ""},
    ]
    a = calculate_risk_score("negative", 0.80, same_cat)
    b = calculate_risk_score("negative", 0.80, diverse)
    assert b > a


def test_strong_negative_with_keywords_reaches_high():
    """공정위 조사처럼 강한 부정 + 다중 카테고리는 High 등급(>=67)에 도달."""
    factors = [
        {"category": "regulatory", "keyword": "조사", "description": ""},
        {"category": "regulatory", "keyword": "공정위", "description": ""},
        {"category": "legal", "keyword": "소송", "description": ""},
    ]
    score = calculate_risk_score("negative", 0.95, factors)
    assert score >= 67
    assert classify_risk_level(score) == "High"


def test_positive_news_stays_low():
    """긍정 강하면 점수가 떨어져야."""
    score = calculate_risk_score("positive", 0.95, [])
    assert score <= 5
    assert classify_risk_level(score) == "Low"


def test_classify_thresholds():
    assert classify_risk_level(70) == "High"
    assert classify_risk_level(67) == "High"
    assert classify_risk_level(66) == "Medium"
    assert classify_risk_level(33) == "Medium"
    assert classify_risk_level(32) == "Low"
    assert classify_risk_level(0) == "Low"
