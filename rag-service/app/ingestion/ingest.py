import hashlib
import logging
import re
import sys
from typing import Dict, List

from langchain_core.documents import Document

from app.ingestion.loader import load_documents
from app.ingestion.splitter import split_documents
from app.ingestion.vectorstore import get_vectorstore

logger = logging.getLogger(__name__)

# Chroma's default embedding batch ceiling is 5461; stay safely under it.
_BATCH_SIZE = 5000

# Lightweight, deterministic enrichment tables. Derived from the corpus naming
# convention (<topic>_air_quality.md) and the pollutant/AQI vocabulary used
# throughout the docs. Kept intentionally small — this improves retrieval
# precision without turning ingestion into an NLP pipeline.
_POLLUTANT_PATTERNS = {
    "pm25": re.compile(r"\bpm\s?2\.?5\b", re.IGNORECASE),
    "pm10": re.compile(r"\bpm\s?10\b", re.IGNORECASE),
    "o3": re.compile(r"\b(o3|ozone)\b", re.IGNORECASE),
    "no2": re.compile(r"\bno2\b", re.IGNORECASE),
    "so2": re.compile(r"\bso2\b", re.IGNORECASE),
    "co": re.compile(r"\bcarbon monoxide\b", re.IGNORECASE),
}

# Maps an AQI band label to a regex that recognizes how that band appears in the
# corpus (either the numeric range or the category name).
_AQI_BAND_PATTERNS = {
    "good": re.compile(r"\bgood\b|\b0[\s–-]+50\b", re.IGNORECASE),
    "moderate": re.compile(r"\bmoderate\b|\b51[\s–-]+100\b", re.IGNORECASE),
    "usg": re.compile(
        r"unhealthy for sensitive|sensitive groups|\b101[\s–-]+150\b", re.IGNORECASE
    ),
    "unhealthy": re.compile(r"\b151[\s–-]+200\b", re.IGNORECASE),
    "very_unhealthy": re.compile(r"very unhealthy|\b201[\s–-]+300\b", re.IGNORECASE),
    "hazardous": re.compile(r"hazardous|\b301\+?\b", re.IGNORECASE),
}


def _topic_from_source(source: str) -> str:
    """Derive a coarse topic tag from a corpus filename.

    e.g. 'asthma_air_quality.md' -> 'asthma', 'epa_aqi_categories.md' -> 'aqi_categories',
    'nhlbi_asthma_action_plan.pdf' -> 'asthma_action_plan'. Falls back to the bare stem.
    """
    stem = re.sub(r"\.[^.]+$", "", source).lower()
    # Strip the common, non-discriminating suffixes/prefixes used in the corpus.
    stem = re.sub(r"_?air_quality(_guidelines)?$", "", stem)
    stem = re.sub(r"^(epa|who|nhlbi|aha|lung)_", "", stem)
    return stem or "general"


def _detect(text: str, patterns: Dict[str, re.Pattern]) -> List[str]:
    return [label for label, pat in patterns.items() if pat.search(text)]


def _enrich_metadata(chunk: Document) -> None:
    """Tag a chunk in place with topic / pollutant / AQI-band metadata.

    Retrieval still keys on the embedding; these fields exist so callers can
    optionally filter (e.g. by pollutant) and so the structured logs are richer.
    Chroma metadata values must be scalars, so lists are stored as comma-joined
    strings.
    """
    source = chunk.metadata.get("source", "")
    chunk.metadata["topic"] = _topic_from_source(source)

    pollutants = _detect(chunk.page_content, _POLLUTANT_PATTERNS)
    if pollutants:
        chunk.metadata["pollutants"] = ",".join(pollutants)

    bands = _detect(chunk.page_content, _AQI_BAND_PATTERNS)
    if bands:
        chunk.metadata["aqi_bands"] = ",".join(bands)


