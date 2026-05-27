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


def send_message(db: Session, user_id: int, ticker: str, user_text: str) -> ChatMessage:
    if not settings.OPENAI_API_KEY:
        raise LLMNotConfigured(
            "AI Agent 기능은 OPENAI_API_KEY 가 .env 에 설정되어야 동작합니다."
        )

    # 1. 사용자 메시지 먼저 저장
    user_msg = ChatMessage(user_id=user_id, ticker=ticker, role="user", content=user_text)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # 2. system + history + 현재 user 메시지로 messages 배열 빌드
    system_prompt = _build_system_prompt(ticker, db, user_id)
    history = _load_history(db, user_id, ticker, MAX_HISTORY_TURNS)

    messages = [{"role": "system", "content": system_prompt}]
    # 마지막은 이미 db 에 들어간 user_msg — history 의 일부. 중복 방지 위해 그대로 사용.
    for h in history:
        if h.id == user_msg.id:
            continue  # 시스템 프롬프트 다음에 별도로 붙임
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": user_text})

    # 3. OpenAI 호출
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise LLMNotConfigured("openai 패키지가 설치되어 있지 않습니다.") from exc

    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        reply = response.choices[0].message.content.strip()
    except Exception as exc:
        logger.exception("OpenAI 호출 실패")
        raise LLMCallFailed(str(exc)) from exc

    # 4. assistant 응답 저장
    assistant_msg = ChatMessage(user_id=user_id, ticker=ticker, role="assistant", content=reply)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg
