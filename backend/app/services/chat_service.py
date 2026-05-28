"""종목별 1:1 채팅 agent.

흐름:
  사용자 메시지 ─► 종목 컨텍스트(시세·최근 뉴스 5건·우리 분석) 빌드
              ─► system + history + user 메시지로 OpenAI Chat Completions 호출
              ─► 응답을 DB 에 저장하고 반환

LLM 미설정 시(키 없음) 400 으로 안내. 호출 자체가 실패한 경우(429/network)는 502 매핑.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.data import stocks as stock_data
from app.database.models import AnalysisResult, ChatMessage
from app.services import news_service, quote_service

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 12  # 한 대화당 최근 N 턴만 LLM 에 넣어 토큰 비용 cap
MAX_NEWS_SNIPPETS = 5


class LLMNotConfigured(Exception):
    """OPENAI_API_KEY 또는 LLM_PROVIDER 미설정."""


class LLMCallFailed(Exception):
    """OpenAI 응답 실패 (rate limit / network / quota)."""


def _build_system_prompt(ticker: str, db: Session, user_id: int) -> str:
    stock = stock_data.find_by_ticker(ticker)
    stock_name = stock["name"] if stock else ticker
    market = stock["market"] if stock else ""

    parts = [
        f"너는 한국 주식 '{stock_name}' ({market} {ticker}) 의 전문 분석 agent 다.",
        "사용자가 이 종목에 대해 묻는다. 한국어로 2~4문장씩 간결하게 답한다.",
        "단정적 매수·매도 권유는 절대 하지 않는다. \"~할 가능성이 있다\", \"~를 모니터링하는 것을 권한다\" 식으로 표현.",
        "추측이 필요하면 그게 추측임을 명시한다.",
        "",
        "── 현재 컨텍스트 ──",
    ]

    # 1. 실시간 시세
    quote = quote_service.get_quote(ticker)
    if quote:
        direction = {"up": "▲", "down": "▼", "flat": "─"}.get(quote["direction"], "")
        parts.append(
            f"현재가: {quote['price']:,}원 {direction} "
            f"{quote['change']:+,} ({quote['change_pct']:+.2f}%)"
        )

    # 2. 최근 뉴스 5건 헤드라인 (검색 가드 거친 결과)
    try:
        news = news_service.fetch_news(stock_name, display=MAX_NEWS_SNIPPETS)
    except Exception:
        news = []
    if news:
        parts.append("최근 뉴스 헤드라인:")
        for n in news[:MAX_NEWS_SNIPPETS]:
            parts.append(f"- {n['title']}")

    # 3. 우리 시스템에서 이 사용자가 본 종목 분석 이력 (최근 3건)
    history = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.user_id == user_id, AnalysisResult.ticker == ticker)
        .order_by(AnalysisResult.created_at.desc())
        .limit(3)
        .all()
    )
    if history:
        parts.append("이 사용자의 최근 RedFlag 분석 결과:")
        for a in history:
            parts.append(f"- risk {a.risk_score}/100 ({a.risk_level}): {a.title}")

    return "\n".join(parts)


def _load_history(db: Session, user_id: int, ticker: str, limit: int) -> List[ChatMessage]:
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id, ChatMessage.ticker == ticker)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit * 2)  # user+assistant 한 쌍
        .all()
    )
    return list(reversed(rows))


def list_messages(db: Session, user_id: int, ticker: str, limit: int = 100) -> List[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id, ChatMessage.ticker == ticker)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )


def clear_messages(db: Session, user_id: int, ticker: str) -> int:
    deleted = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id, ChatMessage.ticker == ticker)
        .delete()
    )
    db.commit()
    return deleted


def _select_provider() -> str:
    """LLM_PROVIDER 가 명시되면 그대로, 비어 있으면 키가 있는 쪽을 자동 선택.

    우선순위 (auto-select): gemini → anthropic → openai
    Gemini 가 가장 위인 이유: 무료 tier 가 가장 넉넉해서 \"키가 있다\" = \"호출 가능\" 확률이 높음.
    """
    p = (settings.LLM_PROVIDER or "").lower()
    if p in {"openai", "anthropic", "gemini"}:
        return p
    if settings.GEMINI_API_KEY:
        return "gemini"
    if settings.ANTHROPIC_API_KEY:
        return "anthropic"
    if settings.OPENAI_API_KEY:
        return "openai"
    return ""


def _call_openai(system_prompt: str, history_msgs: list, user_text: str) -> str:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise LLMNotConfigured("openai 패키지가 설치되어 있지 않습니다.") from exc

    messages = [{"role": "system", "content": system_prompt}]
    for h in history_msgs:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": user_text})

    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        logger.exception("OpenAI 호출 실패")
        raise LLMCallFailed(str(exc)) from exc


def _call_gemini(system_prompt: str, history_msgs: list, user_text: str) -> str:
    try:
        import google.generativeai as genai
    except ImportError as exc:
        raise LLMNotConfigured("google-generativeai 패키지가 설치되어 있지 않습니다.") from exc

    # Gemini 의 role 명은 'user' / 'model'. assistant 를 model 로 매핑.
    history = []
    for h in history_msgs:
        role = "model" if h.role == "assistant" else "user"
        history.append({"role": role, "parts": [h.content]})

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=system_prompt,
        )
        chat = model.start_chat(history=history)
        response = chat.send_message(
            user_text,
            generation_config={"max_output_tokens": 600, "temperature": 0.4},
        )
        return (response.text or "").strip()
    except Exception as exc:
        logger.exception("Gemini 호출 실패")
        raise LLMCallFailed(str(exc)) from exc


def _call_anthropic(system_prompt: str, history_msgs: list, user_text: str) -> str:
    try:
        from anthropic import Anthropic
    except ImportError as exc:
        raise LLMNotConfigured("anthropic 패키지가 설치되어 있지 않습니다.") from exc

    # Anthropic 은 system 을 별도 파라미터로, messages 에는 user/assistant 만.
    msgs = []
    for h in history_msgs:
        if h.role not in {"user", "assistant"}:
            continue
        msgs.append({"role": h.role, "content": h.content})
    msgs.append({"role": "user", "content": user_text})

    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=500,
            system=system_prompt,
            messages=msgs,
        )
        text = "".join(b.text for b in response.content if hasattr(b, "text")).strip()
        return text
    except Exception as exc:
        logger.exception("Anthropic 호출 실패")
        raise LLMCallFailed(str(exc)) from exc


def _stream_openai(system_prompt: str, history_msgs: list, user_text: str):
    from openai import OpenAI
    messages = [{"role": "system", "content": system_prompt}]
    for h in history_msgs:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": user_text})
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    with client.chat.completions.create(
        model=settings.OPENAI_MODEL, messages=messages,
        temperature=0.4, max_tokens=600, stream=True,
    ) as stream:
        for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                yield token


def _stream_gemini(system_prompt: str, history_msgs: list, user_text: str):
    import google.generativeai as genai
    history = []
    for h in history_msgs:
        history.append({"role": "model" if h.role == "assistant" else "user", "parts": [h.content]})
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(model_name=settings.GEMINI_MODEL, system_instruction=system_prompt)
    chat = model.start_chat(history=history)
    response = chat.send_message(
        user_text,
        generation_config={"max_output_tokens": 600, "temperature": 0.4},
        stream=True,
    )
    for chunk in response:
        token = chunk.text or ""
        if token:
            yield token


def _stream_anthropic(system_prompt: str, history_msgs: list, user_text: str):
    from anthropic import Anthropic
    msgs = [{"role": h.role, "content": h.content} for h in history_msgs if h.role in {"user", "assistant"}]
    msgs.append({"role": "user", "content": user_text})
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    with client.messages.stream(
        model=settings.ANTHROPIC_MODEL, max_tokens=600,
        system=system_prompt, messages=msgs,
    ) as stream:
        for text in stream.text_stream:
            if text:
                yield text


def prepare_stream(db: Session, user_id: int, ticker: str, user_text: str):
    """사용자 메시지 저장 + 컨텍스트 준비. 스트리밍 시작 전에 호출."""
    provider = _select_provider()
    if not provider:
        raise LLMNotConfigured(
            "AI Agent 기능은 .env 에 GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY 중 하나가 필요합니다."
        )
    user_msg = ChatMessage(user_id=user_id, ticker=ticker, role="user", content=user_text)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    system_prompt = _build_system_prompt(ticker, db, user_id)
    history = _load_history(db, user_id, ticker, MAX_HISTORY_TURNS)
    history_for_llm = [h for h in history if h.id != user_msg.id]
    return provider, user_msg, system_prompt, history_for_llm


def iter_stream_tokens(provider: str, system_prompt: str, history_for_llm: list, user_text: str):
    """provider 에 맞는 스트리밍 제너레이터를 반환."""
    try:
        if provider == "gemini":
            yield from _stream_gemini(system_prompt, history_for_llm, user_text)
        elif provider == "anthropic":
            yield from _stream_anthropic(system_prompt, history_for_llm, user_text)
        else:
            yield from _stream_openai(system_prompt, history_for_llm, user_text)
    except Exception as exc:
        logger.exception("스트리밍 LLM 호출 실패")
        raise LLMCallFailed(str(exc)) from exc


def save_assistant_message(db: Session, user_id: int, ticker: str, content: str) -> ChatMessage:
    msg = ChatMessage(user_id=user_id, ticker=ticker, role="assistant", content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def send_message(db: Session, user_id: int, ticker: str, user_text: str) -> ChatMessage:
    provider = _select_provider()
    if not provider:
        raise LLMNotConfigured(
            "AI Agent 기능은 .env 에 GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY 중 하나가 설정되어야 동작합니다."
        )
    if provider == "gemini" and not settings.GEMINI_API_KEY:
        raise LLMNotConfigured("LLM_PROVIDER=gemini 인데 GEMINI_API_KEY 가 비어 있습니다.")
    if provider == "anthropic" and not settings.ANTHROPIC_API_KEY:
        raise LLMNotConfigured("LLM_PROVIDER=anthropic 인데 ANTHROPIC_API_KEY 가 비어 있습니다.")
    if provider == "openai" and not settings.OPENAI_API_KEY:
        raise LLMNotConfigured("LLM_PROVIDER=openai 인데 OPENAI_API_KEY 가 비어 있습니다.")

    # 1. 사용자 메시지 저장
    user_msg = ChatMessage(user_id=user_id, ticker=ticker, role="user", content=user_text)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # 2. 컨텍스트 빌드 (현재 user_msg 는 history 에서 제외하고 user_text 로 별도 전달)
    system_prompt = _build_system_prompt(ticker, db, user_id)
    history = _load_history(db, user_id, ticker, MAX_HISTORY_TURNS)
    history_for_llm = [h for h in history if h.id != user_msg.id]

    # 3. provider 별 호출
    if provider == "gemini":
        reply = _call_gemini(system_prompt, history_for_llm, user_text)
    elif provider == "anthropic":
        reply = _call_anthropic(system_prompt, history_for_llm, user_text)
    else:
        reply = _call_openai(system_prompt, history_for_llm, user_text)

    # 4. assistant 응답 저장
    assistant_msg = ChatMessage(user_id=user_id, ticker=ticker, role="assistant", content=reply)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg
