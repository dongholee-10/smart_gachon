from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.database.models import AnalysisResult, User
from app.database.session import get_db
from app.models.schemas import AuthResponse, LoginRequest, SignupRequest, UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])


def _to_auth_response(user: User) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(subject=user.email),
        user=UserOut(id=user.id, email=user.email, name=user.name),
    )


@router.post("/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
def signup(request: Request, payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다.")

    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_auth_response(user)


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    return _to_auth_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email, name=user.name)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 분석 결과의 user_id를 NULL로 처리해 기록은 보존
    db.query(AnalysisResult).filter(AnalysisResult.user_id == user.id).update({"user_id": None})
    db.delete(user)
    db.commit()
