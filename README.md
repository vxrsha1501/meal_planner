# 🧠 AI Budget-Aware Lifestyle Planner

An intelligent lifestyle planner that helps users maintain a healthy lifestyle while staying within a daily budget. Track calories, manage food spending, and get AI-powered meal and workout recommendations in real time.

![Stack](https://img.shields.io/badge/Flask-Python-blue) ![Stack](https://img.shields.io/badge/React-Vite-purple) ![Stack](https://img.shields.io/badge/Tailwind_CSS-v4-cyan) ![Stack](https://img.shields.io/badge/MySQL-Database-orange)

---

## 🎯 Features

- **User Profile Setup** — Enter height, weight, age, goal, and budget → auto-calculates BMI & calorie target
- **Food Logging** — Select from 20 predefined food items with quantity tracking
- **Budget Tracking** — Real-time spending tracker with visual progress bars
- **AI Decision Engine** — Rule-based engine suggests meals & workouts based on your remaining calories, budget, and goal
- **Workout Recommendations** — Goal-specific exercise suggestions (cardio, strength, yoga, etc.)
- **Live Dashboard** — Beautiful dark-themed UI with glassmorphism cards, animations, and progress indicators

---

## 📁 Project Structure

```
meal_planner/
├── backend/
│   ├── app.py                # Flask REST API (all endpoints)
│   ├── decision_engine.py    # Rule-based recommendation engine
│   ├── config.py             # Database & app configuration
│   ├── seed_data.py          # Predefined food dataset + seeding
│   ├── schema.sql            # MySQL schema (for reference)
│   ├── .env                  # Environment variables
│   └── requirements.txt      # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProfileForm.jsx    # User profile setup
│   │   │   ├── MealLogger.jsx     # Food logging with preview
│   │   │   ├── Dashboard.jsx      # Progress bars & meal history
│   │   │   └── SuggestionsCard.jsx # AI meal & workout suggestions
│   │   ├── App.jsx            # Root component (layout + state)
│   │   ├── api.js             # Backend API utility
│   │   └── index.css          # Tailwind CSS + custom styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## ⚙️ Setup Instructions

### Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- **MySQL** (optional — SQLite works out of the box)

### 1. Backend Setup

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Database Configuration

**Option A: SQLite (default — zero setup)**

The `.env` file is preconfigured with `USE_SQLITE=true`. Just run the app.

**Option B: MySQL**

1. Create the database:
   ```sql
   CREATE DATABASE meal_planner;
   ```

2. Update `backend/.env`:
   ```env
   USE_SQLITE=false
   DB_USER=root
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=meal_planner
   ```

#### Start the Backend

```bash
python app.py
```

The API will run on `http://localhost:5000`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will run on `http://localhost:5173`.

> The Vite dev server proxies `/api` requests to the Flask backend, so both servers must be running.

---

## 🔌 API Endpoints

| Method | Endpoint            | Description                              |
|--------|---------------------|------------------------------------------|
| POST   | `/user/setup`       | Create user profile (BMI + calorie calc) |
| POST   | `/meal/log`         | Log a meal, update daily totals          |
| GET    | `/dashboard`        | Full dashboard: progress + recommendations |
| GET    | `/recommendations`  | Meal & workout suggestions only          |
| GET    | `/food-items`       | List all available food items            |
| POST   | `/user/reset`       | Reset daily counters for a new day       |

---

## 🧠 Decision Engine Logic

The engine runs after every meal log and uses rule-based scoring:

1. **Situation Assessment** — Classifies the user's state (high/low calories remaining, budget tight/comfortable, goal)
2. **Meal Scoring** — Each food item is scored based on:
   - Calorie alignment with remaining target
   - Budget affordability
   - Goal-specific preferences (protein for gain, veggies for lose)
   - Cost efficiency (calories per rupee)
3. **Workout Selection** — Maps goal + calorie state to appropriate exercise
4. **Status Message** — Human-readable progress summary

---

## 🍽️ Food Dataset

20 predefined items across 6 categories:

| Category  | Items |
|-----------|-------|
| Protein   | Egg, Paneer, Chicken, Dal, Tofu, Fish, Protein Shake |
| Carbs     | Rice, Roti, Oats, Bread, Pasta, Sweet Potato |
| Fruit     | Banana, Apple |
| Dairy     | Milk, Yogurt, Cheese |
| Vegetable | Salad Bowl |
| Fat       | Peanut Butter |

---

## 🔄 Workflow

1. User sets profile → BMI & calorie target calculated
2. User logs meals from predefined list
3. System updates calories consumed & budget used
4. Decision engine generates real-time recommendations
5. Dashboard updates with progress bars & suggestions

---

## 🛠️ Tech Stack

- **Backend**: Python Flask, Flask-SQLAlchemy, Flask-CORS
- **Frontend**: React 19, Vite 8, Tailwind CSS v4
- **Database**: MySQL (primary) / SQLite (fallback)
- **Architecture**: REST API + Rule-based decision engine

---

*Built for Hackathon 2026* 🚀
