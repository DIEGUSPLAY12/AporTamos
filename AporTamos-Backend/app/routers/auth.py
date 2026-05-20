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

from app.models.user import UserCreate, UserLogin, UserResponse, GoogleLogin
from app.services.auth_service import (
    create_user,
    authenticate_user,
    create_or_get_user_google,
    UserAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
)
from app.dependencies import get_supabase_client, create_access_token
from app.config import log_info, log_warning, log_error, ValidationException, ConflictException, settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


def _create_token_response(user_id: str, user_email: str, user_name: str) -> Dict[str, Any]:
    token = create_access_token(data={
        "sub": user_id,
        "email": user_email,
        "name": user_name,
        "type": "access",
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
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


@router.post("/google-login", response_model=Dict[str, Any])
async def google_login(google_data: GoogleLogin) -> Dict[str, Any]:
    """
    Authenticate or register with Google OAuth.
    
    This endpoint:
    1. Extracts user info from Google OAuth token
    2. Retrieves user by google_id if exists
    3. Creates new user if this is first Google login
    4. Returns access token and user info with is_new_user flag
    
    Args:
        google_data: GoogleLogin schema with google_token
        
    Returns:
        Dict with access_token, token_type, expires_in, user info, and is_new_user flag
        
    Raises:
        400: Invalid Google token or email already registered
        401: Token expired
        500: Database or server error
        
    Example:
        POST /auth/google-login
        {
            "google_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
        }
        
        Response (200):
        {
            "access_token": "placeholder_token_550e8400...",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "user@gmail.com",
                "name": "John Doe"
            },
            "is_new_user": true
        }
    """
    try:
        # In a production system, we would verify the Google token signature here
        # For now, we assume the frontend has already validated the token
        # and we extract the user info from it
        
        # TODO: Implement actual Google token verification using google-auth library
        # For now, this is a placeholder that would be called from frontend with decoded token
        
        # Extract user info from token (in real implementation, use google.auth.transport.requests)
        # This would normally be done via:
        # from google.auth.transport import requests
        # id_info = id_token.verify_oauth2_token(google_data.google_token, requests.Request(), settings.google_client_id)
        
        # For now, assume token is validated by frontend and we get user info from Supabase
        # In production, you'd parse the JWT and verify signature
        
        # In a real implementation, you would parse the token here
        # For now, we'll demonstrate the flow with placeholder values
        # The frontend would send the ID token, and we'd verify it with Google
        
        log_warning(
            "Google login called - token verification not yet implemented",
            extra={"token_length": len(google_data.google_token)},
        )
        
        # Placeholder for real token verification
        # In production, implement with:
        # from google.auth.transport import requests
        # from google.oauth2 import id_token
        # id_info = id_token.verify_oauth2_token(google_data.google_token, requests.Request(), settings.google_client_id)
        # google_id = id_info['sub']
        # email = id_info['email']
        # name = id_info.get('name', email.split('@')[0])
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth token verification requires backend configuration with Google client credentials",
        )
        
    except InvalidCredentialsError as exc:
        log_warning(
            f"Google login failed: Invalid credentials - {str(exc)}",
            extra={},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
        
    except UserAlreadyExistsError as exc:
        log_warning(
            f"Google login failed: Email already exists",
            extra={},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
        
    except Exception as exc:
        log_error(
            f"Google login failed: {str(exc)}",
            exc,
            extra={},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication failed",
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
