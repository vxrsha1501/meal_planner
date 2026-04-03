from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from ..auth import get_current_user
from ..db import get_supabase
from ..schemas import (
    LLMMealQueryRequest,
    MealGuidanceResponse,
    MealImageAnalysisResponse,
    ReceiptScanResponse,
    WorkoutPlanRequest,
    WorkoutPlanResponse,
)
from ..services.llm_service import analyze_meal_image, generate_meal_guidance, generate_workout_and_meal_plan
from ..services.receipt_service import extract_total_amount, perform_ocr
from .deps import get_today_budget, get_today_totals, load_user_with_profile

router = APIRouter(tags=["ai"])


@router.post("/ai/meal-query", response_model=MealGuidanceResponse)
async def llm_meal_query(payload: LLMMealQueryRequest, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    loaded = load_user_with_profile(supabase, current_user["id"])
    profile = loaded["profile"]

    total_cal, total_cost, _, _, _, _ = get_today_totals(supabase, current_user["id"])
    today_budget = get_today_budget(supabase, current_user["id"], profile["default_budget"])

    context = {
        "goal": profile["goal"],
        "body_type": profile.get("body_type"),
        "calories_remaining": profile["calorie_target"] - total_cal,
        "budget_remaining": today_budget - total_cost,
    }
    guidance = await generate_meal_guidance(payload.query, context)
    return guidance


@router.post("/ai/meal-scan", response_model=MealImageAnalysisResponse)
async def scan_meal_image(file: UploadFile, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    try:
        result = await analyze_meal_image(content, file.content_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Meal image analysis failed: {exc}") from exc

    if not result["analysis"].get("is_food", False):
        raise HTTPException(status_code=400, detail="Uploaded image is not recognized as food")

    return result


@router.post("/ai/workout-plan", response_model=WorkoutPlanResponse)
async def ai_workout_plan(payload: WorkoutPlanRequest, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    loaded = load_user_with_profile(supabase, current_user["id"])
    profile = loaded["profile"]

    total_cal, total_cost, total_protein, total_carbs, total_fat, _ = get_today_totals(supabase, current_user["id"])
    today_budget = get_today_budget(supabase, current_user["id"], profile["default_budget"])

    context = {
        "goal": profile["goal"],
        "body_type": profile.get("body_type"),
        "calorie_target": profile["calorie_target"],
        "calories_consumed": total_cal,
        "calories_remaining": profile["calorie_target"] - total_cal,
        "budget_remaining": today_budget - total_cost,
        "protein_consumed": total_protein,
        "carbs_consumed": total_carbs,
        "fat_consumed": total_fat,
    }

    return await generate_workout_and_meal_plan(payload.workout_preference, payload.notes, context)


@router.post("/receipt/scan", response_model=ReceiptScanResponse)
async def scan_receipt(file: UploadFile, current_user=Depends(get_current_user), supabase=Depends(get_supabase)) -> dict:
    content = await file.read()
    text = perform_ocr(content)
    total = extract_total_amount(text)

    if total <= 0:
        raise HTTPException(status_code=400, detail="Could not detect total amount from receipt")

    supabase.table("receipt_scans").insert(
        {
            "user_id": current_user["id"],
            "scanned_text": text,
            "extracted_total": total,
        }
    ).execute()

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
        supabase.table("daily_budget").update({"amount": total}).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("daily_budget").insert(
            {
                "user_id": current_user["id"],
                "budget_date": today,
                "amount": total,
            }
        ).execute()

    return {"scanned_text": text, "extracted_total": total}
