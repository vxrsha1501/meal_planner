from fastapi import APIRouter, Depends, HTTPException, Request, Response

from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..db import get_supabase
from ..schemas import AuthResponse, ChangePasswordRequest, LoginRequest, MeResponse, ProfileResponse, SignupRequest
from ..settings import settings
from .deps import calculate_bmi, calculate_calorie_target, load_user_with_profile

router = APIRouter(tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        max_age=settings.access_token_expire_minutes * 60,
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(settings.cookie_name)


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(payload: SignupRequest, response: Response, supabase=Depends(get_supabase)) -> dict:
    existing = supabase.table("users_auth").select("id").eq("username", payload.username).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Username already taken")

    auth_result = supabase.table("users_auth").insert(
        {"username": payload.username, "password_hash": hash_password(payload.password)}
    ).execute()
    auth = auth_result.data[0]

    bmi = calculate_bmi(payload.weight_kg, payload.height_cm)
    calorie_target = calculate_calorie_target(
        payload.weight_kg,
        payload.height_cm,
        payload.age,
        payload.goal,
        payload.body_type,
    )

    supabase.table("users").insert(
        {
            "auth_id": auth["id"],
            "name": payload.name,
            "height_cm": payload.height_cm,
            "weight_kg": payload.weight_kg,
            "age": payload.age,
            "body_type": payload.body_type,
            "goal": payload.goal,
            "target_weight": payload.target_weight,
            "default_budget": payload.default_budget,
            "bmi": bmi,
            "calorie_target": calorie_target,
        }
    ).execute()

    token = create_access_token(auth["id"])
    _set_auth_cookie(response, token)

    return {
        "message": "Account created successfully!",
        "user": {
            "id": auth["id"],
            "username": auth["username"],
            "name": payload.name,
            "goal": payload.goal,
        },
    }


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, response: Response, supabase=Depends(get_supabase)) -> dict:
    result = supabase.table("users_auth").select("*").eq("username", payload.username.strip()).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    auth = result.data[0]
    if not verify_password(payload.password, auth["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(auth["id"])
    _set_auth_cookie(response, token)

    loaded = load_user_with_profile(supabase, auth["id"])
    profile = loaded["profile"]

    return {
        "message": "Login successful!",
        "user": {
            "id": auth["id"],
            "username": auth["username"],
            "name": profile["name"] if profile else auth["username"],
            "goal": profile["goal"] if profile else None,
        },
    }


@router.post("/logout")
async def logout(response: Response) -> dict:
    _clear_auth_cookie(response)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=MeResponse)
async def get_me(request: Request, supabase=Depends(get_supabase)) -> dict:
    cookie_token = request.cookies.get(settings.cookie_name)
    if not cookie_token:
        return {"authenticated": False}

    try:
        user = await get_current_user(cookie_token, supabase)
    except Exception:
        return {"authenticated": False}

    loaded = load_user_with_profile(supabase, user["id"])
    profile = loaded["profile"]

    return {
        "authenticated": True,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": profile["name"] if profile else user["username"],
            "goal": profile["goal"] if profile else None,
        },
    }


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    loaded = load_user_with_profile(supabase, current_user["id"])
    user = loaded["auth"]
    profile = loaded["profile"]

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {
        "name": profile["name"],
        "username": user["username"],
        "height_cm": profile["height_cm"],
        "weight_kg": profile["weight_kg"],
        "age": profile["age"],
        "goal": profile["goal"],
        "target_weight": profile.get("target_weight"),
        "default_budget": profile["default_budget"],
        "bmi": profile["bmi"],
        "calorie_target": profile["calorie_target"],
    }


@router.post("/profile/password")
async def change_password(payload: ChangePasswordRequest, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    if not verify_password(payload.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=403, detail="Current password is incorrect")

    supabase.table("users_auth").update({"password_hash": hash_password(payload.new_password)}).eq("id", current_user["id"]).execute()
    return {"message": "Password changed successfully!"}
