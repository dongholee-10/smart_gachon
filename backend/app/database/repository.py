from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.database.models import AnalysisResult, Comment, Post, WatchlistItem


# ── Analysis ────────────────────────────────────────────────────────────────

def save_analysis_result(db: Session, result: dict, user_id: Optional[int] = None) -> AnalysisResult:
    record = AnalysisResult(
        user_id=user_id,
        ticker=result.get("ticker"),
        title=result["title"],
        content=result["content"],
        sentiment_label=result["sentiment_label"],
        sentiment_score=result["sentiment_score"],
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        risk_factors=result.get("risk_factors", []),
        explanation=result["explanation"],
        news_link=result.get("news_link"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_analysis_result(db: Session, result_id: int) -> Optional[AnalysisResult]:
    return db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()


def list_analysis_results(db: Session, user_id: Optional[int] = None, limit: int = 50) -> List[AnalysisResult]:
    query = db.query(AnalysisResult)
    if user_id is not None:
        query = query.filter(AnalysisResult.user_id == user_id)
    return query.order_by(AnalysisResult.created_at.desc()).limit(limit).all()


# ── Community ────────────────────────────────────────────────────────────────

def get_posts(db: Session, limit: int = 50) -> List[Post]:
    return (
        db.query(Post)
        .options(joinedload(Post.author), joinedload(Post.comments).joinedload(Comment.author))
        .order_by(Post.created_at.desc())
        .limit(limit)
        .all()
    )


def get_post(db: Session, post_id: int) -> Optional[Post]:
    return (
        db.query(Post)
        .options(joinedload(Post.author), joinedload(Post.comments).joinedload(Comment.author))
        .filter(Post.id == post_id)
        .first()
    )


def create_post(db: Session, user_id: int, title: str, content: str, ticker: Optional[str] = None) -> Post:
    post = Post(user_id=user_id, title=title, content=content, ticker=ticker)
    db.add(post)
    db.commit()
    db.refresh(post)
    return get_post(db, post.id)


def like_post(db: Session, post_id: int) -> Optional[Post]:
    post = db.query(Post).filter(Post.id == post_id).first()
    if post:
        post.likes += 1
        db.commit()
        db.refresh(post)
    return post


def add_comment(db: Session, post_id: int, user_id: int, content: str) -> Optional[Comment]:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return None
    comment = Comment(post_id=post_id, user_id=user_id, content=content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    # author 관계 로드
    db.refresh(comment)
    return comment


# ── Watchlist ────────────────────────────────────────────────────────────────

def get_watchlist(db: Session, user_id: int) -> List[WatchlistItem]:
    return db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id).order_by(WatchlistItem.added_at.desc()).all()


def add_watchlist_item(db: Session, user_id: int, ticker: str, name: str, memo: str = "") -> WatchlistItem:
    item = WatchlistItem(user_id=user_id, ticker=ticker.upper(), name=name, memo=memo)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def delete_watchlist_item(db: Session, user_id: int, item_id: int) -> bool:
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id, WatchlistItem.user_id == user_id).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def update_watchlist_memo(db: Session, user_id: int, item_id: int, memo: str) -> Optional[WatchlistItem]:
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id, WatchlistItem.user_id == user_id).first()
    if not item:
        return None
    item.memo = memo
    db.commit()
    db.refresh(item)
    return item
