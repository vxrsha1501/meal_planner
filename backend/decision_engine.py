"""
Decision Engine — the brain of the AI Budget-Aware Lifestyle Planner.

This rule-based engine generates personalized meal and workout
recommendations based on:
  - calories_remaining (daily target minus consumed)
  - budget_remaining  (daily budget minus spent)
  - user_goal         ('lose', 'gain', 'maintain')

No ML models — just intelligent rule combinations designed for
real-time suggestions after every meal log.
"""


def get_recommendations(calories_remaining, budget_remaining, user_goal, food_items):
    """
    Main entry point. Returns a dict with meal_suggestions and workout_suggestion.

    Args:
        calories_remaining (int): Calories left for the day
        budget_remaining   (float): Budget left for the day
        user_goal          (str): 'lose', 'gain', or 'maintain'
        food_items         (list[dict]): Available food items from DB
            Each item: { name, calories, cost, category }

    Returns:
        dict: {
            meal_suggestions: [{ name, calories, cost, reason }],
            workout_suggestion: { activity, duration, description },
            status_message: str
        }
    """
    # --- Step 1: Determine the user's current situation ---
    situation = _assess_situation(calories_remaining, budget_remaining, user_goal)

    # --- Step 2: Filter and rank meals based on situation ---
    meal_suggestions = _suggest_meals(
        food_items, calories_remaining, budget_remaining, user_goal, situation
    )

    # --- Step 3: Suggest a workout based on goal and intake ---
    workout_suggestion = _suggest_workout(calories_remaining, user_goal, situation)

    # --- Step 4: Generate a human-readable status message ---
    status_message = _generate_status(calories_remaining, budget_remaining, situation)

    return {
        "meal_suggestions": meal_suggestions,
        "workout_suggestion": workout_suggestion,
        "status_message": status_message,
    }


# ──────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────


def _assess_situation(calories_remaining, budget_remaining, user_goal):
    """
    Classify the user's current state into a situation tag.
    This drives downstream meal/workout selection logic.
    """
    tags = []

    # Calorie assessment
    if calories_remaining > 800:
        tags.append("high_cal_remaining")
    elif calories_remaining > 400:
        tags.append("moderate_cal_remaining")
    elif calories_remaining > 0:
        tags.append("low_cal_remaining")
    else:
        tags.append("cal_exceeded")

    # Budget assessment
    if budget_remaining > 200:
        tags.append("budget_comfortable")
    elif budget_remaining > 50:
        tags.append("budget_moderate")
    elif budget_remaining > 0:
        tags.append("budget_tight")
    else:
        tags.append("budget_exceeded")

    # Goal context
    tags.append(f"goal_{user_goal}")

    return tags


def _suggest_meals(food_items, calories_remaining, budget_remaining, user_goal, situation):
    """
    Score and rank food items, return top 3 suggestions.
    Scoring considers calories, cost, goal alignment, and budget.
    """
    if not food_items:
        return []

    scored_items = []

    for item in food_items:
        score = 0
        reason_parts = []

        cal = item["calories"]
        cost = item["cost"]
        category = item["category"]

        # --- Rule 1: Budget filter (hard constraint) ---
        if cost > budget_remaining and budget_remaining > 0:
            continue  # Can't afford it

        # --- Rule 2: Calorie alignment ---
        if "high_cal_remaining" in situation:
            # Need more calories → prefer calorie-dense foods
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

        # --- Rule 3: Budget alignment ---
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

        # --- Rule 4: Goal-specific preferences ---
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
            # Balanced approach
            if category == "protein":
                score += 2
                reason_parts.append("Good protein source for maintenance")
            elif category in ("carbs", "dairy"):
                score += 1
            elif category == "vegetable":
                score += 1

        # --- Rule 5: Cost efficiency (calories per rupee) ---
        if cost > 0:
            efficiency = cal / cost
            if efficiency > 5:
                score += 1
                reason_parts.append("Great calorie-to-cost ratio")

        # Build the reason string
        reason = "; ".join(reason_parts) if reason_parts else "Available option"

        scored_items.append({
            "name": item["name"],
            "calories": cal,
            "cost": cost,
            "category": category,
            "reason": reason,
            "score": score,
        })

    # Sort by score (descending), return top 3
    scored_items.sort(key=lambda x: x["score"], reverse=True)
    top = scored_items[:3]

    # Remove internal score from output
    for item in top:
        del item["score"]

    return top


