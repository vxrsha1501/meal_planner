from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException

from decision_engine import get_recommendations

from ..auth import get_current_user
from ..db import get_supabase
from ..services.llm_service import generate_ai_recipe_recommendations
from ..schemas import BudgetUpdateRequest, MealLogRequest, WeeklyReportResponse, WorkoutLogRequest
from .deps import get_today_budget, get_today_totals, load_user_with_profile

router = APIRouter(tags=["planner"])


@router.get("/dashboard")
async def get_dashboard(current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    loaded = load_user_with_profile(supabase, current_user["id"])
    user = loaded["auth"]
    profile = loaded["profile"]
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    today = date.today()
    today_budget = get_today_budget(supabase, user["id"], profile["default_budget"])
    total_cal, total_cost, total_protein, total_carbs, total_fat, meals = get_today_totals(supabase, user["id"])

    calories_remaining = profile["calorie_target"] - total_cal
    budget_remaining = today_budget - total_cost

    meals_by_type = {"breakfast": [], "lunch": [], "dinner": []}
    for meal in meals:
        meal_type = meal.get("meal_type")
        if meal_type in meals_by_type:
            meals_by_type[meal_type].append(
                {
                    "id": meal.get("id"),
                    "food_item": meal.get("food_item"),
                    "quantity": meal.get("quantity"),
                    "total_calories": meal.get("total_calories"),
                    "total_cost": meal.get("total_cost"),
                    "total_protein": meal.get("total_protein"),
                    "total_carbs": meal.get("total_carbs"),
                    "total_fat": meal.get("total_fat"),
                }
            )

    food_items = supabase.table("food_items").select("*").execute().data or []
    recommendations = await get_recommendations(
        calories_remaining,
        budget_remaining,
        profile["goal"],
        food_items,
        total_protein,
    )

    ai_recipe_context = {
        "goal": profile["goal"],
        "body_type": profile.get("body_type"),
        "calories_remaining": calories_remaining,
        "budget_remaining": budget_remaining,
        "protein_consumed": total_protein,
        "top_meal_suggestions": [item.get("name") for item in recommendations.get("meal_suggestions", [])],
    }
    recommendations["ai_recommended_recipes"] = await generate_ai_recipe_recommendations(ai_recipe_context)

    workout_rows = (
        supabase.table("workout_log")
        .select("*")
        .eq("user_id", user["id"])
        .eq("logged_date", today.isoformat())
        .limit(1)
        .execute()
        .data
        or []
    )
    today_workout = workout_rows[0] if workout_rows else None

    return {
        "user": {
            "id": user["id"],
            "name": profile["name"],
            "bmi": profile["bmi"],
            "goal": profile["goal"],
            "body_type": profile.get("body_type"),
            "target_weight": profile.get("target_weight"),
            "calorie_target": profile["calorie_target"],
            "budget_limit": today_budget,
            "default_budget": profile["default_budget"],
        },
        "progress": {
            "calories_consumed": total_cal,
            "calories_remaining": calories_remaining,
            "calorie_target": profile["calorie_target"],
            "budget_used": total_cost,
            "budget_remaining": budget_remaining,
            "budget_limit": today_budget,
            "protein_consumed": total_protein,
            "carbs_consumed": total_carbs,
            "fat_consumed": total_fat,
        },
        "meals_by_type": meals_by_type,
        "recommendations": recommendations,
        "today_workout": (
            {
                "activity": today_workout.get("activity"),
                "duration": today_workout.get("duration"),
                "description": today_workout.get("description"),
            }
            if today_workout
            else None
        ),
    }


@router.post("/meal/log")
async def log_meal(payload: MealLogRequest, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    if not payload.items:
        raise HTTPException(status_code=400, detail="No items to log")

    today = date.today().isoformat()
    logged_items = []

    for item_data in payload.items:
        food_name = item_data.food_item
        quantity = max(1, int(item_data.quantity or 1))

        food_rows = supabase.table("food_items").select("*").eq("name", food_name).limit(1).execute().data or []
        food = food_rows[0] if food_rows else None

        if food:
            cal = float(food.get("calories", 0)) * quantity
            cost = float(food.get("cost", 0)) * quantity
            protein = float(food.get("protein", 0)) * quantity
            carbs = float(food.get("carbs", 0)) * quantity
            fat = float(food.get("fat", 0)) * quantity
        else:
            cal = float(item_data.calories or 0) * quantity
            cost = float(item_data.cost or 0) * quantity
            protein = float(item_data.protein or 0) * quantity
            carbs = float(item_data.carbs or 0) * quantity
            fat = float(item_data.fat or 0) * quantity

        supabase.table("meals_log").insert(
            {
                "user_id": current_user["id"],
                "food_item": food_name,
                "quantity": quantity,
                "meal_type": payload.meal_type,
                "total_calories": int(cal),
                "total_cost": float(cost),
                "total_protein": float(protein),
                "total_carbs": float(carbs),
                "total_fat": float(fat),
                "logged_date": today,
            }
        ).execute()

        logged_items.append(
            {
                "food_item": food_name,
                "quantity": quantity,
                "calories": int(cal),
                "cost": float(cost),
                "protein": float(protein),
                "carbs": float(carbs),
                "fat": float(fat),
            }
        )

    loaded = load_user_with_profile(supabase, current_user["id"])
    profile = loaded["profile"]
    total_cal, total_cost, total_protein, total_carbs, total_fat, _ = get_today_totals(supabase, current_user["id"])
    today_budget = get_today_budget(supabase, current_user["id"], profile["default_budget"])

    return {
        "message": f"{payload.meal_type.capitalize()} logged successfully!",
        "logged_items": logged_items,
        "totals": {
            "calories_consumed": total_cal,
            "calories_remaining": profile["calorie_target"] - total_cal,
            "budget_used": total_cost,
            "budget_remaining": today_budget - total_cost,
            "protein_consumed": total_protein,
            "carbs_consumed": total_carbs,
            "fat_consumed": total_fat,
        },
    }


@router.get("/food-items")
async def list_food_items(current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    public_items = supabase.table("food_items").select("*").eq("is_custom", False).execute().data or []
    return {"food_items": public_items}


@router.post("/budget/update")
async def update_budget(payload: BudgetUpdateRequest, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Budget amount must be positive")

    today = date.today().isoformat()
    existing = (
        supabase.table("daily_budget")
        .select("id")
        .eq("user_id", current_user["id"])
        .eq("budget_date", today)
        .limit(1)
        .execute()
    )

    if existing.data:
        supabase.table("daily_budget").update({"amount": float(payload.amount)}).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("daily_budget").insert(
            {"user_id": current_user["id"], "budget_date": today, "amount": float(payload.amount)}
        ).execute()

    return {"message": f"Today's budget set to INR {payload.amount}"}


@router.get("/recommendations")
async def get_recs(current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    loaded = load_user_with_profile(supabase, current_user["id"])
    profile = loaded["profile"]
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    total_cal, total_cost, total_protein, _, _, _ = get_today_totals(supabase, current_user["id"])
    today_budget = get_today_budget(supabase, current_user["id"], profile["default_budget"])

    calories_remaining = profile["calorie_target"] - total_cal
    budget_remaining = today_budget - total_cost
    food_items = supabase.table("food_items").select("*").execute().data or []

    return await get_recommendations(calories_remaining, budget_remaining, profile["goal"], food_items, total_protein)


@router.post("/workout/log")
async def log_workout(payload: WorkoutLogRequest, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    activity = payload.activity.strip()
    duration = payload.duration.strip()
    if not activity or not duration:
        raise HTTPException(status_code=400, detail="Activity and duration are required")

    supabase.table("workout_log").insert(
        {
            "user_id": current_user["id"],
            "activity": activity,
            "duration": duration,
            "description": payload.description or "",
            "logged_date": date.today().isoformat(),
        }
    ).execute()

    return {"message": "Workout logged!"}


@router.get("/weekly-report", response_model=WeeklyReportResponse)
async def weekly_report(current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    today = date.today()
    days = []

    for index in range(6, -1, -1):
        day = today - timedelta(days=index)
        day_iso = day.isoformat()

        meals = (
            supabase.table("meals_log")
            .select("*")
            .eq("user_id", current_user["id"])
            .eq("logged_date", day_iso)
            .execute()
            .data
            or []
        )

        workouts = (
            supabase.table("workout_log")
            .select("*")
            .eq("user_id", current_user["id"])
            .eq("logged_date", day_iso)
            .execute()
            .data
            or []
        )

        days.append(
            {
                "day": day.strftime("%a"),
                "date": day_iso,
                "calories": int(sum(meal.get("total_calories", 0) for meal in meals)),
                "protein": float(sum(meal.get("total_protein", 0) for meal in meals)),
                "carbs": float(sum(meal.get("total_carbs", 0) for meal in meals)),
                "fat": float(sum(meal.get("total_fat", 0) for meal in meals)),
                "cost": float(sum(meal.get("total_cost", 0) for meal in meals)),
                "workouts": [
                    {
                        "activity": workout.get("activity"),
                        "duration": workout.get("duration"),
                        "description": workout.get("description"),
                    }
                    for workout in workouts
                ],
            }
        )

    loaded = load_user_with_profile(supabase, current_user["id"])
    profile = loaded["profile"]
    return {"calorie_target": profile["calorie_target"] if profile else 0, "days": days}
