import base64
import json
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_groq import ChatGroq
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..settings import settings


class MealOption(BaseModel):
    meal: Literal["breakfast", "lunch", "dinner"]
    title: str
    calories: int = Field(ge=0)
    estimated_cost_inr: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    reason: str


class MealGuidanceStructured(BaseModel):
    summary: str
    budget_fit: str
    calorie_fit: str
    options: list[MealOption] = Field(default_factory=list)


class RecipeStep(BaseModel):
    step: int = Field(ge=1)
    instruction: str


class WorkoutMealPlanStructured(BaseModel):
    workout_plan: dict[str, Any]
    meal_suggestions: list[MealOption] = Field(default_factory=list)
    recipes: list[dict[str, Any]] = Field(default_factory=list)
    summary: str


class AIRecipeItem(BaseModel):
    name: str
    prep_time_min: int = Field(ge=1)
    ingredients: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    reason: str = ""


class AIRecipeRecommendationsStructured(BaseModel):
    recipes: list[AIRecipeItem] = Field(default_factory=list)


class MealImageAnalysisStructured(BaseModel):
    model_config = ConfigDict(extra="ignore")

    is_food: bool
    food_name: str = ""
    confidence: float = Field(ge=0, le=1)
    calories: int = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    notes: str = ""

    @field_validator("is_food", mode="before")
    @classmethod
    def parse_bool(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"true", "1", "yes", "y"}:
                return True
            if lowered in {"false", "0", "no", "n"}:
                return False
        return bool(value)

    @field_validator("confidence", "protein_g", "carbs_g", "fat_g", mode="before")
    @classmethod
    def parse_float(cls, value: Any) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            return float(value.strip().replace(",", ""))
        raise ValueError("Expected numeric value")

    @field_validator("calories", mode="before")
    @classmethod
    def parse_int(cls, value: Any) -> int:
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(round(value))
        if isinstance(value, str):
            return int(round(float(value.strip().replace(",", ""))))
        raise ValueError("Expected integer value")


def _get_groq_key() -> str | None:
    return settings.groq_api_key or settings.api_key


def _to_pretty_json(data: dict) -> str:
    return json.dumps(data, indent=2, ensure_ascii=True)


def _content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                chunks.append(str(item.get("text", "")))
            else:
                chunks.append(str(item))
        return "\n".join(chunks)
    return str(content)


async def generate_meal_guidance(query: str, context: dict) -> dict:
    groq_key = _get_groq_key()
    if not groq_key:
        fallback = {
            "summary": (
                "Groq API key is not configured. Set GROQ_API_KEY (or API_KEY) "
                "in backend/.env to enable AI meal guidance."
            ),
            "budget_fit": "unknown",
            "calorie_fit": "unknown",
            "options": [],
        }
        return {"analysis": fallback, "analysis_pretty": _to_pretty_json(fallback)}

    chat = ChatGroq(
        api_key=groq_key,
        model=settings.groq_model,
        temperature=0.2,
    ).with_structured_output(MealGuidanceStructured)

    system_prompt = (
        "You are a strict nutrition and budget coach. "
        "Return valid structured output only. "
        "Use realistic Indian meal options and include macro estimates. "
        "Keep options concise and practical."
    )

    user_prompt = (
        f"User context: {context}. "
        f"Question: {query}. "
        "Respect calorie and budget constraints from context first."
    )

    structured = await chat.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    analysis = structured.model_dump() if hasattr(structured, "model_dump") else dict(structured)
    return {
        "analysis": analysis,
        "analysis_pretty": _to_pretty_json(analysis),
    }


