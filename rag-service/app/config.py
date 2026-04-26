from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str = "replace-me"
    gemini_model: str = "gemini-2.5-pro"

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
