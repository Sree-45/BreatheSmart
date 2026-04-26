import os
from typing import Optional

import requests
from langchain_core.tools import tool

from app.rag.pipeline import run_recommendation


def _fetch_live_aqi(latitude: float, longitude: float, api_key: str) -> Optional[dict]:
    url = f"https://airquality.googleapis.com/v1/currentConditions:lookup?key={api_key}"
    payload = {"location": {"latitude": latitude, "longitude": longitude}}
    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
        data = r.json()
        indexes = data.get("indexes", [])
        primary = next((i for i in indexes if i.get("code") == "ind_cpcb"), None) or (
            indexes[0] if indexes else None
        )
        if not primary:
            return None
        return {
            "aqi": primary.get("aqi"),
            "category": primary.get("category"),
            "dominant_pollutant": primary.get("dominantPollutant"),
        }
    except Exception:
        return None


@tool
def fetch_aqi_for_city(city: str) -> dict:
    """Fetch current air quality for a city. Returns aqi, category, dominant_pollutant.

    Uses the Google Air Quality API when GOOGLE_MAPS_API_KEY is set; otherwise
    returns a mock payload so the agent can still demonstrate the tool-calling flow.
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")

    # Hard-coded geocoding for the demo cities; in production the agent would call
    # a separate geocoding tool or proxy through Spring Boot.
    coords = {
        "hyderabad": (17.3850, 78.4867),
        "delhi": (28.6139, 77.2090),
        "mumbai": (19.0760, 72.8777),
        "bengaluru": (12.9716, 77.5946),
        "chennai": (13.0827, 80.2707),
        "kolkata": (22.5726, 88.3639),
    }
    key = city.strip().lower()
    if api_key and key in coords:
        lat, lng = coords[key]
        live = _fetch_live_aqi(lat, lng, api_key)
        if live:
            return {**live, "city": city, "source": "google_air_quality"}

    return {
        "aqi": 156,
        "category": "Unhealthy",
        "dominant_pollutant": "pm25",
        "city": city,
        "source": "mock",
        "note": "Live AQI unavailable — set GOOGLE_MAPS_API_KEY and use a known city for real data.",
    }


@tool
def get_health_recommendation(
    age: int,
    medical_conditions: str,
    aqi: int,
    category: str,
    dominant_pollutant: str,
    city: str,
    question: str = "",
) -> dict:
    """Run the RAG pipeline to produce a health recommendation grounded in retrieved guidelines.

    Inputs:
      age: user age in years
      medical_conditions: free-text description of conditions (e.g. "Asthma, hypertension")
      aqi: current AQI integer
      category: AQI category label
      dominant_pollutant: e.g. "pm25", "pm10", "o3"
      city: city name for context
      question: optional follow-up question

    Returns: {recommendation: {primary, secondary}, sources, fallback, latency_ms}
    """
    user_profile = {
        "age": age,
        "medical_conditions": medical_conditions,
    }
    aqi_data = {
        "aqi": aqi,
        "category": category,
        "dominant_pollutant": dominant_pollutant,
        "city": city,
    }
    return run_recommendation(user_profile, aqi_data, question or None)


ALL_TOOLS = [fetch_aqi_for_city, get_health_recommendation]
