"""
API Routers for AporTamos Backend

This package contains all API route modules that define FastAPI endpoints.

Routers:
- auth: Authentication endpoints (register, login, logout, etc.)
- households: Household management endpoints (create, invite, join, manage members)
"""

from app.routers.auth import router as auth_router
from app.routers.households import router as households_router

__all__ = [
    "auth_router",
    "households_router",
]
