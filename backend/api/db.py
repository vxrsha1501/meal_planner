from fastapi import HTTPException
from supabase import Client, create_client

from .settings import settings


def _create_supabase_client() -> Client | None:
    key = settings.supabase_service_role_key or settings.supabase_key
    if not settings.supabase_url or not key:
        return None
    return create_client(settings.supabase_url, key)


supabase_client: Client | None = _create_supabase_client()


def get_supabase() -> Client:
    if supabase_client is None:
        raise HTTPException(
            status_code=500,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env",
        )
    return supabase_client
