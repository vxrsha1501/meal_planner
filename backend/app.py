"""
AI Budget-Aware Lifestyle Planner — Flask REST API

Endpoints:
  POST /user/setup        → Create user profile, calculate BMI & calorie target
  POST /meal/log          → Log a meal, update calories & budget
  GET  /dashboard         → Get dashboard data (calories, budget, suggestions)
  GET  /recommendations   → Get meal & workout recommendations
  GET  /food-items        → List all available food items
  POST /user/reset        → Reset daily counters (for new day)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config import Config
from decision_engine import get_recommendations
from seed_data import seed_food_items

# ──────────────────────────────────────────────
# App & DB initialization
# ──────────────────────────────────────────────

app = Flask(__name__)
config = Config()
app.config["SQLALCHEMY_DATABASE_URI"] = config.SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = config.SQLALCHEMY_TRACK_MODIFICATIONS
app.config["SECRET_KEY"] = config.SECRET_KEY

CORS(app)  # Allow frontend requests from different port

db = SQLAlchemy(app)

# ──────────────────────────────────────────────
# Database Models
# ──────────────────────────────────────────────


class User(db.Model):
    """User profile with computed health targets."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    height_cm = db.Column(db.Float, nullable=False)
    weight_kg = db.Column(db.Float, nullable=False)
    age = db.Column(db.Integer, nullable=False)
    goal = db.Column(db.String(20), nullable=False)         # 'lose', 'gain', 'maintain'
    daily_budget = db.Column(db.Float, nullable=False)
    bmi = db.Column(db.Float, nullable=False)
    calorie_target = db.Column(db.Integer, nullable=False)
    calories_consumed = db.Column(db.Integer, default=0)
    budget_used = db.Column(db.Float, default=0)

    meals = db.relationship("MealLog", backref="user", lazy=True, cascade="all, delete-orphan")


class FoodItem(db.Model):
    """Predefined food items dataset."""
    __tablename__ = "food_items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    calories = db.Column(db.Integer, nullable=False)
    cost = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)


class MealLog(db.Model):
    """Logged meals for each user."""
    __tablename__ = "meals_log"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    food_item = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    total_calories = db.Column(db.Integer, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)


# ──────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────


def calculate_bmi(weight_kg, height_cm):
    """BMI = weight(kg) / height(m)^2"""
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)


def calculate_calorie_target(weight_kg, height_cm, age, goal):
    """
    Calorie target using Mifflin-St Jeor equation (simplified, gender-neutral).
    BMR ≈ 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
    TDEE = BMR × 1.4 (lightly active)
    Then adjust for goal.
    """
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    tdee = bmr * 1.4  # Assume lightly active

    if goal == "lose":
        return int(tdee - 500)   # 500 cal deficit
    elif goal == "gain":
        return int(tdee + 500)   # 500 cal surplus
    else:  # maintain
        return int(tdee)


# ──────────────────────────────────────────────
# API Endpoints
# ──────────────────────────────────────────────


@app.route("/user/setup", methods=["POST"])
def setup_user():
    """
    Create or update user profile.
    Body: { height_cm, weight_kg, age, goal, daily_budget }
    Returns: { user_id, bmi, calorie_target, budget_limit }
    """
    data = request.get_json()

    # Validate required fields
    required = ["height_cm", "weight_kg", "age", "goal", "daily_budget"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    # Validate goal
    if data["goal"] not in ("lose", "gain", "maintain"):
        return jsonify({"error": "Goal must be 'lose', 'gain', or 'maintain'"}), 400

    # Calculate health metrics
    bmi = calculate_bmi(data["weight_kg"], data["height_cm"])
    calorie_target = calculate_calorie_target(
        data["weight_kg"], data["height_cm"], data["age"], data["goal"]
    )

    # Create user
    user = User(
        height_cm=data["height_cm"],
        weight_kg=data["weight_kg"],
        age=data["age"],
        goal=data["goal"],
        daily_budget=data["daily_budget"],
        bmi=bmi,
        calorie_target=calorie_target,
        calories_consumed=0,
        budget_used=0,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "user_id": user.id,
        "bmi": bmi,
        "calorie_target": calorie_target,
        "budget_limit": data["daily_budget"],
        "message": f"Profile created! BMI: {bmi}, Daily target: {calorie_target} cal",
    }), 201


