from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.rag.pipeline import run_recommendation

router = APIRouter(tags=["rag"])


class UserProfile(BaseModel):
    user_id: Optional[str] = None
    age: Optional[int] = None
    medical_conditions: Optional[str] = None
    blood_type: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None


class AqiData(BaseModel):
    aqi: Optional[int] = None
    category: Optional[str] = None
    dominant_pollutant: Optional[str] = None
    city: Optional[str] = None


class RecommendRequest(BaseModel):
    user_profile: UserProfile
    aqi_data: AqiData
    question: Optional[str] = Field(default=None, description="Optional free-text follow-up.")


class Source(BaseModel):
    source: str
    scope: str
    snippet: str
    score: float


class RecommendResponse(BaseModel):
    recommendation: Dict[str, Any]
    sources: List[Source]
    fallback: bool
    latency_ms: int


@router.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest) -> RecommendResponse:
    try:
        result = run_recommendation(
            user_profile=req.user_profile.model_dump(),
            aqi_data=req.aqi_data.model_dump(),
            question=req.question,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return RecommendResponse(**result)
