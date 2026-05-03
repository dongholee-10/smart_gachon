from fastapi import FastAPI
from fastapi.responses import JSONResponse
from services.news_service import fetch_news

#종목(키워드) 입력 시, 관련 최신 뉴스 5개 가져오는 API Server

app = FastAPI()


@app.get("/")
def root():
    return {"message": "News API is running"}

@app.get("/news")
def get_news(query: str):
    news = fetch_news(query)

    return JSONResponse(
        content={
            "query": query,
            "count": len(news),
            "news": news
        },
        media_type="application/json; charset=utf-8"
    )