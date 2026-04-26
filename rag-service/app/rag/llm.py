from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings


@lru_cache(maxsize=1)
def get_llm() -> ChatGoogleGenerativeAI:
    if not settings.gemini_api_key or settings.gemini_api_key == "replace-me":
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Set it in rag-service/.env."
        )
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.3,
        timeout=settings.llm_timeout_s,
        max_retries=settings.llm_max_retries,
    )
