"""
AI Budget-Aware Lifestyle Planner — Flask REST API (v2)

Features:
  - Session-based authentication (Flask-Login)
  - Password hashing (werkzeug.security)
  - Meal logging with meal types (breakfast/lunch/dinner)
  - Daily budget overrides
  - Weekly report data
  - Workout logging
  - AI-powered recommendations
"""

import logging
from datetime import date, timedelta

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    login_required, current_user
)
from werkzeug.security import generate_password_hash, check_password_hash

from config import Config
from decision_engine import get_recommendations
from seed_data import seed_food_items

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# App & DB initialization
# ──────────────────────────────────────────────

app = Flask(__name__)
config = Config()
app.config["SQLALCHEMY_DATABASE_URI"] = config.SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = config.SQLALCHEMY_TRACK_MODIFICATIONS
app.config["SECRET_KEY"] = config.SECRET_KEY
app.config["SESSION_COOKIE_HTTPONLY"] = config.SESSION_COOKIE_HTTPONLY
app.config["SESSION_COOKIE_SAMESITE"] = config.SESSION_COOKIE_SAMESITE

CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

db = SQLAlchemy(app)
login_manager = LoginManager(app)

# ──────────────────────────────────────────────
# Database Models
# ──────────────────────────────────────────────


class UserAuth(UserMixin, db.Model):
    """Authentication credentials."""
    __tablename__ = "users_auth"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    profile = db.relationship("User", backref="auth", uselist=False, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class User(db.Model):
    """User profile with computed health targets."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    auth_id = db.Column(db.Integer, db.ForeignKey("users_auth.id"), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    height_cm = db.Column(db.Float, nullable=False)
    weight_kg = db.Column(db.Float, nullable=False)
    age = db.Column(db.Integer, nullable=False)
    goal = db.Column(db.String(20), nullable=False)
    target_weight = db.Column(db.Float, nullable=True)
    default_budget = db.Column(db.Float, nullable=False)
    bmi = db.Column(db.Float, nullable=False)
    calorie_target = db.Column(db.Integer, nullable=False)


class FoodItem(db.Model):
    """Predefined + custom food items."""
    __tablename__ = "food_items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    calories = db.Column(db.Integer, nullable=False)
    cost = db.Column(db.Float, nullable=False)
    protein = db.Column(db.Float, nullable=False, default=0)
    category = db.Column(db.String(50), nullable=False)
    is_custom = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users_auth.id"), nullable=True)


class MealLog(db.Model):
    """Logged meals with meal type."""
    __tablename__ = "meals_log"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users_auth.id"), nullable=False)
    food_item = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    meal_type = db.Column(db.String(20), nullable=False)  # breakfast, lunch, dinner
    total_calories = db.Column(db.Integer, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    total_protein = db.Column(db.Float, nullable=False, default=0)
    logged_date = db.Column(db.Date, nullable=False)


class WorkoutLog(db.Model):
    """Logged workouts."""
    __tablename__ = "workout_log"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users_auth.id"), nullable=False)
    activity = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    logged_date = db.Column(db.Date, nullable=False)


class DailyBudget(db.Model):
    """Optional daily budget overrides."""
    __tablename__ = "daily_budget"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users_auth.id"), nullable=False)
    budget_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Float, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "budget_date", name="unique_user_date"),
    )


# ──────────────────────────────────────────────
# Flask-Login user loader
# ──────────────────────────────────────────────


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(UserAuth, int(user_id))


# ──────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────


def calculate_bmi(weight_kg, height_cm):
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)


def calculate_calorie_target(weight_kg, height_cm, age, goal):
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    tdee = bmr * 1.4

    if goal == "lose":
        return int(tdee - 500)
    elif goal == "gain":
        return int(tdee + 500)
    else:
        return int(tdee)


def get_today_budget(user_auth_id, default_budget):
    """Get today's budget — daily override or fallback to default."""
    today = date.today()
    override = DailyBudget.query.filter_by(user_id=user_auth_id, budget_date=today).first()
    if override:
        return override.amount
    return default_budget


def get_today_totals(user_auth_id):
    """Calculate today's consumed totals."""
    today = date.today()
    meals = MealLog.query.filter_by(user_id=user_auth_id, logged_date=today).all()

    total_cal = sum(m.total_calories for m in meals)
    total_cost = sum(m.total_cost for m in meals)
    total_protein = sum(m.total_protein for m in meals)

    return total_cal, total_cost, total_protein, meals


# ──────────────────────────────────────────────
# AUTH Endpoints
# ──────────────────────────────────────────────


@app.route("/signup", methods=["POST"])
def signup():
    """
    Create a new user account + profile.
    Body: { username, password, name, height_cm, weight_kg, age, goal, target_weight?, default_budget }
    """
    data = request.get_json()
    logger.debug(f"Signup attempt: {data.get('username')}")

    required = ["username", "password", "name", "height_cm", "weight_kg", "age", "goal", "default_budget"]
    for field in required:
        if field not in data or data[field] == "" or data[field] is None:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    if data["goal"] not in ("lose", "gain", "maintain"):
        return jsonify({"error": "Goal must be 'lose', 'gain', or 'maintain'"}), 400

    if UserAuth.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already taken"}), 409

    # Create auth record
    auth = UserAuth(username=data["username"])
    auth.set_password(data["password"])
    db.session.add(auth)
    db.session.flush()  # Get auth.id

    # Calculate health metrics
    bmi = calculate_bmi(data["weight_kg"], data["height_cm"])
    calorie_target = calculate_calorie_target(
        data["weight_kg"], data["height_cm"], data["age"], data["goal"]
    )

    # Create profile
    profile = User(
        auth_id=auth.id,
        name=data["name"],
        height_cm=data["height_cm"],
        weight_kg=data["weight_kg"],
        age=data["age"],
        goal=data["goal"],
        target_weight=data.get("target_weight"),
        default_budget=data["default_budget"],
        bmi=bmi,
        calorie_target=calorie_target,
    )
    db.session.add(profile)
    db.session.commit()

    login_user(auth)
    logger.info(f"User signed up: {data['username']} (id={auth.id})")

    return jsonify({
        "message": "Account created successfully!",
        "user": {
            "id": auth.id,
            "username": auth.username,
            "name": profile.name,
            "bmi": bmi,
            "calorie_target": calorie_target,
        }
    }), 201


@app.route("/login", methods=["POST"])
def login():
    """
    Login with username and password.
    Body: { username, password }
    """
    data = request.get_json()
    logger.debug(f"Login attempt: {data.get('username')}")

    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    auth = UserAuth.query.filter_by(username=username).first()
    if not auth or not auth.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401

    login_user(auth)
    profile = auth.profile
    logger.info(f"User logged in: {username}")

    return jsonify({
        "message": "Login successful!",
        "user": {
            "id": auth.id,
            "username": auth.username,
            "name": profile.name if profile else username,
            "goal": profile.goal if profile else None,
        }
    }), 200


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    """Logout the current user."""
    logger.info(f"User logged out: {current_user.username}")
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200


@app.route("/me", methods=["GET"])
def get_me():
    """Get the current session user info (used on app load)."""
    if current_user.is_authenticated:
        profile = current_user.profile
        return jsonify({
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "name": profile.name if profile else current_user.username,
                "goal": profile.goal if profile else None,
            }
        }), 200
    return jsonify({"authenticated": False}), 200


