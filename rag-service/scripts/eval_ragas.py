"""Offline RAG quality evaluation for the BreatheSmart pipeline.

Runs the production `run_recommendation` pipeline against a fixed test set, then
scores it with the RAGAS library (faithfulness, answer_relevancy, context_precision)
using the same Groq model (via get_llm()) + HuggingFace embeddings that production
uses. If the `ragas` package is unavailable, falls back to a keyword-coverage
approximation so the script still produces a usable signal in CI without the heavy
dependency.

Run from rag-service/:
    python scripts/eval_ragas.py
    python scripts/eval_ragas.py --no-ragas      # force keyword-coverage mode
    python scripts/eval_ragas.py --json out.json # write machine-readable results
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

# Allow running directly from rag-service/ without installing as a package.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.rag.pipeline import run_recommendation  # noqa: E402

TEST_CASES: List[Dict[str, Any]] = [
    {
        "name": "asthma + high PM2.5",
        "user_profile": {"age": 45, "medical_conditions": "Asthma"},
        "aqi_data": {"aqi": 165, "category": "Unhealthy", "dominant_pollutant": "pm25", "city": "Hyderabad"},
        "expect_keywords": ["asthma", "indoor", "mask", "n95", "inhaler"],
        "ground_truth": (
            "Adults with asthma should remain indoors with windows closed when PM2.5 pushes AQI into the "
            "Unhealthy range (151-200). Use a HEPA air purifier, keep a rescue inhaler accessible, and wear "
            "a well-fitted N95 mask if outdoor activity is unavoidable."
        ),
    },
    {
        "name": "elderly + cardiovascular + PM10",
        "user_profile": {"age": 72, "medical_conditions": "Hypertension, coronary artery disease"},
        "aqi_data": {"aqi": 130, "category": "Unhealthy for Sensitive Groups", "dominant_pollutant": "pm10", "city": "Delhi"},
        "expect_keywords": ["heart", "exertion", "blood pressure", "elderly"],
        "ground_truth": (
            "Older adults with cardiovascular disease should avoid outdoor exertion when PM10 pushes AQI above "
            "100. Monitor blood pressure, take prescribed medication on schedule, and seek medical attention "
            "for chest tightness or breathlessness."
        ),
    },
    {
        "name": "child + ozone",
        "user_profile": {"age": 8, "medical_conditions": "None"},
        "aqi_data": {"aqi": 110, "category": "Unhealthy for Sensitive Groups", "dominant_pollutant": "o3", "city": "Mumbai"},
        "expect_keywords": ["children", "school", "outdoor", "ozone"],
        "ground_truth": (
            "Children are more sensitive to ground-level ozone than adults. When AQI for ozone exceeds 100, "
            "schools and parents should reduce strenuous outdoor play, especially in the afternoon when ozone "
            "peaks, and watch for coughing or wheezing."
        ),
    },
    {
        "name": "healthy adult + good air",
        "user_profile": {"age": 30, "medical_conditions": "None"},
        "aqi_data": {"aqi": 42, "category": "Good", "dominant_pollutant": "pm25", "city": "Bengaluru"},
        "expect_keywords": ["normal", "outdoor"],
        "ground_truth": (
            "Healthy adults can engage in normal outdoor activity when AQI is in the Good range (0-50). No "
            "specific protective measures are required."
        ),
    },
    {
        "name": "diabetic + very unhealthy",
        "user_profile": {"age": 58, "medical_conditions": "Type 2 diabetes"},
        "aqi_data": {"aqi": 240, "category": "Very Unhealthy", "dominant_pollutant": "pm25", "city": "Delhi"},
        "expect_keywords": ["indoor", "hepa", "avoid", "exertion"],
        "ground_truth": (
            "When AQI is in the Very Unhealthy range (201-300), people with diabetes should remain indoors, "
            "run a HEPA air purifier, avoid all outdoor exertion, and contact their physician if respiratory "
            "or cardiovascular symptoms appear since diabetes amplifies pollution-related risk."
        ),
    },
    {
        "name": "pregnant woman + moderate",
        "user_profile": {"age": 28, "medical_conditions": "Pregnancy (28 weeks)"},
        "aqi_data": {"aqi": 95, "category": "Moderate", "dominant_pollutant": "pm25", "city": "Chennai"},
        "expect_keywords": ["pregnan", "indoor", "outdoor"],
        "ground_truth": (
            "Pregnant women should limit prolonged outdoor exertion when AQI is in the Moderate range, prefer "
            "low-traffic outdoor areas, and consider a well-fitted mask for longer outings."
        ),
    },
    {
        "name": "copd + sensitive group",
        "user_profile": {"age": 64, "medical_conditions": "COPD"},
        "aqi_data": {"aqi": 145, "category": "Unhealthy for Sensitive Groups", "dominant_pollutant": "pm25", "city": "Kolkata"},
        "expect_keywords": ["copd", "indoor", "inhaler", "mask"],
        "ground_truth": (
            "COPD patients should treat the Unhealthy-for-Sensitive-Groups range as a serious threshold: stay "
            "indoors with filtered air, keep rescue inhalers nearby, and wear an N95 if any outdoor errand is "
            "necessary."
        ),
    },
    {
        "name": "athlete + good outdoor day",
        "user_profile": {"age": 24, "medical_conditions": "None — competitive runner"},
        "aqi_data": {"aqi": 55, "category": "Moderate", "dominant_pollutant": "o3", "city": "Bengaluru"},
        "expect_keywords": ["outdoor", "moderate", "intensity"],
        "ground_truth": (
            "At Moderate AQI driven by ozone, healthy adults including athletes can train outdoors but should "
            "schedule high-intensity sessions in the morning, since ozone concentrations climb in the afternoon."
        ),
    },
    {
        "name": "infant + hazardous",
        "user_profile": {"age": 1, "medical_conditions": "None"},
        "aqi_data": {"aqi": 320, "category": "Hazardous", "dominant_pollutant": "pm25", "city": "Delhi"},
        "expect_keywords": ["infant", "indoor", "hepa", "avoid"],
        "ground_truth": (
            "When AQI reaches Hazardous (>300), infants must stay indoors with HEPA filtration, all outdoor "
            "outings should be avoided, and medical attention sought immediately for any breathing difficulty."
        ),
    },
    {
        "name": "no conditions + ozone moderate",
        "user_profile": {"age": 35, "medical_conditions": "None"},
        "aqi_data": {"aqi": 88, "category": "Moderate", "dominant_pollutant": "o3", "city": "Hyderabad"},
        "expect_keywords": ["moderate", "outdoor", "ozone"],
        "ground_truth": (
            "Healthy adults can carry out normal outdoor activity at Moderate AQI but should reduce prolonged "
            "or intense exertion, especially during midday when ozone peaks."
        ),
    },
]


def run_pipeline(case: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the production pipeline once and reshape the output for evaluation."""
    out = run_recommendation(case["user_profile"], case["aqi_data"])
    answer_text = json.dumps(out["recommendation"])
    contexts = [s["snippet"] for s in out["sources"]] or ["(no contexts retrieved)"]
    return {
        "name": case["name"],
        "question": case.get("question") or (
            f"Health guidance for age {case['user_profile'].get('age')}, "
            f"conditions {case['user_profile'].get('medical_conditions')}, "
            f"AQI {case['aqi_data'].get('aqi')} ({case['aqi_data'].get('dominant_pollutant')})."
        ),
        "answer": answer_text,
        "contexts": contexts,
        "reference": case.get("ground_truth", ""),
        "fallback": out["fallback"],
        "latency_ms": out["latency_ms"],
        "expect_keywords": case.get("expect_keywords", []),
    }


