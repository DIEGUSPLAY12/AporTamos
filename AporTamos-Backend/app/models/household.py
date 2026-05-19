"""
Household and HouseholdMember Pydantic Models for AporTamos

This module defines Pydantic models for household entities, including household
creation, membership management, and response schemas.

Models:
- HouseholdCreate: Schema for creating a new household
- HouseholdResponse: Public household information for API responses
- Household: Complete household model with all fields
- HouseholdMember: Membership model for household members
- HouseholdMemberResponse: Public member information for API responses
- HouseholdDetail: Complete household with members list for GET /households/{id} responses
"""

from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, validator


class HouseholdRoleEnum(str, Enum):
    """Enum for household member roles."""
    owner = "owner"
    member = "member"


class HouseholdCreate(BaseModel):
    """Schema for creating a new household.
    
    Attributes:
        name: Household display name (e.g., "Diego's Apartment")
        timezone_id: IANA timezone ID for streak reset calculations
    """
    
    name: str = Field(
        ..., 
        min_length=1, 
        max_length=100, 
        description="Household name (1-100 characters)"
    )
    timezone_id: str = Field(
        default="America/New_York", 
        description="IANA timezone ID for daily streak reset (default: America/New_York)"
    )
    
    @validator('name')
    def validate_name(cls, v):
        """Validate name is not just whitespace and contains valid characters."""
        if not v.strip():
            raise ValueError('Household name cannot be empty or whitespace only')
        
        # Allow letters, numbers, spaces, hyphens, apostrophes, ampersands
        allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -\'&.')
        if not all(c in allowed_chars for c in v):
            raise ValueError('Household name contains invalid characters')
        
        return v.strip()
    
    @validator('timezone_id')
    def validate_timezone(cls, v):
        """Validate timezone ID is not empty."""
        if not v or not v.strip():
            raise ValueError('Timezone ID cannot be empty')
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Diego's Apartment",
                "timezone_id": "America/New_York"
            }
        }


class HouseholdResponse(BaseModel):
    """Public household information for API responses.
    
    This schema only includes information that should be visible in API responses.
    
    Attributes:
        id: Unique household identifier
        owner_id: User ID of household creator
        name: Household display name
        timezone_id: IANA timezone ID
        daily_streak: Current consecutive days at 100% completion
        last_completion_date: Last date household completion was calculated
        created_at: Household creation timestamp
        updated_at: Last modification timestamp
    """
    
    id: UUID = Field(..., description="Unique household identifier")
    owner_id: UUID = Field(..., description="User ID of household owner")
    name: str = Field(..., description="Household display name")
    timezone_id: str = Field(..., description="IANA timezone ID for streak calculations")
    daily_streak: int = Field(..., ge=0, description="Current daily streak (consecutive days at 100% completion)")
    last_completion_date: Optional[date] = Field(None, description="Last date completion was calculated")
    created_at: datetime = Field(..., description="Household creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "owner_id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Diego's Apartment",
                "timezone_id": "America/New_York",
                "daily_streak": 2,
                "last_completion_date": "2026-05-07",
                "created_at": "2026-05-07T10:00:00Z",
                "updated_at": "2026-05-07T18:45:00Z"
            }
        }


class Household(HouseholdResponse):
    """Complete household model with all fields.
    
    This is the primary model for household data within the application.
    Use HouseholdResponse for API responses to exclude sensitive fields.
    
    Attributes:
        deleted_at: Soft delete timestamp (null if active)
    """
    
    deleted_at: Optional[datetime] = Field(None, description="Soft delete timestamp (null if active)")
    
    @property
    def is_active(self) -> bool:
        """Check if household is active (not soft-deleted)."""
        return self.deleted_at is None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "owner_id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Diego's Apartment",
                "timezone_id": "America/New_York",
                "daily_streak": 2,
                "last_completion_date": "2026-05-07",
                "created_at": "2026-05-07T10:00:00Z",
                "updated_at": "2026-05-07T18:45:00Z",
                "deleted_at": None
            }
        }