# ──────────────────────────────────────────────
# PROFILE Endpoints
# ──────────────────────────────────────────────


@app.route("/profile", methods=["GET"])
@login_required
def get_profile():
    """Get the current user's full profile."""
    profile = current_user.profile
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    return jsonify({
        "name": profile.name,
        "username": current_user.username,
        "height_cm": profile.height_cm,
        "weight_kg": profile.weight_kg,
        "age": profile.age,
        "goal": profile.goal,
        "target_weight": profile.target_weight,
        "default_budget": profile.default_budget,
        "bmi": profile.bmi,
        "calorie_target": profile.calorie_target,
    }), 200


@app.route("/profile/password", methods=["POST"])
@login_required
def change_password():
    """
    Change the current user's password.
    Body: { current_password, new_password }
    """
    data = request.get_json()
    current_pw = data.get("current_password", "")
    new_pw = data.get("new_password", "")

    if not current_pw or not new_pw:
        return jsonify({"error": "Both current and new password are required"}), 400

    if len(new_pw) < 4:
        return jsonify({"error": "New password must be at least 4 characters"}), 400

    if not current_user.check_password(current_pw):
        return jsonify({"error": "Current password is incorrect"}), 403

    current_user.set_password(new_pw)
    db.session.commit()
    logger.info(f"Password changed for user: {current_user.username}")

    return jsonify({"message": "Password changed successfully!"}), 200


# ──────────────────────────────────────────────
# DASHBOARD Endpoint
# ──────────────────────────────────────────────


