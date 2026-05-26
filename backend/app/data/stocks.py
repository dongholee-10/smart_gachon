"""시연용 종목 마스터.

운영에서는 KRX 일일 다운로드를 cron 으로 받아와 DB 에 저장하는 게 맞지만,
시연 단계에선 자주 검색되는 코스피·코스닥 핵심 종목을 메모리에 둔다.
검색은 O(n) substring — 종목 수가 ~80개라 충분.
"""
from typing import List, Optional, TypedDict


class Stock(TypedDict):
    ticker: str
    name: str
    market: str  # "KOSPI" | "KOSDAQ"


STOCKS: List[Stock] = [
    # ── KOSPI (시가총액 상위 + 자주 언급되는 종목) ───────────────────────
    {"ticker": "005930", "name": "삼성전자", "market": "KOSPI"},
    {"ticker": "000660", "name": "SK하이닉스", "market": "KOSPI"},
    {"ticker": "373220", "name": "LG에너지솔루션", "market": "KOSPI"},
    {"ticker": "207940", "name": "삼성바이오로직스", "market": "KOSPI"},
    {"ticker": "005380", "name": "현대차", "market": "KOSPI"},
    {"ticker": "000270", "name": "기아", "market": "KOSPI"},
    {"ticker": "068270", "name": "셀트리온", "market": "KOSPI"},
    {"ticker": "035420", "name": "NAVER", "market": "KOSPI"},
    {"ticker": "035720", "name": "카카오", "market": "KOSPI"},
    {"ticker": "005490", "name": "POSCO홀딩스", "market": "KOSPI"},
    {"ticker": "105560", "name": "KB금융", "market": "KOSPI"},
    {"ticker": "055550", "name": "신한지주", "market": "KOSPI"},
    {"ticker": "086790", "name": "하나금융지주", "market": "KOSPI"},
    {"ticker": "316140", "name": "우리금융지주", "market": "KOSPI"},
    {"ticker": "006400", "name": "삼성SDI", "market": "KOSPI"},
    {"ticker": "032830", "name": "삼성생명", "market": "KOSPI"},
    {"ticker": "000810", "name": "삼성화재", "market": "KOSPI"},
    {"ticker": "028260", "name": "삼성물산", "market": "KOSPI"},
    {"ticker": "009150", "name": "삼성전기", "market": "KOSPI"},
    {"ticker": "010140", "name": "삼성중공업", "market": "KOSPI"},
    {"ticker": "018260", "name": "삼성에스디에스", "market": "KOSPI"},
    {"ticker": "051910", "name": "LG화학", "market": "KOSPI"},
    {"ticker": "066570", "name": "LG전자", "market": "KOSPI"},
    {"ticker": "003550", "name": "LG", "market": "KOSPI"},
    {"ticker": "034220", "name": "LG디스플레이", "market": "KOSPI"},
    {"ticker": "032640", "name": "LG유플러스", "market": "KOSPI"},
    {"ticker": "051900", "name": "LG생활건강", "market": "KOSPI"},
    {"ticker": "034730", "name": "SK", "market": "KOSPI"},
    {"ticker": "017670", "name": "SK텔레콤", "market": "KOSPI"},
    {"ticker": "096770", "name": "SK이노베이션", "market": "KOSPI"},
    {"ticker": "326030", "name": "SK바이오팜", "market": "KOSPI"},
    {"ticker": "302440", "name": "SK바이오사이언스", "market": "KOSPI"},
    {"ticker": "034020", "name": "두산에너빌리티", "market": "KOSPI"},
    {"ticker": "267250", "name": "HD현대중공업", "market": "KOSPI"},
    {"ticker": "329180", "name": "HD현대일렉트릭", "market": "KOSPI"},
    {"ticker": "015760", "name": "한국전력", "market": "KOSPI"},
    {"ticker": "033780", "name": "KT&G", "market": "KOSPI"},
    {"ticker": "030200", "name": "KT", "market": "KOSPI"},
    {"ticker": "090430", "name": "아모레퍼시픽", "market": "KOSPI"},
    {"ticker": "035250", "name": "강원랜드", "market": "KOSPI"},
    {"ticker": "271560", "name": "오리온", "market": "KOSPI"},
    {"ticker": "003490", "name": "대한항공", "market": "KOSPI"},
    {"ticker": "047810", "name": "한국항공우주", "market": "KOSPI"},
    {"ticker": "009830", "name": "한화솔루션", "market": "KOSPI"},
    {"ticker": "012330", "name": "현대모비스", "market": "KOSPI"},
    {"ticker": "024110", "name": "기업은행", "market": "KOSPI"},

    # ── KOSDAQ ─────────────────────────────────────────────────────────
    {"ticker": "247540", "name": "에코프로비엠", "market": "KOSDAQ"},
    {"ticker": "086520", "name": "에코프로", "market": "KOSDAQ"},
    {"ticker": "091990", "name": "셀트리온헬스케어", "market": "KOSDAQ"},
    {"ticker": "196170", "name": "알테오젠", "market": "KOSDAQ"},
    {"ticker": "263750", "name": "펄어비스", "market": "KOSDAQ"},
    {"ticker": "041510", "name": "에스엠", "market": "KOSDAQ"},
    {"ticker": "035900", "name": "JYP Ent.", "market": "KOSDAQ"},
    {"ticker": "352820", "name": "하이브", "market": "KOSDAQ"},
    {"ticker": "112040", "name": "위메이드", "market": "KOSDAQ"},
    {"ticker": "078340", "name": "컴투스", "market": "KOSDAQ"},
    {"ticker": "036570", "name": "엔씨소프트", "market": "KOSDAQ"},
    {"ticker": "259960", "name": "크래프톤", "market": "KOSDAQ"},
    {"ticker": "293490", "name": "카카오게임즈", "market": "KOSDAQ"},
    {"ticker": "323410", "name": "카카오뱅크", "market": "KOSDAQ"},
    {"ticker": "377300", "name": "카카오페이", "market": "KOSDAQ"},
    {"ticker": "066970", "name": "엘앤에프", "market": "KOSDAQ"},
    {"ticker": "095610", "name": "테스", "market": "KOSDAQ"},
    {"ticker": "058470", "name": "리노공업", "market": "KOSDAQ"},
    {"ticker": "240810", "name": "원익IPS", "market": "KOSDAQ"},
    {"ticker": "214450", "name": "파마리서치", "market": "KOSDAQ"},
    {"ticker": "278280", "name": "천보", "market": "KOSDAQ"},
    {"ticker": "145020", "name": "휴젤", "market": "KOSDAQ"},
    {"ticker": "067310", "name": "하나마이크론", "market": "KOSDAQ"},
    {"ticker": "067160", "name": "아프리카TV", "market": "KOSDAQ"},
    {"ticker": "095660", "name": "네오위즈", "market": "KOSDAQ"},
    {"ticker": "194480", "name": "데브시스터즈", "market": "KOSDAQ"},
    {"ticker": "041960", "name": "코미팜", "market": "KOSDAQ"},
    {"ticker": "048410", "name": "현대바이오", "market": "KOSDAQ"},
    {"ticker": "066970", "name": "엘앤에프", "market": "KOSDAQ"},
    {"ticker": "086900", "name": "메디톡스", "market": "KOSDAQ"},
    {"ticker": "214150", "name": "클래시스", "market": "KOSDAQ"},
    {"ticker": "319660", "name": "피에스케이", "market": "KOSDAQ"},
    {"ticker": "950140", "name": "잉글우드랩", "market": "KOSDAQ"},
]


