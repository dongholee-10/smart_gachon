from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database import repository as repo
from app.database.models import User
from app.models.schemas import CommentCreate, CommentOut, PostCreate, PostOut, PostUpdate

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


@router.patch("/posts/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    body: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 빈 페이로드 거부 — 의도하지 않은 no-op 호출 막기
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="수정할 항목이 없습니다.")

    existing = repo.get_post(db, post_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    if existing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인이 작성한 글만 수정할 수 있습니다.")

    updated = repo.update_post(db, post_id=post_id, user_id=current_user.id, **payload)
    return PostOut.from_orm_with_relations(updated)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = repo.delete_post(db, post_id=post_id, user_id=current_user.id)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    if result == "forbidden":
        raise HTTPException(status_code=403, detail="본인이 작성한 글만 삭제할 수 있습니다.")


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
