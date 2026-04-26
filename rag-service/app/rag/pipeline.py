import json
import logging
import re
import time
from typing import Any, Dict, Optional

from app.rag.llm import get_llm
from app.rag.prompt import ADVISORY_FALLBACK, ADVISORY_RAG, RAG_PROMPT
from app.rag.retriever import has_relevant_results, retrieve

logger = logging.getLogger(__name__)


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


def _format_context(results) -> str:
    if not results:
        return "(no specific guidelines retrieved)"
    return "\n\n".join(
        f"[Source: {d.metadata.get('source', 'unknown')}]\n{d.page_content}"
        for d, _ in results
    )


def run_recommendation(
    user_profile: dict,
    aqi_data: dict,
    question: Optional[str] = None,
) -> Dict[str, Any]:
    start = time.time()
    if not question:
        question = (
            "What precautions should I take given my profile and the current air quality?"
        )

    query = _build_query(user_profile, aqi_data, question)
    user_id = user_profile.get("user_id")
    results = retrieve(query, user_id=user_id, k=4)
    relevant = has_relevant_results(results)

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
    llm = get_llm()
    response = llm.invoke(prompt)
    raw = response.content if hasattr(response, "content") else str(response)
    cleaned = _strip_json_fence(raw)

    try:
        recommendation = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Gemini returned non-JSON output, wrapping raw text")
        recommendation = {"primary": [cleaned[:500]], "secondary": []}

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
    logger.info(
        "rag.recommend completed: k=%d relevant=%s fallback=%s latency_ms=%d",
        len(results),
        relevant,
        not relevant,
        elapsed_ms,
    )

    return {
        "recommendation": recommendation,
        "sources": sources,
        "fallback": not relevant,
        "latency_ms": elapsed_ms,
    }
