RISK_KEYWORDS = {
    "legal": {
        "keywords": [
            "lawsuit", "sued", "court", "legal action", "settlement",
            "소송", "고소", "법원", "합의", "재판"
        ],
        "description": "Legal risk detected from lawsuit or court-related terms."
    },
    "regulatory": {
        "keywords": [
            "investigation", "probe", "regulator", "sec", "fined", "penalty",
            "조사", "수사", "금감원", "공정위", "제재", "벌금", "과징금"
        ],
        "description": "Regulatory risk detected from investigation or penalty-related terms."
    },
    "financial": {
        "keywords": [
            "earnings decline", "loss", "bankruptcy", "debt", "default",
            "revenue decline", "적자", "손실", "파산", "부채",
            "실적 악화", "매출 감소", "영업손실", "영업이익 감소"
        ],
        "description": "Financial risk detected from weak earnings, debt, or bankruptcy-related terms."
    },
    "management": {
        "keywords": [
            "ceo resigns", "executive departure", "fraud", "misconduct",
            "대표 사임", "임원 사퇴", "횡령", "배임", "비리", "분식회계"
        ],
        "description": "Management risk detected from leadership instability or misconduct."
    },
    "market": {
        "keywords": [
            "stock plunge", "sharp decline", "downgrade", "sell-off",
            "급락", "하락", "폭락", "목표가 하향", "투자의견 하향"
        ],
        "description": "Market risk detected from stock price decline or negative market signals."
    }
}


def detect_risk_factors(text: str) -> list:
    """Detect red flag keywords from text."""
    if not text:
        return []

    text_lower = text.lower()
    detected = []

    for category, info in RISK_KEYWORDS.items():
        for keyword in info["keywords"]:
            if keyword.lower() in text_lower:
                detected.append({
                    "category": category,
                    "keyword": keyword,
                    "description": info["description"]
                })

    return detected


# ── 임계값 ─────────────────────────────────────────────────────────────────
RISK_LEVEL_HIGH = 67
RISK_LEVEL_MEDIUM = 33


def calculate_risk_score(
    sentiment_label: str,
    sentiment_score: float,
    risk_factors: list,
) -> int:
    """Continuous-feel risk score in [0, 100] (rounded to int — DB column is Integer).

    설계:
    1. FinBERT 의 0~1 확률을 가중치로 그대로 사용 → 이산 합산 회피, 0~100 사이가 거의 균등.
    2. 감성 기여도 (~55점) + 룰 기여도 (~45점) + 강한 부정 보너스 (~10점).
    3. 같은 카테고리 키워드 반복은 한계 효용이 줄어들고, 카테고리 다양성이 더 큰 비중.
       (\"파산\" 한 단어보다 \"파산 + CEO 사임 + 공정위 조사\" 가 위험.)
    """
    confidence = max(0.0, min(1.0, sentiment_score))

    # 감성 기여도 0 ~ 55
    if sentiment_label == "negative":
        sentiment_part = 25 + confidence * 30  # 부정 잡히면 베이스 25, 확신 1.0 이면 +30
    elif sentiment_label == "positive":
        sentiment_part = -confidence * 15  # 긍정 강하면 점수를 깎음
    else:  # neutral
        sentiment_part = 8 + confidence * 6

    # 룰 기여도 0 ~ 45
    n_factors = len(risk_factors)
    unique_categories = {f["category"] for f in risk_factors}
    diversity = len(unique_categories)
    repetition_part = 12 * (1 - 0.6 ** n_factors) if n_factors else 0
    diversity_part = diversity * 9
    rule_part = min(45, repetition_part + diversity_part)

    # 강한 부정 + 다중 카테고리 보너스 0 ~ 10
    if sentiment_label == "negative" and confidence >= 0.85 and diversity >= 2:
        bonus = min(10, (diversity - 1) * 3 + (confidence - 0.85) * 30)
    else:
        bonus = 0

    raw = sentiment_part + rule_part + bonus
    return int(round(max(0.0, min(100.0, raw))))


def classify_risk_level(risk_score: int) -> str:
    """Convert numeric risk score into Low / Medium / High."""
    if risk_score >= RISK_LEVEL_HIGH:
        return "High"
    if risk_score >= RISK_LEVEL_MEDIUM:
        return "Medium"
    return "Low"
