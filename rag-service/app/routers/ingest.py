from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ingestion.ingest import ingest_directory, ingest_user_report

router = APIRouter(tags=["ingestion"])


class IngestReportRequest(BaseModel):
    user_id: str = Field(..., description="MongoDB user id; used as the per-user ChromaDB scope.")
    report_text: str = Field(..., description="Plain text extracted from the uploaded report.")
    filename: str = "report.pdf"


@router.post("/ingest/report")
def ingest_report(req: IngestReportRequest):
    if not req.report_text.strip():
        raise HTTPException(status_code=400, detail="report_text cannot be empty")
    return ingest_user_report(req.user_id, req.report_text, req.filename)


@router.post("/ingest/global")
def ingest_global():
    """Trigger ingestion of every doc in ./data/ into the global collection.
    Usually run once at setup, or after dropping new PDFs into ./data/."""
    return ingest_directory("./data")
