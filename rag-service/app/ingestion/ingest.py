import logging
import sys
from typing import Dict

from langchain_core.documents import Document

from app.ingestion.loader import load_documents
from app.ingestion.splitter import split_documents
from app.ingestion.vectorstore import get_vectorstore

logger = logging.getLogger(__name__)


def ingest_directory(directory: str = "./data") -> Dict[str, int]:
    """Loads, splits, and indexes every supported file in `directory` into the global ChromaDB collection."""
    docs = load_documents(directory)
    if not docs:
        logger.warning("no documents found in %s", directory)
        return {"loaded": 0, "chunks": 0}

    chunks = split_documents(docs)
    vs = get_vectorstore()
    vs.add_documents(chunks)
    logger.info("ingested %d documents into %d chunks from %s", len(docs), len(chunks), directory)
    return {"loaded": len(docs), "chunks": len(chunks)}


def ingest_user_report(user_id: str, text: str, filename: str) -> Dict[str, object]:
    """Indexes a single user health report into ChromaDB with per-user scope metadata."""
    if not text or not text.strip():
        return {"chunks": 0, "user_id": user_id, "skipped": True}

    doc = Document(
        page_content=text,
        metadata={
            "source": filename,
            "scope": f"user_{user_id}",
            "user_id": user_id,
        },
    )
    chunks = split_documents([doc])
    vs = get_vectorstore()
    vs.add_documents(chunks)
    logger.info("ingested user report for %s: %d chunks (file=%s)", user_id, len(chunks), filename)
    return {"chunks": len(chunks), "user_id": user_id, "filename": filename}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    target = sys.argv[1] if len(sys.argv) > 1 else "./data"
    result = ingest_directory(target)
    print(result)
