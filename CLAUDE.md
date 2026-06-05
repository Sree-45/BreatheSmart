# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BreatheSmart is a full-stack air-quality + health-intelligence platform built from **three independently-runnable services** that communicate over HTTP:

| Service | Stack | Port | Role |
|---|---|---|---|
| `frontend` | React 19 + Vite (HTTPS dev) | 5173 | UI. Calls the backend via the Vite `/api` proxy for AQI/auth/profile/AI, **and calls Google Maps/Places/Geocoding directly** with a browser-side key |
| `backend` | Spring Boot 3.5 + MongoDB + JWT + Spring AI | 8080 | Auth, persistence, Google API orchestration, AI proxy |
| `rag-service` | FastAPI + LangChain + LangGraph + Groq (OpenAI-compatible) + ChromaDB | 8000 | **All RAG/agent/LLM-retrieval logic lives here** |

`PROJECT_CONTEXT.txt` (repo root) is a long-form design/context document — consult it for product rationale, but code is the source of truth.

## Commands

**Run everything (Docker):** `docker compose up --build` — starts Mongo, rag-service, backend. The frontend stays local (HTTPS + hot reload). Then `cd frontend; npm install; npm run dev`.

**Frontend** (`cd frontend`):
- `npm run dev` — Vite dev server on https://localhost:5173 (self-signed via `@vitejs/plugin-basic-ssl`)
- `npm run build` / `npm run preview`
- `npm run lint` — ESLint (the only frontend check; no test suite)
- Supply `VITE_GOOGLE_MAPS_API_KEY` (env, or replace the placeholder in [airQualityService.js](frontend/src/services/airQualityService.js)) for the map/places features

**Backend** (`cd backend`, uses Maven wrapper):
- `./mvnw spring-boot:run` (or `.\mvnw.cmd` on Windows) — port 8080
- `./mvnw test` — full test suite
- `./mvnw test -Dtest=BackendApplicationTests#methodName` — single test
- Requires env: `JWT_SECRET`. The Groq LLM key and Google Maps key default to **placeholders** in `application.properties` — set `GROQ_API_KEY` / `GOOGLE_MAPS_API_KEY` env vars (no `.env` needed) or replace in place (see secrets note below)

**rag-service** (`cd rag-service`):
- `python -m venv venv; venv\Scripts\activate` (or `source venv/bin/activate`); `pip install -r requirements.txt`
- `python main.py` — port 8000 (`UVICORN_RELOAD=true` by default outside Docker)
- `curl -X POST http://localhost:8000/ingest/global` — **must run once after startup** to populate the corpus, or retrieval returns nothing
- `python scripts/eval_ragas.py [--json out.json] [--no-ragas]` — RAGAS quality eval against 10 fixed cases; falls back to keyword coverage if `ragas` isn't installed
- `python scripts/download_docs.py` — legacy HTML fetcher; the corpus is now curated `.md` in `data/` (asthma, copd, cardiovascular, diabetes, pregnancy, children, elderly, epa_aqi_categories, who_air_quality_guidelines), so this is optional

**Required secrets:** `JWT_SECRET` (generate with `openssl rand -hex 64`). The **Groq** LLM key and **Google Maps** key default to **placeholders** (`YOUR_GROQ_API_KEY` / `YOUR_GOOGLE_MAPS_API_KEY`) — no real keys are committed. Supply them via env vars (no `.env` file required) or by replacing the placeholders in place:
- Groq: `GROQ_API_KEY` → [application.properties](backend/src/main/resources/application.properties) (`${GROQ_API_KEY:…}`) + [config.py](rag-service/app/config.py) (pydantic reads the env automatically).
- Maps: `GOOGLE_MAPS_API_KEY` → [application.properties](backend/src/main/resources/application.properties) + [config.py](rag-service/app/config.py); browser: `VITE_GOOGLE_MAPS_API_KEY` → [airQualityService.js](frontend/src/services/airQualityService.js).

Restrict the Maps browser key by HTTP referrer in the Google Cloud console.

## Architecture — the important boundaries

### The Spring↔Python split is the central design decision
The backend is a **thin orchestrator**, not where AI happens. It owns the `User` (MongoDB), authentication, and Google API calls, then delegates anything retrieval/agent-related to the Python service. `RagServiceClient` ([backend/.../service/RagServiceClient.java](backend/src/main/java/com/sreeshanth/backend/service/RagServiceClient.java)) is the single seam — it maps Spring domain objects into the rag-service JSON contract and calls `/recommend`, `/agent/analyze`, `/ingest/report`. When changing the AI contract, **both sides must change together**: `RagDtos` (Spring) and the Pydantic models in the routers (Python).

