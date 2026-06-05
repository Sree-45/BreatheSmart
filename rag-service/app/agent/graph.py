from functools import lru_cache
from typing import Annotated, List, TypedDict

from langchain_core.messages import BaseMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.agent.tools import ALL_TOOLS
from app.config import settings


SYSTEM_PROMPT = """You are an air-quality and health agent for the BreatheSmart app.

Tool-use policy (STRICT):
1. If the user mentions a city but no AQI numbers, you MUST call `fetch_aqi_for_city` first.
2. After you have AQI data, call `get_health_recommendation` with the user's age, medical
   conditions, and the AQI fields you obtained.
3. Never invent AQI values, never invent guideline citations. If a tool fails, say so plainly.
4. After tools return, summarize for the user in 2-4 short sentences. Mention the AQI value,
   the dominant pollutant, and the single most important action for their profile.
5. Do not call any tool more than twice. Do not loop.
"""


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]


def _build_llm() -> ChatOpenAI:
    if not settings.groq_api_key or settings.groq_api_key == "replace-me":
        raise RuntimeError("GROQ_API_KEY is not configured. Set it in rag-service/.env.")
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.groq_api_key,
        base_url=settings.llm_base_url,
        temperature=0.2,
        timeout=settings.llm_timeout_s,
        max_retries=settings.llm_max_retries,
    ).bind_tools(ALL_TOOLS)


def should_continue(state: AgentState) -> str:
    """Conditional edge: route to tools if the agent asked for one, else terminate."""
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "tools"
    return END


@lru_cache(maxsize=1)
def build_graph():
    llm = _build_llm()
    tool_node = ToolNode(ALL_TOOLS)

    def call_model(state: AgentState):
        messages = state["messages"]
        # Inject the system prompt only once, on the first hop.
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=SYSTEM_PROMPT), *messages]
        return {"messages": [llm.invoke(messages)]}

    g = StateGraph(AgentState)
    g.add_node("agent", call_model)
    g.add_node("tools", tool_node)
    g.set_entry_point("agent")
    g.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    g.add_edge("tools", "agent")
    return g.compile()
