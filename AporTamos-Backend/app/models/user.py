"""
User Pydantic Models for AporTamos Authentication

This module defines Pydantic models for user entities, including registration,
login, and response schemas with comprehensive validation.

Models:
- UserCreate: Schema for user registration
- UserLogin: Schema for user login  
- UserResponse: Public user information for API responses
- User: Complete user model with all fields
- UserInDB: Database model with password hash
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr, validator


class UserCreate(BaseModel):
    """Schema for user registration via email/password.
    
    Attributes:
        email: Valid email address (must be unique)
        password: Plain text password (will be hashed before storage)
        name: User's display name (1-100 characters)
    """
    
    email: EmailStr = Field(..., description="Valid email address for account login")
    password: str = Field(..., min_length=8, max_length=128, description="Password (8-128 chars, must include uppercase, lowercase, number, special char)")
    name: str = Field(..., min_length=1, max_length=100, description="User display name")
    
    @validator('password')
    def validate_password_strength(cls, v):
        """Validate password meets security requirements.
        
        Password must contain:
        - At least 8 characters
        - At least one uppercase letter
        - At least one lowercase letter  
        - At least one digit
        - At least one special character (!@#$%^&*)
        """
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        
        special_chars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
        if not any(c in special_chars for c in v):
            raise ValueError(f'Password must contain at least one special character: {special_chars}')
        
        return v
    
    @validator('name')
    def validate_name(cls, v):
        """Validate name is not just whitespace and contains valid characters."""
        if not v.strip():
            raise ValueError('Name cannot be empty or whitespace only')
        
        # Allow letters, numbers, spaces, hyphens, apostrophes
        allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -\'.')
        if not all(c in allowed_chars for c in v):
            raise ValueError('Name contains invalid characters')
        
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecurePass123!",
                "name": "John Doe"
            }
        }


class UserLogin(BaseModel):
    """Schema for user login via email/password.
    
    Attributes:
        email: User's registered email address
        password: User's password
    """
    
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="User password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecurePass123!"
            }
        }


class UserResponse(BaseModel):
    """Public user information for API responses.
    
    This schema only includes information that should be visible in API responses.
    Sensitive information (password hash, google_id) is excluded.
    
    Attributes:
        id: Unique user identifier
        email: User's email address
        name: User's display name
        created_at: Account creation timestamp
    """
    
    id: UUID = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User's email address")
    name: str = Field(..., description="User's display name")
    created_at: datetime = Field(..., description="Account creation timestamp")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "john.doe@example.com",
                "name": "John Doe",
                "created_at": "2026-05-12T10:30:00Z"
            }
        }


class User(BaseModel):
    """Complete user model with all fields.
    
    This is the primary model for user data within the application.
    Use UserResponse for API responses to exclude sensitive fields.
    
    Attributes:
        id: Unique user identifier
        email: User's email address (unique)
        name: User's display name
        google_id: Google account ID for OAuth (optional, unique if present)
        created_at: Account creation timestamp
        updated_at: Last profile update timestamp
        deleted_at: Soft delete timestamp (null if active)
    """
    
    id: UUID = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User's email address (unique)")
    name: str = Field(..., description="User's display name")
    google_id: Optional[str] = Field(None, description="Google account ID for OAuth login")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last profile update timestamp")
    deleted_at: Optional[datetime] = Field(None, description="Soft delete timestamp (null if active)")
    
    @property
    def is_active(self) -> bool:
        """Check if user account is active (not soft-deleted)."""
        return self.deleted_at is None
    
    @property
    def is_oauth_user(self) -> bool:
        """Check if user is registered via OAuth."""
        return self.google_id is not None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "john.doe@example.com",
                "name": "John Doe",
                "google_id": None,
                "created_at": "2026-05-12T10:30:00Z",
                "updated_at": "2026-05-12T10:30:00Z",
                "deleted_at": None
            }
        }


class UserInDB(User):
    """User model as stored in database.
    
    Extends User with password_hash field for authentication.
    This model should NOT be used in API responses or serialized to JSON.
    
    Attributes:
        password_hash: Hashed password for email/password authentication (nullable for OAuth-only users)
    """
    
    password_hash: Optional[str] = Field(None, description="Bcrypt hashed password (null for OAuth-only users)")
    
    @property
    def has_password(self) -> bool:
        """Check if user has a password hash (email/password authentication enabled)."""
        return self.password_hash is not None
    
    @property
    def can_use_email_password(self) -> bool:
        """Check if user can authenticate via email/password."""
        return self.has_password
    
    @property
    def can_use_oauth(self) -> bool:
        """Check if user can authenticate via OAuth."""
        return self.is_oauth_user
    
    class Config:
        from_attributes = True
        # Include password_hash in schema but mark as sensitive
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "john.doe@example.com",
                "name": "John Doe",
                "password_hash": "$2b$12$...",  # bcrypt hash
                "google_id": None,
                "created_at": "2026-05-12T10:30:00Z",
                "updated_at": "2026-05-12T10:30:00Z",
                "deleted_at": None
            }
        }


class UserUpdate(BaseModel):
    """Schema for updating user profile information.
    
    Attributes:
        name: New display name (optional)
        email: New email address (optional, must be unique)
    """
    
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="New display name")
    email: Optional[EmailStr] = Field(None, description="New email address (must be unique)")
    
    @validator('name')
    def validate_name(cls, v):
        """Validate name if provided."""
        if v is not None:
            if not v.strip():
                raise ValueError('Name cannot be empty or whitespace only')
            # Allow letters, numbers, spaces, hyphens, apostrophes
            allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -\'.')
            if not all(c in allowed_chars for c in v):
                raise ValueError('Name contains invalid characters')
            return v.strip()
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Smith",
                "email": "john.smith@example.com"
            }
        }


class PasswordChangeRequest(BaseModel):
    """Schema for changing user password.
    
    Attributes:
        current_password: Current password for verification
        new_password: New password (must meet strength requirements)
    """
    
    current_password: str = Field(..., description="Current password for verification")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    
    @validator('new_password')
    def validate_new_password_strength(cls, v):
        """Validate new password meets security requirements."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        
        special_chars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
        if not any(c in special_chars for c in v):
            raise ValueError(f'Password must contain at least one special character: {special_chars}')
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "current_password": "OldPass123!",
                "new_password": "NewPass456!"
            }
        }


# Export all models for use in endpoints
__all__ = [
    'UserCreate',
    'UserLogin',
    'UserResponse',
    'User',
    'UserInDB',
    'UserUpdate',
    'PasswordChangeRequest',
]
