import logging

import requests
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.utils.text_cleaner import clean_html

logger = logging.getLogger(__name__)

NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json"

STOCK_KEYWORDS = [
    "주가", "실적", "증시", "전망", "투자",
    "목표가", "매출", "영업이익",
    "반도체", "AI", "수출", "시장",
    "상승", "하락", "급등", "급락",
    "적자", "흑자", "영업손실", "매수", "매도",
    "lawsuit", "investigation", "earnings", "revenue",
    "profit", "loss", "stock", "market", "decline"
]


def remove_duplicates(news_list: list) -> list:
    seen_titles = set()
    unique_news = []

    for news in news_list:
        title = news["title"]

        if title not in seen_titles:
            unique_news.append(news)
            seen_titles.add(title)

    return unique_news


LATEST_NEWS_KEYWORDS = ["주가", "증시", "코스피", "코스닥", "반도체", "AI 주식", "실적"]


def _format_mock_pub_date(days_ago: int = 0, hours_ago: int = 0) -> str:
    dt = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours_ago)
    return dt.strftime("%a, %d %b %Y %H:%M:%S %z")


def _mock_news(display: int = 5, query: str = "시장") -> list:
    base_items = [
        {
            "score": 4,
            "title": f"{query} 관련 실적 전망과 투자 심리 점검",
            "description": "최근 매출 전망, 수급 흐름, 업종별 리스크 요인을 함께 점검하는 시장 분석입니다.",
            "link": "https://example.com/redflag/mock-news-1",
            "pubDate": _format_mock_pub_date(hours_ago=1),
        },
        {
            "score": 3,
            "title": f"{query} 주가 변동성 확대, 위험 신호는 제한적",
            "description": "단기 변동성은 커졌지만 주요 재무 지표와 뉴스 흐름은 중립 구간에 머물고 있습니다.",
            "link": "https://example.com/redflag/mock-news-2",
            "pubDate": _format_mock_pub_date(hours_ago=4),
        },
        {
            "score": 5,
            "title": f"{query} 공급망 이슈와 매출 둔화 우려 부각",
            "description": "공급망 차질, 비용 증가, 매출 둔화 가능성이 투자자 관심 요인으로 떠올랐습니다.",
            "link": "https://example.com/redflag/mock-news-3",
            "pubDate": _format_mock_pub_date(hours_ago=8),
        },
        {
            "score": 2,
            "title": f"{query} 업종 전반 AI 투자 확대 기대",
            "description": "AI와 자동화 투자 확대가 중장기 성장 동력으로 평가되고 있습니다.",
            "link": "https://example.com/redflag/mock-news-4",
            "pubDate": _format_mock_pub_date(days_ago=1),
        },
        {
            "score": 4,
            "title": f"{query} 규제 변화에 따른 시장 영향 분석",
            "description": "정책과 규제 변화가 기업 실적, 투자 심리, 주가 흐름에 미칠 영향을 분석합니다.",
            "link": "https://example.com/redflag/mock-news-5",
            "pubDate": _format_mock_pub_date(days_ago=1, hours_ago=5),
        },
    ]
    return base_items[:display]


def _has_naver_credentials() -> bool:
    return bool(settings.NAVER_CLIENT_ID and settings.NAVER_CLIENT_SECRET)


