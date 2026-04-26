from typing import Optional

from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from app.agent.graph import build_graph

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

    user_msg = (
        f"I live in {req.city}. "
        f"Age: {req.age if req.age is not None else 'unspecified'}. "
        f"Medical conditions: {req.medical_conditions or 'none reported'}. "
        f"{req.question or 'What precautions should I take given the current air quality?'} "
        f"First call fetch_aqi_for_city to get the current air quality, then call "
        f"get_health_recommendation with my profile and the AQI data, then summarize the result."
    )

    final_state = graph.invoke({"messages": [HumanMessage(content=user_msg)]})
    messages = final_state["messages"]
    final = messages[-1]

    return {
        "answer": getattr(final, "content", str(final)),
        "trace": [_summarize_message(m) for m in messages],
    }