@app.route("/dashboard", methods=["GET"])
@login_required
def get_dashboard():
    """Get full dashboard data for the current user."""
    profile = current_user.profile
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    today = date.today()
    today_budget = get_today_budget(current_user.id, profile.default_budget)
    total_cal, total_cost, total_protein, meals = get_today_totals(current_user.id)

    calories_remaining = profile.calorie_target - total_cal
    budget_remaining = today_budget - total_cost

    # Organize meals by type
    meals_by_type = {"breakfast": [], "lunch": [], "dinner": []}
    for m in meals:
        if m.meal_type in meals_by_type:
            meals_by_type[m.meal_type].append({
                "id": m.id,
                "food_item": m.food_item,
                "quantity": m.quantity,
                "total_calories": m.total_calories,
                "total_cost": m.total_cost,
                "total_protein": m.total_protein,
            })

    # Get recommendations
    food_items = [
        {"name": f.name, "calories": f.calories, "cost": f.cost,
         "protein": f.protein, "category": f.category}
        for f in FoodItem.query.all()
    ]
    recommendations = get_recommendations(
        calories_remaining, budget_remaining, profile.goal, food_items, total_protein
    )

    # Today's workout
    today_workout = WorkoutLog.query.filter_by(
        user_id=current_user.id, logged_date=today
    ).first()

    return jsonify({
        "user": {
            "id": current_user.id,
            "name": profile.name,
            "bmi": profile.bmi,
            "goal": profile.goal,
            "target_weight": profile.target_weight,
            "calorie_target": profile.calorie_target,
            "budget_limit": today_budget,
            "default_budget": profile.default_budget,
        },
        "progress": {
            "calories_consumed": total_cal,
            "calories_remaining": calories_remaining,
            "calorie_target": profile.calorie_target,
            "budget_used": total_cost,
            "budget_remaining": budget_remaining,
            "budget_limit": today_budget,
            "protein_consumed": total_protein,
        },
        "meals_by_type": meals_by_type,
        "recommendations": recommendations,
        "today_workout": {
            "activity": today_workout.activity,
            "duration": today_workout.duration,
            "description": today_workout.description,
        } if today_workout else None,
    }), 200


# ──────────────────────────────────────────────
# MEAL Endpoints
# ──────────────────────────────────────────────


@app.route("/meal/log", methods=["POST"])
@login_required
def log_meal():
    """
    Log a meal for the current user.
    Body: { meal_type, items: [{ food_item, quantity }] }
    Also supports custom items: { food_item, quantity, calories?, cost?, protein? }
    """
    data = request.get_json()
    logger.debug(f"Meal log: {data}")

    meal_type = data.get("meal_type")
    if meal_type not in ("breakfast", "lunch", "dinner"):
        return jsonify({"error": "meal_type must be 'breakfast', 'lunch', or 'dinner'"}), 400

    items = data.get("items", [])
    if not items:
        return jsonify({"error": "No items to log"}), 400

    today = date.today()
    logged_items = []

    for item_data in items:
        food_name = item_data.get("food_item")
        quantity = int(item_data.get("quantity", 1))

        if quantity < 1:
            continue

        # Check if it's a known food item
        food = FoodItem.query.filter_by(name=food_name).first()

        if food:
            cal = food.calories * quantity
            cost = food.cost * quantity
            protein = food.protein * quantity
        else:
            # Custom food item — use provided values
            cal = int(item_data.get("calories", 0)) * quantity
            cost = float(item_data.get("cost", 0)) * quantity
            protein = float(item_data.get("protein", 0)) * quantity

            # Optionally save the custom food for reuse
            if food_name and cal > 0:
                existing = FoodItem.query.filter_by(name=food_name).first()
                if not existing:
                    custom_food = FoodItem(
                        name=food_name,
                        calories=int(item_data.get("calories", 0)),
                        cost=float(item_data.get("cost", 0)),
                        protein=float(item_data.get("protein", 0)),
                        category="custom",
                        is_custom=True,
                        created_by=current_user.id,
                    )
                    db.session.add(custom_food)

        meal = MealLog(
            user_id=current_user.id,
            food_item=food_name,
            quantity=quantity,
            meal_type=meal_type,
            total_calories=cal,
            total_cost=cost,
            total_protein=protein,
            logged_date=today,
        )
        db.session.add(meal)
        logged_items.append({
            "food_item": food_name,
            "quantity": quantity,
            "calories": cal,
            "cost": cost,
            "protein": protein,
        })

    db.session.commit()
    logger.info(f"Logged {len(logged_items)} items for {meal_type} (user={current_user.id})")

    # Return updated totals
    total_cal, total_cost, total_protein, _ = get_today_totals(current_user.id)
    profile = current_user.profile
    today_budget = get_today_budget(current_user.id, profile.default_budget)

    return jsonify({
        "message": f"{meal_type.capitalize()} logged successfully!",
        "logged_items": logged_items,
        "totals": {
            "calories_consumed": total_cal,
            "calories_remaining": profile.calorie_target - total_cal,
            "budget_used": total_cost,
            "budget_remaining": today_budget - total_cost,
            "protein_consumed": total_protein,
        }
    }), 200


