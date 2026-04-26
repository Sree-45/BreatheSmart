import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.observability.logging_config import configure_logging
from app.routers import agent, health, ingest, recommend

configure_logging(settings.log_level)

app = FastAPI(title="BreatheSmart RAG Service", version="0.1.0")

# Comma-separated env override; falls back to local dev origins.
_default_origins = "http://localhost:8080,http://localhost:5173,https://localhost:5173"
_origins = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(recommend.router)
app.include_router(ingest.router)
app.include_router(agent.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=os.getenv("UVICORN_RELOAD", "true").lower() in ("1", "true", "yes"),
    )
