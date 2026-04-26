import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from app.agent.graph import build_graph
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["agent"])


class AnalyzeRequest(BaseModel):
    city: str
    age: Optional[int] = None
    medical_conditions: Optional[str] = None
    question: Optional[str] = None


def _summarize_message(m) -> dict:
    content = getattr(m, "content", "")
    if not isinstance(content, str):
        content = str(content)
    return {
        "type": type(m).__name__,
        "content": content[:500],
        "tool_calls": [
            tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", "?")
            for tc in (getattr(m, "tool_calls", None) or [])
        ],
    }


@router.post("/agent/analyze")
def analyze(req: AnalyzeRequest):
    try:
        graph = build_graph()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Free-form user message — tool ordering is enforced by the system prompt
    # in graph.py, not stuffed into the user turn. This keeps the agentic
    # narrative clean: the LLM is the one deciding which tools to call.
    user_msg = (
        f"I live in {req.city}. "
        f"Age: {req.age if req.age is not None else 'unspecified'}. "
        f"Medical conditions: {req.medical_conditions or 'none reported'}. "
        f"{req.question or 'What precautions should I take given the current air quality?'}"
    )

    try:
        final_state = graph.invoke(
            {"messages": [HumanMessage(content=user_msg)]},
            config={"recursion_limit": settings.agent_recursion_limit},
        )
    except Exception as e:
        logger.exception("agent.analyze failed")
        raise HTTPException(status_code=502, detail=f"agent execution failed: {e}")

    messages = final_state["messages"]
    final = messages[-1]

    return {
        "answer": getattr(final, "content", str(final)),
        "trace": [_summarize_message(m) for m in messages],
    }
