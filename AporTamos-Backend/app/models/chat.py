"""
Chat Pydantic Models for AporTamos Real-Time Messaging

Defines models for the household chat: channels and messages. A chat channel is
auto-created per household (DB trigger), and messages can be text, audio, or image.

DB schema (initial-schema.sql):
- chat_channels(id, household_id UNIQUE, created_at, updated_at)
- chat_messages(id, channel_id, sender_id, message_type[text|audio|image],
                content, media_url, created_at)
  Constraint: exactly one of (content, media_url) must be set.

Models:
- MessageType: Enum for message kinds (text/audio/image)
- ChatChannelResponse: Channel info for API responses
- ChatMessageCreate: Schema for sending a message (text content; media set server-side)
- ChatMessageResponse: A chat message with sender info for API responses
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, model_validator


class MessageType(str, Enum):
    """Kind of chat message."""
    TEXT = "text"
    AUDIO = "audio"
    IMAGE = "image"


class ChatChannelResponse(BaseModel):
    """Public chat channel information for API responses.

    Attributes:
        id: Unique channel identifier
        household_id: Household this channel belongs to (one channel per household)
        created_at: Channel creation timestamp
        updated_at: Last update timestamp
    """

    id: UUID = Field(..., description="Unique channel identifier")
    household_id: UUID = Field(..., description="Household this channel belongs to")
    created_at: datetime = Field(..., description="Channel creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "household_id": "660e8400-e29b-41d4-a716-446655440000",
                "created_at": "2026-06-01T10:00:00Z",
                "updated_at": "2026-06-01T10:00:00Z",
            }
        }


class ChatMessageCreate(BaseModel):
    """Schema for sending a new chat message.

    For text messages, `content` is required. For audio/image messages the file
    is uploaded via multipart and `media_url` is set by the server, so the client
    only sends `message_type` here.

    Attributes:
        message_type: text, audio, or image
        content: Text body (required for text messages, null otherwise)
    """

    message_type: MessageType = Field(default=MessageType.TEXT, description="text, audio, or image")
    content: Optional[str] = Field(
        None,
        max_length=2000,
        description="Text body (required for text messages, 1-2000 chars)",
    )

    @model_validator(mode="after")
    def validate_text_has_content(self):
        """Text messages must include non-empty content."""
        if self.message_type == MessageType.TEXT:
            if not self.content or not self.content.strip():
                raise ValueError("Text messages require non-empty content")
            self.content = self.content.strip()
        return self

    class Config:
        json_schema_extra = {
            "example": {
                "message_type": "text",
                "content": "¿Quién saca la basura hoy?",
            }
        }


class ChatMessageResponse(BaseModel):
    """A chat message for API responses, including sender info.

    Exactly one of `content` or `media_url` is set, matching the DB constraint.

    Attributes:
        id: Unique message identifier
        channel_id: Channel the message belongs to
        sender_id: User who sent the message
        sender_name: Display name of the sender (joined for UI convenience)
        message_type: text, audio, or image
        content: Text body (set for text messages)
        media_url: URL to the media file (set for audio/image messages)
        created_at: Message timestamp
    """

    id: UUID = Field(..., description="Unique message identifier")
    channel_id: UUID = Field(..., description="Channel the message belongs to")
    sender_id: UUID = Field(..., description="User who sent the message")
    sender_name: Optional[str] = Field(None, description="Display name of the sender")
    message_type: MessageType = Field(..., description="text, audio, or image")
    content: Optional[str] = Field(None, description="Text body (text messages)")
    media_url: Optional[str] = Field(None, description="Media URL (audio/image messages)")
    created_at: datetime = Field(..., description="Message timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "770e8400-e29b-41d4-a716-446655440000",
                "channel_id": "550e8400-e29b-41d4-a716-446655440000",
                "sender_id": "880e8400-e29b-41d4-a716-446655440000",
                "sender_name": "Alex",
                "message_type": "text",
                "content": "¡Yo la saco!",
                "media_url": None,
                "created_at": "2026-06-01T10:05:00Z",
            }
        }


__all__ = [
    "MessageType",
    "ChatChannelResponse",
    "ChatMessageCreate",
    "ChatMessageResponse",
]