# ---------- Mode A: real RAGAS ----------

def evaluate_ragas(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """RAGAS-driven evaluation using the same Groq LLM + HF embeddings that prod uses."""
    from datasets import Dataset
    from ragas import evaluate
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.llms import LangchainLLMWrapper
    from ragas.metrics import answer_relevancy, context_precision, faithfulness

    from app.ingestion.embeddings import get_embeddings
    from app.rag.llm import get_llm

    judge_llm = LangchainLLMWrapper(get_llm())
    judge_embeddings = LangchainEmbeddingsWrapper(get_embeddings())

    ds = Dataset.from_list(
        [
            {
                "question": r["question"],
                "answer": r["answer"],
                "contexts": r["contexts"],
                "reference": r["reference"],
            }
            for r in rows
        ]
    )

    result = evaluate(
        ds,
        metrics=[faithfulness, answer_relevancy, context_precision],
        llm=judge_llm,
        embeddings=judge_embeddings,
    )

    df = result.to_pandas()
    per_case = df.to_dict(orient="records")
    summary = {
        "faithfulness": float(df["faithfulness"].mean()),
        "answer_relevancy": float(df["answer_relevancy"].mean()),
        "context_precision": float(df["context_precision"].mean()),
    }
    return {"mode": "ragas", "per_case": per_case, "summary": summary}


# ---------- Mode B: keyword-coverage fallback ----------

def keyword_coverage(text: str, keywords: List[str]) -> float:
    if not keywords:
        return 0.0
    text_lower = text.lower()
    return sum(1 for k in keywords if k.lower() in text_lower) / len(keywords)


def evaluate_keywords(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    per_case = []
    for r in rows:
        ctx_text = " ".join(r["contexts"])
        per_case.append(
            {
                "case": r["name"],
                "context_relevance": keyword_coverage(ctx_text, r["expect_keywords"]),
                "answer_relevance": keyword_coverage(r["answer"], r["expect_keywords"]),
                "fallback": r["fallback"],
                "latency_ms": r["latency_ms"],
            }
        )
    summary = {
        "context_relevance": sum(c["context_relevance"] for c in per_case) / len(per_case),
        "answer_relevance": sum(c["answer_relevance"] for c in per_case) / len(per_case),
        "avg_latency_ms": sum(c["latency_ms"] for c in per_case) / len(per_case),
    }
    return {"mode": "keyword", "per_case": per_case, "summary": summary}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-ragas", action="store_true", help="Skip RAGAS even if installed.")
    parser.add_argument("--json", type=str, default=None, help="Write full results to this path.")
    args = parser.parse_args()

    rows: List[Dict[str, Any]] = []
    for case in TEST_CASES:
        print(f"\n=== {case['name']} ===", flush=True)
        try:
            row = run_pipeline(case)
            print(
                f"  fallback={row['fallback']}  latency_ms={row['latency_ms']}  "
                f"k_contexts={len(row['contexts'])}",
                flush=True,
            )
            rows.append(row)
        except Exception as e:
            print(f"  ERROR running pipeline: {e}", flush=True)

    if not rows:
        print("No successful cases — nothing to evaluate.", flush=True)
        return 1

    use_ragas = not args.no_ragas
    if use_ragas:
        try:
            results = evaluate_ragas(rows)
        except ImportError:
            print("\n[ragas not installed — falling back to keyword-coverage]", flush=True)
            results = evaluate_keywords(rows)
        except Exception as e:
            print(f"\n[ragas evaluation failed: {e} — falling back to keyword-coverage]", flush=True)
            results = evaluate_keywords(rows)
    else:
        results = evaluate_keywords(rows)

    print("\n=== Summary ({}) ===".format(results["mode"]), flush=True)
    for k, v in results["summary"].items():
        print(f"  {k:<22} {v:.3f}" if isinstance(v, float) else f"  {k:<22} {v}", flush=True)

    if args.json:
        Path(args.json).write_text(json.dumps(results, indent=2, default=str))
        print(f"\nWrote {args.json}", flush=True)

    # Pass/fail thresholds suited to a fresher-grade RAG demo. Tighten as the corpus grows.
    summary = results["summary"]
    if results["mode"] == "ragas":
        ok = summary.get("faithfulness", 0) >= 0.6 and summary.get("answer_relevancy", 0) >= 0.6
    else:
        ok = summary.get("answer_relevance", 0) >= 0.4
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
