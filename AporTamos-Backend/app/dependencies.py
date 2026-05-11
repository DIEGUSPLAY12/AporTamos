"""
Supabase client initialization and dependency injection for FastAPI.

This module provides:
- Supabase client singleton instance
- Database connection management
- Async context managers for transactions
- Dependency injection for FastAPI endpoints
- Error handling and logging
"""

from typing import AsyncGenerator, Optional, TYPE_CHECKING
import logging

from fastapi import Depends, HTTPException, status

from app.config import settings, log_debug, log_error, log_info, DatabaseException

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
            _supabase_client = create_client(
                supabase_url=settings.supabase_url,
                supabase_key=settings.supabase_key
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


def get_current_user(token: str) -> dict:
    """
    Extract current user from JWT token (placeholder for token verification).
    
    This will be implemented in the authentication service.
    Currently, this is a placeholder that will be replaced with actual
    token verification logic.
    
    Args:
        token: JWT token from Authorization header
        
    Returns:
        dict: Decoded token with user information
        
    Raises:
        HTTPException: If token is invalid
    """
    # TODO: Implement JWT token verification with secret_key from settings
    # This should:
    # 1. Decode the JWT token using settings.secret_key
    # 2. Verify token expiration
    # 3. Extract user_id and other claims
    # 4. Return decoded token payload
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required"
    )


async def get_current_user_id(supabase: Client = Depends(get_supabase)) -> str:
    """
    Get the current authenticated user's ID from Supabase auth.
    
    Usage:
        @app.get("/me")
        async def get_current_user_profile(user_id: str = Depends(get_current_user_id)):
            # user_id is guaranteed to be from authenticated user
            ...
    
    Args:
        supabase: Supabase client from dependency injection
        
    Returns:
        str: UUID of the current authenticated user
        
    Raises:
        HTTPException: If user is not authenticated
    """
    # TODO: This will use Supabase Auth session
    # Implementation will extract user_id from supabase.auth.get_session()
    # and verify it matches the JWT token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="User not authenticated"
    )


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
