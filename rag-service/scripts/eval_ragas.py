"""Lightweight offline evaluation for the RAG pipeline.

This is a simplified RAGAS-style harness — measures keyword-based context
relevance and answer faithfulness on a small fixed test set. It is meant to
demonstrate AI Evaluation & Ops, not to replace a full RAGAS run with LLM-as-judge.

Run (from rag-service/):
    python scripts/eval_ragas.py
"""
from __future__ import annotations

import json
import sys
from typing import List

# Allow running this script directly from rag-service/ without installing as a package.
sys.path.insert(0, ".")

from app.rag.pipeline import run_recommendation  # noqa: E402

TEST_CASES = [
    {
        "name": "asthma + high PM2.5",
        "user_profile": {"age": 45, "medical_conditions": "Asthma"},
        "aqi_data": {
            "aqi": 165,
            "category": "Unhealthy",
            "dominant_pollutant": "pm25",
            "city": "Hyderabad",
        },
        "expect_keywords": ["asthma", "indoor", "mask", "n95", "inhaler"],
    },
    {
        "name": "elderly + cardiovascular + PM10",
        "user_profile": {
            "age": 72,
            "medical_conditions": "Hypertension, coronary artery disease",
        },
        "aqi_data": {
            "aqi": 130,
            "category": "Unhealthy for Sensitive Groups",
            "dominant_pollutant": "pm10",
            "city": "Delhi",
        },
        "expect_keywords": ["heart", "exertion", "blood pressure", "elderly"],
    },
    {
        "name": "child + ozone",
        "user_profile": {"age": 8, "medical_conditions": "None"},
        "aqi_data": {
            "aqi": 110,
            "category": "Unhealthy for Sensitive Groups",
            "dominant_pollutant": "o3",
            "city": "Mumbai",
        },
        "expect_keywords": ["children", "school", "outdoor", "ozone"],
    },
    {
        "name": "healthy adult + good air",
        "user_profile": {"age": 30, "medical_conditions": "None"},
        "aqi_data": {
            "aqi": 42,
            "category": "Good",
            "dominant_pollutant": "pm25",
            "city": "Bengaluru",
        },
        "expect_keywords": ["normal", "outdoor"],
    },
    {
        "name": "diabetic + very unhealthy",
        "user_profile": {"age": 58, "medical_conditions": "Type 2 diabetes"},
        "aqi_data": {
            "aqi": 240,
            "category": "Very Unhealthy",
            "dominant_pollutant": "pm25",
            "city": "Delhi",
        },
        "expect_keywords": ["indoor", "hepa", "avoid", "exertion"],
    },
]


def keyword_coverage(text: str, keywords: List[str]) -> float:
    if not keywords:
        return 0.0
    text_lower = text.lower()
    hits = sum(1 for k in keywords if k.lower() in text_lower)
    return hits / len(keywords)


def main() -> int:
    rows = []
    for tc in TEST_CASES:
        print(f"\n=== {tc['name']} ===")
        try:
            out = run_recommendation(tc["user_profile"], tc["aqi_data"])
        except Exception as e:
            print(f"  ERROR: {e}")
            rows.append({"case": tc["name"], "error": str(e)})
            continue

        rec_text = json.dumps(out["recommendation"])
        ctx_text = " ".join(s["snippet"] for s in out["sources"])

        ctx_relevance = keyword_coverage(ctx_text, tc["expect_keywords"])
        ans_relevance = keyword_coverage(rec_text, tc["expect_keywords"])

        print(
            f"  context_relevance={ctx_relevance:.2f}  "
            f"answer_relevance={ans_relevance:.2f}  "
            f"fallback={out['fallback']}  "
            f"latency_ms={out['latency_ms']}"
        )
        rows.append(
            {
                "case": tc["name"],
                "context_relevance": ctx_relevance,
                "answer_relevance": ans_relevance,
                "fallback": out["fallback"],
                "latency_ms": out["latency_ms"],
            }
        )

    valid = [r for r in rows if "error" not in r]
    if valid:
        avg_ctx = sum(r["context_relevance"] for r in valid) / len(valid)
        avg_ans = sum(r["answer_relevance"] for r in valid) / len(valid)
        avg_lat = sum(r["latency_ms"] for r in valid) / len(valid)
        print("\n=== Summary ===")
        print(f"  cases run:               {len(valid)} / {len(TEST_CASES)}")
        print(f"  avg context_relevance:   {avg_ctx:.2f}")
        print(f"  avg answer_relevance:    {avg_ans:.2f}")
        print(f"  avg latency_ms:          {avg_lat:.0f}")

    return 0 if all("error" not in r for r in rows) else 1


if __name__ == "__main__":
    sys.exit(main())
