from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database import repository as repo
from app.database.models import User
from app.models.schemas import WatchlistItemCreate, WatchlistItemOut, WatchlistMemoUpdate

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.get("", response_model=list[WatchlistItemOut])
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = repo.get_watchlist(db, current_user.id)
    return [WatchlistItemOut.from_orm(i) for i in items]


@router.post("", response_model=WatchlistItemOut, status_code=status.HTTP_201_CREATED)
def add_watchlist(
    body: WatchlistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = repo.get_watchlist(db, current_user.id)
    if any(i.ticker == body.ticker.upper() for i in existing):
        raise HTTPException(status_code=400, detail="이미 등록된 관심종목입니다.")
    item = repo.add_watchlist_item(db, user_id=current_user.id, ticker=body.ticker, name=body.name, memo=body.memo or "")
    return WatchlistItemOut.from_orm(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watchlist(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = repo.delete_watchlist_item(db, user_id=current_user.id, item_id=item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="관심종목을 찾을 수 없습니다.")


@router.patch("/{item_id}", response_model=WatchlistItemOut)
def update_memo(
    item_id: int,
    body: WatchlistMemoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = repo.update_watchlist_memo(db, user_id=current_user.id, item_id=item_id, memo=body.memo)
    if not item:
        raise HTTPException(status_code=404, detail="관심종목을 찾을 수 없습니다.")
    return WatchlistItemOut.from_orm(item)
