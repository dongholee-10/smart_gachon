import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ── Auth ────────────────────────────────────────────────────────────────
# 비밀번호 정책: 8자 이상 + 대문자 + 소문자 + 숫자 + 특수문자 각 1개 이상.
PASSWORD_MIN_LENGTH = 8
PASSWORD_SPECIAL_CHARS = r"!@#$%^&*()\-_=+[\]{};:'\",.<>/?\\|`~"
_PASSWORD_SPECIAL_RE = re.compile(f"[{re.escape(PASSWORD_SPECIAL_CHARS)}]")
PASSWORD_POLICY_MESSAGE = (
    f"비밀번호는 {PASSWORD_MIN_LENGTH}자 이상이며 "
    "대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다."
)


def _validate_password(value: str) -> str:
    if len(value) < PASSWORD_MIN_LENGTH:
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    if not re.search(r"[A-Z]", value):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    if not re.search(r"[a-z]", value):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    if not re.search(r"\d", value):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    if not _PASSWORD_SPECIAL_RE.search(value):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    return value


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=50)

    @field_validator("password")
    @classmethod
    def password_must_meet_policy(cls, v: str) -> str:
        return _validate_password(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Analysis ────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=500)
    content: Optional[str] = Field(default=None, max_length=5000)
    text: Optional[str] = Field(default=None, max_length=5000)
    ticker: Optional[str] = Field(default=None, max_length=20)
    news_link: Optional[str] = Field(default=None, max_length=2048)


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
    model_config = ConfigDict(from_attributes=True)

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
    created_at: Optional[datetime] = None

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


# ── Community ────────────────────────────────────────────────────────────────

class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    post_id: int
    content: str
    author: str = ""
    created_at: Optional[datetime] = None

    @classmethod
    def from_orm_with_author(cls, comment):
        return cls(
            id=comment.id,
            post_id=comment.post_id,
            content=comment.content,
            author=comment.author.name if comment.author else "익명",
            created_at=comment.created_at,
        )


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    content: str
    ticker: Optional[str] = None
    likes: int = 0
    author: str = ""
    comments: List[CommentOut] = []
    created_at: Optional[datetime] = None

    @classmethod
    def from_orm_with_relations(cls, post):
        return cls(
            id=post.id,
            title=post.title,
            content=post.content,
            ticker=post.ticker,
            likes=post.likes,
            author=post.author.name if post.author else "익명",
            comments=[CommentOut.from_orm_with_author(c) for c in post.comments],
            created_at=post.created_at,
        )


class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=5000)
    ticker: Optional[str] = Field(default=None, max_length=20)


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


# ── Watchlist ────────────────────────────────────────────────────────────────

class WatchlistItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ticker: str
    name: str
    memo: str = ""
    addedAt: Optional[datetime] = None

    @classmethod
    def from_orm(cls, item):
        return cls(
            id=item.id,
            ticker=item.ticker,
            name=item.name,
            memo=item.memo or "",
            addedAt=item.added_at,
        )


class WatchlistItemCreate(BaseModel):
    ticker: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=100)
    memo: Optional[str] = Field(default="", max_length=500)


class WatchlistMemoUpdate(BaseModel):
    memo: str = Field(max_length=500)
