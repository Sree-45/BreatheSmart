import json
import logging
import re
import time
import uuid
from typing import Any, Dict, Optional

from app.config import settings
from app.observability.logging_config import event_logger
from app.rag.llm import get_llm
from app.rag.prompt import ADVISORY_FALLBACK, ADVISORY_RAG, RAG_PROMPT
from app.rag.retriever import has_relevant_results, retrieve

logger = logging.getLogger(__name__)
events = event_logger("rag.events")


def _build_query(user_profile: dict, aqi_data: dict, question: Optional[str]) -> str:
    conditions = user_profile.get("medical_conditions") or "no known conditions"
    pollutant = aqi_data.get("dominant_pollutant", "pm25")
    category = aqi_data.get("category", "")
    aqi = aqi_data.get("aqi", "")
    base = (
        f"Health recommendations for someone with {conditions} when {pollutant} is "
        f"{category} (AQI {aqi})."
    )
    if question:
        base += f" {question}"
    return base


_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", flags=re.MULTILINE)


def _strip_json_fence(text: str) -> str:
    return _FENCE_RE.sub("", text.strip()).strip()


def _extract_first_json_object(text: str) -> Optional[str]:
    """Return the first balanced top-level {...} substring, or None.

    Models occasionally wrap the JSON in a sentence of prose despite the prompt;
    scanning for a brace-balanced object (ignoring braces inside strings) recovers
    the payload instead of failing the whole parse. This is a hardening step, not a
    replacement for the schema coercion that follows.
    """
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def _parse_llm_json(cleaned: str) -> Optional[Any]:
    """Best-effort parse of the LLM's (de-fenced) output into a Python object.

    Tries a direct json.loads first, then falls back to extracting the first
    balanced JSON object embedded in surrounding prose. Returns None if neither
    yields valid JSON, leaving the caller to apply its plain-text fallback.
    """
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        candidate = _extract_first_json_object(cleaned)
        if candidate is not None:
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                return None
    return None


def _format_context(results) -> str:
    if not results:
        return "(no specific guidelines retrieved)"
    return "\n\n".join(
        f"[Source: {d.metadata.get('source', 'unknown')}]\n{d.page_content}"
        for d, _ in results
    )


def _coerce_recommendation(parsed: Any) -> Dict[str, Any]:
    """Make sure the LLM output matches the {primary, secondary} schema regardless of how it returned."""
    if isinstance(parsed, dict):
        primary = parsed.get("primary") or []
        secondary = parsed.get("secondary") or []
        if not isinstance(primary, list):
            primary = [str(primary)]
        if not isinstance(secondary, list):
            secondary = [str(secondary)]
        return {"primary": primary[:4], "secondary": secondary[:4]}
    return {"primary": [str(parsed)[:500]], "secondary": []}


_FALLBACK_RECOMMENDATION = {
    "primary": [
        "Limit outdoor exertion until air quality improves.",
        "Keep windows closed and run an air purifier indoors if available.",
        "Wear a well-fitted N95 mask if you must go outside for extended periods.",
    ],
    "secondary": [
        "Stay hydrated and avoid smoking or other indoor air pollutants.",
        "Monitor symptoms (cough, wheezing, chest tightness) and contact a doctor if they worsen.",
    ],
}


def run_recommendation(
    user_profile: dict,
    aqi_data: dict,
    question: Optional[str] = None,
) -> Dict[str, Any]:
    request_id = uuid.uuid4().hex[:12]
    start = time.time()
    if not question:
        question = (
            "What precautions should I take given my profile and the current air quality?"
        )

    query = _build_query(user_profile, aqi_data, question)
    user_id = user_profile.get("user_id")
    # Honor the configurable retriever_k (RAGAS sweeps it via env). Previously this
    # was hardcoded to 4, which silently ignored the setting on the /recommend path.
    results = retrieve(query, user_id=user_id, k=settings.retriever_k)
    relevant = has_relevant_results(results)
    retrieve_ms = int((time.time() - start) * 1000)

    prompt_inputs = {
        "advisory": ADVISORY_RAG if relevant else ADVISORY_FALLBACK,
        "context": _format_context(results),
        "age": user_profile.get("age", "unknown"),
        "conditions": user_profile.get("medical_conditions") or "none reported",
        "blood_type": user_profile.get("blood_type", "unknown"),
        "height": user_profile.get("height", "unknown"),
        "weight": user_profile.get("weight", "unknown"),
        "aqi": aqi_data.get("aqi", "unknown"),
        "category": aqi_data.get("category", "unknown"),
        "dominant_pollutant": aqi_data.get("dominant_pollutant", "unknown"),
        "city": aqi_data.get("city", "unknown"),
        "question": question,
    }

    prompt = RAG_PROMPT.format(**prompt_inputs)
    llm_start = time.time()
    llm_failed = False
    parse_failed = False
    try:
        llm = get_llm()
        response = llm.invoke(prompt)
        raw = response.content if hasattr(response, "content") else str(response)
        cleaned = _strip_json_fence(raw)
        parsed = _parse_llm_json(cleaned)
        if parsed is not None:
            recommendation = _coerce_recommendation(parsed)
        else:
            # Last resort: surface the raw text as a single primary item rather than
            # 500ing. This keeps the response useful even when the model ignores the
            # JSON instruction entirely.
            parse_failed = True
            logger.warning(
                "rag.recommend: LLM returned non-JSON output; coercing to schema",
                extra={"request_id": request_id},
            )
            recommendation = {"primary": [cleaned[:500]], "secondary": []}
    except Exception as exc:
        # Degrade gracefully: serve a generic safety recommendation instead of 500ing.
        # Surfaces in JD's "fallback and degradation strategies" pillar.
        llm_failed = True
        logger.error(
            "rag.recommend: LLM call failed, returning fallback recommendation",
            extra={"request_id": request_id, "error": str(exc)},
        )
        recommendation = dict(_FALLBACK_RECOMMENDATION)

    llm_ms = int((time.time() - llm_start) * 1000)

    sources = [
        {
            "source": d.metadata.get("source", "unknown"),
            "scope": d.metadata.get("scope", "global"),
            "snippet": d.page_content[:240],
            "score": float(score),
        }
        for d, score in results
    ]

    elapsed_ms = int((time.time() - start) * 1000)
    events.info(
        "rag.recommend",
        extra={
            "event": "rag.recommend",
            "request_id": request_id,
            "user_id": user_id,
            "query": query,
            "k": len(results),
            "retrieved": [
                {
                    "source": s["source"],
                    "scope": s["scope"],
                    "score": s["score"],
                }
                for s in sources
            ],
            "min_score": min((s["score"] for s in sources), default=None),
            "fallback_grounding": not relevant,
            "llm_failed": llm_failed,
            "json_parse_failed": parse_failed,
            "retrieve_latency_ms": retrieve_ms,
            "llm_latency_ms": llm_ms,
            "total_latency_ms": elapsed_ms,
        },
    )

    return {
        "recommendation": recommendation,
        "sources": sources,
        "fallback": not relevant or llm_failed,
        "latency_ms": elapsed_ms,
        "request_id": request_id,
    }
