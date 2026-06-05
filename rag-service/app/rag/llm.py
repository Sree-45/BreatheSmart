from functools import lru_cache

from langchain_openai import ChatOpenAI

from app.config import settings


@lru_cache(maxsize=1)
def get_llm() -> ChatOpenAI:
    if not settings.groq_api_key or settings.groq_api_key == "replace-me":
        raise RuntimeError(
            "GROQ_API_KEY is not configured. Set it in rag-service/.env."
        )
    # Groq exposes an OpenAI-compatible Chat Completions API, so ChatOpenAI
    # works as-is — only base_url + model differ from vanilla OpenAI.
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.groq_api_key,
        base_url=settings.llm_base_url,
        temperature=0.3,
        timeout=settings.llm_timeout_s,
        max_retries=settings.llm_max_retries,
    )