### The backend's three AI endpoints — two delegate to Python, one runs in Java
`AiController` ([AiController.java](backend/src/main/java/com/sreeshanth/backend/controller/AiController.java)) exposes three POST endpoints; they are **not** interchangeable:
1. **`/api/ai/recommendations` — RAG** (`RagServiceClient` → Python `/recommend`): retrieval-grounded recommendations *with source citations*. Returns `{recommendation:{primary,secondary}, sources, fallback, latency_ms, request_id}`.
2. **`/api/ai/agent` — LangGraph agent** (`RagServiceClient` → Python `/agent/analyze`): the agent fetches AQI and runs the RAG tool itself, returning an `answer` plus the tool-call `trace`.
3. **`/api/ai/summary` — Spring AI** (`AiSummaryService`, [AiSummaryService.java](backend/src/main/java/com/sreeshanth/backend/service/AiSummaryService.java)): a direct, **non-RAG, non-retrieval** one-shot daily digest via Spring AI `ChatClient`, reaching **Groq** through its *OpenAI-compatible* endpoint (`spring.ai.openai.base-url=https://api.groq.com/openai/v1`).

So (1) and (2) delegate to the Python rag-service via `RagServiceClient`; only (3) calls an LLM from inside Java. Keep them separate. (Of the three, the frontend currently wires up (1) and (2) — the two tabs of `HealthRecsModal` — while (3) is implemented end-to-end but not surfaced in the UI.)

### LLM provider — Groq (OpenAI-compatible) everywhere
Both LLM execution sites talk to **Groq** via its OpenAI-compatible Chat Completions API, default model `openai/gpt-oss-20b`:
- **rag-service** uses `langchain-openai`'s `ChatOpenAI(base_url=…groq.com/openai/v1)` behind the `get_llm()` seam ([llm.py](rag-service/app/rag/llm.py)) and in the agent ([graph.py](rag-service/app/agent/graph.py)). Config lives in [config.py](rag-service/app/config.py) as `groq_api_key` / `llm_base_url` / `llm_model`.
- **backend** uses the Spring AI OpenAI starter pointed at the same endpoint ([application.properties](backend/src/main/resources/application.properties)).
- Because both sides are OpenAI-compatible, switching providers (OpenRouter, local Ollama, OpenAI) is just a base-url + model + key change — no code edits. `langchain-google-genai` is still in `requirements.txt` for easy rollback to Gemini but is no longer imported.

### rag-service internal flow
- **`/recommend`** → `run_recommendation` ([pipeline.py](rag-service/app/rag/pipeline.py)): build query → `retrieve()` from Chroma → relevance check → format prompt → LLM (Groq) → coerce output to the `{primary, secondary}` schema → emit one structured JSON log event → return with sources. The whole path degrades gracefully: LLM failure returns `_FALLBACK_RECOMMENDATION`; non-JSON output is coerced; low retrieval relevance switches the prompt's advisory text.
- **`/agent/analyze`** → LangGraph agent ([graph.py](rag-service/app/agent/graph.py)): a `StateGraph` with an `agent` node (the Groq LLM bound to tools) and a `ToolNode`. Tools are `fetch_aqi_for_city` and `get_health_recommendation` ([tools.py](rag-service/app/agent/tools.py)) — the latter calls the same `run_recommendation` pipeline. Tool *ordering* is enforced by the system prompt, not code, and a `recursion_limit` guards against loops. The response includes a `trace` of which tools fired.
- **Ingestion**: `/ingest/global` indexes everything in `./data/` into the `global` collection (**idempotent** — stable chunk IDs, so re-running upserts instead of duplicating); `/ingest/report` LLM-validates that text is medical, then indexes it under a per-user scope. Both go through `loader → splitter (800/120 chunks) → vectorstore`.

### Per-user retrieval scoping (key invariant)
Every chunk in Chroma carries a `scope` metadata field: `"global"` for corpus docs, `"user_<mongoId>"` for a user's uploaded reports. `retrieve()` ([retriever.py](rag-service/app/rag/retriever.py)) filters with `{"scope": {"$in": ["global", "user_<id>"]}}` so a user only ever sees global guidelines + their own reports — never another user's. Chroma uses **L2 distance (lower = more similar)**; `has_relevant_results` compares against `similarity_threshold` (1.2). Both `similarity_threshold` and `retriever_k` are read from `settings` at query time — `run_recommendation` passes `k=settings.retriever_k` ([pipeline.py](rag-service/app/rag/pipeline.py)) — so RAGAS can sweep them via env without code edits. Chunks are also tagged at ingest with `topic`/`pollutants`/`aqi_bands` metadata.

