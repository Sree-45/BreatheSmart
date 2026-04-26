from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ingestion.ingest import ingest_directory, ingest_user_report
from app.rag.llm import get_llm
import logging

router = APIRouter(tags=["ingestion"])


class IngestReportRequest(BaseModel):
    user_id: str = Field(..., description="MongoDB user id; used as the per-user ChromaDB scope.")
    report_text: str = Field(..., description="Plain text extracted from the uploaded report.")
    filename: str = "report.pdf"

def validate_medical_content(text: str) -> bool:
    try:
        llm = get_llm()
        result = llm.invoke(f"Is the following text primarily from a medical or healthcare document (e.g. lab report, prescription, clinical summary)? Reply with only 'YES' or 'NO'.\n\nText: {text[:2000]}")
        content = result.content.strip().upper()
        return "YES" in content
    except Exception as e:
        logging.getLogger(__name__).error("Failed to validate medical content: %s", str(e))
        return True  # Fallback to true if validation fails

MAX_REPORT_CHARS = 200_000  # ~50 pages of dense text; covers 99% of medical PDFs.


@router.post("/ingest/report")
def ingest_report(req: IngestReportRequest):
    if not req.report_text.strip():
        raise HTTPException(status_code=400, detail="report_text cannot be empty")

    text = req.report_text
    if len(text) > MAX_REPORT_CHARS:
        logging.getLogger(__name__).info(
            "ingest.report: truncating oversized report from %d to %d chars (user=%s)",
            len(text), MAX_REPORT_CHARS, req.user_id,
        )
        text = text[:MAX_REPORT_CHARS]

    if not validate_medical_content(text):
        raise HTTPException(status_code=400, detail="Document doesn't appear to be a medical report. Please upload healthcare documents, lab reports, or clinical summaries.")

    return ingest_user_report(req.user_id, text, req.filename)


@router.post("/ingest/global")
def ingest_global():
    """Trigger ingestion of every doc in ./data/ into the global collection.
    Usually run once at setup, or after dropping new PDFs into ./data/."""
    return ingest_directory("./data")
