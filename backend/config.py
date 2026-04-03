"""
Configuration for the Flask application.
Supports MySQL (primary) and SQLite (fallback for quick local dev).
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "hackathon-secret-key-2026")

    # MySQL connection (default)
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "meal_planner")

    # Use SQLite if USE_SQLITE=true (for quick local testing without MySQL)
    USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"

    @property
    def SQLALCHEMY_DATABASE_URI(self):
        if self.USE_SQLITE:
            return "sqlite:///meal_planner.db"
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Session config
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