def _stable_chunk_id(chunk: Document, index: int) -> str:
    """Deterministic id so re-ingesting upserts the same chunk instead of duplicating.

    Keyed on (scope, source, chunk-index, content hash): the content hash means an
    edited doc produces new ids for the changed chunks (so stale text doesn't linger
    under the same id), while unchanged chunks keep their id and are overwritten in place.
    """
    scope = chunk.metadata.get("scope", "global")
    source = chunk.metadata.get("source", "unknown")
    digest = hashlib.sha1(chunk.page_content.encode("utf-8")).hexdigest()[:16]
    return f"{scope}:{source}:{index}:{digest}"


def _add_in_batches(vs, chunks: List[Document], ids: List[str]) -> None:
    # Passing ids makes langchain-chroma upsert: existing ids are overwritten in
    # place instead of appended, which is what keeps re-ingest from duplicating.
    for i in range(0, len(chunks), _BATCH_SIZE):
        vs.add_documents(chunks[i : i + _BATCH_SIZE], ids=ids[i : i + _BATCH_SIZE])


def _clear_scope(vs, scope: str) -> None:
    """Best-effort delete of all chunks for a metadata scope before re-ingest.

    Stable ids already prevent duplicates; clearing the scope additionally removes
    chunks that belonged to a doc that was edited (and therefore got new ids) or
    deleted, so the index can't accumulate stale orphans across re-ingests. Guarded
    because a brand-new collection has nothing to delete and older Chroma builds may
    not expose `_collection`.
    """
    try:
        vs._collection.delete(where={"scope": scope})
    except Exception as exc:  # pragma: no cover - depends on chroma internals
        logger.debug("scope clear skipped for %s: %s", scope, exc)


def ingest_directory(directory: str = "./data") -> Dict[str, int]:
    """Loads, splits, enriches, and indexes every supported file in `directory`
    into the global ChromaDB collection.

    Idempotent: each chunk gets a deterministic id (see `_stable_chunk_id`), so
    re-running upserts in place rather than duplicating the whole corpus.
    """
    docs = load_documents(directory)
    if not docs:
        logger.warning("no documents found in %s", directory)
        return {"loaded": 0, "chunks": 0}

    chunks = split_documents(docs)

    # Per-source chunk indices keep ids stable when a single source is re-split.
    per_source_index: Dict[str, int] = {}
    ids: List[str] = []
    for chunk in chunks:
        _enrich_metadata(chunk)
        source = chunk.metadata.get("source", "unknown")
        idx = per_source_index.get(source, 0)
        per_source_index[source] = idx + 1
        ids.append(_stable_chunk_id(chunk, idx))

    vs = get_vectorstore()
    # Clear prior global chunks first (removes orphans from edited/deleted docs),
    # then upsert by stable id. Only the "global" scope is touched, so per-user
    # report chunks are never affected by a corpus re-ingest.
    _clear_scope(vs, "global")
    _add_in_batches(vs, chunks, ids)

    logger.info(
        "ingested %d documents into %d chunks from %s (idempotent upsert)",
        len(docs),
        len(chunks),
        directory,
    )
    return {"loaded": len(docs), "chunks": len(chunks)}


def ingest_user_report(user_id: str, text: str, filename: str) -> Dict[str, object]:
    """Indexes a single user health report into ChromaDB with per-user scope metadata.

    Idempotent per (user, file): re-uploading the same file overwrites its chunks
    rather than duplicating them.
    """
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
    ids: List[str] = []
    for idx, chunk in enumerate(chunks):
        _enrich_metadata(chunk)
        ids.append(_stable_chunk_id(chunk, idx))

    vs = get_vectorstore()
    _add_in_batches(vs, chunks, ids)
    logger.info("ingested user report for %s: %d chunks (file=%s)", user_id, len(chunks), filename)
    return {"chunks": len(chunks), "user_id": user_id, "filename": filename}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    target = sys.argv[1] if len(sys.argv) > 1 else "./data"
    result = ingest_directory(target)
    print(result)
