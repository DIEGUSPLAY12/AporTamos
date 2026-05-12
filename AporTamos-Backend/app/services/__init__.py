"""
Business Logic Services for AporTamos Backend

This package contains all service modules that encapsulate business logic,
database operations, and external integrations.

Services:
- auth_service: User authentication and password management
"""

from app.services.auth_service import (
    hash_password,
    verify_password,
    create_user,
    get_user_by_email,
    get_user_by_id,
    authenticate_user,
    authenticate_user_google,
    update_user,
    soft_delete_user,
    AuthenticationError,
    UserAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
)

__all__ = [
    # Auth service functions
    'hash_password',
    'verify_password',
    'create_user',
    'get_user_by_email',
    'get_user_by_id',
    'authenticate_user',
    'authenticate_user_google',
    'update_user',
    'soft_delete_user',
    # Auth service exceptions
    'AuthenticationError',
    'UserAlreadyExistsError',
    'InvalidCredentialsError',
    'UserNotFoundError',
]
