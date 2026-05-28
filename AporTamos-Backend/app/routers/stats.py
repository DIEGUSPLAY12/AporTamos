"""
Stats Endpoints for AporTamos

GET /households/{household_id}/stats — Household completion %, streak, member stats
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.models.stats import HouseholdStatsResponse
from app.services.gamification_service import (
    get_household_stats,
    HouseholdNotFoundError,
    StatsCalculationError,
)
from app.services.household_service import check_user_household_access
from app.dependencies import get_current_user_id
from app.config import log_error, log_info

router = APIRouter(tags=["Stats"])
logger = logging.getLogger(__name__)


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
    is_member = await check_user_household_access(current_user_id, household_id)
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this household.",
        )

    try:
        stats = await get_household_stats(household_id)
        log_info(
            "Household stats retrieved",
            extra={"household_id": str(household_id), "user_id": str(current_user_id)},
        )
        return HouseholdStatsResponse(**stats)

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
