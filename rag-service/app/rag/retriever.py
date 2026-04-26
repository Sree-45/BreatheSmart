from typing import List, Optional, Tuple

from langchain_core.documents import Document

from app.ingestion.vectorstore import get_vectorstore

DEFAULT_K = 4
# Chroma uses L2 distance with normalized embeddings; lower = more similar.
# Empirically ~1.0-1.2 is a reasonable cutoff for "still relevant" with MiniLM.
SIMILARITY_THRESHOLD = 1.2


def retrieve(
    query: str,
    user_id: Optional[str] = None,
    k: int = DEFAULT_K,
) -> List[Tuple[Document, float]]:
    """Retrieve top-k chunks scoped to global docs + (optionally) the user's own report chunks."""
    vs = get_vectorstore()
    scopes = ["global"]
    if user_id:
        scopes.append(f"user_{user_id}")

    where = {"scope": {"$in": scopes}}
    return vs.similarity_search_with_score(query, k=k, filter=where)


def has_relevant_results(results: List[Tuple[Document, float]]) -> bool:
    if not results:
        return False
    return any(score < SIMILARITY_THRESHOLD for _, score in results)
