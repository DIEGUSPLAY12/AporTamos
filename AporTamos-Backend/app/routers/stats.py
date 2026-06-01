"""
Stats Endpoints for AporTamos

GET /households/{household_id}/stats — Household completion %, streak, member stats
GET /users/{user_id}/stats           — User completion % and task history within a household
"""

import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field

from app.models.stats import HouseholdStatsResponse, UserStatsResponse
from app.services.gamification_service import (
    get_household_stats,
    get_user_stats,
    calculate_user_total_points,
    HouseholdNotFoundError,
    UserNotFoundError,
    StatsCalculationError,
)
from app.services.household_service import check_user_household_access, HouseholdError
from app.dependencies import get_current_user_id, get_supabase_client
from app.config import log_error, log_info


class AvatarUpdate(BaseModel):
    avatar_url: str = Field(..., max_length=500, description="Avatar image URL")

router = APIRouter(tags=["Stats"])
logger = logging.getLogger(__name__)


async def _require_household_member(user_id: UUID, household_id: UUID) -> None:
    """Raise 403 if user is not a member of the household, 500 on DB failure."""
    try:
        is_member = await check_user_household_access(user_id, household_id)
    except HouseholdError as exc:
        log_error("Household access check failed", exc, extra={"household_id": str(household_id)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify household membership.",
        )
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this household.",
        )


@router.get(
    "/households/{household_id}/stats",
    response_model=HouseholdStatsResponse,
)
async def get_household_stats_endpoint(
    household_id: UUID = Path(..., description="Household ID"),
    current_user_id: UUID = Depends(get_current_user_id),
) -> HouseholdStatsResponse:
    """Get statistics for a household.

    Returns today's weighted completion percentage, current streak,
    task counts, and per-member breakdowns.

    Raises:
        403: Current user is not a member of the household
        404: Household not found
        500: Stats calculation failure
    """
    await _require_household_member(current_user_id, household_id)

    try:
        stats = await get_household_stats(household_id)
        log_info(
            "Household stats retrieved",
            extra={"household_id": str(household_id), "user_id": str(current_user_id)},
        )
        return HouseholdStatsResponse.model_validate(stats)

    except HouseholdNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Household not found.",
        )
    except StatsCalculationError as exc:
        log_error(
            "Stats calculation failed",
            exc,
            extra={"household_id": str(household_id)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate household statistics.",
        )


@router.get(
    "/users/{user_id}/stats",
    response_model=UserStatsResponse,
)
async def get_user_stats_endpoint(
    user_id: UUID = Path(..., description="User ID"),
    household_id: UUID = Query(..., description="Household ID for context"),
    current_user_id: UUID = Depends(get_current_user_id),
) -> UserStatsResponse:
    """Get statistics for a user within a household.

    Returns today's completion percentage, task counts, and 7-day history.
    Only accessible to members of the household. The target user must also
    be a member of the same household.

    Raises:
        403: Current user is not a member of the household
        403: Target user is not a member of the household
        404: User not found
        500: Stats calculation failure
    """
    await _require_household_member(current_user_id, household_id)
    await _require_household_member(user_id, household_id)

    try:
        stats = await get_user_stats(user_id, household_id)
        log_info(
            "User stats retrieved",
            extra={
                "user_id": str(user_id),
                "household_id": str(household_id),
                "requester_id": str(current_user_id),
            },
        )
        return UserStatsResponse.model_validate(stats)

    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    except StatsCalculationError as exc:
        log_error(
            "Stats calculation failed",
            exc,
            extra={"user_id": str(user_id), "household_id": str(household_id)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate user statistics.",
        )


@router.patch("/users/me/avatar")
async def update_my_avatar_endpoint(
    body: AvatarUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Update the authenticated user's avatar URL."""
    try:
        get_supabase_client().table("users").update({
            "avatar_url": body.avatar_url,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", str(current_user_id)).execute()
        log_info("Avatar updated", extra={"user_id": str(current_user_id)})
        return {"avatar_url": body.avatar_url}
    except Exception as exc:
        log_error("Avatar update failed", exc, extra={"user_id": str(current_user_id)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update avatar.",
        )


@router.get("/users/me/points")
async def get_my_points_endpoint(
    current_user_id: UUID = Depends(get_current_user_id),
) -> dict:
    """Total lifetime points for the authenticated user, across all households.

    Points are weighted by each completed task's effort_weight (effort × 5).
    """
    try:
        points = await calculate_user_total_points(current_user_id)
        return {"user_id": str(current_user_id), "total_points": points}
    except StatsCalculationError as exc:
        log_error("Points calculation failed", exc, extra={"user_id": str(current_user_id)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate points.",
        )
