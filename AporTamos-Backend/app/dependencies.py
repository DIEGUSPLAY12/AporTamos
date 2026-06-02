"""
Supabase client initialization, dependency injection, and error handling middleware for FastAPI.

This module provides:
- Supabase client singleton instance
- Database connection management
- Async context managers for transactions
- Dependency injection for FastAPI endpoints
- JWT token handling and verification
- Token refresh logic
- Bearer token validation middleware
- Authentication error handling with appropriate HTTP codes
- Error handling and logging
- Error handling middleware and decorators for endpoint protection
- Request error handling utilities
"""

from __future__ import annotations  # lazy annotations: TYPE_CHECKING-only types (e.g. Client) won't error at runtime

from typing import AsyncGenerator, Callable, Optional, TYPE_CHECKING, Dict, Any
import logging
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Header

from app.config import (
    settings,
    log_debug,
    log_error,
    log_info,
    log_warning,
    DatabaseException,
    ValidationException,
    AuthenticationException,
    AuthorizationException,
    ResourceNotFoundException,
    ConflictException,
    RateLimitException,
)

# Type checking imports to avoid circular imports with httpcore issues
if TYPE_CHECKING:
    from supabase import Client

# Global Supabase client instance
_supabase_client: Optional["Client"] = None


def get_supabase_client() -> "Client":
    """
    Get or create the Supabase client instance.
    
    Returns:
        Client: Authenticated Supabase client
        
    Raises:
        DatabaseException: If Supabase is not configured
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not settings.supabase_url or not settings.supabase_key:
            raise DatabaseException(
                "Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY environment variables.",
                operation="client_initialization"
            )
        
        try:
            # Lazy import to avoid httpcore issues
            from supabase import create_client
            
            log_debug("Initializing Supabase client", extra={"url": settings.supabase_url[:20]})
            # Use service role key to bypass RLS — the backend enforces auth itself via JWT
            key = settings.supabase_service_role_key or settings.supabase_key
            _supabase_client = create_client(
                supabase_url=settings.supabase_url,
                supabase_key=key
            )
            log_info("Supabase client initialized successfully", extra={})
        except Exception as exc:
            log_error("Failed to initialize Supabase client", exc, extra={})
            raise DatabaseException(
                f"Failed to initialize Supabase client: {str(exc)}",
                operation="client_initialization"
            ) from exc
    
    return _supabase_client


async def get_supabase() -> AsyncGenerator["Client", None]:
    """
    FastAPI dependency for Supabase client.
    
    Usage:
        @app.get("/households")
        async def list_households(supabase: Client = Depends(get_supabase)):
            response = supabase.table("households").select("*").execute()
            return response.data
    
    Yields:
        Client: Supabase client instance
    """
    client = get_supabase_client()
    yield client


async def get_database_session() -> AsyncGenerator[Client, None]:
    """
    FastAPI dependency for database session (alias for get_supabase).
    
    Usage:
        @app.get("/users/{user_id}")
        async def get_user(user_id: str, db: Client = Depends(get_database_session)):
            response = db.table("users").select("*").eq("id", user_id).single().execute()
            return response.data
    
    Yields:
        Client: Supabase client instance
    """
    async for client in get_supabase():
        yield client


# JWT Token Handling

def extract_token_from_header(authorization: Optional[str]) -> str:
    """
    Extract JWT token from Authorization header.
    
    Args:
        authorization: Authorization header value (format: "Bearer <token>")
        
    Returns:
        str: JWT token
        
    Raises:
        HTTPException: If token is missing or malformed
    """
    if not authorization:
        log_warning(
            "Missing authorization header",
            extra={"operation": "extract_token"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Authorization header should be "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        log_warning(
            "Invalid authorization header format",
            extra={
                "operation": "extract_token",
                "format": "Expected 'Bearer <token>'"
            }
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return parts[1]


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    Verify and decode a JWT token.
    
    Validates:
    - Token signature using configured secret_key
    - Token expiration (exp claim)
    - Token algorithm
    
    Args:
        token: JWT token string
        
    Returns:
        dict: Decoded token payload with claims
        
    Raises:
        HTTPException: If token is invalid, expired, or malformed
    """
    try:
        # Decode and verify token signature
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        
        log_debug(
            "JWT token verified successfully",
            extra={
                "operation": "verify_jwt_token",
                "user_id": payload.get("sub"),
                "token_type": payload.get("type")
            }
        )
        
        return payload
        
    except JWTError as exc:
        log_warning(
            "JWT token verification failed",
            extra={
                "operation": "verify_jwt_token",
                "error": str(exc),
                "error_type": type(exc).__name__
            }
        )
        
        # Provide specific error messages for different JWT errors
        if "expired" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Access token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        elif "signature" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token signature",
                headers={"WWW-Authenticate": "Bearer"},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid access token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as exc:
        log_error(
            "Unexpected error during JWT verification",
            exc,
            extra={"operation": "verify_jwt_token"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a new JWT access token.
    
    Encodes the provided data with optional expiration.
    
    Args:
        data: Dictionary of claims to encode
        expires_delta: Optional expiration time (default: access_token_expire_minutes)
        
    Returns:
        str: Encoded JWT token
        
    Raises:
        Exception: If token creation fails
    """
    to_encode = data.copy()
    
    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    
    try:
        encoded_jwt = jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm=settings.algorithm
        )
        
        log_debug(
            "JWT access token created",
            extra={
                "operation": "create_access_token",
                "user_id": data.get("sub"),
                "expires_at": expire.isoformat()
            }
        )
        
        return encoded_jwt
    except Exception as exc:
        log_error(
            "Failed to create access token",
            exc,
            extra={"operation": "create_access_token"}
        )
        raise


def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Extract and verify current user from JWT token in Authorization header.
    
    This dependency verifies:
    - Authorization header is present and properly formatted
    - JWT token is valid and not expired
    - Token signature matches configured secret key
    
    Returns the decoded token payload containing user claims.
    
    Usage:
        @app.get("/me")
        async def get_current_user_profile(current_user = Depends(get_current_user)):
            return {
                "user_id": current_user["sub"],
                "email": current_user.get("email"),
                "token_type": current_user.get("type")
            }
    
    Args:
        authorization: Authorization header from request
        
    Returns:
        dict: Decoded JWT token payload with claims including:
            - sub: User ID (UUID)
            - email: User email address
            - type: Token type (e.g., "access")
            - exp: Token expiration timestamp
            - iat: Token issued-at timestamp
        
    Raises:
        HTTPException: 
            - 401 if Authorization header is missing
            - 401 if token format is invalid
            - 401 if token is expired
            - 401 if token signature is invalid
    """
    token = extract_token_from_header(authorization)
    return verify_jwt_token(token)


async def get_current_user_id(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> str:
    """
    Get the current authenticated user's ID from JWT token.
    
    Extracts the 'sub' (subject) claim from the verified JWT token,
    which contains the user's UUID.
    
    Usage:
        @app.get("/me")
        async def get_current_user_profile(user_id: str = Depends(get_current_user_id)):
            # user_id is guaranteed to be from authenticated user
            ...
    
    Args:
        current_user: Verified JWT token payload from get_current_user
        
    Returns:
        str: UUID of the current authenticated user
        
    Raises:
        HTTPException: 
            - 401 if user_id claim is missing from token
            - 401 if user_id is not a valid UUID
    """
    user_id = current_user.get("sub")
    
    if not user_id:
        log_warning(
            "User ID missing from JWT token",
            extra={"operation": "get_current_user_id"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    log_debug(
        "Current user ID extracted from token",
        extra={
            "operation": "get_current_user_id",
            "user_id": user_id
        }
    )
    
    return user_id


# Database helper functions

async def query_single(
    supabase: Client,
    table: str,
    filters: dict,
    select: str = "*"
) -> dict:
    """
    Query a single record from a table.
    
    Args:
        supabase: Supabase client
        table: Table name
        filters: Dictionary of column:value filters
        select: Columns to select (default: "*")
        
    Returns:
        dict: Single record or None
        
    Raises:
        DatabaseException: If query fails
    """
    try:
        query = supabase.table(table).select(select)
        
        for column, value in filters.items():
            query = query.eq(column, value)
        
        response = query.single().execute()
        return response.data
    except Exception as exc:
        log_error(
            f"Database query failed on table {table}",
            exc,
            extra={"table": table, "filters": filters}
        )
        raise DatabaseException(
            f"Failed to query {table}: {str(exc)}",
            operation=f"select_{table}"
        ) from exc


async def query_multiple(
    supabase: Client,
    table: str,
    filters: Optional[dict] = None,
    select: str = "*",
    order_by: Optional[str] = None,
    limit: Optional[int] = None
) -> list:
    """
    Query multiple records from a table.
    
    Args:
        supabase: Supabase client
        table: Table name
        filters: Dictionary of column:value filters (optional)
        select: Columns to select (default: "*")
        order_by: Column to order by (optional)
        limit: Maximum records to return (optional)
        
    Returns:
        list: Records matching the filters
        
    Raises:
        DatabaseException: If query fails
    """
    try:
        query = supabase.table(table).select(select)
        
        if filters:
            for column, value in filters.items():
                query = query.eq(column, value)
        
        if order_by:
            query = query.order(order_by)
        
        if limit:
            query = query.limit(limit)
        
        response = query.execute()
        return response.data if response.data else []
    except Exception as exc:
        log_error(
            f"Database query failed on table {table}",
            exc,
            extra={"table": table, "filters": filters}
        )
        raise DatabaseException(
            f"Failed to query {table}: {str(exc)}",
            operation=f"select_multiple_{table}"
        ) from exc


async def insert_record(
    supabase: Client,
    table: str,
    data: dict,
    return_inserted: bool = True
) -> dict:
    """
    Insert a single record into a table.
    
    Args:
        supabase: Supabase client
        table: Table name
        data: Dictionary of column:value pairs
        return_inserted: Return the inserted record (default: True)
        
    Returns:
        dict: Inserted record data
        
    Raises:
        DatabaseException: If insert fails
    """
    try:
        response = supabase.table(table).insert(data, return_inserted="representation" if return_inserted else "minimal").execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        log_error(
            f"Database insert failed on table {table}",
            exc,
            extra={"table": table}
        )
        raise DatabaseException(
            f"Failed to insert into {table}: {str(exc)}",
            operation=f"insert_{table}"
        ) from exc


async def update_record(
    supabase: Client,
    table: str,
    filters: dict,
    data: dict,
    return_updated: bool = True
) -> dict:
    """
    Update records in a table.
    
    Args:
        supabase: Supabase client
        table: Table name
        filters: Dictionary of column:value filters (WHERE clause)
        data: Dictionary of column:value pairs to update
        return_updated: Return updated records (default: True)
        
    Returns:
        dict or list: Updated record(s)
        
    Raises:
        DatabaseException: If update fails
    """
    try:
        query = supabase.table(table).update(data)
        
        for column, value in filters.items():
            query = query.eq(column, value)
        
        response = query.execute()
        return response.data
    except Exception as exc:
        log_error(
            f"Database update failed on table {table}",
            exc,
            extra={"table": table, "filters": filters}
        )
        raise DatabaseException(
            f"Failed to update {table}: {str(exc)}",
            operation=f"update_{table}"
        ) from exc


async def delete_record(
    supabase: Client,
    table: str,
    filters: dict
) -> bool:
    """
    Delete records from a table.
    
    Args:
        supabase: Supabase client
        table: Table name
        filters: Dictionary of column:value filters (WHERE clause)
        
    Returns:
        bool: True if deletion was successful
        
    Raises:
        DatabaseException: If deletion fails
    """
    try:
        query = supabase.table(table).delete()
        
        for column, value in filters.items():
            query = query.eq(column, value)
        
        response = query.execute()
        return response.status_code == 204
    except Exception as exc:
        log_error(
            f"Database delete failed on table {table}",
            exc,
            extra={"table": table, "filters": filters}
        )
        raise DatabaseException(
            f"Failed to delete from {table}: {str(exc)}",
            operation=f"delete_{table}"
        ) from exc


# RLS (Row-Level Security) context helpers

async def set_rls_context(
    supabase: Client,
    user_id: str
) -> None:
    """
    Set the RLS context for the current user.
    
    This tells Supabase to apply row-level security policies
    based on the user_id claim in the JWT token.
    
    Args:
        supabase: Supabase client
        user_id: Current user's UUID
    """
    # TODO: Implement RLS context setting
    # This would typically involve:
    # 1. Verifying user_id matches authenticated user
    # 2. Setting session variables for RLS policies
    pass


# Error Handling Middleware

class ErrorContext:
    """
    Context manager for error handling in endpoint handlers.
    
    Automatically catches exceptions and wraps them in appropriate
    AporTamos exceptions with proper logging.
    
    Usage:
        async def get_user(user_id: str, supabase: Client = Depends(get_supabase)):
            async with ErrorContext("fetch_user"):
                response = supabase.table("users").select("*").eq("id", user_id).single().execute()
                return response.data
    """
    
    def __init__(self, operation: str, extra_context: Optional[dict] = None):
        """
        Initialize error context.
        
        Args:
            operation: Name of the operation being performed
            extra_context: Additional context to log with errors
        """
        self.operation = operation
        self.extra_context = extra_context or {}
    
    async def __aenter__(self):
        """Enter async context."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """
        Exit async context and handle exceptions.
        
        Args:
            exc_type: Exception type
            exc_val: Exception value
            exc_tb: Exception traceback
            
        Returns:
            False to propagate exception, True to suppress
        """
        if exc_type is None:
            return False
        
        # Already an AporTamos exception, just log and propagate
        if issubclass(exc_type, Exception) and hasattr(exc_val, 'error_code'):
            log_warning(
                f"Operation failed: {self.operation}",
                extra={
                    "operation": self.operation,
                    "error": str(exc_val),
                    **self.extra_context
                }
            )
            return False
        
        # Unexpected exception, wrap and log
        log_error(
            f"Unexpected error during {self.operation}",
            exc_val,
            extra={
                "operation": self.operation,
                **self.extra_context
            }
        )
        
        return False


async def handle_database_operation(
    operation: str,
    func,
    *args,
    **kwargs
):
    """
    Wrap a database operation with error handling.
    
    Args:
        operation: Name of the operation
        func: Async function to execute
        *args: Positional arguments for func
        **kwargs: Keyword arguments for func
        
    Returns:
        Result of func execution
        
    Raises:
        DatabaseException: If operation fails
    """
    try:
        return await func(*args, **kwargs)
    except Exception as exc:
        log_error(
            f"Database operation failed: {operation}",
            exc,
            extra={"operation": operation}
        )
        if isinstance(exc, DatabaseException):
            raise
        raise DatabaseException(
            f"Failed to execute {operation}: {str(exc)}",
            operation=operation
        ) from exc


def wrap_endpoint_error_handling(operation: str):
    """
    Decorator to wrap endpoint handlers with error handling.
    
    Catches unexpected exceptions and wraps them appropriately,
    while allowing AporTamos exceptions to propagate normally.
    
    Args:
        operation: Name of the operation being performed
        
    Returns:
        Decorator function
        
    Usage:
        @app.get("/users/{user_id}")
        @wrap_endpoint_error_handling("get_user")
        async def get_user(user_id: str, supabase: Client = Depends(get_supabase)):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as exc:
                # Let AporTamos exceptions propagate normally
                if isinstance(exc, Exception) and hasattr(exc, 'error_code'):
                    raise
                
                # Log and wrap unexpected exceptions
                log_error(
                    f"Endpoint error: {operation}",
                    exc,
                    extra={"operation": operation}
                )
                
                # Return generic internal error for unexpected exceptions
                raise DatabaseException(
                    f"Failed to complete {operation}",
                    operation=operation
                ) from exc
        
        return wrapper
    return decorator


class RequestErrorHandler:
    """
    Dependency class for endpoint-level error handling.
    
    Provides structured error handling for individual endpoints.
    
    Usage:
        @app.get("/data")
        async def get_data(error_handler: RequestErrorHandler = Depends()):
            try:
                # ... operation ...
                pass
            except Exception as exc:
                return error_handler.handle(exc, "fetch_data")
    """
    
    @staticmethod
    def handle(
        exc: Exception,
        operation: str,
        status_code: int = 500
    ) -> HTTPException:
        """
        Handle an exception and return appropriate HTTPException.
        
        Args:
            exc: Exception to handle
            operation: Name of the operation that failed
            status_code: HTTP status code (default: 500)
            
        Returns:
            HTTPException for the endpoint to return
        """
        log_error(
            f"Request error during {operation}",
            exc,
            extra={"operation": operation}
        )
        
        # Map AporTamos exceptions to HTTP responses
        if isinstance(exc, DatabaseException):
            return HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {exc.operation}"
            )
        elif isinstance(exc, ValidationException):
            return HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation error: {exc.message}"
            )
        elif isinstance(exc, AuthenticationException):
            return HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=exc.message
            )
        elif isinstance(exc, AuthorizationException):
            return HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=exc.message
            )
        elif isinstance(exc, ResourceNotFoundException):
            return HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=exc.message
            )
        elif isinstance(exc, ConflictException):
            return HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=exc.message
            )
        elif isinstance(exc, RateLimitException):
            return HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=exc.message
            )
        else:
            # Unexpected exception
            return HTTPException(
                status_code=status_code,
                detail="An unexpected error occurred"
            )


