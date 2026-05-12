"""
Authentication Service for AporTamos

Handles user authentication logic including password hashing, credential validation,
and user account management. Uses bcrypt via passlib for secure password storage.

This service is used by auth endpoints (register, login, logout) and provides
core authentication functionality for the application.

Functions:
- hash_password(): Securely hash a plaintext password
- verify_password(): Verify a plaintext password against a hash
- create_user(): Create new user account with hashed password
- get_user_by_email(): Retrieve user by email address
- get_user_by_id(): Retrieve user by ID
- authenticate_user(): Validate email/password credentials
- delete_user(): Soft delete a user account
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from passlib.context import CryptContext
from pydantic import EmailStr

from app.models.user import User, UserCreate, UserInDB
from app.dependencies import supabase_client


# Configure password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Base exception for authentication-related errors."""
    pass


class UserAlreadyExistsError(AuthenticationError):
    """Raised when attempting to create a user with an existing email."""
    pass


class InvalidCredentialsError(AuthenticationError):
    """Raised when login credentials are invalid."""
    pass


class UserNotFoundError(AuthenticationError):
    """Raised when a user cannot be found."""
    pass


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt.
    
    Args:
        password: The plaintext password to hash
        
    Returns:
        The bcrypt hashed password string
        
    Raises:
        ValueError: If password is empty or None
        
    Examples:
        >>> hashed = hash_password("SecurePass123!")
        >>> hashed.startswith("$2b$")
        True
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Error hashing password: {str(e)}")
        raise


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash.
    
    Args:
        plain_password: The plaintext password to verify
        hashed_password: The bcrypt hash to verify against
        
    Returns:
        True if password matches, False otherwise
        
    Raises:
        ValueError: If either parameter is empty
        
    Examples:
        >>> hashed = hash_password("SecurePass123!")
        >>> verify_password("SecurePass123!", hashed)
        True
        >>> verify_password("WrongPassword", hashed)
        False
    """
    if not plain_password or not hashed_password:
        raise ValueError("Both password and hash cannot be empty")
    
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Error verifying password: {str(e)}")
        # Return False on verification error (invalid hash format, etc.)
        return False


async def create_user(user_data: UserCreate) -> UserInDB:
    """Create a new user account with email and password.
    
    This function:
    1. Checks if email already exists
    2. Hashes the password securely
    3. Creates user record in Supabase
    4. Logs the user creation
    
    Args:
        user_data: UserCreate schema with email, password, and name
        
    Returns:
        UserInDB object with created user data
        
    Raises:
        UserAlreadyExistsError: If email already exists
        AuthenticationError: If user creation fails
        
    Examples:
        >>> user_create = UserCreate(
        ...     email="john@example.com",
        ...     password="SecurePass123!",
        ...     name="John Doe"
        ... )
        >>> user = await create_user(user_create)
        >>> user.email
        'john@example.com'
    """
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        logger.warning(f"Attempted to create user with existing email: {user_data.email}")
        raise UserAlreadyExistsError(f"Email {user_data.email} already exists")
    
    # Hash the password
    password_hash = hash_password(user_data.password)
    
    # Create user record in Supabase
    user_id = uuid4()
    now = datetime.utcnow()
    
    try:
        response = supabase_client.table("users").insert({
            "id": str(user_id),
            "email": user_data.email,
            "password_hash": password_hash,
            "google_id": None,
            "name": user_data.name,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "deleted_at": None,
        }).execute()
        
        if not response.data:
            raise AuthenticationError("Failed to create user in database")
        
        user_record = response.data[0]
        logger.info(f"User created successfully: {user_data.email}")
        
        return UserInDB(
            id=UUID(user_record["id"]),
            email=user_record["email"],
            password_hash=user_record["password_hash"],
            google_id=user_record.get("google_id"),
            name=user_record["name"],
            created_at=datetime.fromisoformat(user_record["created_at"]),
            updated_at=datetime.fromisoformat(user_record["updated_at"]),
            deleted_at=user_record.get("deleted_at"),
        )
        
    except Exception as e:
        if isinstance(e, UserAlreadyExistsError):
            raise
        logger.error(f"Error creating user: {str(e)}")
        raise AuthenticationError(f"Failed to create user: {str(e)}")


async def get_user_by_email(email: str) -> Optional[UserInDB]:
    """Retrieve a user by email address.
    
    Args:
        email: The email address to search for
        
    Returns:
        UserInDB object if found, None otherwise
        
    Raises:
        AuthenticationError: If database query fails
        
    Examples:
        >>> user = await get_user_by_email("john@example.com")
        >>> user.name if user else "Not found"
    """
    if not email:
        return None
    
    try:
        response = supabase_client.table("users").select("*").eq(
            "email", email.lower()
        ).eq("deleted_at", "null").execute()
        
        if not response.data or len(response.data) == 0:
            return None
        
        user_record = response.data[0]
        return UserInDB(
            id=UUID(user_record["id"]),
            email=user_record["email"],
            password_hash=user_record.get("password_hash"),
            google_id=user_record.get("google_id"),
            name=user_record["name"],
            created_at=datetime.fromisoformat(user_record["created_at"]),
            updated_at=datetime.fromisoformat(user_record["updated_at"]),
            deleted_at=user_record.get("deleted_at"),
        )
        
    except Exception as e:
        logger.error(f"Error retrieving user by email: {str(e)}")
        raise AuthenticationError(f"Failed to retrieve user: {str(e)}")


async def get_user_by_id(user_id: UUID) -> Optional[UserInDB]:
    """Retrieve a user by ID.
    
    Args:
        user_id: The UUID of the user to retrieve
        
    Returns:
        UserInDB object if found, None otherwise
        
    Raises:
        AuthenticationError: If database query fails
        
    Examples:
        >>> user = await get_user_by_id(UUID("550e8400-e29b-41d4-a716-446655440000"))
        >>> user.name if user else "Not found"
    """
    if not user_id:
        return None
    
    try:
        response = supabase_client.table("users").select("*").eq(
            "id", str(user_id)
        ).eq("deleted_at", "null").execute()
        
        if not response.data or len(response.data) == 0:
            return None
        
        user_record = response.data[0]
        return UserInDB(
            id=UUID(user_record["id"]),
            email=user_record["email"],
            password_hash=user_record.get("password_hash"),
            google_id=user_record.get("google_id"),
            name=user_record["name"],
            created_at=datetime.fromisoformat(user_record["created_at"]),
            updated_at=datetime.fromisoformat(user_record["updated_at"]),
            deleted_at=user_record.get("deleted_at"),
        )
        
    except Exception as e:
        logger.error(f"Error retrieving user by ID: {str(e)}")
        raise AuthenticationError(f"Failed to retrieve user: {str(e)}")


async def authenticate_user(email: str, password: str) -> UserInDB:
    """Authenticate a user with email and password.
    
    This function:
    1. Retrieves the user by email
    2. Verifies the password matches
    3. Returns the authenticated user
    
    Args:
        email: User's email address
        password: User's plaintext password
        
    Returns:
        UserInDB object if authentication successful
        
    Raises:
        UserNotFoundError: If user does not exist
        InvalidCredentialsError: If password is incorrect
        AuthenticationError: If authentication fails
        
    Examples:
        >>> user = await authenticate_user("john@example.com", "SecurePass123!")
        >>> user.email
        'john@example.com'
    """
    if not email or not password:
        raise InvalidCredentialsError("Email and password are required")
    
    # Get user by email
    user = await get_user_by_email(email)
    if not user:
        logger.warning(f"Login attempt for non-existent user: {email}")
        raise UserNotFoundError(f"User with email {email} not found")
    
    # Check if user has password auth enabled
    if not user.can_use_email_password:
        logger.warning(f"Login attempt for OAuth-only user: {email}")
        raise InvalidCredentialsError("This account uses OAuth. Please sign in with Google.")
    
    # Verify password
    if not verify_password(password, user.password_hash):
        logger.warning(f"Invalid password for user: {email}")
        raise InvalidCredentialsError("Invalid email or password")
    
    logger.info(f"User authenticated successfully: {email}")
    return user


async def authenticate_user_google(google_id: str) -> UserInDB:
    """Retrieve user by Google ID for OAuth authentication.
    
    Args:
        google_id: The Google account ID
        
    Returns:
        UserInDB object if found
        
    Raises:
        UserNotFoundError: If user does not exist
        AuthenticationError: If query fails
        
    Examples:
        >>> user = await authenticate_user_google("118207346348...")
        >>> user.email
    """
    if not google_id:
        raise InvalidCredentialsError("Google ID is required")
    
    try:
        response = supabase_client.table("users").select("*").eq(
            "google_id", google_id
        ).eq("deleted_at", "null").execute()
        
        if not response.data or len(response.data) == 0:
            raise UserNotFoundError(f"User with Google ID {google_id} not found")
        
        user_record = response.data[0]
        logger.info(f"User authenticated via Google: {user_record['email']}")
        
        return UserInDB(
            id=UUID(user_record["id"]),
            email=user_record["email"],
            password_hash=user_record.get("password_hash"),
            google_id=user_record.get("google_id"),
            name=user_record["name"],
            created_at=datetime.fromisoformat(user_record["created_at"]),
            updated_at=datetime.fromisoformat(user_record["updated_at"]),
            deleted_at=user_record.get("deleted_at"),
        )
        
    except UserNotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error authenticating Google user: {str(e)}")
        raise AuthenticationError(f"Failed to authenticate with Google: {str(e)}")


async def create_or_get_user_google(
    google_id: str,
    email: str,
    name: str,
) -> tuple[UserInDB, bool]:
    """Create or retrieve a user via Google OAuth.
    
    This function handles both new user registration and existing user login via Google OAuth:
    1. First tries to retrieve user by google_id
    2. If found, returns existing user with is_new_user=False
    3. If not found, creates new user with google_id
    4. Returns created user with is_new_user=True
    
    Args:
        google_id: The Google account ID from OAuth token
        email: The user's email from Google profile
        name: The user's display name from Google profile
        
    Returns:
        Tuple of (UserInDB object, is_new_user boolean)
        
    Raises:
        UserAlreadyExistsError: If email already exists for different user
        AuthenticationError: If database operation fails
        
    Examples:
        >>> user, is_new = await create_or_get_user_google(
        ...     google_id="118207346348...",
        ...     email="john@gmail.com",
        ...     name="John Doe"
        ... )
        >>> is_new
        True
    """
    if not google_id or not email or not name:
        raise InvalidCredentialsError("google_id, email, and name are required")
    
    try:
        # Try to find existing user by google_id
        existing_by_google_id = await get_user_by_id(UUID("00000000-0000-0000-0000-000000000000"))  # Dummy to use service
        response = supabase_client.table("users").select("*").eq(
            "google_id", google_id
        ).eq("deleted_at", "null").execute()
        
        if response.data and len(response.data) > 0:
            # User exists via Google ID
            user_record = response.data[0]
            logger.info(f"Existing Google user retrieved: {email}")
            
            return (
                UserInDB(
                    id=UUID(user_record["id"]),
                    email=user_record["email"],
                    password_hash=user_record.get("password_hash"),
                    google_id=user_record.get("google_id"),
                    name=user_record["name"],
                    created_at=datetime.fromisoformat(user_record["created_at"]),
                    updated_at=datetime.fromisoformat(user_record["updated_at"]),
                    deleted_at=user_record.get("deleted_at"),
                ),
                False,  # is_new_user = False
            )
        
        # Check if email already exists (different user)
        existing_by_email = await get_user_by_email(email)
        if existing_by_email:
            logger.warning(f"Email {email} already exists for different user")
            raise UserAlreadyExistsError(f"Email {email} is already registered. Please sign in instead.")
        
        # Create new user via Google OAuth
        user_id = uuid4()
        now = datetime.utcnow()
        
        create_response = supabase_client.table("users").insert({
            "id": str(user_id),
            "email": email,
            "password_hash": None,  # No password for OAuth users
            "google_id": google_id,
            "name": name,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "deleted_at": None,
        }).execute()
        
        if not create_response.data:
            raise AuthenticationError("Failed to create user in database")
        
        user_record = create_response.data[0]
        logger.info(f"New Google user created: {email}")
        
        return (
            UserInDB(
                id=UUID(user_record["id"]),
                email=user_record["email"],
                password_hash=user_record.get("password_hash"),
                google_id=user_record.get("google_id"),
                name=user_record["name"],
                created_at=datetime.fromisoformat(user_record["created_at"]),
                updated_at=datetime.fromisoformat(user_record["updated_at"]),
                deleted_at=user_record.get("deleted_at"),
            ),
            True,  # is_new_user = True
        )
        
    except (UserAlreadyExistsError, InvalidCredentialsError):
        raise
    except Exception as e:
        logger.error(f"Error creating/getting Google user: {str(e)}")
        raise AuthenticationError(f"Failed to process Google authentication: {str(e)}")


async def update_user(user_id: UUID, **fields) -> UserInDB:
    """Update user fields (name, email, etc.).
    
    Args:
        user_id: The UUID of the user to update
        **fields: Field names and values to update
        
    Returns:
        Updated UserInDB object
        
    Raises:
        UserNotFoundError: If user does not exist
        UserAlreadyExistsError: If email already exists (when updating email)
        AuthenticationError: If update fails
        
    Examples:
        >>> user = await update_user(
        ...     UUID("550e8400-e29b-41d4-a716-446655440000"),
        ...     name="John Smith"
        ... )
        >>> user.name
        'John Smith'
    """
    # Get current user to verify exists
    user = await get_user_by_id(user_id)
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    # Check if email is being updated and if it already exists
    if "email" in fields and fields["email"] != user.email:
        existing_user = await get_user_by_email(fields["email"])
        if existing_user:
            raise UserAlreadyExistsError(f"Email {fields['email']} already exists")
    
    # Add updated_at timestamp
    fields["updated_at"] = datetime.utcnow().isoformat()
    
    try:
        response = supabase_client.table("users").update(fields).eq(
            "id", str(user_id)
        ).execute()
        
        if not response.data:
            raise AuthenticationError("Failed to update user")
        
        user_record = response.data[0]
        logger.info(f"User updated successfully: {user_id}")
        
        return UserInDB(
            id=UUID(user_record["id"]),
            email=user_record["email"],
            password_hash=user_record.get("password_hash"),
            google_id=user_record.get("google_id"),
            name=user_record["name"],
            created_at=datetime.fromisoformat(user_record["created_at"]),
            updated_at=datetime.fromisoformat(user_record["updated_at"]),
            deleted_at=user_record.get("deleted_at"),
        )
        
    except (UserNotFoundError, UserAlreadyExistsError):
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise AuthenticationError(f"Failed to update user: {str(e)}")


async def soft_delete_user(user_id: UUID) -> None:
    """Soft delete a user account by setting deleted_at timestamp.
    
    Note: This does not delete the user record, only marks it as deleted.
    The user cannot log in after soft deletion.
    
    Args:
        user_id: The UUID of the user to delete
        
    Raises:
        UserNotFoundError: If user does not exist
        AuthenticationError: If deletion fails
        
    Examples:
        >>> await soft_delete_user(UUID("550e8400-e29b-41d4-a716-446655440000"))
    """
    # Verify user exists
    user = await get_user_by_id(user_id)
    if not user:
        raise UserNotFoundError(f"User with ID {user_id} not found")
    
    try:
        response = supabase_client.table("users").update({
            "deleted_at": datetime.utcnow().isoformat()
        }).eq("id", str(user_id)).execute()
        
        if not response.data:
            raise AuthenticationError("Failed to delete user")
        
        logger.info(f"User soft-deleted successfully: {user_id}")
        
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise AuthenticationError(f"Failed to delete user: {str(e)}")


# Export public API
__all__ = [
    # Functions
    'hash_password',
    'verify_password',
    'create_user',
    'get_user_by_email',
    'get_user_by_id',
    'authenticate_user',
    'authenticate_user_google',
    'create_or_get_user_google',
    'update_user',
    'soft_delete_user',
    # Exceptions
    'AuthenticationError',
    'UserAlreadyExistsError',
    'InvalidCredentialsError',
    'UserNotFoundError',
]
