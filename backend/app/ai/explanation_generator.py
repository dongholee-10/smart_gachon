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


def _template_explanation(sentiment_label, sentiment_score, risk_level, risk_score, risk_factors) -> str:
    base = (
        f"The news sentiment is classified as {sentiment_label} "
        f"with a confidence score of {sentiment_score:.2f}. "
        f"The calculated risk score is {risk_score}/100, "
        f"which corresponds to a {risk_level} risk level. "
    )

    if not risk_factors:
        return (
            base
            + "No explicit red flag keywords were detected. "
            + "Therefore, the overall risk appears limited based on the current news text."
        )

    factor_descriptions = [
        f"{f['category']} risk was detected from the keyword '{f['keyword']}'" for f in risk_factors
    ]
    factor_text = "; ".join(factor_descriptions)
    explanation = base + f"The system detected the following red flag signals: {factor_text}. "

    if risk_level == "High":
        explanation += (
            "This suggests that the company may be facing serious potential risks. "
            "Investors should carefully monitor whether these issues affect legal stability, "
            "regulatory compliance, financial performance, or market confidence."
        )
    elif risk_level == "Medium":
        explanation += (
            "This indicates a moderate level of uncertainty. The issue may not immediately imply "
            "severe damage, but it should be monitored because it could affect investor sentiment."
        )
    else:
        explanation += (
            "The detected risk appears relatively limited. However, the news should still be "
            "interpreted together with additional financial data."
        )

    return explanation
