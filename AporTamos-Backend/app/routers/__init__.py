"""
API Routers for AporTamos Backend

This package contains all API route modules that define FastAPI endpoints.

Routers:
- auth: Authentication endpoints (register, login, logout, etc.)
"""

from app.routers.auth import router as auth_router

__all__ = [
    "auth_router",
]
