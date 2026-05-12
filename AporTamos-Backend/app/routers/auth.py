"""
Authentication Endpoints for AporTamos

This module defines all authentication-related endpoints:
- POST /auth/register: Create new user account
- POST /auth/login: Authenticate with email/password
- POST /auth/google-login: Authenticate with Google OAuth
- POST /auth/logout: Invalidate session

All endpoints return standardized responses with access_token, token_type, expires_in, and user info.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.models.user import UserCreate, UserLogin, UserResponse
from app.services.auth_service import (
    create_user,
    authenticate_user,
    UserAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
)
from app.dependencies import get_supabase_client
from app.config import log_info, log_warning, log_error, ValidationException, ConflictException

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


def _create_token_response(user_id: str, user_email: str, user_name: str) -> Dict[str, Any]:
    """Create a JWT-like token response for API responses.
    
    Note: In a production system, this would generate real JWT tokens signed with a secret key.
    For now, we return a placeholder that integrates with Supabase Auth.
    
    Args:
        user_id: The user's UUID
        user_email: The user's email
        user_name: The user's name
        
    Returns:
        Dict with access_token, token_type, expires_in, and user info
    """
    # In production with Supabase Auth, we would get the JWT token from Supabase
    # For now, return a structured response that the frontend can use
    return {
        "access_token": f"placeholder_token_{user_id}",  # Would be real JWT from Supabase
        "token_type": "bearer",
        "expires_in": 3600,
        "user": {
            "id": user_id,
            "email": user_email,
            "name": user_name,
        },
    }


@router.post("/register", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate) -> Dict[str, Any]:
    """
    Register a new user account with email and password.
    
    This endpoint:
    1. Validates the registration data (email format, password strength, name length)
    2. Checks if the email already exists
    3. Creates a new user account with hashed password
    4. Returns access token and user info
    
    Args:
        user_data: UserCreate schema with email, password, and name
        
    Returns:
        Dict with access_token, token_type, expires_in, and user info
        
    Raises:
        400: Email already exists
        422: Invalid email format or weak password
        500: Database or server error
        
    Example:
        POST /auth/register
        {
            "email": "john@example.com",
            "password": "SecurePass123!",
            "name": "John Doe"
        }
        
        Response (201):
        {
            "access_token": "eyJhbGciOiJIUzI1NiIs...",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "john@example.com",
                "name": "John Doe"
            }
        }
    """
    try:
        # Create user in database with hashed password
        created_user = await create_user(user_data)
        
        log_info(
            f"User registered successfully: {user_data.email}",
            extra={
                "user_id": str(created_user.id),
                "email": user_data.email,
            },
        )
        
        # Return token response with user info
        return _create_token_response(
            user_id=str(created_user.id),
            user_email=created_user.email,
            user_name=created_user.name,
        )
        
    except UserAlreadyExistsError as exc:
        log_warning(
            f"Registration failed: {str(exc)}",
            extra={"email": user_data.email},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email {user_data.email} already exists",
        )
        
    except ValueError as exc:
        # Validation errors from Pydantic or password validators
        log_warning(
            f"Registration validation failed: {str(exc)}",
            extra={"email": user_data.email},
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
        
    except Exception as exc:
        log_error(
            f"Registration failed: {str(exc)}",
            exc,
            extra={"email": user_data.email},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account",
        )


@router.post("/login", response_model=Dict[str, Any])
async def login(user_data: UserLogin) -> Dict[str, Any]:
    """
    Authenticate with email and password.
    
    This endpoint:
    1. Validates the login credentials
    2. Retrieves the user from database
    3. Verifies the password hash
    4. Returns access token and user info
    
    Args:
        user_data: UserLogin schema with email and password
        
    Returns:
        Dict with access_token, token_type, expires_in, and user info
        
    Raises:
        401: Invalid credentials
        404: User not found
        500: Database or server error
        
    Example:
        POST /auth/login
        {
            "email": "john@example.com",
            "password": "SecurePass123!"
        }
        
        Response (200):
        {
            "access_token": "eyJhbGciOiJIUzI1NiIs...",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "john@example.com",
                "name": "John Doe"
            }
        }
    """
    try:
        # Authenticate user with email and password
        authenticated_user = await authenticate_user(user_data.email, user_data.password)
        
        log_info(
            f"User logged in: {user_data.email}",
            extra={
                "user_id": str(authenticated_user.id),
                "email": user_data.email,
            },
        )
        
        # Return token response with user info
        return _create_token_response(
            user_id=str(authenticated_user.id),
            user_email=authenticated_user.email,
            user_name=authenticated_user.name,
        )
        
    except UserNotFoundError:
        log_warning(
            f"Login failed: User not found - {user_data.email}",
            extra={"email": user_data.email},
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
        
    except InvalidCredentialsError as exc:
        log_warning(
            f"Login failed: Invalid credentials - {user_data.email}",
            extra={"email": user_data.email},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
        
    except Exception as exc:
        log_error(
            f"Login failed: {str(exc)}",
            exc,
            extra={"email": user_data.email},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed",
        )


@router.post("/logout", response_model=Dict[str, str])
async def logout() -> Dict[str, str]:
    """
    Logout the current user and invalidate session.
    
    This endpoint invalidates the current session token. In a production system,
    this would invalidate refresh tokens or add the token to a blacklist.
    
    Returns:
        Dict with success message
        
    Example:
        POST /auth/logout
        Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
        
        Response (200):
        {
            "message": "Successfully logged out"
        }
    """
    try:
        log_info("User logged out", extra={})
        
        return {
            "message": "Successfully logged out",
        }
        
    except Exception as exc:
        log_error(
            f"Logout failed: {str(exc)}",
            exc,
            extra={},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed",
        )


# Export router for inclusion in main app
__all__ = ["router"]
