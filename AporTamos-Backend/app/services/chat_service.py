"""
Chat Service for AporTamos Real-Time Messaging

Handles household chat operations: resolving a household's chat channel, sending
text/media messages, fetching paginated history, and uploading media to Supabase
Storage (chat-media bucket).

Notes:
- The Supabase Python client is synchronous; do NOT await .execute().
- A chat channel is auto-created per household by a DB trigger (US2/T037).
- chat_messages enforces "exactly one of (content, media_url)" via a DB trigger;
  we also guard it here for clearer errors.

Functions:
- get_channel_by_household(): Resolve the chat channel for a household
- send_message(): Insert a chat message (text or media) and return it
- get_messages(): Fetch paginated chat history (newest first) with sender names
- upload_chat_media(): Upload audio/image to chat-media and return a signed URL
"""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import UploadFile

from app.dependencies import get_supabase_client
from app.config import DatabaseException, log_error, log_info
from app.models.chat import ChatMessageResponse, MessageType

logger = logging.getLogger(__name__)

CHAT_MEDIA_BUCKET = "chat-media"
SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 7  # 7 days
MEDIA_MAX_BYTES = 10 * 1024 * 1024  # 10 MB

# content-type → file extension for stored media
_EXT_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/webm": "webm",
}


class ChatError(Exception):
    """Base exception for chat-related errors."""
    pass


class ChannelNotFoundError(ChatError):
    """Raised when a household has no chat channel."""
    pass


async def get_channel_by_household(household_id: UUID) -> dict:
    """Return the chat channel row for a household.

    Raises:
        ChannelNotFoundError: If the household has no chat channel.
        DatabaseException: On query failure.
    """
    try:
        response = get_supabase_client().table("chat_channels").select("*").eq(
            "household_id", str(household_id)
        ).limit(1).execute()

        if not response.data:
            raise ChannelNotFoundError(f"No chat channel for household {household_id}")
        return response.data[0]

    except ChannelNotFoundError:
        raise
    except Exception as exc:
        log_error("Failed to fetch chat channel", exc, extra={"household_id": str(household_id)})
        raise DatabaseException(
            f"Failed to fetch chat channel: {str(exc)}",
            operation="get_channel_by_household",
        ) from exc


def _resolve_extension(file: UploadFile) -> str:
    """Pick a file extension from the upload's content-type (fallback to filename)."""
    ext = _EXT_BY_CONTENT_TYPE.get((file.content_type or "").lower())
    if ext:
        return ext
    if file.filename and "." in file.filename:
        return file.filename.rsplit(".", 1)[-1].lower()
    return "bin"


async def upload_chat_media(file: UploadFile, household_id: UUID, message_id: UUID) -> str:
    """Upload an audio/image file to the chat-media bucket and return a signed URL.

    Storage path: {household_id}/messages/{message_id}.{ext}

    Raises:
        ChatError: If the file is too large or the upload fails.
    """
    ext = _resolve_extension(file)
    storage_path = f"{household_id}/messages/{message_id}.{ext}"

    try:
        contents = await file.read()
        if len(contents) > MEDIA_MAX_BYTES:
            raise ChatError(f"Media exceeds the 10 MB limit ({len(contents)} bytes).")

        supabase = get_supabase_client()
        supabase.storage.from_(CHAT_MEDIA_BUCKET).upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type or "application/octet-stream", "upsert": "true"},
        )

        signed = supabase.storage.from_(CHAT_MEDIA_BUCKET).create_signed_url(
            path=storage_path,
            expires_in=SIGNED_URL_EXPIRES_IN,
        )
        url: str = signed["signedURL"]

        log_info("Chat media uploaded", extra={"path": storage_path, "size_bytes": len(contents)})
        return url

    except ChatError:
        raise
    except Exception as exc:
        log_error("Failed to upload chat media", exc, extra={"path": storage_path})
        raise ChatError(f"Failed to upload media: {str(exc)}") from exc


async def send_message(
    household_id: UUID,
    sender_id: UUID,
    message_type: MessageType,
    content: Optional[str] = None,
    media_url: Optional[str] = None,
    message_id: Optional[UUID] = None,
) -> ChatMessageResponse:
    """Insert a chat message into the household's channel and return it.

    Exactly one of (content, media_url) must be set.

    Raises:
        ChatError: If validation fails.
        ChannelNotFoundError: If the household has no channel.
        DatabaseException: On insert failure.
    """
    has_content = bool(content and content.strip())
    has_media = bool(media_url)
    if has_content == has_media:
        raise ChatError("Exactly one of content or media_url must be set")

    channel = await get_channel_by_household(household_id)

    record = {
        "id": str(message_id or uuid4()),
        "channel_id": channel["id"],
        "sender_id": str(sender_id),
        "message_type": message_type.value if isinstance(message_type, MessageType) else str(message_type),
        "content": content.strip() if has_content else None,
        "media_url": media_url if has_media else None,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    try:
        supabase = get_supabase_client()
        response = supabase.table("chat_messages").insert(record).execute()
        row = response.data[0] if response.data else record

        # Resolve sender name for the response
        sender_name = None
        try:
            u = supabase.table("users").select("name").eq("id", str(sender_id)).limit(1).execute()
            if u.data:
                sender_name = u.data[0].get("name")
        except Exception:
            pass

        log_info(
            "Chat message sent",
            extra={"message_id": row["id"], "channel_id": channel["id"], "type": record["message_type"]},
        )

        return ChatMessageResponse(
            id=UUID(row["id"]),
            channel_id=UUID(row["channel_id"]),
            sender_id=UUID(row["sender_id"]),
            sender_name=sender_name,
            message_type=MessageType(row["message_type"]),
            content=row.get("content"),
            media_url=row.get("media_url"),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
        )

    except Exception as exc:
        log_error("Failed to send chat message", exc, extra={"household_id": str(household_id)})
        raise DatabaseException(
            f"Failed to send message: {str(exc)}",
            operation="send_message",
        ) from exc


async def get_messages(
    household_id: UUID,
    limit: int = 50,
    before: Optional[datetime] = None,
) -> List[ChatMessageResponse]:
    """Fetch chat history for a household, newest first, with cursor pagination.

    Args:
        household_id: Household whose channel to read
        limit: Max messages to return (default 50)
        before: Return messages created strictly before this timestamp (cursor)

    Raises:
        ChannelNotFoundError: If the household has no channel.
        DatabaseException: On query failure.
    """
    channel = await get_channel_by_household(household_id)

    try:
        supabase = get_supabase_client()
        query = supabase.table("chat_messages").select(
            "id, channel_id, sender_id, message_type, content, media_url, created_at, users!sender_id(name)"
        ).eq("channel_id", channel["id"])

        if before is not None:
            query = query.lt("created_at", before.isoformat())

        response = query.order("created_at", desc=True).limit(limit).execute()
        rows = response.data or []

        messages: List[ChatMessageResponse] = []
        for row in rows:
            sender = row.get("users") or {}
            messages.append(ChatMessageResponse(
                id=UUID(row["id"]),
                channel_id=UUID(row["channel_id"]),
                sender_id=UUID(row["sender_id"]),
                sender_name=sender.get("name"),
                message_type=MessageType(row["message_type"]),
                content=row.get("content"),
                media_url=row.get("media_url"),
                created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            ))

        return messages

    except Exception as exc:
        log_error("Failed to fetch chat messages", exc, extra={"household_id": str(household_id)})
        raise DatabaseException(
            f"Failed to fetch messages: {str(exc)}",
            operation="get_messages",
        ) from exc
