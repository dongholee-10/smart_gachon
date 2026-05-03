import requests
from config import NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
from datetime import datetime, timedelta, timezone
import re

NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json"

# 🔥 확장된 키워드 (중요)
STOCK_KEYWORDS = [
    "주가", "실적", "증시", "전망", "투자",
    "목표가", "매출", "영업이익",
    "반도체", "AI", "수출", "시장",
    "상승", "하락", "급등", "급락"
]


def fetch_news(query: str, display: int = 50): # 검색 범위를 넓힙니다.
    if not query:
        raise ValueError("Query is required")

    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    }

    # query를 단순화하여 검색 결과 누락 방지
    params = {
        "query": query, 
        "display": display,
        "sort": "date"
    }

    response = requests.get(NAVER_NEWS_URL, headers=headers, params=params)
    if response.status_code != 200:
        print(f"Error: {response.status_code}") # 에러 로그 출력
        return []

    data = response.json()
    items = data.get("items", [])
    
    if not items:
        print("검색 결과가 없습니다.")
        return []

    # 3일 전 기준 시간 (비교를 위해 단순화)
    now = datetime.now(timezone.utc)
    three_days_ago = now - timedelta(days=3)

    scored_news = []
    for item in items:
        title = clean_html(item["title"])
        desc = clean_html(item["description"])
        text = title + " " + desc

        # 날짜 파싱 안전하게 처리
        try:
            pub_date = datetime.strptime(item["pubDate"], "%a, %d %b %Y %H:%M:%S %z")
        except Exception as e:
            continue

        # 날짜 필터 (문제가 있다면 이 부분을 조정하세요)
        if pub_date < three_days_ago:
            continue

        # 점수 계산 (대소문자 구분 없애기 위해 lower() 사용 추천)
        score = sum(1 for keyword in STOCK_KEYWORDS if keyword in text)

        # 필터링 (점수가 낮아도 일단 가져오고 싶다면 0으로 수정)
        if score >= 1:
            scored_news.append({
                "score": score,
                "title": title,
                "description": desc,
                "link": item["link"],
                "pubDate": item["pubDate"]
            })

    # 정렬 및 중복 제거 로직 진행
    scored_news.sort(key=lambda x: x["score"], reverse=True)
    unique_news = remove_duplicates([n for n in scored_news])
    
    return unique_news[:5]


def remove_duplicates(news_list):
    seen = set()
    unique = []

    for news in news_list:
        if news["title"] not in seen:
            unique.append(news)
            seen.add(news["title"])

    return unique


def clean_html(text: str):
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)