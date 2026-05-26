"""네이버 모바일 금융 API 로부터 실시간 시세 조회.

비공식 endpoint 라 운영 환경에선 KIS Developers / Yahoo Finance / pykrx 같은 정식 소스로 교체.
시연·개발 목적. ToS 위반은 아니지만 키 없이 호출되므로 IP rate limit 가 있을 수 있음.
같은 종목 30초 캐시.
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional, TypedDict

import requests

logger = logging.getLogger(__name__)

NAVER_M_STOCK_URL = "https://m.stock.naver.com/api/stock/{ticker}/basic"
_TTL = timedelta(seconds=30)
_lock = threading.Lock()
_cache: dict[str, tuple[datetime, "Quote"]] = {}

_DIRECTION_MAP = {
    "RISING": "up",
    "FALLING": "down",
    "EVEN": "flat",
    "UPPER_LIMIT": "up",
    "LOWER_LIMIT": "down",
}


class Quote(TypedDict, total=False):
    ticker: str
    name: str
    price: int
    change: int
    change_pct: float
    direction: str  # "up" | "down" | "flat"
    currency: str
    source: str
    fetched_at: str


def _parse_int(v) -> Optional[int]:
    if v is None:
        return None
    s = str(v).replace(",", "").strip()
    if s.startswith("+"):
        s = s[1:]
    try:
        return int(s)
    except ValueError:
        try:
            return int(float(s))
        except (ValueError, TypeError):
            return None


def _parse_float(v) -> Optional[float]:
    if v is None:
        return None
    s = str(v).replace(",", "").strip()
    if s.startswith("+"):
        s = s[1:]
    try:
        return float(s)
    except ValueError:
        return None


def get_quote(ticker: str) -> Optional[Quote]:
    if not ticker:
        return None
    t = ticker.strip()
    now = datetime.now(timezone.utc)

    cached = _cache.get(t)
    if cached and now - cached[0] < _TTL:
        return cached[1]

    try:
        r = requests.get(
            NAVER_M_STOCK_URL.format(ticker=t),
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; redflag-demo/1.0)",
                "Accept": "application/json",
            },
            timeout=4,
        )
        if r.status_code != 200:
            logger.debug("Naver quote %s: HTTP %d", t, r.status_code)
            return None
        data = r.json()
    except Exception:
        logger.debug("Naver quote %s 요청 실패", t, exc_info=True)
        return None

    price = _parse_int(data.get("closePrice"))
    change = _parse_int(data.get("compareToPreviousClosePrice"))
    change_pct = _parse_float(data.get("fluctuationsRatio"))
    direction_raw = (data.get("compareToPreviousPrice") or {}).get("name", "EVEN")

    # 하락이면 부호 보정 (네이버는 절대값을 주고 방향은 별도 필드로)
    if change is not None and direction_raw in {"FALLING", "LOWER_LIMIT"} and change > 0:
        change = -change
    if change_pct is not None and direction_raw in {"FALLING", "LOWER_LIMIT"} and change_pct > 0:
        change_pct = -change_pct

    if price is None:
        return None

    quote: Quote = {
        "ticker": t,
        "name": data.get("stockName") or "",
        "price": price,
        "change": change if change is not None else 0,
        "change_pct": change_pct if change_pct is not None else 0.0,
        "direction": _DIRECTION_MAP.get(direction_raw, "flat"),
        "currency": "KRW",
        "source": "naver",
        "fetched_at": now.isoformat(),
    }

    with _lock:
        _cache[t] = (now, quote)

    return quote