async def analyze_meal_image(file_bytes: bytes, content_type: str | None = None) -> dict:
    groq_key = _get_groq_key()
    if not groq_key:
        raise ValueError("Groq API key is not configured")

    mime = content_type or "image/jpeg"
    image_b64 = base64.b64encode(file_bytes).decode("ascii")
    image_url = f"data:{mime};base64,{image_b64}"

    parser = JsonOutputParser(pydantic_object=MealImageAnalysisStructured)

    chat = ChatGroq(
        api_key=groq_key,
        model=settings.groq_vision_model,
        temperature=0,
    )

    system_prompt = (
        "You are a food-image nutrition analyzer. "
        "If the image is not food, set is_food=false and keep macro values 0. "
        "If it is food, estimate calories, protein_g, carbs_g, and fat_g for visible portion only. "
        "Return only JSON and do not wrap numeric/boolean values in quotes."
    )

    prompt_with_schema = (
        "Analyze this image and return ONLY one JSON object. "
        "IMPORTANT: Do not put numbers or booleans in quotes. "
        f"\n\n{parser.get_format_instructions()}"
    )

    human_content = [
        {
            "type": "text",
            "text": prompt_with_schema,
        },
        {
            "type": "image_url",
            "image_url": {"url": image_url},
        },
    ]

    raw_response = await chat.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_content),
    ])

    raw_text = _content_to_text(raw_response.content)
    parsed = parser.parse(raw_text)
    structured = MealImageAnalysisStructured.model_validate(parsed)
    analysis = structured.model_dump()
    return {
        "analysis": analysis,
        "analysis_pretty": _to_pretty_json(analysis),
    }


async def generate_workout_and_meal_plan(workout_preference: str, notes: str, context: dict) -> dict:
    groq_key = _get_groq_key()
    if not groq_key:
        fallback = {
            "workout_plan": {
                "title": "AI unavailable",
                "duration": "N/A",
                "intensity": "unknown",
                "focus": workout_preference,
                "plan_steps": [],
            },
            "meal_suggestions": [],
            "recipes": [],
            "summary": "Groq API key missing. Set GROQ_API_KEY (or API_KEY) in backend/.env.",
        }
        return {"analysis": fallback, "analysis_pretty": _to_pretty_json(fallback)}

    chat = ChatGroq(
        api_key=groq_key,
        model=settings.groq_model,
        temperature=0.2,
    ).with_structured_output(WorkoutMealPlanStructured)

    system_prompt = (
        "You are an expert fitness and nutrition coach. "
        "Generate a workout plan first, then meal suggestions, then practical recipes. "
        "Keep it safe, realistic, and budget-aware."
    )

    user_prompt = (
        f"Workout preference: {workout_preference}. "
        f"Additional notes: {notes}. "
        f"User context: {context}. "
        "Return JSON with: workout_plan, meal_suggestions, recipes, summary. "
        "Workout plan must include a step-by-step plan_steps array. "
        "Each recipe must include name, prep_time_min, ingredients, and steps."
    )

    structured = await chat.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    analysis = structured.model_dump() if hasattr(structured, "model_dump") else dict(structured)
    return {
        "analysis": analysis,
        "analysis_pretty": _to_pretty_json(analysis),
    }


async def generate_ai_recipe_recommendations(context: dict) -> list[dict[str, Any]]:
    groq_key = _get_groq_key()
    if not groq_key:
        return []

    chat = ChatGroq(
        api_key=groq_key,
        model=settings.groq_model,
        temperature=0.25,
    ).with_structured_output(AIRecipeRecommendationsStructured)

    system_prompt = (
        "You are an expert nutrition chef. "
        "Recommend exactly 3 practical recipes for the user's current calorie and budget scenario. "
        "Prefer Indian/home-cook friendly options and include clear steps."
    )

    user_prompt = (
        f"User context: {context}. "
        "Return only recipes that fit current budget and goal. "
        "Each recipe must include name, prep_time_min, ingredients, steps, and reason."
    )

    try:
        structured = await chat.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ])
        parsed = structured.model_dump() if hasattr(structured, "model_dump") else dict(structured)
        return parsed.get("recipes", [])
    except Exception:
        return []
