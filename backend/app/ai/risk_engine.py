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
    """
    Detect red flag keywords from text.
    """
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


def calculate_risk_score(
    sentiment_label: str,
    sentiment_score: float,
    risk_factors: list
) -> int:
    """
    Calculate risk score based on sentiment and detected risk factors.
    Score range: 0 to 100.
    """
    score = 0

    if sentiment_label == "negative":
        score += 40
    elif sentiment_label == "neutral":
        score += 15
    elif sentiment_label == "positive":
        score += 0

    score += len(risk_factors) * 20

    if sentiment_label == "negative" and sentiment_score >= 0.90:
        score += 10

    return min(score, 100)


def classify_risk_level(risk_score: int) -> str:
    """
    Convert numeric risk score into discrete risk level.
    """
    if risk_score >= 70:
        return "High"
    elif risk_score >= 40:
        return "Medium"
    else:
        return "Low"