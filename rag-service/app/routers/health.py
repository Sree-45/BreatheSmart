from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "rag-service",
        "model": settings.llm_model,
        "chroma_path": settings.chroma_db_path,
        "embedding_model": settings.embedding_model,
        "llm_key_configured": settings.groq_api_key not in (None, "", "replace-me"),
    }
