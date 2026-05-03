from fastapi import FastAPI, HTTPException, Query

from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    CompanyAnalyzeRequest,
    CompanyAnalyzeResponse,
    ReportRequest,
    ReportResponse,
    NewsItem
)

from app.service import (
    analyze_news,
    get_analysis_result,
    search_company_news,
    analyze_company_news,
    generate_report
)

app = FastAPI(
    title="News-based Stock Red Flag Detection API",
    description="A FastAPI backend for detecting corporate red flags from financial news using FinBERT and rule-based risk scoring.",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "News-based Stock Red Flag Detection API is running."
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    result = analyze_news(
        title=request.title,
        content=request.content,
        ticker=request.ticker
    )

    return result


@app.get("/results/{result_id}", response_model=AnalyzeResponse)
def get_result(result_id: int):
    result = get_analysis_result(result_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Result not found")

    return result


@app.get("/news/search", response_model=list[NewsItem])
def search_news(
    query: str = Query(..., description="Company or stock keyword"),
    display: int = Query(10, description="Number of news items to request from Naver API")
):
    try:
        news_list = search_company_news(query, display)
        return news_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/company", response_model=CompanyAnalyzeResponse)
def analyze_company(request: CompanyAnalyzeRequest):
    try:
        result = analyze_company_news(
            company=request.company,
            display=request.display
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/report", response_model=ReportResponse)
def report(request: ReportRequest):
    result = generate_report(request.result_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Result not found")

    return result