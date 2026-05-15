from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, JSON, String, Text

from app.database.session import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    sentiment_label = Column(String, nullable=False)
    sentiment_score = Column(Float, nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False, index=True)
    risk_factors = Column(JSON, nullable=False, default=list)
    explanation = Column(Text, nullable=False)
    news_link = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
