# 🧠 AI Budget-Aware Lifestyle Planner

An intelligent lifestyle planner that helps users maintain a healthy lifestyle while staying within a daily budget. Track calories, protein, manage food spending, and get AI-powered meal & workout recommendations in real time.

![Stack](https://img.shields.io/badge/Flask-Python-blue) ![Stack](https://img.shields.io/badge/React-Vite-purple) ![Stack](https://img.shields.io/badge/Tailwind_CSS-v4-cyan) ![Stack](https://img.shields.io/badge/MySQL-Database-orange)

---

## 🎯 Features

- **Authentication** — Signup + Login with hashed passwords (Flask sessions)
- **User Profile** — Height, weight, age, goal (with target weight), BMI auto-calculation
- **Meal Logging** — Breakfast, Lunch, Dinner with checkbox selection + quantity
- **Custom Food** — Add your own food items with calories, cost, protein
- **Budget System** — Default budget at signup + optional daily overrides
- **AI Decision Engine** — Rule-based suggestions for meals & workouts
- **Meal Combos** — Auto-generated 2-item meal combinations within budget
- **Workout Recommendations** — Goal-specific exercises with logging
- **Weekly Report** — Bar charts for calories, protein, spending + workout history
- **Live Dashboard** — Glassmorphism UI with progress bars and live updates

---

## 📁 Project Structure

```
meal_planner/
├── backend/
│   ├── app.py                # Flask REST API (auth, all endpoints)
│   ├── decision_engine.py    # Rule-based recommendation engine
│   ├── config.py             # Database & app configuration
│   ├── seed_data.py          # Predefined food dataset (with protein)
│   ├── schema.sql            # MySQL schema (6 tables)
│   ├── .env                  # Environment variables
│   └── requirements.txt      # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── Signup.jsx        # Registration + profile setup
│   │   │   ├── Sidebar.jsx       # Left navigation sidebar
│   │   │   ├── Dashboard.jsx     # Main dashboard with everything
│   │   │   ├── MealSection.jsx   # Breakfast/Lunch/Dinner meal sections
│   │   │   ├── Profile.jsx       # User info + change password
│   │   │   └── WeeklyReport.jsx  # Charts + workout history
│   │   ├── App.jsx            # Root component (auth + routing)
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

**MySQL (required):**

1. Create the database:
   ```sql
   CREATE DATABASE meal_planner;
   ```
2. Update `backend/.env`:
   ```env
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

API runs on `http://localhost:5000`.

#### One-Command Backend Bootstrap (Windows PowerShell)

From the project root, run:

```powershell
.\bootstrap_backend_mysql.ps1
```

This will:
- read MySQL credentials from `backend/.env`
- apply `backend/schema.sql`
- start the Flask backend

If you already applied the schema and only want to start Flask:

```powershell
.\bootstrap_backend_mysql.ps1 -SkipSchema
```

#### One-Command Fullstack Launch (Windows PowerShell)

From the project root, run:

```powershell
.\start_fullstack.ps1
```

This will:
- start backend in a new PowerShell window (without re-importing schema)
- install frontend dependencies if needed
- start Vite frontend in the current terminal

If you want schema initialization as part of startup:

```powershell
.\start_fullstack.ps1 -InitSchema
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

App runs on `http://localhost:5173`.

> The Vite dev server proxies `/api` requests to the Flask backend, so both servers must be running.

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| POST   | `/signup`            | Create account + profile       |
| POST   | `/login`             | Login with username/password   |
| POST   | `/logout`            | End session                    |
| GET    | `/me`                | Check current session          |

### Profile
| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| GET    | `/profile`           | Get user profile               |
| POST   | `/profile/password`  | Change password                |

### Dashboard & Meals
| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| GET    | `/dashboard`         | Full dashboard data            |
| POST   | `/meal/log`          | Log a meal (breakfast/lunch/dinner) |
| GET    | `/food-items`        | List all food items            |
| GET    | `/recommendations`   | Get suggestions                |

### Budget & Workout
| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| POST   | `/budget/update`     | Set today's budget override    |
| POST   | `/workout/log`       | Log a completed workout        |
| GET    | `/weekly-report`     | Last 7 days data for charts    |

---

## 📋 Example API Usage

### Sign Up
```bash
curl -X POST http://localhost:5000/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John","username":"john","password":"pass123","height_cm":170,"weight_kg":70,"age":25,"goal":"lose","target_weight":65,"default_budget":500}'
```

### Login
```bash
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"pass123"}'
```

### Log a Meal
```bash
curl -X POST http://localhost:5000/meal/log \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"meal_type":"breakfast","items":[{"food_item":"Egg","quantity":2},{"food_item":"Oats (1 cup)","quantity":1}]}'
```

### Set Budget Override
```bash
curl -X POST http://localhost:5000/budget/update \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"amount":300}'
```

---

## 🗄️ Database Tables

| Table          | Description                          |
|----------------|--------------------------------------|
| `users_auth`   | Login credentials (hashed passwords) |
| `users`        | Profile, BMI, calorie target         |
| `food_items`   | Predefined + custom foods            |
| `meals_log`    | Logged meals with type + date        |
| `workout_log`  | Logged workouts per day              |
| `daily_budget` | Optional daily budget overrides      |

---

## 🧠 Decision Engine

- **Situation Assessment** — Classifies calorie + budget state
- **Meal Scoring** — Ranks foods by calorie/budget/protein/goal alignment
- **Meal Combos** — Generates 2-item combinations within constraints
- **Workout Selection** — Maps goal + calorie state to exercises
- **Status Message** — Human-readable progress summary

---

## 🛠️ Tech Stack

- **Backend**: Python Flask, Flask-SQLAlchemy, Flask-Login, Flask-CORS
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, React Router, Recharts
- **Database**: MySQL
- **Authentication**: Flask sessions + werkzeug password hashing
