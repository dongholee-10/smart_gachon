from typing import List, Optional

from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    # Accept either {title, content} or a single {text} blob.
    title: Optional[str] = None
    content: Optional[str] = None
    text: Optional[str] = None
    ticker: Optional[str] = None
    news_link: Optional[str] = None


class CompanyAnalyzeRequest(BaseModel):
    company: str
    display: Optional[int] = 10


class ReportRequest(BaseModel):
    result_id: int


class RiskFactor(BaseModel):
    category: str
    keyword: str
    description: str


class SentimentBreakdown(BaseModel):
    positive: float
    neutral: float
    negative: float


class AnalyzeResponse(BaseModel):
    id: int
    ticker: Optional[str] = None
    title: str
    content: str
    sentiment_label: str
    sentiment_score: float
    risk_score: int
    risk_level: str
    risk_factors: List[RiskFactor]
    explanation: str
    news_link: Optional[str] = None

    # Frontend-friendly aliases
    score: Optional[int] = None
    reasoning: Optional[str] = None
    news_title: Optional[str] = None
    sentiment: Optional[SentimentBreakdown] = None


class NewsItem(BaseModel):
    score: int
    title: str
    description: str
    link: str
    pubDate: str


class NewsSearchResponse(BaseModel):
    news: List[NewsItem]


class CompanyAnalyzeResponse(BaseModel):
    company: str
    news_count: int
    results: List[AnalyzeResponse]


class ReportResponse(BaseModel):
    result_id: int
    summary: str
    recommendation: str
