from typing import Optional

from app.core.config import settings


def generate_explanation(
    sentiment_label: str,
    sentiment_score: float,
    risk_level: str,
    risk_score: int,
    risk_factors: list,
    title: Optional[str] = None,
    content: Optional[str] = None,
) -> str:
    """
    Returns a natural-language risk explanation.

    If an LLM provider is configured via env (LLM_PROVIDER=openai|anthropic) and
    the corresponding API key is set, the LLM is used. Otherwise the system
    falls back to a deterministic template — safe to run offline.
    """
    if settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        text = _try_openai(
            sentiment_label, sentiment_score, risk_level, risk_score, risk_factors, title, content
        )
        if text:
            return text

    if settings.LLM_PROVIDER == "anthropic" and settings.ANTHROPIC_API_KEY:
        text = _try_anthropic(
            sentiment_label, sentiment_score, risk_level, risk_score, risk_factors, title, content
        )
        if text:
            return text

    return _template_explanation(sentiment_label, sentiment_score, risk_level, risk_score, risk_factors)


def _build_prompt(sentiment_label, sentiment_score, risk_level, risk_score, risk_factors, title, content):
    factor_text = (
        ", ".join(f"{f['category']}({f['keyword']})" for f in risk_factors) or "none detected"
    )
    body = content[:1200] if content else ""
    return (
        "당신은 금융 리스크 애널리스트입니다. 아래 뉴스를 읽고 한국어로 3~4문장 분량의 위험 분석 리포트를 작성하세요.\n"
        "- 어떤 위험 신호가 어떤 근거로 탐지됐는지 명시\n"
        "- 투자자가 단기/장기적으로 무엇을 모니터링해야 하는지\n"
        "- 단정적 매수/매도 권유 금지\n\n"
        f"제목: {title or ''}\n"
        f"본문: {body}\n\n"
        f"감성 분석: {sentiment_label} (confidence {sentiment_score:.2f})\n"
        f"위험 점수: {risk_score}/100 ({risk_level})\n"
        f"탐지 키워드: {factor_text}\n"
    )


def _try_openai(sentiment_label, sentiment_score, risk_level, risk_score, risk_factors, title, content) -> Optional[str]:
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        prompt = _build_prompt(
            sentiment_label, sentiment_score, risk_level, risk_score, risk_factors, title, content
        )
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[LLM/OpenAI Error] {e}")
        return None


def _try_anthropic(sentiment_label, sentiment_score, risk_level, risk_score, risk_factors, title, content) -> Optional[str]:
    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = _build_prompt(
            sentiment_label, sentiment_score, risk_level, risk_score, risk_factors, title, content
        )
        message = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(block.text for block in message.content if hasattr(block, "text")).strip()
    except Exception as e:
        print(f"[LLM/Anthropic Error] {e}")
        return None


_SENTIMENT_KO = {"positive": "긍정", "neutral": "중립", "negative": "부정"}
_CATEGORY_KO = {
    "legal": "법적",
    "regulatory": "규제",
    "financial": "재무",
    "management": "경영",
    "market": "시장",
}


def _template_explanation(sentiment_label, sentiment_score, risk_level, risk_score, risk_factors) -> str:
    sentiment_ko = _SENTIMENT_KO.get(sentiment_label, sentiment_label)
    base = (
        f"이 뉴스의 감성은 '{sentiment_ko}'으로 분류되었으며 "
        f"신뢰도는 {sentiment_score:.2f}입니다. "
        f"산출된 위험 점수는 {risk_score}/100으로 "
        f"'{risk_level}' 수준에 해당합니다. "
    )

    if not risk_factors:
        return (
            base
            + "명시적인 위험 키워드는 탐지되지 않았습니다. "
            + "따라서 현재 뉴스 텍스트만 보았을 때 전반적인 위험은 제한적인 것으로 판단됩니다."
        )

    factor_descriptions = [
        f"{_CATEGORY_KO.get(f['category'], f['category'])} 리스크('{f['keyword']}')"
        for f in risk_factors
    ]
    factor_text = ", ".join(factor_descriptions)
    explanation = base + f"다음과 같은 위험 신호가 탐지되었습니다: {factor_text}. "

    if risk_level == "High":
        explanation += (
            "이는 해당 기업이 상당한 잠재 리스크에 직면해 있을 가능성을 시사합니다. "
            "투자자는 법적 안정성, 규제 준수, 재무 성과, 시장 신뢰도에 미치는 영향을 "
            "면밀히 모니터링할 필요가 있습니다."
        )
    elif risk_level == "Medium":
        explanation += (
            "중간 수준의 불확실성이 감지되었습니다. 당장 심각한 피해로 이어진다고 단정하기는 "
            "어렵지만, 투자 심리와 향후 실적에 영향을 줄 수 있으므로 지속적인 관찰이 필요합니다."
        )
    else:
        explanation += (
            "탐지된 위험은 상대적으로 제한적인 수준입니다. "
            "다만 이 뉴스는 다른 재무 데이터와 함께 종합적으로 해석되어야 합니다."
        )

    return explanation
