from fastapi import APIRouter, HTTPException

from app.models.schemas import ReportRequest, ReportResponse
from app.services.report_service import generate_report

router = APIRouter(prefix="/report", tags=["Report"])


@router.post("", response_model=ReportResponse)
def create_report(request: ReportRequest):
    """Generate summarized risk report."""
    result = generate_report(request.result_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