### Report upload flow
`POST /api/users/{id}/reports` (multipart, [ReportUploadController.java](backend/src/main/java/com/sreeshanth/backend/controller/ReportUploadController.java)): save to disk (`FileStorageService`) → **Apache Tika** extracts text → forward to Python `/ingest/report` → append a `Report` to `user.pastReports`. If the rag-service rejects/unreachable, the uploaded file is deleted (soft-fail) and no Mongo row is written. A 400 from Python (non-medical doc) is surfaced as a 400 to the client.

### Auth
JWT, stateless sessions ([SecurityConfig.java](backend/src/main/java/com/sreeshanth/backend/config/SecurityConfig.java)). Public: `/api/auth/**`, `/api/map/**`, `/api/air-quality/**`. Authenticated: `/api/ai/**`, `/api/users/**`. `JwtAuthFilter` resolves the `User` as `@AuthenticationPrincipal`. Frontend stores `authToken` + `user` in `localStorage`; the axios interceptor ([frontend/src/services/api.js](frontend/src/services/api.js)) attaches the Bearer header and **wipes both keys on any 401/403** (a `user` without a matching `authToken` is the classic "asks me to log in again" bug).

The frontend is only two routes ([App.jsx](frontend/src/App.jsx)): `/` → `Landing` (public marketing/login entry) and `/app` → `Home` (the single-page experience where the map, AQI dashboards, recommendations, and agent panel live — note `/app` itself is not route-guarded; auth gating happens per-feature). The interceptor's redirect-to-`/` on auth loss therefore drops the user back on the landing page.

**Where Google APIs are actually called (important — it's split):** only [AirQualityController](backend/src/main/java/com/sreeshanth/backend/controller/AirQualityController.java) genuinely proxies a Google API (the **Air Quality API**: current/history/forecast), keeping *that* key server-side. [MapController](backend/src/main/java/com/sreeshanth/backend/controller/MapController.java) does **not** proxy Maps/Places — it returns static map config, a placeholder `/geocode/reverse`, and the AQI heatmap-tile URL *template*. Interactive map rendering, Places autocomplete/details, geocoding, nearby-hospital search ([placesService.js](frontend/src/services/placesService.js)), and heatmap tiles all run **client-side against Google** using the browser-exposed `VITE_GOOGLE_MAPS_API_KEY`. So `services/*.js` split two ways: `airQualityService`/`authService`/`userService`/`mapConfigService`/`aiService` wrap backend prefixes, while `placesService` (and inline calls in `Home.jsx`) call Google directly.

## Conventions & gotchas

- **Frontend never calls the Python rag-service directly** — all AI goes browser → backend `/api/ai/*` (Vite proxy → :8080) → rag-service over the Docker network. (It *does* call Google Maps/Places/Geocoding directly, though — see "Where Google APIs are actually called" above.)
- **Servlet stack is pinned** (`spring.main.web-application-type=servlet`); webflux is on the classpath *only* for `WebClient`. Don't assume a reactive app.
- **Corpus filenames are user-facing**: `data/` doc filenames (convention `<source>_<topic>.pdf`) appear verbatim in the `/recommend` response's `sources[].source`. Make them descriptive. `data/pdfs/` is gitignored — drop real PDFs there and re-ingest.
- **To rebuild the index from scratch**: stop rag-service, delete `rag-service/chroma_db/` (or `docker volume rm breathesmart_chroma_data`), then re-`/ingest/global`.
- **Embedding model is pre-baked** into the rag-service Docker image ([Dockerfile](rag-service/Dockerfile)) so the first request doesn't pay a download. Changing `embedding_model` in config means a cold first request locally.
- **Structured logging**: rag-service emits one JSON event per `/recommend` on the `rag.events` logger. The `request_id` is generated in the pipeline and returned in the response (it survives into Spring's `RecommendResponse.requestId`), so one id ties the rag-service log line to the result the backend/frontend received. Set `LOG_FORMAT=text` for readable dev logs. When recommendations look "generic," check `min_score` in that log — high distance means a poor corpus match, not a code bug.
- **Resilience is intentional everywhere**: LLM calls have timeout+retry and a deterministic fallback (RAG safety rec, or templated digest in Spring AI). Preserve these fallbacks when editing AI paths.
