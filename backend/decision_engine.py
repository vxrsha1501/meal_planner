"""
Decision Engine — the brain of the AI Budget-Aware Lifestyle Planner.

Rule-based engine that generates personalized meal and workout
recommendations based on calories remaining, budget remaining,
protein needs, and user goal.
"""


def get_recommendations(calories_remaining, budget_remaining, user_goal, food_items, protein_consumed=0):
    """
    Main entry point. Returns meal suggestions, workout suggestion, and status.

    Args:
        calories_remaining (int): Calories left for the day
        budget_remaining   (float): Budget left for the day
        user_goal          (str): 'lose', 'gain', or 'maintain'
        food_items         (list[dict]): Available food items from DB
        protein_consumed   (int): Protein consumed so far today

    Returns:
        dict with meal_suggestions, meal_combos, workout_suggestion, status_message
    """
    situation = _assess_situation(calories_remaining, budget_remaining, user_goal)

    meal_suggestions = _suggest_meals(
        food_items, calories_remaining, budget_remaining, user_goal, situation
    )

    meal_combos = _suggest_combos(
        food_items, calories_remaining, budget_remaining, user_goal
    )

    workout_suggestion = _suggest_workout(calories_remaining, user_goal, situation)
    status_message = _generate_status(calories_remaining, budget_remaining, situation)

    return {
        "meal_suggestions": meal_suggestions,
        "meal_combos": meal_combos,
        "workout_suggestion": workout_suggestion,
        "status_message": status_message,
    }


# ──────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────


def _assess_situation(calories_remaining, budget_remaining, user_goal):
    """Classify the user's current state into situation tags."""
    tags = []

    if calories_remaining > 800:
        tags.append("high_cal_remaining")
    elif calories_remaining > 400:
        tags.append("moderate_cal_remaining")
    elif calories_remaining > 0:
        tags.append("low_cal_remaining")
    else:
        tags.append("cal_exceeded")

    if budget_remaining > 200:
        tags.append("budget_comfortable")
    elif budget_remaining > 50:
        tags.append("budget_moderate")
    elif budget_remaining > 0:
        tags.append("budget_tight")
    else:
        tags.append("budget_exceeded")

    tags.append(f"goal_{user_goal}")
    return tags


def _suggest_meals(food_items, calories_remaining, budget_remaining, user_goal, situation):
    """Score and rank food items, return top 3 suggestions."""
    if not food_items:
        return []

    scored_items = []

    for item in food_items:
        score = 0
        reason_parts = []

        cal = item["calories"]
        cost = item["cost"]
        protein = item.get("protein", 0)
        category = item["category"]

        # Budget filter (hard constraint)
        if cost > budget_remaining and budget_remaining > 0:
            continue

        # Calorie alignment
        if "high_cal_remaining" in situation:
            if cal >= 150:
                score += 3
                reason_parts.append("High-calorie to meet your target")
        elif "moderate_cal_remaining" in situation:
            if 80 <= cal <= 200:
                score += 2
                reason_parts.append("Balanced calories for your remaining target")
        elif "low_cal_remaining" in situation:
            if cal <= 120:
                score += 3
                reason_parts.append("Light option to stay within target")
            else:
                score -= 1
        elif "cal_exceeded" in situation:
            if cal <= 80:
                score += 2
                reason_parts.append("Very light — you've hit your calorie target")
            else:
                score -= 3

        # Budget alignment
        if "budget_tight" in situation or "budget_exceeded" in situation:
            if cost <= 20:
                score += 3
                reason_parts.append("Budget-friendly choice")
            elif cost <= 40:
                score += 1
            else:
                score -= 2
        elif "budget_moderate" in situation:
            if cost <= 40:
                score += 1

        # Goal-specific preferences
        if user_goal == "lose":
            if category == "vegetable":
                score += 3
                reason_parts.append("Low-cal vegetable — great for weight loss")
            elif category == "fruit":
                score += 2
                reason_parts.append("Healthy fruit option")
            elif category == "protein":
                score += 1
                reason_parts.append("Protein helps preserve muscle while losing")
            elif category == "fat":
                score -= 1
            elif category == "carbs" and cal > 150:
                score -= 1

        elif user_goal == "gain":
            if category == "protein":
                score += 3
                reason_parts.append("Protein-rich — ideal for muscle gain")
            elif category == "carbs":
                score += 2
                reason_parts.append("Carbs for energy and mass gain")
            elif category == "dairy":
                score += 2
                reason_parts.append("Dairy for calories and protein")
            elif category == "vegetable":
                score -= 1

        elif user_goal == "maintain":
            if category == "protein":
                score += 2
                reason_parts.append("Good protein source for maintenance")
            elif category in ("carbs", "dairy"):
                score += 1
            elif category == "vegetable":
                score += 1

        # Protein bonus
        if protein >= 15:
            score += 2
            reason_parts.append(f"High protein ({protein}g)")
        elif protein >= 8:
            score += 1

        # Cost efficiency
        if cost > 0:
            efficiency = cal / cost
            if efficiency > 5:
                score += 1
                reason_parts.append("Great calorie-to-cost ratio")

        reason = "; ".join(reason_parts) if reason_parts else "Available option"

        scored_items.append({
            "name": item["name"],
            "calories": cal,
            "cost": cost,
            "protein": protein,
            "category": category,
            "reason": reason,
            "score": score,
        })

    scored_items.sort(key=lambda x: x["score"], reverse=True)
    top = scored_items[:3]

    for item in top:
        del item["score"]

    return top


