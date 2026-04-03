from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class SignupRequest(BaseModel):
    username: str
    password: str
    name: str
    height_cm: float
    weight_kg: float
    age: int
    body_type: Literal["ectomorph", "mesomorph", "endomorph"] = "mesomorph"
    goal: Literal["lose", "gain", "maintain"]
    target_weight: float | None = None
    default_budget: float


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=4)


class UserSummary(BaseModel):
    id: int
    username: str
    name: str
    goal: str | None = None


class AuthResponse(BaseModel):
    message: str
    user: UserSummary


class MeResponse(BaseModel):
    authenticated: bool
    user: UserSummary | None = None


class ProfileResponse(BaseModel):
    name: str
    username: str
    height_cm: float
    weight_kg: float
    age: int
    goal: str
    target_weight: float | None = None
    default_budget: float
    bmi: float
    calorie_target: int


class MealInputItem(BaseModel):
    food_item: str
    quantity: int = 1
    calories: int | None = None
    cost: float | None = None
    protein: float | None = None
    carbs: float | None = None
    fat: float | None = None


class MealLogRequest(BaseModel):
    meal_type: Literal["breakfast", "lunch", "dinner"]
    items: list[MealInputItem]


class BudgetUpdateRequest(BaseModel):
    amount: float


class WorkoutLogRequest(BaseModel):
    activity: str
    duration: str
    description: str | None = ""


class WeeklyDay(BaseModel):
    day: str
    date: date
    calories: int
    protein: float
    carbs: float = 0
    fat: float = 0
    cost: float
    workouts: list[dict[str, Any]]


class WeeklyReportResponse(BaseModel):
    calorie_target: int
    days: list[WeeklyDay]


class LLMMealQueryRequest(BaseModel):
    query: str


class WorkoutPlanRequest(BaseModel):
    workout_preference: str
    notes: str = ""


class MealGuidanceOption(BaseModel):
    meal: Literal["breakfast", "lunch", "dinner"]
    title: str
    calories: int
    estimated_cost_inr: float
    protein_g: float
    carbs_g: float
    fat_g: float
    reason: str


class MealGuidanceResponse(BaseModel):
    analysis: dict[str, Any]
    analysis_pretty: str


class MealImageAnalysisResponse(BaseModel):
    analysis: dict[str, Any]
    analysis_pretty: str


class WorkoutPlanResponse(BaseModel):
    analysis: dict[str, Any]
    analysis_pretty: str


class ReceiptScanResponse(BaseModel):
    extracted_total: float
    scanned_text: str


class ChallengeCreateRequest(BaseModel):
    title: str
    description: str = ""
    target_budget: float
    duration_days: int = 7
