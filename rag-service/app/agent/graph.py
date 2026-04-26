from functools import lru_cache
from typing import Annotated, List, TypedDict

from langchain_core.messages import BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.agent.tools import ALL_TOOLS
from app.config import settings


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]


def _build_llm() -> ChatGoogleGenerativeAI:
    if not settings.gemini_api_key or settings.gemini_api_key == "replace-me":
        raise RuntimeError("GEMINI_API_KEY is not configured. Set it in rag-service/.env.")
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.2,
    ).bind_tools(ALL_TOOLS)


def should_continue(state: AgentState) -> str:
    """Conditional edge: if the last AI message asked for a tool call, route to the tools node;
    otherwise we're done."""
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "tools"
    return END


@lru_cache(maxsize=1)
def build_graph():
    llm = _build_llm()
    tool_node = ToolNode(ALL_TOOLS)

    def call_model(state: AgentState):
        return {"messages": [llm.invoke(state["messages"])]}

    g = StateGraph(AgentState)
    g.add_node("agent", call_model)
    g.add_node("tools", tool_node)
    g.set_entry_point("agent")
    g.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    g.add_edge("tools", "agent")
    return g.compile()