def _suggest_workout(calories_remaining, user_goal, situation):
    """
    Suggest a workout based on the user's goal and calorie state.
    Returns simple, actionable exercise recommendations.
    """

    # --- Goal: Lose weight ---
    if user_goal == "lose":
        if "cal_exceeded" in situation:
            return {
                "activity": "Brisk Walking",
                "duration": "30 min",
                "description": "You've exceeded your calorie target. A brisk 30-minute walk will help burn ~150 extra calories.",
            }
        elif "high_cal_remaining" in situation:
            return {
                "activity": "Light Yoga",
                "duration": "20 min",
                "description": "You have room for more food. Light yoga keeps you active without burning too many calories before you eat.",
            }
        else:
            return {
                "activity": "HIIT Cardio",
                "duration": "15 min",
                "description": "Short burst cardio — jump squats, burpees, and high knees. Great for fat burn with your calorie deficit.",
            }

    # --- Goal: Gain weight ---
    elif user_goal == "gain":
        if "high_cal_remaining" in situation:
            return {
                "activity": "Strength Training",
                "duration": "30 min",
                "description": "Focus on compound lifts: squats, deadlifts, bench press. Eat your remaining calories post-workout.",
            }
        elif "cal_exceeded" in situation:
            return {
                "activity": "Light Stretching",
                "duration": "10 min",
                "description": "You've eaten well today! Light stretching aids digestion and recovery. Save energy for tomorrow's workout.",
            }
        else:
            return {
                "activity": "Push-ups & Squats",
                "duration": "20 min",
                "description": "Bodyweight strength work — 4 sets of push-ups and squats. Builds muscle with your calorie surplus.",
            }

    # --- Goal: Maintain ---
    else:
        if "cal_exceeded" in situation:
            return {
                "activity": "Evening Walk",
                "duration": "20 min",
                "description": "A relaxed walk to balance out the extra calories and aid digestion.",
            }
        elif "high_cal_remaining" in situation:
            return {
                "activity": "Rest Day",
                "duration": "—",
                "description": "You haven't eaten much yet. Focus on getting your meals in before exercising.",
            }
        else:
            return {
                "activity": "Mixed Routine",
                "duration": "25 min",
                "description": "15 min walk + 10 min bodyweight exercises (push-ups, planks, squats). Balanced activity for maintenance.",
            }


def _generate_status(calories_remaining, budget_remaining, situation):
    """Generate a friendly status message for the dashboard."""

    messages = []

    # Calorie status
    if "cal_exceeded" in situation:
        messages.append(f"⚠️ You've exceeded your calorie target by {abs(calories_remaining)} cal.")
    elif "low_cal_remaining" in situation:
        messages.append(f"🎯 Almost there! Only {calories_remaining} calories left for today.")
    elif "moderate_cal_remaining" in situation:
        messages.append(f"👍 On track — {calories_remaining} calories remaining.")
    else:
        messages.append(f"🍽️ You still have {calories_remaining} calories to fill today.")

    # Budget status
    if "budget_exceeded" in situation:
        messages.append(f"💸 Budget exceeded by ₹{abs(budget_remaining):.0f}. Try free/homemade options.")
    elif "budget_tight" in situation:
        messages.append(f"💰 Budget is tight — only ₹{budget_remaining:.0f} left. Go for affordable picks.")
    elif "budget_moderate" in situation:
        messages.append(f"💵 ₹{budget_remaining:.0f} remaining in your budget.")
    else:
        messages.append(f"✅ Comfortable budget — ₹{budget_remaining:.0f} available.")

    return " ".join(messages)
