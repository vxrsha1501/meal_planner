-- ============================================
-- AI Budget-Aware Lifestyle Planner
-- MySQL Database Schema (v2 — with auth)
-- ============================================

CREATE DATABASE IF NOT EXISTS meal_planner;
USE meal_planner;

-- Authentication credentials
CREATE TABLE IF NOT EXISTS users_auth (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(256) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profile + default budget
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    auth_id         INT NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    height_cm       FLOAT NOT NULL,
    weight_kg       FLOAT NOT NULL,
    age             INT NOT NULL,
    goal            VARCHAR(20) NOT NULL,          -- 'lose', 'gain', 'maintain'
    target_weight   FLOAT DEFAULT NULL,            -- Only for lose/gain
    default_budget  FLOAT NOT NULL,                -- Default daily food budget
    bmi             FLOAT NOT NULL,
    calorie_target  INT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (auth_id) REFERENCES users_auth(id) ON DELETE CASCADE
);

-- Food items dataset
CREATE TABLE IF NOT EXISTS food_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    calories    INT NOT NULL,
    cost        FLOAT NOT NULL,
    protein     FLOAT NOT NULL DEFAULT 0,
    category    VARCHAR(50) NOT NULL,
    is_custom   BOOLEAN DEFAULT FALSE,
    created_by  INT DEFAULT NULL,
    FOREIGN KEY (created_by) REFERENCES users_auth(id) ON DELETE SET NULL
);

-- Meals log — tracks what the user has eaten
CREATE TABLE IF NOT EXISTS meals_log (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    food_item       VARCHAR(100) NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    meal_type       VARCHAR(20) NOT NULL,          -- 'breakfast', 'lunch', 'dinner'
    total_calories  INT NOT NULL,
    total_cost      FLOAT NOT NULL,
    total_protein   FLOAT NOT NULL DEFAULT 0,
    logged_date     DATE NOT NULL,
    logged_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
);

-- Workout log
CREATE TABLE IF NOT EXISTS workout_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    activity    VARCHAR(100) NOT NULL,
    duration    VARCHAR(50) NOT NULL,
    description TEXT,
    logged_date DATE NOT NULL,
    logged_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
);

-- Daily budget overrides
CREATE TABLE IF NOT EXISTS daily_budget (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    budget_date DATE NOT NULL,
    amount      FLOAT NOT NULL,
    UNIQUE KEY unique_user_date (user_id, budget_date),
    FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
);
