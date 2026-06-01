"""
Household Endpoints for AporTamos

This module defines all household management endpoints:
- POST /households: Create a new household
- GET /households/{household_id}: Retrieve household details with members
- POST /households/{household_id}/members: Invite member by email
- PUT /households/{household_id}/members/{user_id}: Accept invitation
- DELETE /households/{household_id}/members/{user_id}: Remove member

All endpoints require authentication and validate user access permissions.
"""

import logging
from typing import Dict, Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Path

from app.models.household import (
    HouseholdCreate,
    HouseholdResponse,
    HouseholdDetail,
    HouseholdUpdate,
)
from app.services.household_service import (
    create_household,
    get_household,
    get_user_households,
    invite_member,
    accept_invitation,
    remove_member,
    leave_household,
    is_household_owner,
    check_user_household_access,
    HouseholdError,
    HouseholdNotFoundError,
    HouseholdAccessError,
    HouseholdOwnerError,
    HouseholdMemberError,
)
from app.dependencies import get_current_user_id
from app.config import log_info, log_warning, log_error

router = APIRouter(prefix="/households", tags=["Households"])
logger = logging.getLogger(__name__)


@router.get("", response_model=List[HouseholdResponse])
async def list_households_endpoint(
    current_user_id: UUID = Depends(get_current_user_id),
) -> List[HouseholdResponse]:
    """List all households where the current user is a member."""
    try:
        households = await get_user_households(current_user_id)
        log_info("User households listed", extra={"user_id": str(current_user_id), "count": len(households)})
        return households
    except HouseholdError as exc:
        log_error("Failed to list households", exc, extra={"user_id": str(current_user_id)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch households.")


@router.post("", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
async def create_household_endpoint(
    household_data: HouseholdCreate,
    current_user_id: UUID = Depends(get_current_user_id),
) -> HouseholdResponse:
    """
    Create a new household.
    
    This endpoint:
    1. Validates the household data (name, timezone)
    2. Creates a new household with the current user as owner
    3. Creates a HouseholdMember record for the owner
    4. Creates a ChatChannel for the household
    5. Returns the created household
    
    **Authentication**: Required (Bearer token)
    
    Args:
        household_data: HouseholdCreate schema with name and timezone_id
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        HouseholdResponse with created household data
        
    Raises:
        400: Invalid household data (invalid timezone)
        401: Unauthorized (missing authentication)
        422: Validation error (name too long, etc.)
        500: Database or server error
        
    Example:
        POST /households
        Authorization: Bearer <JWT_TOKEN>
        
        {
            "name": "Diego's Apartment",
            "timezone_id": "America/New_York"
        }
        
        Response (201):
        {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "owner_id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Diego's Apartment",
            "timezone_id": "America/New_York",
            "daily_streak": 0,
            "last_completion_date": null,
            "created_at": "2026-05-07T10:00:00Z",
            "updated_at": "2026-05-07T10:00:00Z"
        }
    """
    try:
        # Create household with current user as owner
        created_household = await create_household(current_user_id, household_data)
        
        log_info(
            f"Household created successfully",
            extra={
                "household_id": str(created_household.id),
                "owner_id": str(current_user_id),
                "household_name": household_data.name,
            },
        )
        
        return created_household
        
    except ValueError as exc:
        # Validation errors from Pydantic validators
        log_warning(
            f"Household creation validation failed: {str(exc)}",
            extra={"user_id": str(current_user_id)},
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
        
    except HouseholdError as exc:
        log_warning(
            f"Household creation failed: {str(exc)}",
            extra={"user_id": str(current_user_id)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create household",
        )
        
    except Exception as exc:
        log_error(
            f"Household creation failed: {str(exc)}",
            exc,
            extra={"user_id": str(current_user_id)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create household",
        )


@router.get(
    "/{household_id}",
    response_model=HouseholdDetail,
    status_code=status.HTTP_200_OK,
)
async def get_household_endpoint(
    household_id: UUID = Path(..., description="UUID of the household"),
    current_user_id: UUID = Depends(get_current_user_id),
) -> HouseholdDetail:
    """
    Retrieve household details with all members.
    
    This endpoint:
    1. Verifies the user is a member of the household
    2. Retrieves household details
    3. Retrieves all household members with user information
    4. Returns complete household data
    
    **Authentication**: Required (Bearer token)
    **Authorization**: User must be a member of the household
    
    Args:
        household_id: UUID of the household
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        HouseholdDetail with household info and members list
        
    Raises:
        401: Unauthorized (missing authentication)
        403: Forbidden (user is not household member)
        404: Household not found
        500: Database or server error
        
    Example:
        GET /households/a1b2c3d4-e5f6-7890-abcd-ef1234567890
        Authorization: Bearer <JWT_TOKEN>
        
        Response (200):
        {
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
                    "email": "john@example.com",
                    "role": "owner",
                    "joined_at": "2026-05-07T10:00:00Z"
                },
                {
                    "user_id": "660e8400-e29b-41d4-a716-446655440000",
                    "name": "Jane Doe",
                    "email": "jane@example.com",
                    "role": "member",
                    "joined_at": "2026-05-08T14:30:00Z"
                }
            ]
        }
    """
    try:
        # Check if user is household member
        is_member = await check_user_household_access(current_user_id, household_id)
        if not is_member:
            log_warning(
                f"Unauthorized household access attempt",
                extra={
                    "user_id": str(current_user_id),
                    "household_id": str(household_id),
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this household",
            )
        
        # Retrieve household with members
        household = await get_household(household_id)
        
        if not household:
            log_warning(
                f"Household not found",
                extra={"household_id": str(household_id)},
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Household not found",
            )
        
        log_info(
            f"Household retrieved",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        
        return household
        
    except HTTPException:
        raise
        
    except HouseholdError as exc:
        log_warning(
            f"Household retrieval failed: {str(exc)}",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve household",
        )
        
    except Exception as exc:
        log_error(
            f"Household retrieval failed: {str(exc)}",
            exc,
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve household",
        )


@router.post(
    "/{household_id}/members",
    response_model=Dict[str, str],
    status_code=status.HTTP_201_CREATED,
)
async def invite_member_endpoint(
    household_id: UUID = Path(..., description="UUID of the household"),
    invite_data: Dict[str, str] = ...,
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, str]:
    """
    Invite a user to household by email.
    
    This endpoint:
    1. Verifies the user is the household owner
    2. Validates the email address
    3. Checks if user is already a member
    4. Sends invitation (in future implementations)
    5. Returns invitation status
    
    **Authentication**: Required (Bearer token)
    **Authorization**: User must be household owner
    
    Args:
        household_id: UUID of the household
        invite_data: Dict with "email" key containing email to invite
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        Dict with invitation message
        
    Raises:
        400: Email already a member or invalid
        401: Unauthorized (missing authentication)
        403: Forbidden (user is not household owner)
        404: Household not found
        500: Database or server error
        
    Example:
        POST /households/a1b2c3d4-e5f6-7890-abcd-ef1234567890/members
        Authorization: Bearer <JWT_TOKEN>
        
        {
            "email": "newmember@example.com"
        }
        
        Response (201):
        {
            "message": "Invitation sent to newmember@example.com"
        }
    """
    try:
        # Extract email from request data
        email = invite_data.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email is required",
            )
        
        # Check if user is household owner
        is_owner = await is_household_owner(current_user_id, household_id)
        if not is_owner:
            log_warning(
                f"Non-owner attempted to invite member",
                extra={
                    "user_id": str(current_user_id),
                    "household_id": str(household_id),
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only household owner can invite members",
            )
        
        # Send invitation
        result = await invite_member(current_user_id, household_id, email)
        
        log_info(
            f"Invitation sent",
            extra={
                "household_id": str(household_id),
                "owner_id": str(current_user_id),
                "invite_email": email,
            },
        )
        
        return result
        
    except HTTPException:
        raise
        
    except HouseholdOwnerError as exc:
        log_warning(
            f"Invitation failed - permission denied: {str(exc)}",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
        
    except HouseholdMemberError as exc:
        log_warning(
            f"Invitation failed - member error: {str(exc)}",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
        
    except HouseholdError as exc:
        log_warning(
            f"Invitation failed: {str(exc)}",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send invitation",
        )
        
    except Exception as exc:
        log_error(
            f"Invitation failed: {str(exc)}",
            exc,
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send invitation",
        )


@router.put(
    "/{household_id}/members/{user_id}",
    response_model=Dict[str, str],
    status_code=status.HTTP_200_OK,
)
async def accept_invitation_endpoint(
    household_id: UUID = Path(..., description="UUID of the household"),
    user_id: UUID = Path(..., description="UUID of the user (must be current user)"),
    action_data: Dict[str, str] = ...,
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, str]:
    """
    Accept household invitation and join household.
    
    This endpoint:
    1. Verifies the user_id matches the current authenticated user
    2. Accepts the household invitation
    3. Creates a HouseholdMember record with "member" role
    4. Returns acceptance status
    
    **Authentication**: Required (Bearer token)
    **Authorization**: User can only accept for themselves
    
    Args:
        household_id: UUID of the household
        user_id: UUID of the user (must match current_user_id)
        action_data: Dict with "action": "accept"
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        Dict with acceptance message
        
    Raises:
        400: Already a member or invalid request
        401: Unauthorized (missing authentication)
        403: Forbidden (trying to accept for another user)
        404: Household not found
        500: Database or server error
        
    Example:
        PUT /households/a1b2c3d4-e5f6-7890-abcd-ef1234567890/members/550e8400-e29b-41d4-a716-446655440000
        Authorization: Bearer <JWT_TOKEN>
        
        {
            "action": "accept"
        }
        
        Response (200):
        {
            "message": "Successfully joined household",
            "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "household_name": "Diego's Apartment"
        }
    """
    try:
        # Verify user is accepting for themselves
        if user_id != current_user_id:
            log_warning(
                f"User attempted to accept invitation for another user",
                extra={
                    "current_user_id": str(current_user_id),
                    "target_user_id": str(user_id),
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only accept invitations for yourself",
            )
        
        # Extract action from request data
        action = action_data.get("action")
        if action != "accept":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Action must be 'accept'",
            )
        
        # Accept invitation
        result = await accept_invitation(current_user_id, household_id)
        
        log_info(
            f"Invitation accepted",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        
        return result
        
    except HTTPException:
        raise
        
    except HouseholdNotFoundError as exc:
        log_warning(
            f"Invitation acceptance failed - household not found: {str(exc)}",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
        
    except HouseholdMemberError as exc:
        log_warning(
            f"Invitation acceptance failed - member error: {str(exc)}",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
        
    except HouseholdError as exc:
        log_warning(
            f"Invitation acceptance failed: {str(exc)}",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept invitation",
        )
        
    except Exception as exc:
        log_error(
            f"Invitation acceptance failed: {str(exc)}",
            exc,
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept invitation",
        )


@router.delete(
    "/{household_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member_endpoint(
    household_id: UUID = Path(..., description="UUID of the household"),
    user_id: UUID = Path(..., description="UUID of the member to remove"),
    current_user_id: UUID = Depends(get_current_user_id),
) -> None:
    """
    Remove a member from household.
    
    This endpoint:
    1. Verifies the user is the household owner
    2. Prevents removal of the owner without ownership transfer
    3. Removes the HouseholdMember record
    4. Returns no content on success
    
    **Authentication**: Required (Bearer token)
    **Authorization**: User must be household owner
    
    Args:
        household_id: UUID of the household
        user_id: UUID of the member to remove
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        None (204 No Content)
        
    Raises:
        400: Cannot remove owner or other validation error
        401: Unauthorized (missing authentication)
        403: Forbidden (user is not household owner)
        404: Household or member not found
        500: Database or server error
        
    Example:
        DELETE /households/a1b2c3d4-e5f6-7890-abcd-ef1234567890/members/550e8400-e29b-41d4-a716-446655440000
        Authorization: Bearer <JWT_TOKEN>
        
        Response (204):
        (no content)
    """
    try:
        # Check if user is household owner
        is_owner = await is_household_owner(current_user_id, household_id)
        if not is_owner:
            log_warning(
                f"Non-owner attempted to remove member",
                extra={
                    "current_user_id": str(current_user_id),
                    "household_id": str(household_id),
                    "member_to_remove": str(user_id),
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only household owner can remove members",
            )
        
        # Remove member
        await remove_member(current_user_id, household_id, user_id)
        
        log_info(
            f"Member removed from household",
            extra={
                "household_id": str(household_id),
                "owner_id": str(current_user_id),
                "removed_user_id": str(user_id),
            },
        )
        
    except HTTPException:
        raise
        
    except HouseholdOwnerError as exc:
        log_warning(
            f"Member removal failed - permission denied: {str(exc)}",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
        
    except HouseholdError as exc:
        log_warning(
            f"Member removal failed: {str(exc)}",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove member",
        )
        
    except Exception as exc:
        log_error(
            f"Member removal failed: {str(exc)}",
            exc,
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove member",
        )


@router.post(
    "/{household_id}/leave",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
)
async def leave_household_endpoint(
    household_id: UUID = Path(..., description="UUID of the household to leave"),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """Leave a household.

    Any member can leave. The household stays active for the remaining members.
    If the owner leaves, ownership transfers to the oldest remaining member.
    When the last member leaves, the household is permanently (soft) deleted.
    """
    try:
        result = await leave_household(current_user_id, household_id)
        log_info(
            "User left household",
            extra={"household_id": str(household_id), "user_id": str(current_user_id),
                   "deleted": result.get("household_deleted")},
        )
        return result
    except HouseholdMemberError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except HouseholdError as exc:
        log_error("Failed to leave household", exc,
                  extra={"household_id": str(household_id), "user_id": str(current_user_id)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to leave household")
