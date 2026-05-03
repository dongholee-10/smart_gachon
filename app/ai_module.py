from transformers import pipeline


try:
    sentiment_pipeline = pipeline(
        "sentiment-analysis",
        model="ProsusAI/finbert"
    )
except Exception:
    sentiment_pipeline = None


RISK_KEYWORDS = {
    "legal": {
        "keywords": [
            "lawsuit", "sued", "court", "legal action", "settlement",
            "소송", "고소", "법원", "합의"
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
            "revenue decline", "적자", "손실", "파산", "부채", "실적 악화",
            "매출 감소", "영업손실"
        ],
        "description": "Financial risk detected from weak earnings, debt, or bankruptcy-related terms."
    },
    "management": {
        "keywords": [
            "ceo resigns", "executive departure", "fraud", "misconduct",
            "대표 사임", "임원 사퇴", "횡령", "배임", "비리"
        ],
        "description": "Management risk detected from leadership instability or misconduct."
    },
    "market": {
        "keywords": [
            "stock plunge", "sharp decline", "downgrade", "sell-off",
            "급락", "하락", "목표가 하향", "투자의견 하향"
        ],
        "description": "Market risk detected from stock price decline or negative market signals."
    }
}


def analyze_sentiment(text: str) -> dict:
    if sentiment_pipeline is None:
        return {
            "label": "neutral",
            "score": 0.5
        }

    result = sentiment_pipeline(text[:512])[0]

    return {
        "label": result["label"].lower(),
        "score": float(result["score"])
    }


def detect_risk_factors(text: str) -> list:
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
    score = 0

    if sentiment_label == "negative":
        score += 40
    elif sentiment_label == "neutral":
        score += 15
    elif sentiment_label == "positive":
        score += 0

    score += len(risk_factors) * 20

    return min(score, 100)


def classify_risk_level(risk_score: int) -> str:
    if risk_score >= 70:
        return "High"
    elif risk_score >= 40:
        return "Medium"
    else:
        return "Low"


def generate_explanation(
    sentiment_label: str,
    sentiment_score: float,
    risk_level: str,
    risk_factors: list
) -> str:
    if not risk_factors:
        return (
            f"The news sentiment is classified as {sentiment_label} "
            f"with a confidence score of {sentiment_score:.2f}. "
            f"No major red flag keywords were detected. "
            f"The overall risk level is {risk_level}."
        )

    factor_text = ", ".join(
        [
            f"{factor['category']} risk from keyword '{factor['keyword']}'"
            for factor in risk_factors
        ]
    )

    explanation = (
        f"The news sentiment is classified as {sentiment_label} "
        f"with a confidence score of {sentiment_score:.2f}. "
        f"The system detected the following red flag factors: {factor_text}. "
        f"Based on the sentiment and detected risk factors, "
        f"the overall risk level is classified as {risk_level}. "
    )

    if risk_level == "High":
        explanation += (
            "This may indicate a serious potential risk for investors, "
            "especially if the issue affects legal, regulatory, financial, or market stability."
        )
    elif risk_level == "Medium":
        explanation += (
            "This suggests moderate uncertainty, and investors should monitor future developments carefully."
        )
    else:
        explanation += (
            "The detected risk appears limited, but the news should still be reviewed in context."
        )

    return explanation