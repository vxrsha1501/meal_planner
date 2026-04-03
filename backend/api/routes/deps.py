from datetime import date

from fastapi import HTTPException
from supabase import Client


def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round(weight_kg / (height_m**2), 1)


def calculate_calorie_target(weight_kg: float, height_cm: float, age: int, goal: str, body_type: str) -> int:
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    activity_multiplier = 1.35
    if body_type == "ectomorph":
        activity_multiplier = 1.45
    elif body_type == "endomorph":
        activity_multiplier = 1.25

    tdee = bmr * activity_multiplier
    if goal == "lose":
        return int(tdee - 500)
    if goal == "gain":
        return int(tdee + 500)
    return int(tdee)


def get_today_budget(supabase: Client, user_auth_id: int, default_budget: float) -> float:
    today = date.today()
    result = (
        supabase.table("daily_budget")
        .select("amount")
        .eq("user_id", user_auth_id)
        .eq("budget_date", today.isoformat())
        .limit(1)
        .execute()
    )
    if result.data:
        return float(result.data[0]["amount"])
    return default_budget


def get_today_totals(supabase: Client, user_auth_id: int) -> tuple[int, float, float, float, float, list[dict]]:
    today = date.today()
    result = (
        supabase.table("meals_log")
        .select("*")
        .eq("user_id", user_auth_id)
        .eq("logged_date", today.isoformat())
        .execute()
    )
    meals = result.data or []

    total_cal = int(sum(m.get("total_calories", 0) for m in meals))
    total_cost = float(sum(m.get("total_cost", 0) for m in meals))
    total_protein = float(sum(m.get("total_protein", 0) for m in meals))
    total_carbs = float(sum(m.get("total_carbs", 0) for m in meals))
    total_fat = float(sum(m.get("total_fat", 0) for m in meals))
    return total_cal, total_cost, total_protein, total_carbs, total_fat, meals


def load_user_with_profile(supabase: Client, user_id: int) -> dict:
    auth_result = supabase.table("users_auth").select("*").eq("id", user_id).limit(1).execute()
    if not auth_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    auth = auth_result.data[0]
    profile_result = supabase.table("users").select("*").eq("auth_id", user_id).limit(1).execute()
    profile = profile_result.data[0] if profile_result.data else None
    return {"auth": auth, "profile": profile}
