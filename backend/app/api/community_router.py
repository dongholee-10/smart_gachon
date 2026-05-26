from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database import repository as repo
from app.database.models import User
from app.models.schemas import CommentCreate, CommentOut, PostCreate, PostOut

router = APIRouter(prefix="/community", tags=["Community"])


@router.get("/posts", response_model=list[PostOut])
def list_posts(db: Session = Depends(get_db)):
    posts = repo.get_posts(db)
    return [PostOut.from_orm_with_relations(p) for p in posts]


@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    body: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = repo.create_post(db, user_id=current_user.id, title=body.title, content=body.content, ticker=body.ticker)
    return PostOut.from_orm_with_relations(post)


@router.post("/posts/{post_id}/like", response_model=PostOut)
def like_post(post_id: int, db: Session = Depends(get_db)):
    post = repo.like_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    return PostOut.from_orm_with_relations(repo.get_post(db, post_id))


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(
    post_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = repo.add_comment(db, post_id=post_id, user_id=current_user.id, content=body.content)
    if not comment:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    return CommentOut.from_orm_with_author(comment)
