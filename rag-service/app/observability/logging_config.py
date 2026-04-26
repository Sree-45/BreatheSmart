"""Structured JSON logging for the rag-service.

Single line per event, machine-parseable, ready for ingestion into
Loki / CloudWatch / ELK. Two channels:

  * `app`           — generic FastAPI / framework logs (one record per HTTP req etc.)
  * `rag.events`    — domain events from the RAG pipeline (query, retrieved chunks,
                      similarity scores, latency). This is the channel that
                      AI Eval & Ops dashboards subscribe to.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time
from typing import Any, Dict


class JsonFormatter(logging.Formatter):
    """Renders LogRecord as a single-line JSON object."""

    RESERVED_KEYS = {
        "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
        "created", "msecs", "relativeCreated", "thread", "threadName",
        "processName", "process", "message",
    }

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        # Anything passed via logger.info(..., extra={"key": value}) lands here.
        for key, value in record.__dict__.items():
            if key in self.RESERVED_KEYS or key.startswith("_"):
                continue
            try:
                json.dumps(value)
                payload[key] = value
            except (TypeError, ValueError):
                payload[key] = repr(value)

        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    """Idempotent logging setup. Replaces any handlers that may already exist
    (so calling twice from main.py + uvicorn doesn't double-print).
    """
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level.upper())

    handler = logging.StreamHandler(sys.stdout)
    # Plain text in dev (LOG_FORMAT=text), JSON otherwise.
    if os.getenv("LOG_FORMAT", "json").lower() == "text":
        handler.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
        )
    else:
        handler.setFormatter(JsonFormatter())
    root.addHandler(handler)

    # Quiet down noisy third-party loggers.
    for noisy in ("httpx", "urllib3", "chromadb"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def event_logger(name: str = "rag.events") -> logging.Logger:
    """Domain-event channel. Use logger.info(event, extra={...fields...})."""
    return logging.getLogger(name)
