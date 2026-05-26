from typing import List

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.data import stocks as stock_data

router = APIRouter(prefix="/stocks", tags=["Stocks"])


class StockOut(BaseModel):
    ticker: str
    name: str
    market: str


@router.get("/search", response_model=List[StockOut])
def search_stocks(
    q: str = Query("", description="검색어 (종목명 일부 또는 종목코드)"),
    limit: int = Query(20, ge=1, le=50),
):
    """자동완성용. 빈 쿼리는 빈 리스트를 반환해 UI 가 명시적으로 입력하게 유도."""
    return stock_data.search(q, limit=limit)
