from fastapi import APIRouter

from ..settings import settings

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "meal-planner-api"}


@router.get("/system/check")
async def system_check() -> dict:
    return {
        "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
        "groq_configured": bool(settings.groq_api_key),
    }