class HouseholdMember(BaseModel):
    """Household member relationship model.
    
    Represents a user's membership in a household with their role.
    
    Attributes:
        id: Unique household member record ID
        household_id: Foreign key to Household
        user_id: Foreign key to User
        role: Member role (owner or member)
        joined_at: When user joined household
        updated_at: Last role change timestamp
    """
    
    id: UUID = Field(..., description="Unique household member record ID")
    household_id: UUID = Field(..., description="Reference to Household")
    user_id: UUID = Field(..., description="Reference to User")
    role: HouseholdRoleEnum = Field(..., description="Member role (owner or member)")
    joined_at: datetime = Field(..., description="When user joined household")
    updated_at: datetime = Field(..., description="Last role change timestamp")
    
    @property
    def is_owner(self) -> bool:
        """Check if member has owner role."""
        return self.role == HouseholdRoleEnum.owner
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "role": "owner",
                "joined_at": "2026-05-07T10:00:00Z",
                "updated_at": "2026-05-07T10:00:00Z"
            }
        }


class HouseholdMemberResponse(BaseModel):
    """Public household member information for API responses.
    
    Includes user information alongside membership data.
    
    Attributes:
        user_id: User ID
        name: User's display name
        email: User's email address
        role: Member role (owner or member)
        joined_at: When user joined household
    """
    
    user_id: UUID = Field(..., description="User ID")
    name: str = Field(..., description="User's display name")
    email: str = Field(..., description="User's email address")
    role: HouseholdRoleEnum = Field(..., description="Member role (owner or member)")
    joined_at: datetime = Field(..., description="When user joined household")
    
    @property
    def is_owner(self) -> bool:
        """Check if member has owner role."""
        return self.role == HouseholdRoleEnum.owner
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "John Doe",
                "email": "john.doe@example.com",
                "role": "owner",
                "joined_at": "2026-05-07T10:00:00Z"
            }
        }


class HouseholdDetail(HouseholdResponse):
    """Complete household with members list for detail responses.
    
    This model is used for GET /households/{id} responses to include
    full household information with all members.
    
    Attributes:
        members: List of household members with their user information
    """
    
    members: List[HouseholdMemberResponse] = Field(
        default_factory=list, 
        description="List of household members with their user information"
    )
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "owner_id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Diego's Apartment",
                "timezone_id": "America/New_York",
                "daily_streak": 2,
                "last_completion_date": "2026-05-07",
                "created_at": "2026-05-07T10:00:00Z",
                "updated_at": "2026-05-07T18:45:00Z",
                "members": [
                    {
                        "user_id": "550e8400-e29b-41d4-a716-446655440000",
                        "name": "John Doe",
                        "email": "john.doe@example.com",
                        "role": "owner",
                        "joined_at": "2026-05-07T10:00:00Z"
                    },
                    {
                        "user_id": "660e8400-e29b-41d4-a716-446655440000",
                        "name": "Jane Doe",
                        "email": "jane.doe@example.com",
                        "role": "member",
                        "joined_at": "2026-05-08T14:30:00Z"
                    }
                ]
            }
        }


class HouseholdUpdate(BaseModel):
    """Schema for updating household information.
    
    Attributes:
        name: New household name (optional)
        timezone_id: New IANA timezone ID (optional)
    """
    
    name: Optional[str] = Field(
        None, 
        min_length=1, 
        max_length=100, 
        description="New household name"
    )
    timezone_id: Optional[str] = Field(
        None, 
        description="New IANA timezone ID"
    )
    
    @validator('name')
    def validate_name(cls, v):
        """Validate name if provided."""
        if v is not None:
            if not v.strip():
                raise ValueError('Household name cannot be empty or whitespace only')
            allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -\'&.')
            if not all(c in allowed_chars for c in v):
                raise ValueError('Household name contains invalid characters')
            return v.strip()
        return v
    
    @validator('timezone_id')
    def validate_timezone(cls, v):
        """Validate timezone ID if provided."""
        if v is not None and (not v.strip()):
            raise ValueError('Timezone ID cannot be empty')
        return v.strip() if v else v
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "New Household Name",
                "timezone_id": "America/Los_Angeles"
            }
        }
