from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "rag-service",
        "model": settings.gemini_model,
        "chroma_path": settings.chroma_db_path,
        "embedding_model": settings.embedding_model,
        "gemini_key_configured": bool(settings.gemini_api_key),
    }
