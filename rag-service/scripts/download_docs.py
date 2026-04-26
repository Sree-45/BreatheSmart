"""Downloads curated medical and air-quality reference documents into ./data/.

The seed markdown files in ./data/ are sufficient on their own for the RAG demo;
this script supplements them with authoritative PDFs and HTML pages from public-
health bodies. Run it whenever you want to refresh the corpus.

Usage (from rag-service/):
    python scripts/download_docs.py

After running, re-ingest:
    python -m app.ingestion.ingest

Note on stale URLs: government health agencies reorganize their sites frequently.
Some entries below were verified working as of 2025; if curl returns 404, search
the agency's publications page for the current URL and update DOCS.
"""
from __future__ import annotations

import sys
from pathlib import Path

import requests

# (url, output_filename, kind, source)
DOCS = [
    # PDFs — direct binary downloads
    (
        "https://www.nhlbi.nih.gov/sites/default/files/publications/Asthma-Action-Plan-2020.pdf",
        "pdfs/nhlbi_asthma_action_plan.pdf",
        "pdf",
        "NHLBI",
    ),
    # HTML pages — browser content, ingested as text by loader.py
    (
        "https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health",
        "who_ambient_air_quality.html",
        "html",
        "WHO",
    ),
    (
        "https://www.airnow.gov/aqi/aqi-basics/",
        "epa_aqi_basics.html",
        "html",
        "EPA AirNow",
    ),
    (
        "https://www.lung.org/clean-air/outdoors/who-is-at-risk/asthma-and-air-pollution",
        "lung_asthma_air_pollution.html",
        "html",
        "American Lung Association",
    ),
    (
        "https://www.heart.org/en/health-topics/consumer-healthcare/air-pollution-and-heart-disease",
        "aha_air_pollution_heart.html",
        "html",
        "American Heart Association",
    ),
]

# URLs verified to require interactive download (JS redirects defeat curl).
# Visit these in a browser and save the resulting PDF into ./data/pdfs/.
MANUAL_DOCS = [
    (
        "https://iris.who.int/handle/10665/345334",
        "WHO Global Air Quality Guidelines 2021 — executive summary",
    ),
    (
        "https://www.epa.gov/pm-pollution/health-and-environmental-effects-particulate-matter-pm",
        "EPA Particulate Matter Health Effects",
    ),
]

PDF_MAGIC = b"%PDF"


def download(url: str, dest: Path, kind: str) -> bool:
    print(f"-> {url}")
    try:
        r = requests.get(
            url,
            timeout=45,
            headers={
                "User-Agent": "Mozilla/5.0 BreatheSmartIngest/1.0",
                "Accept": "application/pdf,text/html;q=0.9,*/*;q=0.8",
            },
            allow_redirects=True,
        )
        r.raise_for_status()
    except Exception as e:
        print(f"   FAILED: {e}", file=sys.stderr)
        return False

    if kind == "pdf" and not r.content.startswith(PDF_MAGIC):
        print(
            f"   FAILED: response is not a PDF (got {r.headers.get('content-type', 'unknown')}); "
            f"the source likely requires an interactive download.",
            file=sys.stderr,
        )
        return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(r.content)
    print(f"   saved {len(r.content):,} bytes -> {dest.name}")
    return True


def main(out_dir: str = "./data") -> int:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    succeeded, failed = [], []
    for url, filename, kind, _source in DOCS:
        ok = download(url, out / filename, kind)
        (succeeded if ok else failed).append(filename)

    print("\n=== Summary ===")
    print(f"  Succeeded: {len(succeeded)} / {len(DOCS)}")
    for f in succeeded:
        print(f"    - {f}")
    if failed:
        print(f"  Failed:    {len(failed)}")
        for f in failed:
            print(f"    - {f}")

    if MANUAL_DOCS:
        print("\n=== Manual downloads ===")
        print("These require an interactive browser (JavaScript redirects).")
        print("Visit each URL, save the PDF into ./data/pdfs/, then re-run ingestion.")
        for url, label in MANUAL_DOCS:
            print(f"  - {label}\n    {url}")

    print("\nNext step:  python -m app.ingestion.ingest")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
