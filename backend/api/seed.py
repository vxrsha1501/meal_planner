from supabase import Client

FOOD_ITEMS = [
    {"name": "Egg", "calories": 70, "cost": 10, "protein": 6, "carbs": 0.5, "fat": 5, "category": "protein"},
    {"name": "Rice (1 cup)", "calories": 200, "cost": 20, "protein": 4, "carbs": 45, "fat": 0.4, "category": "carbs"},
    {"name": "Paneer (100g)", "calories": 300, "cost": 80, "protein": 20, "carbs": 6, "fat": 22, "category": "protein"},
    {"name": "Chicken Breast (100g)", "calories": 165, "cost": 120, "protein": 31, "carbs": 0, "fat": 3.6, "category": "protein"},
    {"name": "Dal (1 cup)", "calories": 150, "cost": 30, "protein": 9, "carbs": 24, "fat": 1, "category": "protein"},
    {"name": "Roti", "calories": 120, "cost": 10, "protein": 3, "carbs": 20, "fat": 3, "category": "carbs"},
    {"name": "Banana", "calories": 90, "cost": 5, "protein": 1, "carbs": 23, "fat": 0.3, "category": "fruit"},
    {"name": "Apple", "calories": 95, "cost": 30, "protein": 0, "carbs": 25, "fat": 0.3, "category": "fruit"},
    {"name": "Milk (1 glass)", "calories": 150, "cost": 25, "protein": 8, "carbs": 12, "fat": 8, "category": "dairy"},
    {"name": "Oats (1 cup)", "calories": 180, "cost": 15, "protein": 6, "carbs": 30, "fat": 3.5, "category": "carbs"},
    {"name": "Salad Bowl", "calories": 50, "cost": 40, "protein": 2, "carbs": 9, "fat": 0.4, "category": "vegetable"},
    {"name": "Bread (1 slice)", "calories": 80, "cost": 5, "protein": 3, "carbs": 15, "fat": 1, "category": "carbs"},
    {"name": "Yogurt (1 cup)", "calories": 100, "cost": 20, "protein": 10, "carbs": 8, "fat": 3, "category": "dairy"},
    {"name": "Peanut Butter (2 tbsp)", "calories": 190, "cost": 35, "protein": 7, "carbs": 7, "fat": 16, "category": "fat"},
    {"name": "Pasta (1 cup)", "calories": 220, "cost": 25, "protein": 8, "carbs": 43, "fat": 1.5, "category": "carbs"},
    {"name": "Tofu (100g)", "calories": 80, "cost": 50, "protein": 8, "carbs": 2, "fat": 4, "category": "protein"},
    {"name": "Sweet Potato", "calories": 100, "cost": 15, "protein": 2, "carbs": 24, "fat": 0.1, "category": "carbs"},
    {"name": "Fish (100g)", "calories": 130, "cost": 100, "protein": 26, "carbs": 0, "fat": 3, "category": "protein"},
    {"name": "Cheese (1 slice)", "calories": 110, "cost": 45, "protein": 7, "carbs": 1, "fat": 9, "category": "dairy"},
    {"name": "Protein Shake", "calories": 250, "cost": 60, "protein": 30, "carbs": 12, "fat": 4, "category": "protein"},
]


def seed_food_items(supabase: Client) -> None:
    existing_rows = supabase.table("food_items").select("name").execute()
    existing = {row["name"] for row in (existing_rows.data or [])}

    added = 0
    for item in FOOD_ITEMS:
        if item["name"] not in existing:
            supabase.table("food_items").insert(item).execute()
            added += 1
