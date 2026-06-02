"""
Chat Endpoints for AporTamos Real-Time Messaging

- GET  /households/{household_id}/chat/messages : fetch chat history (paginated)
- POST /households/{household_id}/chat/message   : send a message (added in T096/T097)

All endpoints require authentication and household membership.
"""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Query, UploadFile, status

from app.models.chat import ChatMessageResponse, MessageType
from app.services.chat_service import (
    get_messages,
    send_message,
    upload_chat_media,
    ChatError,
    ChannelNotFoundError,
)
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


@router.post(
    "/{household_id}/chat/message",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_chat_message_endpoint(
    household_id: UUID = Path(..., description="Household ID"),
    message_type: MessageType = Form(MessageType.TEXT, description="text, audio, or image"),
    content: Optional[str] = Form(None, description="Text body (required for text messages)"),
    file: Optional[UploadFile] = File(None, description="Media file (required for audio/image)"),
    current_user_id: UUID = Depends(get_current_user_id),
) -> ChatMessageResponse:
    """Send a chat message to a household channel.

    Multipart/form-data endpoint handling both message kinds:
    - **text**: send `message_type=text` and `content`. No file.
    - **audio/image**: send `message_type=audio|image` and a `file`. No content;
      the file is uploaded to Supabase Storage and stored as `media_url`.

    Raises:
        400: Validation error (missing/extra content or file, bad media type)
        403: Current user is not a member of the household
        404: Household has no chat channel
        500: Upload or insert failure
    """
    await _require_household_member(current_user_id, household_id)

    try:
        # ── Text message ──
        if message_type == MessageType.TEXT:
            if file is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Text messages must not include a file.",
                )
            return await send_message(
                household_id=household_id,
                sender_id=current_user_id,
                message_type=MessageType.TEXT,
                content=content,
            )

        # ── Media message (audio / image) ──
        if file is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{message_type.value} messages require a file.",
            )

        # Light content-type check matches the declared message_type
        ctype = (file.content_type or "").lower()
        expected_prefix = "image/" if message_type == MessageType.IMAGE else "audio/"
        if not ctype.startswith(expected_prefix):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File content-type '{ctype}' does not match message_type '{message_type.value}'.",
            )

        # Generate the message id up front so the stored file path matches it
        message_id = uuid4()
        media_url = await upload_chat_media(file, household_id, message_id)
        return await send_message(
            household_id=household_id,
            sender_id=current_user_id,
            message_type=message_type,
            media_url=media_url,
            message_id=message_id,
        )

    except HTTPException:
        raise
    except ChannelNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This household has no chat channel.",
        )
    except ChatError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except DatabaseException as exc:
        log_error("Failed to send chat message", exc, extra={"household_id": str(household_id)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message.",
        )
