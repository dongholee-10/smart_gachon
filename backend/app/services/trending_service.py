"""실시간 핫 종목 — 네이버 뉴스 검색 시 결과 건수가 많은 종목을 상위로.

매 호출마다 네이버 API 를 N번 두드리는 비용이 크므로 메모리 캐시 5분.
시연 시 한 번 갱신되면 그 후 같은 응답을 반환 (quota 보호).
"""
from __future__ import annotations

import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import List, Optional, TypedDict

import requests

from app.core.config import settings
from app.data import stocks as stock_data

logger = logging.getLogger(__name__)

NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json"
_TTL = timedelta(minutes=5)
_lock = threading.Lock()
_cache: Optional[tuple[datetime, list]] = None  # (fetched_at, ranked_full_list)


class TrendingStock(TypedDict):
    ticker: str
    name: str
    market: str
    article_count: int


def _hit_count(name: str) -> int:
    """네이버 검색 결과 'total' 필드만 받음 — display=1 로 최소 페이로드."""
    if not (settings.NAVER_CLIENT_ID and settings.NAVER_CLIENT_SECRET):
        return 0
    try:
        r = requests.get(
            NAVER_NEWS_URL,
            headers={
                "X-Naver-Client-Id": settings.NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": settings.NAVER_CLIENT_SECRET,
            },
            params={"query": name, "display": 1, "sort": "date"},
            timeout=5,
        )
        if r.status_code != 200:
            return 0
        return int(r.json().get("total", 0))
    except Exception:
        logger.debug("네이버 hit count 요청 실패 (%s)", name)
        return 0


def _build_ranking() -> List[TrendingStock]:
    """전체 종목 마스터를 병렬 조회해 article_count 가 1 이상인 것만 정렬."""
    candidates = stock_data.STOCKS  # 75개 전후
    with ThreadPoolExecutor(max_workers=10) as ex:
        counts = list(ex.map(lambda s: _hit_count(s["name"]), candidates))

    ranked: List[TrendingStock] = [
        {
            "ticker": s["ticker"],
            "name": s["name"],
            "market": s["market"],
            "article_count": c,
        }
        for s, c in zip(candidates, counts)
        if c > 0  # 뉴스 없는 종목은 제외
    ]
    ranked.sort(key=lambda x: x["article_count"], reverse=True)
    return ranked


def get_trending(limit: int = 8) -> List[TrendingStock]:
    """캐시된 ranking 에서 상위 limit 개."""
    global _cache
    now = datetime.now(timezone.utc)

    if _cache and now - _cache[0] < _TTL:
        return _cache[1][:limit]

    with _lock:
        # double-checked
        if _cache and now - _cache[0] < _TTL:
            return _cache[1][:limit]

        logger.info("trending 캐시 만료, 재계산 시작")
        ranked = _build_ranking()
        _cache = (now, ranked)
        logger.info("trending 캐시 갱신: %d개 종목, 상위 %s", len(ranked), [r["name"] for r in ranked[:5]])

    return ranked[:limit]


def invalidate_cache() -> None:
    """테스트·운영 도구용."""
    global _cache
    with _lock:
        _cache = None