# Bearer Token Validation Middleware

async def validate_bearer_token(
    authorization: Optional[str] = Header(None)
) -> Optional[str]:
    """
    Optional bearer token validation dependency.
    
    Returns the token if present and valid, None if not present.
    Used for endpoints that accept but don't require authentication.
    
    Usage:
        @app.get("/public-data")
        async def get_public_data(token = Depends(validate_bearer_token)):
            # token is None if not provided, or the token string if provided
            if token:
                current_user = verify_jwt_token(token)
                # Use authenticated user data
            else:
                # Use public data
    
    Args:
        authorization: Authorization header from request
        
    Returns:
        str: JWT token if valid and present
        None: If Authorization header is not provided
        
    Raises:
        HTTPException: 401 if Authorization header is malformed or token is invalid
    """
    if not authorization:
        return None
    
    try:
        token = extract_token_from_header(authorization)
        # Verify token is valid
        verify_jwt_token(token)
        log_debug(
            "Bearer token validated successfully",
            extra={"operation": "validate_bearer_token"}
        )
        return token
    except HTTPException:
        # Re-raise HTTPException from token extraction/verification
        raise
    except Exception as exc:
        log_error(
            "Unexpected error during bearer token validation",
            exc,
            extra={"operation": "validate_bearer_token"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_bearer_token(
    authorization: Optional[str] = Header(None)
) -> str:
    """
    Enforce bearer token validation dependency.
    
    Returns the validated token or raises 401.
    Used for protected endpoints that require authentication.
    
    Usage:
        @app.get("/protected")
        async def get_protected_data(token = Depends(require_bearer_token)):
            # token is guaranteed to be valid
            # 401 will be raised if no token or invalid token
    
    Args:
        authorization: Authorization header from request
        
    Returns:
        str: Validated JWT token string
        
    Raises:
        HTTPException: 
            - 401 if Authorization header is missing
            - 401 if token format is invalid
            - 401 if token is expired or invalid
    """
    token = extract_token_from_header(authorization)
    verify_jwt_token(token)
    
    log_debug(
        "Bearer token requirement satisfied",
        extra={"operation": "require_bearer_token"}
    )
    
    return token


class BearerTokenMiddleware:
    """
    Middleware for bearer token validation on specific routes.
    
    This middleware class can be extended to validate bearer tokens
    on a per-route basis, providing flexibility in which endpoints
    require authentication.
    
    Features:
    - Optional validation (returns None if token not provided)
    - Required validation (raises 401 if token not provided)
    - Token verification on each request
    - Comprehensive logging of validation attempts
    - Error recovery for invalid tokens
    
    Usage:
        As a dependency for optional auth:
        @app.get("/endpoint")
        async def endpoint(token = Depends(validate_bearer_token)):
            if token:
                # Token is valid
                ...
        
        As a dependency for required auth:
        @app.get("/protected")
        async def protected(token = Depends(require_bearer_token)):
            # Token is guaranteed to be valid
            ...
    """
    
    @staticmethod
    def is_protected_route(path: str, method: str = "GET") -> bool:
        """
        Determine if a route requires bearer token validation.
        
        Can be customized to define which routes need authentication.
        By default, all endpoints except /auth/* require tokens.
        
        Args:
            path: Request path
            method: HTTP method
            
        Returns:
            bool: True if route requires authentication
        """
        # Allow public endpoints
        if path.startswith("/auth/"):
            return False
        if path == "/health":
            return False
        if path == "/status":
            return False
        if path == "/":
            return False
        
        # All other routes require authentication
        return True
    
    @staticmethod
    def get_bearer_token(authorization: Optional[str]) -> Optional[str]:
        """
        Extract bearer token from Authorization header if present.
        
        Args:
            authorization: Authorization header value
            
        Returns:
            str: Extracted token
            None: If no Authorization header
            
        Raises:
            HTTPException: If format is invalid
        """
        if not authorization:
            return None
        
        try:
            return extract_token_from_header(authorization)
        except HTTPException as exc:
            # Re-raise auth errors
            raise
        except Exception as exc:
            log_error(
                "Error extracting bearer token",
                exc,
                extra={"operation": "get_bearer_token"}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authorization header",
                headers={"WWW-Authenticate": "Bearer"},
            )


def create_bearer_validation_dependency(required: bool = True):
    """
    Factory function to create bearer token validation dependencies.
    
    Allows creating custom dependencies with flexible requirements.
    
    Args:
        required: If True, token is mandatory. If False, token is optional.
        
    Returns:
        Dependency function for use with FastAPI Depends()
        
    Usage:
        # Create optional auth dependency
        optional_auth = create_bearer_validation_dependency(required=False)
        
        @app.get("/public")
        async def public_endpoint(token = Depends(optional_auth)):
            if token:
                # Use authenticated user data
                ...
        
        # Create required auth dependency
        required_auth = create_bearer_validation_dependency(required=True)
        
        @app.get("/protected")
        async def protected_endpoint(token = Depends(required_auth)):
            # token is guaranteed to be present
            ...
    """
    if required:
        return require_bearer_token
    else:
        return validate_bearer_token


# Authentication Error Handling

class AuthenticationErrorHandler:
    """
    Comprehensive error handler for authentication failures.
    
    Provides centralized error handling for common auth failure scenarios with
    proper HTTP status codes, error messages, and audit logging.
    
    Supports:
    - Invalid credentials (wrong password)
    - User not found
    - Email already exists (during registration)
    - Invalid email format
    - Weak password
    - Account locked (future)
    - Token validation failures
    
    Usage:
        from app.services.auth_service import UserAlreadyExistsError, InvalidCredentialsError
        
        handler = AuthenticationErrorHandler()
        
        try:
            user = create_user(user_data)
        except UserAlreadyExistsError as exc:
            raise handler.handle_user_exists(exc)
        except ValueError as exc:
            raise handler.handle_validation_error(exc)
    """
    
    @staticmethod
    def handle_user_exists(exc: Exception, email: Optional[str] = None) -> HTTPException:
        """
        Handle "user already exists" error (email already registered).
        
        Args:
            exc: Original exception
            email: User email for logging (optional)
            
        Returns:
            HTTPException with 409 Conflict status
        """
        log_warning(
            "Registration failed: user already exists",
            extra={
                "email": email,
                "error": str(exc),
                "operation": "register"
            }
        )
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email already registered. Please log in or use a different email.",
        )
    
    @staticmethod
    def handle_invalid_credentials(exc: Exception, email: Optional[str] = None) -> HTTPException:
        """
        Handle invalid credentials error (wrong password or email/password mismatch).
        
        Args:
            exc: Original exception
            email: User email for logging (optional)
            
        Returns:
            HTTPException with 401 Unauthorized status
        """
        log_warning(
            "Login failed: invalid credentials",
            extra={
                "email": email,
                "error": str(exc),
                "operation": "login"
            }
        )
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials and try again.",
        )
    
    @staticmethod
    def handle_user_not_found(exc: Exception, email: Optional[str] = None) -> HTTPException:
        """
        Handle user not found error.
        
        Args:
            exc: Original exception
            email: User email for logging (optional)
            
        Returns:
            HTTPException with 401 Unauthorized status (generic for security)
        """
        log_warning(
            "Login failed: user not found",
            extra={
                "email": email,
                "error": str(exc),
                "operation": "login"
            }
        )
        # Return 401 instead of 404 to avoid revealing whether email exists
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials and try again.",
        )
    
    @staticmethod
    def handle_validation_error(exc: Exception, field: Optional[str] = None, email: Optional[str] = None) -> HTTPException:
        """
        Handle validation error (invalid email format, weak password, etc).
        
        Args:
            exc: Original exception
            field: Field that failed validation (optional)
            email: User email for logging (optional)
            
        Returns:
            HTTPException with 422 Unprocessable Entity status
        """
        error_message = str(exc)
        
        log_warning(
            "Validation error",
            extra={
                "email": email,
                "field": field,
                "error": error_message,
                "operation": "validation"
            }
        )
        
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation failed: {error_message}",
        )
    
    @staticmethod
    def handle_account_locked(exc: Exception, email: Optional[str] = None) -> HTTPException:
        """
        Handle account locked error (too many failed login attempts).
        
        Args:
            exc: Original exception
            email: User email for logging (optional)
            
        Returns:
            HTTPException with 429 Too Many Requests status
        """
        log_warning(
            "Account locked: too many failed login attempts",
            extra={
                "email": email,
                "error": str(exc),
                "operation": "login"
            }
        )
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to too many failed login attempts. Please try again later.",
        )
    
    @staticmethod
    def handle_token_error(exc: Exception) -> HTTPException:
        """
        Handle token-related error (invalid, expired, malformed).
        
        Args:
            exc: Original exception
            
        Returns:
            HTTPException with 401 Unauthorized status
        """
        log_warning(
            "Token validation failed",
            extra={
                "error": str(exc),
                "operation": "token_validation"
            }
        )
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    @staticmethod
    def handle_oauth_error(exc: Exception, provider: str = "OAuth") -> HTTPException:
        """
        Handle OAuth provider error (invalid token, provider error, etc).
        
        Args:
            exc: Original exception
            provider: OAuth provider name (default: "OAuth")
            
        Returns:
            HTTPException with 400 or 401 status depending on error type
        """
        error_message = str(exc)
        
        if "expired" in error_message.lower():
            status_code = status.HTTP_401_UNAUTHORIZED
            detail = f"{provider} token expired. Please try authenticating again."
        elif "invalid" in error_message.lower():
            status_code = status.HTTP_400_BAD_REQUEST
            detail = f"Invalid {provider} token. Please ensure you're using a valid authentication token."
        else:
            status_code = status.HTTP_400_BAD_REQUEST
            detail = f"{provider} authentication failed. Please try again."
        
        log_warning(
            f"{provider} authentication error",
            extra={
                "error": error_message,
                "provider": provider,
                "operation": f"{provider.lower()}_login"
            }
        )
        
        return HTTPException(
            status_code=status_code,
            detail=detail,
        )
    
    @staticmethod
    def handle_generic_auth_error(exc: Exception, operation: str = "authentication") -> HTTPException:
        """
        Handle generic/unexpected authentication error.
        
        Args:
            exc: Original exception
            operation: Description of the operation (default: "authentication")
            
        Returns:
            HTTPException with 500 Internal Server Error status
        """
        log_error(
            f"Unexpected error during {operation}",
            exc,
            extra={"operation": operation}
        )
        
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during {operation}. Please try again later.",
        )


def create_auth_error_handler() -> AuthenticationErrorHandler:
    """
    Factory function to create an AuthenticationErrorHandler instance.
    
    Usage:
        handler = create_auth_error_handler()
        
        try:
            user = await authenticate_user(email, password)
        except InvalidCredentialsError as exc:
            raise handler.handle_invalid_credentials(exc, email=email)
    
    Returns:
        AuthenticationErrorHandler: Error handler instance
    """
    return AuthenticationErrorHandler()