@app.route("/meal/log", methods=["POST"])
def log_meal():
    """
    Log a meal for a user.
    Body: { user_id, food_item, quantity }
    Returns: updated calorie and budget totals + instant recommendations
    """
    data = request.get_json()

    # Validate
    required = ["user_id", "food_item", "quantity"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    user = User.query.get(data["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    food = FoodItem.query.filter_by(name=data["food_item"]).first()
    if not food:
        return jsonify({"error": f"Food item '{data['food_item']}' not found"}), 404

    quantity = int(data["quantity"])
    if quantity < 1:
        return jsonify({"error": "Quantity must be at least 1"}), 400

    # Calculate totals for this meal
    total_cal = food.calories * quantity
    total_cost = food.cost * quantity

    # Log the meal
    meal = MealLog(
        user_id=user.id,
        food_item=food.name,
        quantity=quantity,
        total_calories=total_cal,
        total_cost=total_cost,
    )
    db.session.add(meal)

    # Update user's running totals
    user.calories_consumed += total_cal
    user.budget_used += total_cost
    db.session.commit()

    # Calculate remaining values
    calories_remaining = user.calorie_target - user.calories_consumed
    budget_remaining = user.daily_budget - user.budget_used

    return jsonify({
        "meal_logged": {
            "food_item": food.name,
            "quantity": quantity,
            "calories_added": total_cal,
            "cost_added": total_cost,
        },
        "totals": {
            "calories_consumed": user.calories_consumed,
            "calories_remaining": calories_remaining,
            "calorie_target": user.calorie_target,
            "budget_used": user.budget_used,
            "budget_remaining": budget_remaining,
            "budget_limit": user.daily_budget,
        },
    }), 200


@app.route("/dashboard", methods=["GET"])
def get_dashboard():
    """
    Get full dashboard data for a user.
    Query: ?user_id=X
    Returns: calories, budget, recent meals, and recommendations
    """
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    calories_remaining = user.calorie_target - user.calories_consumed
    budget_remaining = user.daily_budget - user.budget_used

    # Get today's meal log
    meals = MealLog.query.filter_by(user_id=user.id).all()
    meal_history = [
        {
            "food_item": m.food_item,
            "quantity": m.quantity,
            "total_calories": m.total_calories,
            "total_cost": m.total_cost,
        }
        for m in meals
    ]

    # Get real-time recommendations
    food_items = [
        {"name": f.name, "calories": f.calories, "cost": f.cost, "category": f.category}
        for f in FoodItem.query.all()
    ]
    recommendations = get_recommendations(
        calories_remaining, budget_remaining, user.goal, food_items
    )

    return jsonify({
        "user": {
            "id": user.id,
            "bmi": user.bmi,
            "goal": user.goal,
            "calorie_target": user.calorie_target,
            "budget_limit": user.daily_budget,
        },
        "progress": {
            "calories_consumed": user.calories_consumed,
            "calories_remaining": calories_remaining,
            "calorie_target": user.calorie_target,
            "budget_used": user.budget_used,
            "budget_remaining": budget_remaining,
            "budget_limit": user.daily_budget,
        },
        "meal_history": meal_history,
        "recommendations": recommendations,
    }), 200


@app.route("/recommendations", methods=["GET"])
def get_recs():
    """
    Get meal and workout recommendations for a user.
    Query: ?user_id=X
    Returns: meal_suggestions, workout_suggestion, status_message
    """
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    calories_remaining = user.calorie_target - user.calories_consumed
    budget_remaining = user.daily_budget - user.budget_used

    food_items = [
        {"name": f.name, "calories": f.calories, "cost": f.cost, "category": f.category}
        for f in FoodItem.query.all()
    ]

    recommendations = get_recommendations(
        calories_remaining, budget_remaining, user.goal, food_items
    )

    return jsonify(recommendations), 200


@app.route("/food-items", methods=["GET"])
def list_food_items():
    """List all available food items."""
    items = FoodItem.query.all()
    return jsonify({
        "food_items": [
            {
                "name": f.name,
                "calories": f.calories,
                "cost": f.cost,
                "category": f.category,
            }
            for f in items
        ]
    }), 200


@app.route("/user/reset", methods=["POST"])
def reset_daily():
    """
    Reset a user's daily counters (for a new day).
    Body: { user_id }
    """
    data = request.get_json()
    user_id = data.get("user_id")

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Reset daily counters
    user.calories_consumed = 0
    user.budget_used = 0

    # Clear meal logs
    MealLog.query.filter_by(user_id=user.id).delete()
    db.session.commit()

    return jsonify({"message": "Daily counters reset successfully"}), 200


# ──────────────────────────────────────────────
# App startup
# ──────────────────────────────────────────────

with app.app_context():
    db.create_all()
    seed_food_items(db, FoodItem)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
