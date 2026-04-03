"""
Predefined food dataset for the Lifestyle Planner.
Each item has: calories (per serving), cost (per serving), and category.
This data is seeded into the database on first run.
"""

FOOD_ITEMS = [
    {"name": "Egg",                    "calories": 70,  "cost": 10,  "category": "protein"},
    {"name": "Rice (1 cup)",           "calories": 200, "cost": 20,  "category": "carbs"},
    {"name": "Paneer (100g)",          "calories": 300, "cost": 80,  "category": "protein"},
    {"name": "Chicken Breast (100g)",  "calories": 165, "cost": 120, "category": "protein"},
    {"name": "Dal (1 cup)",            "calories": 150, "cost": 30,  "category": "protein"},
    {"name": "Roti",                   "calories": 120, "cost": 10,  "category": "carbs"},
    {"name": "Banana",                 "calories": 90,  "cost": 5,   "category": "fruit"},
    {"name": "Apple",                  "calories": 95,  "cost": 30,  "category": "fruit"},
    {"name": "Milk (1 glass)",         "calories": 150, "cost": 25,  "category": "dairy"},
    {"name": "Oats (1 cup)",           "calories": 180, "cost": 15,  "category": "carbs"},
    {"name": "Salad Bowl",             "calories": 50,  "cost": 40,  "category": "vegetable"},
    {"name": "Bread (1 slice)",        "calories": 80,  "cost": 5,   "category": "carbs"},
    {"name": "Yogurt (1 cup)",         "calories": 100, "cost": 20,  "category": "dairy"},
    {"name": "Peanut Butter (2 tbsp)", "calories": 190, "cost": 35,  "category": "fat"},
    {"name": "Pasta (1 cup)",          "calories": 220, "cost": 25,  "category": "carbs"},
    {"name": "Tofu (100g)",            "calories": 80,  "cost": 50,  "category": "protein"},
    {"name": "Sweet Potato",           "calories": 100, "cost": 15,  "category": "carbs"},
    {"name": "Fish (100g)",            "calories": 130, "cost": 100, "category": "protein"},
    {"name": "Cheese (1 slice)",       "calories": 110, "cost": 45,  "category": "dairy"},
    {"name": "Protein Shake",          "calories": 250, "cost": 60,  "category": "protein"},
]


def seed_food_items(db, FoodItem):
    """
    Seed the food_items table with predefined data.
    Skips items that already exist (based on name).
    """
    existing = {item.name for item in FoodItem.query.all()}
    added = 0

    for item in FOOD_ITEMS:
        if item["name"] not in existing:
            food = FoodItem(
                name=item["name"],
                calories=item["calories"],
                cost=item["cost"],
                category=item["category"],
            )
            db.session.add(food)
            added += 1

    if added > 0:
        db.session.commit()
        print(f"✅ Seeded {added} food items into the database.")
    else:
        print("ℹ️  Food items already seeded — skipping.")
