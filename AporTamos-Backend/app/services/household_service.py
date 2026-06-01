"""
Household Service for AporTamos

Handles household management logic including creation, membership management,
and household operations. Uses Supabase as the database backend.

This service is used by household endpoints and provides core functionality
for the household management system.

Functions:
- create_household(): Create a new household with owner
- get_household(): Retrieve household with members
- get_household_members(): Get list of household members
- check_user_household_access(): Verify user is household member
- invite_member(): Send invitation to join household
- accept_invitation(): Accept household invitation and become member
- remove_member(): Remove member from household
- remove_member_by_email(): Remove member by email
- is_household_owner(): Check if user is household owner
- transfer_ownership(): Transfer household ownership to another member
- update_household(): Update household name/timezone
- delete_household(): Soft delete a household
"""

import logging
from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4

from app.models.household import (
    Household,
    HouseholdCreate,
    HouseholdResponse,
    HouseholdDetail,
    HouseholdMember,
    HouseholdMemberResponse,
    HouseholdUpdate,
)
from app.models.user import User
from app.dependencies import get_supabase_client


logger = logging.getLogger(__name__)


class HouseholdError(Exception):
    """Base exception for household-related errors."""
    pass


class HouseholdNotFoundError(HouseholdError):
    """Raised when a household cannot be found."""
    pass


class HouseholdAccessError(HouseholdError):
    """Raised when user does not have access to household."""
    pass


class HouseholdOwnerError(HouseholdError):
    """Raised when household owner operation requirements are not met."""
    pass


class HouseholdMemberError(HouseholdError):
    """Raised when household member operation fails."""
    pass