@app.route("/food-items", methods=["GET"])
@login_required
def list_food_items():
    """List all available food items (predefined + user's custom)."""
    items = FoodItem.query.filter(
        (FoodItem.is_custom == False) | (FoodItem.created_by == current_user.id)
    ).all()

    return jsonify({
        "food_items": [
            {
                "name": f.name,
                "calories": f.calories,
                "cost": f.cost,
                "protein": f.protein,
                "category": f.category,
                "is_custom": f.is_custom,
            }
            for f in items
        ]
    }), 200


# ──────────────────────────────────────────────
# BUDGET Endpoint
# ──────────────────────────────────────────────


@app.route("/budget/update", methods=["POST"])
@login_required
def update_budget():
    """
    Set or update today's budget override.
    Body: { amount }
    """
    data = request.get_json()
    amount = data.get("amount")

    if amount is None or float(amount) <= 0:
        return jsonify({"error": "Budget amount must be positive"}), 400

    today = date.today()
    existing = DailyBudget.query.filter_by(
        user_id=current_user.id, budget_date=today
    ).first()

    if existing:
        existing.amount = float(amount)
    else:
        budget = DailyBudget(
            user_id=current_user.id,
            budget_date=today,
            amount=float(amount),
        )
        db.session.add(budget)

    db.session.commit()
    logger.info(f"Budget updated to ₹{amount} for user {current_user.id}")

    return jsonify({"message": f"Today's budget set to ₹{amount}"}), 200


# ──────────────────────────────────────────────
# RECOMMENDATIONS Endpoint
# ──────────────────────────────────────────────


@app.route("/recommendations", methods=["GET"])
@login_required
def get_recs():
    """Get meal and workout recommendations."""
    profile = current_user.profile
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    total_cal, total_cost, total_protein, _ = get_today_totals(current_user.id)
    today_budget = get_today_budget(current_user.id, profile.default_budget)

    calories_remaining = profile.calorie_target - total_cal
    budget_remaining = today_budget - total_cost

    food_items = [
        {"name": f.name, "calories": f.calories, "cost": f.cost,
         "protein": f.protein, "category": f.category}
        for f in FoodItem.query.all()
    ]

    recommendations = get_recommendations(
        calories_remaining, budget_remaining, profile.goal, food_items, total_protein
    )

    return jsonify(recommendations), 200


# ──────────────────────────────────────────────
# WORKOUT Endpoint
# ──────────────────────────────────────────────


@app.route("/workout/log", methods=["POST"])
@login_required
def log_workout():
    """
    Log a workout for today.
    Body: { activity, duration, description? }
    """
    data = request.get_json()
    activity = data.get("activity", "").strip()
    duration = data.get("duration", "").strip()

    if not activity or not duration:
        return jsonify({"error": "Activity and duration are required"}), 400

    today = date.today()
    workout = WorkoutLog(
        user_id=current_user.id,
        activity=activity,
        duration=duration,
        description=data.get("description", ""),
        logged_date=today,
    )
    db.session.add(workout)
    db.session.commit()

    logger.info(f"Workout logged: {activity} ({duration}) for user {current_user.id}")
    return jsonify({"message": "Workout logged!"}), 200


# ──────────────────────────────────────────────
# WEEKLY REPORT Endpoint
# ──────────────────────────────────────────────


@app.route("/weekly-report", methods=["GET"])
@login_required
def weekly_report():
    """
    Get last 7 days of calories, protein, budget usage, and workouts.
    Returns day-by-day data for charts.
    """
    today = date.today()
    days = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%a")  # Mon, Tue, etc.
        day_iso = day.isoformat()

        # Get meals for this day
        meals = MealLog.query.filter_by(user_id=current_user.id, logged_date=day).all()
        day_cal = sum(m.total_calories for m in meals)
        day_cost = sum(m.total_cost for m in meals)
        day_protein = sum(m.total_protein for m in meals)

        # Get workouts for this day
        workouts = WorkoutLog.query.filter_by(user_id=current_user.id, logged_date=day).all()
        workout_list = [
            {"activity": w.activity, "duration": w.duration, "description": w.description}
            for w in workouts
        ]

        days.append({
            "day": day_str,
            "date": day_iso,
            "calories": day_cal,
            "protein": day_protein,
            "cost": day_cost,
            "workouts": workout_list,
        })

    profile = current_user.profile
    return jsonify({
        "calorie_target": profile.calorie_target if profile else 0,
        "days": days,
    }), 200


# ──────────────────────────────────────────────
# App startup
# ──────────────────────────────────────────────

with app.app_context():
    db.create_all()
    seed_food_items(db, FoodItem)
    logger.info("✅ Database initialized and food items seeded.")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
