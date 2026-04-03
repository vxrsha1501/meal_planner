-- ============================================
-- AI Budget-Aware Lifestyle Planner
-- MySQL Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS meal_planner;
USE meal_planner;

-- Users table: stores profile and computed targets
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    height_cm       FLOAT NOT NULL,            -- Height in centimeters
    weight_kg       FLOAT NOT NULL,            -- Weight in kilograms
    age             INT NOT NULL,
    goal            VARCHAR(20) NOT NULL,       -- 'lose', 'gain', 'maintain'
    daily_budget    FLOAT NOT NULL,            -- Daily food budget (currency)
    bmi             FLOAT NOT NULL,            -- Calculated BMI
    calorie_target  INT NOT NULL,              -- Daily calorie target based on goal
    calories_consumed INT DEFAULT 0,           -- Running total for the day
    budget_used     FLOAT DEFAULT 0,           -- Running total spent today
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Food items table: predefined food dataset
CREATE TABLE IF NOT EXISTS food_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    calories    INT NOT NULL,                  -- Calories per serving
    cost        FLOAT NOT NULL,                -- Cost per serving
    category    VARCHAR(50) NOT NULL           -- protein, carbs, fruit, vegetable, dairy, fat
);

-- Meals log table: tracks what the user has eaten
CREATE TABLE IF NOT EXISTS meals_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    food_item   VARCHAR(100) NOT NULL,
    quantity    INT NOT NULL DEFAULT 1,
    total_calories INT NOT NULL,
    total_cost  FLOAT NOT NULL,
    logged_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed food items
INSERT INTO food_items (name, calories, cost, category) VALUES
    ('Egg', 70, 10, 'protein'),
    ('Rice (1 cup)', 200, 20, 'carbs'),
    ('Paneer (100g)', 300, 80, 'protein'),
    ('Chicken Breast (100g)', 165, 120, 'protein'),
    ('Dal (1 cup)', 150, 30, 'protein'),
    ('Roti', 120, 10, 'carbs'),
    ('Banana', 90, 5, 'fruit'),
    ('Apple', 95, 30, 'fruit'),
    ('Milk (1 glass)', 150, 25, 'dairy'),
    ('Oats (1 cup)', 180, 15, 'carbs'),
    ('Salad Bowl', 50, 40, 'vegetable'),
    ('Bread (1 slice)', 80, 5, 'carbs'),
    ('Yogurt (1 cup)', 100, 20, 'dairy'),
    ('Peanut Butter (2 tbsp)', 190, 35, 'fat'),
    ('Pasta (1 cup)', 220, 25, 'carbs'),
    ('Tofu (100g)', 80, 50, 'protein'),
    ('Sweet Potato', 100, 15, 'carbs'),
    ('Fish (100g)', 130, 100, 'protein'),
    ('Cheese (1 slice)', 110, 45, 'dairy'),
    ('Protein Shake', 250, 60, 'protein');
