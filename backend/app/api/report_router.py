from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.schemas import ReportRequest, ReportResponse
from app.services.report_service import generate_report

router = APIRouter(prefix="/report", tags=["Report"])


@router.post("", response_model=ReportResponse)
def create_report(request: ReportRequest, db: Session = Depends(get_db)):
    result = generate_report(db, request.result_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
