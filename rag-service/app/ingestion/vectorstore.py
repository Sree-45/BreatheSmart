from functools import lru_cache

from langchain_chroma import Chroma

from app.config import settings
from app.ingestion.embeddings import get_embeddings


@lru_cache(maxsize=1)
def get_vectorstore() -> Chroma:
    return Chroma(
        collection_name=settings.chroma_collection_name,
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_db_path,
    )