def fetch_latest_news(display: int = 5) -> list:
    """
    Fetch latest general stock market news for the home screen.
    Cycles through general keywords and returns the top N most recent items.
    """
    if not _has_naver_credentials():
        logger.warning("네이버 API 키가 없어 최신 뉴스 mock 데이터를 반환합니다.")
        return _mock_news(display=display, query="국내 증시")

    headers = {
        "X-Naver-Client-Id": settings.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": settings.NAVER_CLIENT_SECRET
    }

    all_items = []

    for keyword in LATEST_NEWS_KEYWORDS[:3]:
        params = {
            "query": keyword,
            "display": 10,
            "sort": "date"
        }
        try:
            response = requests.get(
                NAVER_NEWS_URL,
                headers=headers,
                params=params,
                timeout=10
            )
            response.encoding = "utf-8"
            if response.status_code == 200:
                data = response.json()
                all_items.extend(data.get("items", []))
        except Exception:
            logger.debug("네이버 뉴스 키워드 '%s' 요청 실패, 건너뜀", keyword)
            continue

    now = datetime.now(timezone.utc)
    three_days_ago = now - timedelta(days=3)

    scored_news = []
    for item in all_items:
        title = clean_html(item.get("title", ""))
        description = clean_html(item.get("description", ""))
        link = item.get("link", "")
        pub_date_text = item.get("pubDate", "")

        try:
            pub_date = datetime.strptime(pub_date_text, "%a, %d %b %Y %H:%M:%S %z")
        except Exception:
            continue

        if pub_date < three_days_ago:
            continue

        full_text = title + " " + description
        score = sum(1 for keyword in STOCK_KEYWORDS if keyword.lower() in full_text.lower())

        if score >= 1:
            scored_news.append({
                "score": score,
                "title": title,
                "description": description,
                "link": link,
                "pubDate": pub_date_text
            })

    # 최신순으로 정렬 후 중복 제거
    scored_news.sort(key=lambda x: x["pubDate"], reverse=True)
    unique_news = remove_duplicates(scored_news)

    return unique_news[:display]


def fetch_news(query: str, display: int = 10) -> list:
    """
    Fetch recent stock-related news from Naver News Search API.
    """
    if not query:
        raise ValueError("Query is required")

    if not _has_naver_credentials():
        logger.warning("네이버 API 키가 없어 '%s' 검색 mock 데이터를 반환합니다.", query)
        return _mock_news(display=min(display, 5), query=query)

    headers = {
        "X-Naver-Client-Id": settings.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": settings.NAVER_CLIENT_SECRET
    }

    # 검색어를 그대로 네이버에 전달. 예전엔 \"<query> 주가 실적 전망\" 을 강제로 붙였는데
    # 그 4단어 AND 조건이 소형주·일반 종목 뉴스를 대부분 탈락시켰음. STOCK_KEYWORDS 화이트리스트가
    # 뒤에서 도메인 필터를 따로 걸어주므로 prefix 강제 없이도 주식 노이즈는 충분히 걸린다.
    params = {
        "query": query,
        "display": display,
        "sort": "date",
    }

    response = requests.get(
        NAVER_NEWS_URL,
        headers=headers,
        params=params,
        timeout=10
    )

    response.encoding = "utf-8"

    if response.status_code != 200:
        raise Exception(f"Naver API Error: {response.status_code}, {response.text}")

    data = response.json()
    items = data.get("items", [])

    now = datetime.now(timezone.utc)
    # 3일 윈도우는 소형·중형주에서 결과 0건을 자주 만듦. 14일로 늘려 코어 종목은
    # 거의 항상 결과가 나오게 하고, 시점은 정렬·UI 표시로 사용자에게 위임.
    cutoff = now - timedelta(days=14)

    scored_news = []

    for item in items:
        title = clean_html(item.get("title", ""))
        description = clean_html(item.get("description", ""))
        link = item.get("link", "")
        pub_date_text = item.get("pubDate", "")

        full_text = title + " " + description

        try:
            pub_date = datetime.strptime(
                pub_date_text,
                "%a, %d %b %Y %H:%M:%S %z"
            )
        except Exception:
            continue

        if pub_date < cutoff:
            continue

        score = sum(
            1 for keyword in STOCK_KEYWORDS
            if keyword.lower() in full_text.lower()
        )

        if score >= 1:
            scored_news.append({
                "score": score,
                "title": title,
                "description": description,
                "link": link,
                "pubDate": pub_date_text
            })

    scored_news.sort(key=lambda x: x["score"], reverse=True)

    unique_news = remove_duplicates(scored_news)

    # display 를 그대로 따른다. 예전엔 [:5] 가 박혀 있어 호출자가 10을 보내도 5건만 나왔음.
    return unique_news[:display]
