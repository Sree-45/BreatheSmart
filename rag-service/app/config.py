from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # LLM — any OpenAI-compatible provider (defaults to Groq's free endpoint).
    # Placeholder: replace with your key, or set the GROQ_API_KEY env var
    # (pydantic reads it automatically — no .env file required).
    groq_api_key: str = "YOUR_GROQ_API_KEY"
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_model: str = "openai/gpt-oss-20b"

    # Google Air Quality key for the agent's fetch_aqi_for_city tool. Placeholder:
    # replace, or set GOOGLE_MAPS_API_KEY env var. Falls back to mock AQI if unset.
    google_maps_api_key: str = "YOUR_GOOGLE_MAPS_API_KEY"

    chroma_db_path: str = "./chroma_db"
    chroma_collection_name: str = "breathesmart_global"

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    log_level: str = "INFO"

    # Retrieval tuning — exposed so RAGAS runs can sweep without code edits.
    similarity_threshold: float = 1.2
    retriever_k: int = 4

    # LLM resilience.
    llm_timeout_s: int = 30
    llm_max_retries: int = 2
    agent_recursion_limit: int = 8

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
