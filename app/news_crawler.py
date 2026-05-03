import requests
from datetime import datetime, timedelta, timezone
import re

from app.config import NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

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


def clean_html(text: str) -> str:
    clean = re.compile("<.*?>")
    return re.sub(clean, "", text)


def remove_duplicates(news_list: list) -> list:
    seen_titles = set()
    unique_news = []

    for news in news_list:
        title = news["title"]

        if title not in seen_titles:
            unique_news.append(news)
            seen_titles.add(title)

    return unique_news


def fetch_news(query: str, display: int = 10) -> list:
    if not query:
        raise ValueError("Query is required")

    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        raise Exception("Naver API keys are missing. Please check your .env file.")

    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
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

    if not items:
        return []

    now = datetime.now(timezone.utc)
    three_days_ago = now - timedelta(days=3)

    scored_news = []

    for item in items:
        title = clean_html(item.get("title", ""))
        description = clean_html(item.get("description", ""))
        link = item.get("link", "")
        pub_date_text = item.get("pubDate", "")

        text = title + " " + description

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
            if keyword.lower() in text.lower()
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