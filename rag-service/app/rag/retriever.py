from typing import List, Optional, Tuple

from langchain_core.documents import Document

from app.config import settings
from app.ingestion.vectorstore import get_vectorstore


def retrieve(
    query: str,
    user_id: Optional[str] = None,
    k: Optional[int] = None,
) -> List[Tuple[Document, float]]:
    """Retrieve top-k chunks scoped to global docs + (optionally) the user's own report chunks.

    Chroma uses L2 distance with normalized embeddings, so lower = more similar.
    """
    vs = get_vectorstore()
    scopes = ["global"]
    if user_id:
        scopes.append(f"user_{user_id}")

    where = {"scope": {"$in": scopes}}
    return vs.similarity_search_with_score(query, k=k or settings.retriever_k, filter=where)


def has_relevant_results(results: List[Tuple[Document, float]]) -> bool:
    if not results:
        return False
    return any(score < settings.similarity_threshold for _, score in results)
