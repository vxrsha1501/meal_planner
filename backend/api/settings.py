from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "hackathon-secret-key-2026"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_key: str = ""

    groq_api_key: str | None = None
    api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    cors_origin: str = "http://localhost:5173"
    cookie_name: str = "access_token"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"



settings = Settings(
    _env_file=str(Path(__file__).resolve().parent.parent / ".env"),
    _env_file_encoding="utf-8",
)