def _suggest_combos(food_items, calories_remaining, budget_remaining, user_goal):
    """
    Generate 2-3 meal combinations (2 items each) that fit within
    the remaining calories and budget.
    """
    if not food_items or calories_remaining <= 0 or budget_remaining <= 0:
        return []

    affordable = [
        item for item in food_items
        if item["cost"] <= budget_remaining and item["calories"] <= calories_remaining
    ]

    if len(affordable) < 2:
        return []

    combos = []
    seen = set()

    for i, item_a in enumerate(affordable):
        for item_b in affordable[i + 1:]:
            total_cal = item_a["calories"] + item_b["calories"]
            total_cost = item_a["cost"] + item_b["cost"]
            total_protein = item_a.get("protein", 0) + item_b.get("protein", 0)

            if total_cost > budget_remaining or total_cal > calories_remaining:
                continue

            # Score the combo
            score = 0
            # Calorie coverage
            coverage = total_cal / max(calories_remaining, 1)
            if 0.3 <= coverage <= 0.6:
                score += 3
            elif 0.2 <= coverage <= 0.8:
                score += 1

            # Category diversity bonus
            if item_a["category"] != item_b["category"]:
                score += 2

            # Goal alignment
            if user_goal == "gain" and total_protein >= 15:
                score += 2
            elif user_goal == "lose" and total_cal <= 300:
                score += 2
            elif user_goal == "maintain" and 200 <= total_cal <= 500:
                score += 1

            key = tuple(sorted([item_a["name"], item_b["name"]]))
            if key not in seen:
                seen.add(key)
                combos.append({
                    "items": [item_a["name"], item_b["name"]],
                    "total_calories": total_cal,
                    "total_cost": total_cost,
                    "total_protein": total_protein,
                    "score": score,
                })

    combos.sort(key=lambda x: x["score"], reverse=True)
    top = combos[:3]

    for combo in top:
        del combo["score"]

    return top


def _suggest_workout(calories_remaining, user_goal, situation):
    """Suggest a workout based on the user's goal and calorie state."""

    if user_goal == "lose":
        if "cal_exceeded" in situation:
            return {
                "activity": "Brisk Walking",
                "duration": "30 min",
                "description": "You've exceeded your calorie target. A brisk 30-minute walk will help burn ~150 extra calories.",
                "intensity": "moderate",
            }
        elif "high_cal_remaining" in situation:
            return {
                "activity": "Light Yoga",
                "duration": "20 min",
                "description": "You have room for more food. Light yoga keeps you active without burning too many calories before you eat.",
                "intensity": "low",
            }
        else:
            return {
                "activity": "HIIT Cardio",
                "duration": "15 min",
                "description": "Short burst cardio — jump squats, burpees, and high knees. Great for fat burn with your calorie deficit.",
                "intensity": "high",
            }

    elif user_goal == "gain":
        if "high_cal_remaining" in situation:
            return {
                "activity": "Strength Training",
                "duration": "30 min",
                "description": "Focus on compound lifts: squats, deadlifts, bench press. Eat your remaining calories post-workout.",
                "intensity": "high",
            }
        elif "cal_exceeded" in situation:
            return {
                "activity": "Light Stretching",
                "duration": "10 min",
                "description": "You've eaten well today! Light stretching aids digestion and recovery.",
                "intensity": "low",
            }
        else:
            return {
                "activity": "Push-ups & Squats",
                "duration": "20 min",
                "description": "Bodyweight strength work — 4 sets of push-ups and squats. Builds muscle with your calorie surplus.",
                "intensity": "moderate",
            }

    else:  # maintain
        if "cal_exceeded" in situation:
            return {
                "activity": "Evening Walk",
                "duration": "20 min",
                "description": "A relaxed walk to balance out the extra calories and aid digestion.",
                "intensity": "low",
            }
        elif "high_cal_remaining" in situation:
            return {
                "activity": "Rest Day",
                "duration": "—",
                "description": "You haven't eaten much yet. Focus on getting your meals in before exercising.",
                "intensity": "rest",
            }
        else:
            return {
                "activity": "Mixed Routine",
                "duration": "25 min",
                "description": "15 min walk + 10 min bodyweight exercises (push-ups, planks, squats). Balanced activity for maintenance.",
                "intensity": "moderate",
            }


def _generate_status(calories_remaining, budget_remaining, situation):
    """Generate a friendly status message for the dashboard."""
    messages = []

    if "cal_exceeded" in situation:
        messages.append(f"⚠️ You've exceeded your calorie target by {abs(calories_remaining)} cal.")
    elif "low_cal_remaining" in situation:
        messages.append(f"🎯 Almost there! Only {calories_remaining} calories left for today.")
    elif "moderate_cal_remaining" in situation:
        messages.append(f"👍 On track — {calories_remaining} calories remaining.")
    else:
        messages.append(f"🍽️ You still have {calories_remaining} calories to fill today.")

    if "budget_exceeded" in situation:
        messages.append(f"💸 Budget exceeded by ₹{abs(budget_remaining):.0f}. Try free/homemade options.")
    elif "budget_tight" in situation:
        messages.append(f"💰 Budget is tight — only ₹{budget_remaining:.0f} left. Go for affordable picks.")
    elif "budget_moderate" in situation:
        messages.append(f"💵 ₹{budget_remaining:.0f} remaining in your budget.")
    else:
        messages.append(f"✅ Comfortable budget — ₹{budget_remaining:.0f} available.")

    return " ".join(messages)
