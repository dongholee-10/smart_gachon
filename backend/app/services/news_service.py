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


def fetch_latest_news(display: int = 5) -> list:
    """
    Fetch latest general stock market news for the home screen.
    Cycles through general keywords and returns the top N most recent items.
    """
    if not settings.NAVER_CLIENT_ID or not settings.NAVER_CLIENT_SECRET:
        raise Exception("Naver API keys are missing. Please check your .env file.")

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

    if not settings.NAVER_CLIENT_ID or not settings.NAVER_CLIENT_SECRET:
        raise Exception("Naver API keys are missing. Please check your .env file.")

    headers = {
        "X-Naver-Client-Id": settings.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": settings.NAVER_CLIENT_SECRET
    }

    enhanced_query = f"{query} 주가 실적 전망"

    params = {
        "query": enhanced_query,
        "display": display,
        "sort": "date"
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
    three_days_ago = now - timedelta(days=3)

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

        if pub_date < three_days_ago:
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

    return unique_news[:5]