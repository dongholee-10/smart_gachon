from pydantic import BaseModel
from typing import List, Optional


class AnalyzeRequest(BaseModel):
    title: str
    content: str
    ticker: Optional[str] = None


class CompanyAnalyzeRequest(BaseModel):
    company: str
    display: Optional[int] = 10


class ReportRequest(BaseModel):
    result_id: int


class RiskFactor(BaseModel):
    category: str
    keyword: str
    description: str


class AnalyzeResponse(BaseModel):
    id: int
    ticker: Optional[str]
    title: str
    sentiment_label: str
    sentiment_score: float
    risk_level: str
    risk_score: int
    risk_factors: List[RiskFactor]
    explanation: str


class NewsItem(BaseModel):
    score: int
    title: str
    description: str
    link: str
    pubDate: str


class CompanyAnalyzeResponse(BaseModel):
    company: str
    news_count: int
    results: List[AnalyzeResponse]


class ReportResponse(BaseModel):
    result_id: int
    summary: str