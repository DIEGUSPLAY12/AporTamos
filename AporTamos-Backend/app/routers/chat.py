"""
Chat Endpoints for AporTamos Real-Time Messaging

- GET  /households/{household_id}/chat/messages : fetch chat history (paginated)
- POST /households/{household_id}/chat/message   : send a message (added in T096/T097)

All endpoints require authentication and household membership.
"""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.models.chat import ChatMessageResponse
from app.services.chat_service import get_messages, ChannelNotFoundError
from app.services.household_service import check_user_household_access, HouseholdError
from app.dependencies import get_current_user_id
from app.config import DatabaseException, log_error, log_info

router = APIRouter(prefix="/households", tags=["Chat"])
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
    "/{household_id}/chat/messages",
    response_model=List[ChatMessageResponse],
    status_code=status.HTTP_200_OK,
)
async def get_chat_messages_endpoint(
    household_id: UUID = Path(..., description="Household ID"),
    limit: int = Query(50, ge=1, le=100, description="Max messages to return"),
    before: Optional[str] = Query(
        None, description="ISO timestamp cursor; returns messages created before it"
    ),
    current_user_id: UUID = Depends(get_current_user_id),
) -> List[ChatMessageResponse]:
    """Fetch chat history for a household, newest first, with cursor pagination.

    Use the `created_at` of the oldest returned message as the next `before` cursor.

    Raises:
        400: Invalid `before` timestamp
        403: Current user is not a member of the household
        404: Household has no chat channel
        500: Query failure
    """
    await _require_household_member(current_user_id, household_id)

    before_dt: Optional[datetime] = None
    if before:
        try:
            before_dt = datetime.fromisoformat(before.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid 'before' timestamp. Use ISO 8601 format.",
            )

    try:
        messages = await get_messages(household_id, limit=limit, before=before_dt)
        log_info(
            "Chat history fetched",
            extra={"household_id": str(household_id), "count": len(messages)},
        )
        return messages
    except ChannelNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This household has no chat channel.",
        )
    except DatabaseException as exc:
        log_error("Failed to fetch chat messages", exc, extra={"household_id": str(household_id)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch chat messages.",
        )
