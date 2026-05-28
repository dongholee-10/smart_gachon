import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import User
from app.database.session import SessionLocal, get_db
from app.models.schemas import ChatMessageOut, ChatSendRequest
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["Chat"])


def _normalize_ticker(ticker: str) -> str:
    t = (ticker or "").strip()
    if not t:
        raise HTTPException(status_code=400, detail="ticker 가 필요합니다.")
    return t


@router.get("/stocks/{ticker}/messages", response_model=List[ChatMessageOut])
def list_messages(
    ticker: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return chat_service.list_messages(db, user.id, _normalize_ticker(ticker))


@router.post("/stocks/{ticker}/messages", response_model=ChatMessageOut, status_code=status.HTTP_201_CREATED)
def send_message(
    ticker: str,
    body: ChatSendRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return chat_service.send_message(db, user.id, _normalize_ticker(ticker), body.message)
    except chat_service.LLMNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except chat_service.LLMCallFailed as e:
        raise HTTPException(status_code=502, detail=f"AI 호출 실패: {e}")


@router.post("/stocks/{ticker}/stream")
def stream_message(
    ticker: str,
    body: ChatSendRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticker = _normalize_ticker(ticker)
    try:
        provider, _, system_prompt, history = chat_service.prepare_stream(
            db, user.id, ticker, body.message
        )
    except chat_service.LLMNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))

    user_id = user.id

    def generate():
        accumulated: list[str] = []
        try:
            for token in chat_service.iter_stream_tokens(provider, system_prompt, history, body.message):
                accumulated.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
        except chat_service.LLMCallFailed as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        full_text = "".join(accumulated)
        save_db = SessionLocal()
        try:
            msg = chat_service.save_assistant_message(save_db, user_id, ticker, full_text)
            yield f"data: {json.dumps({'done': True, 'id': msg.id})}\n\n"
        finally:
            save_db.close()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/stocks/{ticker}/messages", status_code=status.HTTP_204_NO_CONTENT)
def clear_messages(
    ticker: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chat_service.clear_messages(db, user.id, _normalize_ticker(ticker))