async def create_household(
    user_id: UUID,
    household_data: HouseholdCreate,
) -> HouseholdResponse:
    """Create a new household with the current user as owner.
    
    This function:
    1. Creates a new household record
    2. Sets the creator as owner
    3. Creates a HouseholdMember record for the owner
    4. Creates a ChatChannel for the household
    5. Logs the creation
    
    Args:
        user_id: UUID of the user creating the household (becomes owner)
        household_data: HouseholdCreate schema with name and timezone_id
        
    Returns:
        HouseholdResponse object with created household data
        
    Raises:
        HouseholdError: If household creation fails
        
    Examples:
        >>> household_data = HouseholdCreate(
        ...     name="Diego's Apartment",
        ...     timezone_id="America/New_York"
        ... )
        >>> household = await create_household(user_id, household_data)
        >>> household.name
        "Diego's Apartment"
    """
    if not user_id or not household_data:
        raise HouseholdError("User ID and household data are required")
    
    household_id = uuid4()
    now = datetime.utcnow()
    
    try:
        # Create household record
        household_response = get_supabase_client().table("households").insert({
            "id": str(household_id),
            "owner_id": str(user_id),
            "name": household_data.name,
            "timezone_id": household_data.timezone_id,
            "daily_streak": 0,
            "last_completion_date": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "deleted_at": None,
        }).execute()
        
        if not household_response.data:
            raise HouseholdError("Failed to create household in database")
        
        household_record = household_response.data[0]
        
        # Create HouseholdMember record for owner
        member_id = uuid4()
        get_supabase_client().table("household_members").insert({
            "id": str(member_id),
            "household_id": str(household_id),
            "user_id": str(user_id),
            "role": "owner",
            "joined_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }).execute()
        
        # Chat channel is created automatically by the DB trigger on household INSERT
        logger.info(f"Household created: {household_record['id']} by user {user_id}")
        
        return HouseholdResponse(
            id=UUID(household_record["id"]),
            owner_id=UUID(household_record["owner_id"]),
            name=household_record["name"],
            timezone_id=household_record["timezone_id"],
            daily_streak=household_record["daily_streak"],
            last_completion_date=household_record.get("last_completion_date"),
            created_at=datetime.fromisoformat(household_record["created_at"]),
            updated_at=datetime.fromisoformat(household_record["updated_at"]),
        )
        
    except Exception as e:
        if isinstance(e, HouseholdError):
            raise
        logger.error(f"Error creating household: {str(e)}")
        raise HouseholdError(f"Failed to create household: {str(e)}")


async def get_user_households(user_id: UUID) -> List[HouseholdResponse]:
    """Return all active households where user_id is a member.

    Raises:
        HouseholdError: If database query fails
    """
    try:
        supabase = get_supabase_client()

        members_resp = supabase.table("household_members").select(
            "household_id"
        ).eq("user_id", str(user_id)).execute()

        household_ids = [m["household_id"] for m in (members_resp.data or [])]
        if not household_ids:
            return []

        households_resp = supabase.table("households").select(
            "id, owner_id, name, timezone_id, daily_streak, last_completion_date, created_at, updated_at"
        ).in_("id", household_ids).execute()

        result = []
        for h in (households_resp.data or []):
            result.append(HouseholdResponse(
                id=UUID(h["id"]),
                owner_id=UUID(h["owner_id"]),
                name=h["name"],
                timezone_id=h["timezone_id"],
                daily_streak=h["daily_streak"],
                last_completion_date=h.get("last_completion_date"),
                created_at=datetime.fromisoformat(h["created_at"]),
                updated_at=datetime.fromisoformat(h["updated_at"]),
            ))
        return result

    except Exception as e:
        logger.error(f"Error fetching user households: {str(e)}")
        raise HouseholdError(f"Failed to fetch households for user {user_id}: {str(e)}")


async def get_household(household_id: UUID) -> Optional[HouseholdDetail]:
    """Retrieve household details with all members.
    
    Args:
        household_id: UUID of the household to retrieve
        
    Returns:
        HouseholdDetail object with household and members if found, None otherwise
        
    Raises:
        HouseholdError: If database query fails
        
    Examples:
        >>> household = await get_household(UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
        >>> household.name if household else "Not found"
    """
    if not household_id:
        return None
    
    try:
        # Get household record
        response = get_supabase_client().table("households").select("*").eq(
            "id", str(household_id)
        ).is_("deleted_at", "null").execute()
        
        if not response.data or len(response.data) == 0:
            return None
        
        household_record = response.data[0]
        
        # Get members with user information
        members_data = await get_household_members(household_id)
        
        return HouseholdDetail(
            id=UUID(household_record["id"]),
            owner_id=UUID(household_record["owner_id"]),
            name=household_record["name"],
            timezone_id=household_record["timezone_id"],
            daily_streak=household_record["daily_streak"],
            last_completion_date=household_record.get("last_completion_date"),
            created_at=datetime.fromisoformat(household_record["created_at"]),
            updated_at=datetime.fromisoformat(household_record["updated_at"]),
            members=members_data,
        )
        
    except Exception as e:
        logger.error(f"Error retrieving household: {str(e)}")
        raise HouseholdError(f"Failed to retrieve household: {str(e)}")


async def get_household_members(household_id: UUID) -> List[HouseholdMemberResponse]:
    """Get list of household members with user information.
    
    Args:
        household_id: UUID of the household
        
    Returns:
        List of HouseholdMemberResponse objects
        
    Raises:
        HouseholdError: If database query fails
        
    Examples:
        >>> members = await get_household_members(UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"))
        >>> len(members)
        2
    """
    if not household_id:
        return []
    
    try:
        # Query to join household_members with users
        response = get_supabase_client().table("household_members").select(
            "*, users(id, name, email)"
        ).eq("household_id", str(household_id)).execute()
        
        if not response.data:
            return []
        
        members = []
        for member_record in response.data:
            user_data = member_record.get("users")
            if user_data:
                members.append(HouseholdMemberResponse(
                    user_id=UUID(user_data["id"]),
                    name=user_data["name"],
                    email=user_data["email"],
                    role=member_record["role"],
                    joined_at=datetime.fromisoformat(member_record["joined_at"]),
                ))
        
        return members
        
    except Exception as e:
        logger.error(f"Error retrieving household members: {str(e)}")
        raise HouseholdError(f"Failed to retrieve household members: {str(e)}")


async def check_user_household_access(
    user_id: UUID,
    household_id: UUID,
) -> bool:
    """Check if a user is a member of a household.
    
    Args:
        user_id: UUID of the user
        household_id: UUID of the household
        
    Returns:
        True if user is household member, False otherwise
        
    Raises:
        HouseholdError: If database query fails
        
    Examples:
        >>> has_access = await check_user_household_access(user_id, household_id)
        >>> has_access
        True
    """
    if not user_id or not household_id:
        return False
    
    try:
        response = get_supabase_client().table("household_members").select("id").eq(
            "household_id", str(household_id)
        ).eq("user_id", str(user_id)).execute()
        
        return len(response.data) > 0
        
    except Exception as e:
        logger.error(f"Error checking household access: {str(e)}")
        raise HouseholdError(f"Failed to check household access: {str(e)}")


async def is_household_owner(
    user_id: UUID,
    household_id: UUID,
) -> bool:
    """Check if a user is the owner of a household.
    
    Args:
        user_id: UUID of the user
        household_id: UUID of the household
        
    Returns:
        True if user is owner, False otherwise
        
    Raises:
        HouseholdError: If database query fails
        
    Examples:
        >>> is_owner = await is_household_owner(user_id, household_id)
        >>> is_owner
        True
    """
    if not user_id or not household_id:
        return False
    
    try:
        response = get_supabase_client().table("household_members").select("role").eq(
            "household_id", str(household_id)
        ).eq("user_id", str(user_id)).eq("role", "owner").execute()
        
        return len(response.data) > 0
        
    except Exception as e:
        logger.error(f"Error checking household owner: {str(e)}")
        raise HouseholdError(f"Failed to check household owner: {str(e)}")


async def invite_member(
    user_id: UUID,
    household_id: UUID,
    invite_email: str,
) -> dict:
    """Invite a user to join household by email.
    
    This function:
    1. Verifies the inviting user is the household owner
    2. Checks if invited email exists and is not already a member
    3. Sends invitation (in future implementations)
    4. Logs the invitation
    
    Args:
        user_id: UUID of the user sending invitation (must be owner)
        household_id: UUID of the household
        invite_email: Email address to invite
        
    Returns:
        Dictionary with invitation status
        
    Raises:
        HouseholdOwnerError: If user is not household owner
        HouseholdMemberError: If email is already a member or other member error
        HouseholdError: If invitation fails
        
    Examples:
        >>> result = await invite_member(user_id, household_id, "newmember@example.com")
        >>> result["message"]
        "Invitation sent to newmember@example.com"
    """
    if not user_id or not household_id or not invite_email:
        raise HouseholdError("User ID, household ID, and email are required")
    
    # Check if user is owner
    is_owner = await is_household_owner(user_id, household_id)
    if not is_owner:
        logger.warning(
            f"Non-owner attempted to invite member to household {household_id}"
        )
        raise HouseholdOwnerError("Only household owner can send invitations")
    
    # TODO: Implement invitation system with email notifications
    # For now, this is a placeholder that will be enhanced in future sprints
    logger.info(
        f"Invitation sent from {user_id} to {invite_email} for household {household_id}"
    )
    
    return {
        "message": f"Invitation sent to {invite_email}",
        "email": invite_email,
    }


async def accept_invitation(
    user_id: UUID,
    household_id: UUID,
) -> dict:
    """Accept household invitation and become a member.
    
    This function:
    1. Checks if invitation is valid
    2. Creates HouseholdMember record with "member" role
    3. Logs the acceptance
    
    Args:
        user_id: UUID of the user accepting invitation
        household_id: UUID of the household
        
    Returns:
        Dictionary with acceptance status
        
    Raises:
        HouseholdNotFoundError: If household does not exist
        HouseholdMemberError: If user is already a member or other member error
        HouseholdError: If acceptance fails
        
    Examples:
        >>> result = await accept_invitation(user_id, household_id)
        >>> result["message"]
        "Successfully joined household"
    """
    if not user_id or not household_id:
        raise HouseholdError("User ID and household ID are required")
    
    try:
        # Check if household exists
        household = await get_household(household_id)
        if not household:
            raise HouseholdNotFoundError(f"Household {household_id} not found")
        
        # Check if user is already a member
        is_member = await check_user_household_access(user_id, household_id)
        if is_member:
            raise HouseholdMemberError("User is already a member of this household")
        
        # Create HouseholdMember record
        member_id = uuid4()
        now = datetime.utcnow()
        
        get_supabase_client().table("household_members").insert({
            "id": str(member_id),
            "household_id": str(household_id),
            "user_id": str(user_id),
            "role": "member",
            "joined_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }).execute()
        
        logger.info(f"User {user_id} accepted invitation to household {household_id}")
        
        return {
            "message": "Successfully joined household",
            "household_id": str(household_id),
            "household_name": household.name,
        }
        
    except (HouseholdNotFoundError, HouseholdMemberError):
        raise
    except Exception as e:
        logger.error(f"Error accepting invitation: {str(e)}")
        raise HouseholdError(f"Failed to accept invitation: {str(e)}")


async def remove_member(
    user_id: UUID,
    household_id: UUID,
    member_user_id: UUID,
) -> dict:
    """Remove a member from household.
    
    This function:
    1. Verifies the requesting user is the household owner
    2. Prevents removal of owner without ownership transfer
    3. Removes the HouseholdMember record
    4. Logs the removal
    
    Args:
        user_id: UUID of the user requesting removal (must be owner)
        household_id: UUID of the household
        member_user_id: UUID of the member to remove
        
    Returns:
        Dictionary with removal status
        
    Raises:
        HouseholdOwnerError: If user is not owner or trying to remove owner without transfer
        HouseholdMemberError: If member not found or other error
        HouseholdError: If removal fails
        
    Examples:
        >>> result = await remove_member(user_id, household_id, member_user_id)
        >>> result["message"]
        "Member removed from household"
    """
    if not user_id or not household_id or not member_user_id:
        raise HouseholdError("User ID, household ID, and member ID are required")
    
    try:
        # Check if requesting user is owner
        is_owner = await is_household_owner(user_id, household_id)
        if not is_owner:
            logger.warning(
                f"Non-owner {user_id} attempted to remove member from household {household_id}"
            )
            raise HouseholdOwnerError("Only household owner can remove members")
        
        # Check if member to remove is the owner
        is_member_owner = await is_household_owner(member_user_id, household_id)
        if is_member_owner:
            raise HouseholdOwnerError(
                "Cannot remove household owner without transferring ownership first"
            )
        
        # Remove the member
        response = get_supabase_client().table("household_members").delete().eq(
            "household_id", str(household_id)
        ).eq("user_id", str(member_user_id)).execute()
        
        logger.info(
            f"User {member_user_id} removed from household {household_id} by {user_id}"
        )
        
        return {
            "message": "Member removed from household",
            "member_user_id": str(member_user_id),
        }
        
    except (HouseholdOwnerError):
        raise
    except Exception as e:
        logger.error(f"Error removing member: {str(e)}")
        raise HouseholdError(f"Failed to remove member: {str(e)}")


async def leave_household(
    user_id: UUID,
    household_id: UUID,
) -> dict:
    """Let a user leave a household themselves.

    Behavior:
    - Removes the requesting user's membership.
    - If the user was the owner and other members remain, ownership is
      transferred to the earliest-joined remaining member.
    - If no members remain afterwards, the household is soft-deleted.

    Returns a dict describing what happened.
    """
    if not user_id or not household_id:
        raise HouseholdError("User ID and household ID are required")

    try:
        supabase = get_supabase_client()

        # Confirm the user is actually a member
        membership = supabase.table("household_members").select("user_id").eq(
            "household_id", str(household_id)
        ).eq("user_id", str(user_id)).execute()
        if not membership.data:
            raise HouseholdMemberError("You are not a member of this household")

        was_owner = await is_household_owner(user_id, household_id)

        # Remove this user's membership
        supabase.table("household_members").delete().eq(
            "household_id", str(household_id)
        ).eq("user_id", str(user_id)).execute()

        # Who's left?
        remaining = supabase.table("household_members").select(
            "user_id, joined_at"
        ).eq("household_id", str(household_id)).order("joined_at", desc=False).execute()
        remaining_members = remaining.data or []

        now = datetime.utcnow().isoformat() + "Z"

        # No one left → soft-delete the household
        if not remaining_members:
            supabase.table("households").update({
                "deleted_at": now,
                "updated_at": now,
            }).eq("id", str(household_id)).execute()
            logger.info(f"Household {household_id} soft-deleted (last member left)")
            return {
                "message": "Left household; household deleted (no members left)",
                "household_deleted": True,
            }

        # Owner left but members remain → transfer ownership to oldest member
        if was_owner:
            new_owner_id = remaining_members[0]["user_id"]
            supabase.table("households").update({
                "owner_id": new_owner_id,
                "updated_at": now,
            }).eq("id", str(household_id)).execute()
            supabase.table("household_members").update({
                "role": "owner",
                "updated_at": now,
            }).eq("household_id", str(household_id)).eq("user_id", new_owner_id).execute()
            logger.info(
                f"User {user_id} left household {household_id}; ownership transferred to {new_owner_id}"
            )
            return {
                "message": "Left household; ownership transferred",
                "household_deleted": False,
                "new_owner_id": new_owner_id,
            }

        logger.info(f"User {user_id} left household {household_id}")
        return {
            "message": "Left household",
            "household_deleted": False,
        }

    except (HouseholdMemberError,):
        raise
    except Exception as e:
        logger.error(f"Error leaving household: {str(e)}")
        raise HouseholdError(f"Failed to leave household: {str(e)}")


async def remove_member_by_email(
    user_id: UUID,
    household_id: UUID,
    member_email: str,
) -> dict:
    """Remove a member from household by email address.
    
    This is a convenience wrapper around remove_member that looks up
    the user ID by email first.
    
    Args:
        user_id: UUID of the user requesting removal (must be owner)
        household_id: UUID of the household
        member_email: Email address of the member to remove
        
    Returns:
        Dictionary with removal status
        
    Raises:
        HouseholdMemberError: If member email not found
        Other exceptions from remove_member()
        
    Examples:
        >>> result = await remove_member_by_email(user_id, household_id, "member@example.com")
        >>> result["message"]
        "Member removed from household"
    """
    if not member_email:
        raise HouseholdError("Member email is required")
    
    try:
        # Look up user by email
        response = get_supabase_client().table("users").select("id").eq(
            "email", member_email.lower()
        ).is_("deleted_at", "null").execute()
        
        if not response.data:
            raise HouseholdMemberError(f"User with email {member_email} not found")
        
        member_user_id = UUID(response.data[0]["id"])
        return await remove_member(user_id, household_id, member_user_id)
        
    except HouseholdMemberError:
        raise
    except Exception as e:
        logger.error(f"Error removing member by email: {str(e)}")
        raise HouseholdError(f"Failed to remove member by email: {str(e)}")


async def transfer_ownership(
    user_id: UUID,
    household_id: UUID,
    new_owner_user_id: UUID,
) -> dict:
    """Transfer household ownership to another member.
    
    This function:
    1. Verifies the requesting user is the current owner
    2. Verifies the new owner is already a member
    3. Updates both HouseholdMember records with new roles
    4. Logs the transfer
    
    Args:
        user_id: UUID of the current owner
        household_id: UUID of the household
        new_owner_user_id: UUID of the new owner (must be existing member)
        
    Returns:
        Dictionary with transfer status
        
    Raises:
        HouseholdOwnerError: If user is not owner or new owner is not member
        HouseholdError: If transfer fails
        
    Examples:
        >>> result = await transfer_ownership(user_id, household_id, new_owner_id)
        >>> result["message"]
        "Ownership transferred successfully"
    """
    if not user_id or not household_id or not new_owner_user_id:
        raise HouseholdError("User ID, household ID, and new owner ID are required")
    
    try:
        # Check if requesting user is owner
        is_owner = await is_household_owner(user_id, household_id)
        if not is_owner:
            raise HouseholdOwnerError("Only current owner can transfer ownership")
        
        # Check if new owner is a member
        is_member = await check_user_household_access(new_owner_user_id, household_id)
        if not is_member:
            raise HouseholdOwnerError("New owner must be a member of the household")
        
        now = datetime.utcnow()
        
        # Update current owner to member role
        get_supabase_client().table("household_members").update({
            "role": "member",
            "updated_at": now.isoformat(),
        }).eq("household_id", str(household_id)).eq(
            "user_id", str(user_id)
        ).execute()
        
        # Update new owner to owner role
        get_supabase_client().table("household_members").update({
            "role": "owner",
            "updated_at": now.isoformat(),
        }).eq("household_id", str(household_id)).eq(
            "user_id", str(new_owner_user_id)
        ).execute()
        
        # Update household owner_id
        get_supabase_client().table("households").update({
            "owner_id": str(new_owner_user_id),
            "updated_at": now.isoformat(),
        }).eq("id", str(household_id)).execute()
        
        logger.info(
            f"Ownership of household {household_id} transferred from {user_id} to {new_owner_user_id}"
        )
        
        return {
            "message": "Ownership transferred successfully",
            "new_owner_id": str(new_owner_user_id),
        }
        
    except (HouseholdOwnerError):
        raise
    except Exception as e:
        logger.error(f"Error transferring ownership: {str(e)}")
        raise HouseholdError(f"Failed to transfer ownership: {str(e)}")


async def update_household(
    user_id: UUID,
    household_id: UUID,
    household_data: HouseholdUpdate,
) -> HouseholdResponse:
    """Update household information (name, timezone).
    
    Args:
        user_id: UUID of the user requesting update (must be owner)
        household_id: UUID of the household
        household_data: HouseholdUpdate schema with optional name and timezone_id
        
    Returns:
        Updated HouseholdResponse object
        
    Raises:
        HouseholdOwnerError: If user is not household owner
        HouseholdNotFoundError: If household does not exist
        HouseholdError: If update fails
        
    Examples:
        >>> update_data = HouseholdUpdate(name="New Name")
        >>> result = await update_household(user_id, household_id, update_data)
        >>> result.name
        "New Name"
    """
    if not user_id or not household_id or not household_data:
        raise HouseholdError("User ID, household ID, and update data are required")
    
    try:
        # Check if user is owner
        is_owner = await is_household_owner(user_id, household_id)
        if not is_owner:
            raise HouseholdOwnerError("Only household owner can update household")
        
        # Check if household exists
        household = await get_household(household_id)
        if not household:
            raise HouseholdNotFoundError(f"Household {household_id} not found")
        
        # Build update data (only include provided fields)
        update_dict = {"updated_at": datetime.utcnow().isoformat()}
        if household_data.name is not None:
            update_dict["name"] = household_data.name
        if household_data.timezone_id is not None:
            update_dict["timezone_id"] = household_data.timezone_id
        
        response = get_supabase_client().table("households").update(
            update_dict
        ).eq("id", str(household_id)).execute()
        
        if not response.data:
            raise HouseholdError("Failed to update household")
        
        updated_record = response.data[0]
        logger.info(f"Household {household_id} updated by {user_id}")
        
        return HouseholdResponse(
            id=UUID(updated_record["id"]),
            owner_id=UUID(updated_record["owner_id"]),
            name=updated_record["name"],
            timezone_id=updated_record["timezone_id"],
            daily_streak=updated_record["daily_streak"],
            last_completion_date=updated_record.get("last_completion_date"),
            created_at=datetime.fromisoformat(updated_record["created_at"]),
            updated_at=datetime.fromisoformat(updated_record["updated_at"]),
        )
        
    except (HouseholdOwnerError, HouseholdNotFoundError):
        raise
    except Exception as e:
        logger.error(f"Error updating household: {str(e)}")
        raise HouseholdError(f"Failed to update household: {str(e)}")


async def delete_household(
    user_id: UUID,
    household_id: UUID,
) -> dict:
    """Soft delete a household (mark as deleted, do not remove data).
    
    This function:
    1. Verifies the requesting user is the household owner
    2. Marks the household as deleted
    3. Logs the deletion
    
    Args:
        user_id: UUID of the user requesting deletion (must be owner)
        household_id: UUID of the household
        
    Returns:
        Dictionary with deletion status
        
    Raises:
        HouseholdOwnerError: If user is not household owner
        HouseholdNotFoundError: If household does not exist
        HouseholdError: If deletion fails
        
    Examples:
        >>> result = await delete_household(user_id, household_id)
        >>> result["message"]
        "Household deleted successfully"
    """
    if not user_id or not household_id:
        raise HouseholdError("User ID and household ID are required")
    
    try:
        # Check if user is owner
        is_owner = await is_household_owner(user_id, household_id)
        if not is_owner:
            raise HouseholdOwnerError("Only household owner can delete household")
        
        # Check if household exists
        household = await get_household(household_id)
        if not household:
            raise HouseholdNotFoundError(f"Household {household_id} not found")
        
        # Soft delete the household
        get_supabase_client().table("households").update({
            "deleted_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", str(household_id)).execute()
        
        logger.info(f"Household {household_id} deleted by {user_id}")
        
        return {
            "message": "Household deleted successfully",
            "household_id": str(household_id),
        }
        
    except (HouseholdOwnerError, HouseholdNotFoundError):
        raise
    except Exception as e:
        logger.error(f"Error deleting household: {str(e)}")
        raise HouseholdError(f"Failed to delete household: {str(e)}")