def find_by_ticker(ticker: str) -> Optional[Stock]:
    if not ticker:
        return None
    t = ticker.strip().upper()
    return next((s for s in STOCKS if s["ticker"] == t), None)


def search(query: str, limit: int = 20) -> List[Stock]:
    """공백·대소문자 무시 substring 매칭. 이름 매치를 ticker 매치보다 우선.

    빈 쿼리는 빈 리스트 (전체 노출 방지 — UI 가 명시적으로 입력해야 결과 표시).
    """
    q = (query or "").strip().lower()
    if not q:
        return []

    name_hits: List[Stock] = []
    ticker_hits: List[Stock] = []
    seen_tickers: set = set()

    for stock in STOCKS:
        if stock["ticker"] in seen_tickers:
            continue
        name_lc = stock["name"].lower()
        if q in name_lc:
            name_hits.append(stock)
            seen_tickers.add(stock["ticker"])
        elif q in stock["ticker"].lower():
            ticker_hits.append(stock)
            seen_tickers.add(stock["ticker"])

    # 이름이 q 로 시작하는 항목을 위로 — 사용자가 보통 prefix 검색을 기대
    name_hits.sort(key=lambda s: (not s["name"].lower().startswith(q), s["name"]))
    return (name_hits + ticker_hits)[:limit]
