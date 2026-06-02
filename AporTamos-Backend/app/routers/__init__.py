"""
API Routers for AporTamos Backend

This package contains all API route modules that define FastAPI endpoints.

Routers:
- auth: Authentication endpoints (register, login, logout, etc.)
- households: Household management endpoints (create, invite, join, manage members)
- tasks: Task schedule endpoints (create, update, manage weekly schedules)
- completions: Task completion endpoints (mark complete with photo proof)
- stats: Statistics and gamification endpoints (completion %, streaks, member stats)
"""

from app.routers.auth import router as auth_router
from app.routers.households import router as households_router
from app.routers.tasks import router as tasks_router
from app.routers.completions import router as completions_router
from app.routers.stats import router as stats_router
from app.routers.chat import router as chat_router

__all__ = [
    "auth_router",
    "households_router",
    "tasks_router",
    "completions_router",
    "stats_router",
    "chat_router",
]
