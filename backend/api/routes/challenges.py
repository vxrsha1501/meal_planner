from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import get_supabase
from ..schemas import ChallengeCreateRequest

router = APIRouter(tags=["challenges"])


@router.post("/challenges")
async def create_challenge(payload: ChallengeCreateRequest, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    if payload.target_budget <= 0:
        raise HTTPException(status_code=400, detail="target_budget must be positive")

    challenge_result = supabase.table("challenges").insert(
        {
            "title": payload.title,
            "description": payload.description,
            "target_budget": payload.target_budget,
            "duration_days": payload.duration_days,
            "created_by": current_user["id"],
        }
    ).execute()

    challenge = challenge_result.data[0]
    supabase.table("challenge_members").insert(
        {"challenge_id": challenge["id"], "user_id": current_user["id"]}
    ).execute()

    return {"message": "Challenge created", "challenge_id": challenge["id"]}


@router.get("/challenges")
async def list_challenges(supabase=Depends(get_supabase)) -> dict:
    challenges = supabase.table("challenges").select("*").order("created_at", desc=True).execute().data or []
    members = supabase.table("challenge_members").select("challenge_id").execute().data or []

    counts = {}
    for member in members:
        cid = member["challenge_id"]
        counts[cid] = counts.get(cid, 0) + 1

    return {
        "challenges": [
            {
                "id": challenge["id"],
                "title": challenge["title"],
                "description": challenge["description"],
                "target_budget": challenge["target_budget"],
                "duration_days": challenge["duration_days"],
                "members": counts.get(challenge["id"], 0),
            }
            for challenge in challenges
        ]
    }


@router.post("/challenges/{challenge_id}/join")
async def join_challenge(challenge_id: int, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    challenge = supabase.table("challenges").select("id").eq("id", challenge_id).limit(1).execute()
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")

    existing = (
        supabase.table("challenge_members")
        .select("id")
        .eq("challenge_id", challenge_id)
        .eq("user_id", current_user["id"])
        .limit(1)
        .execute()
    )
    if existing.data:
        return {"message": "Already joined"}

    supabase.table("challenge_members").insert(
        {"challenge_id": challenge_id, "user_id": current_user["id"]}
    ).execute()
    return {"message": "Challenge joined"}


@router.get("/challenges/me")
async def my_challenges(current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    memberships = supabase.table("challenge_members").select("challenge_id").eq("user_id", current_user["id"]).execute().data or []
    ids = [m["challenge_id"] for m in memberships]
    if not ids:
        return {"challenges": []}

    challenges = supabase.table("challenges").select("*").in_("id", ids).execute().data or []
    return {
        "challenges": [
            {
                "id": challenge["id"],
                "title": challenge["title"],
                "description": challenge["description"],
                "target_budget": challenge["target_budget"],
                "duration_days": challenge["duration_days"],
            }
            for challenge in challenges
        ]
    }
