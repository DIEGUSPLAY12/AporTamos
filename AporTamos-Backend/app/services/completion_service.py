"""
Task Completion Service for AporTamos

Handles the full task completion flow: photo validation, Supabase Storage upload,
completion record creation, and assignment status update.

Functions:
- validate_photo(): Validate uploaded file is an image ≤ 5MB
- upload_to_storage(): Upload photo to Supabase Storage task-proofs bucket
- create_completion_record(): Insert task_completions row
- mark_assignment_complete(): Set task_assignments.is_completed = true
- complete_task(): Orchestrate the full completion flow
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, UploadFile, status

from app.config import (
    DatabaseException,
    ValidationException,
    log_debug,
    log_error,
    log_info,
)
from app.dependencies import get_supabase_client
from app.models.task import TaskCompletionResponse

logger = logging.getLogger(__name__)

PHOTO_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
STORAGE_BUCKET = "task-proofs"
SIGNED_URL_EXPIRES_IN = 60 * 60 * 24  # 24 hours


def validate_photo(file: UploadFile) -> None:
    """Validate that the uploaded file is an image and does not exceed 5 MB.

    Raises:
        HTTPException 400: If content-type is not an image or file size exceeds limit.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP.",
        )

    # UploadFile.size is set by FastAPI when the body is fully read; fall back to
    # reading content if size is not yet available.
    if file.size is not None and file.size > PHOTO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Photo exceeds the 5 MB limit (received {file.size} bytes).",
        )

    log_debug(
        "Photo validation passed",
        extra={"content_type": file.content_type, "size": file.size},
    )


async def upload_to_storage(
    file: UploadFile,
    household_id: str,
    task_id: str,
    assignment_id: str,
) -> str:
    """Upload a photo to the task-proofs Supabase Storage bucket.

    Storage path: task-proofs/{household_id}/{task_id}/{assignment_id}.jpg

    Returns:
        str: Signed URL valid for 24 hours to view the uploaded photo.

    Raises:
        HTTPException 500: If the upload or signed URL generation fails.
    """
    storage_path = f"{household_id}/{task_id}/{assignment_id}.jpg"

    try:
        contents = await file.read()

        if len(contents) > PHOTO_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Photo exceeds the 5 MB limit ({len(contents)} bytes).",
            )

        supabase = get_supabase_client()
        supabase.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )

        signed = supabase.storage.from_(STORAGE_BUCKET).create_signed_url(
            path=storage_path,
            expires_in=SIGNED_URL_EXPIRES_IN,
        )
        signed_url: str = signed["signedURL"]

        log_info(
            "Photo uploaded to Supabase Storage",
            extra={"path": storage_path, "size_bytes": len(contents)},
        )
        return signed_url

    except HTTPException:
        raise
    except Exception as exc:
        log_error(
            "Failed to upload photo to Supabase Storage",
            exc,
            extra={"path": storage_path},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload photo. Please try again.",
        ) from exc


async def create_completion_record(
    supabase,
    assignment_id: str,
    user_id: str,
    photo_url: str,
    completed_at: datetime,
) -> dict:
    """Insert a row into task_completions.

    Returns:
        dict: The inserted completion record.

    Raises:
        DatabaseException: If the insert fails.
    """
    try:
        response = (
            supabase.table("task_completions")
            .insert(
                {
                    "assignment_id": assignment_id,
                    "user_id": user_id,
                    "photo_url": photo_url,
                    "completed_at": completed_at.isoformat(),
                }
            )
            .execute()
        )

        record = response.data[0]
        log_info(
            "Task completion record created",
            extra={"assignment_id": assignment_id, "user_id": user_id},
        )
        return record

    except Exception as exc:
        log_error(
            "Failed to create task completion record",
            exc,
            extra={"assignment_id": assignment_id},
        )
        raise DatabaseException(
            f"Failed to create completion record: {str(exc)}",
            operation="insert_task_completions",
        ) from exc


async def mark_assignment_complete(supabase, assignment_id: str, completed_at: datetime) -> None:
    """Set is_completed = true and completed_at on the task_assignments row.

    Raises:
        DatabaseException: If the update fails.
    """
    try:
        supabase.table("task_assignments").update(
            {
                "is_completed": True,
                "completed_at": completed_at.isoformat(),
            }
        ).eq("id", assignment_id).execute()

        log_debug(
            "Task assignment marked complete",
            extra={"assignment_id": assignment_id},
        )

    except Exception as exc:
        log_error(
            "Failed to mark assignment complete",
            exc,
            extra={"assignment_id": assignment_id},
        )
        raise DatabaseException(
            f"Failed to mark assignment complete: {str(exc)}",
            operation="update_task_assignments",
        ) from exc


async def complete_task(
    assignment_id: str,
    user_id: str,
    household_id: str,
    task_id: str,
    photo_file: UploadFile,
) -> TaskCompletionResponse:
    """Orchestrate the full task completion flow.

    Steps:
    1. Validate photo (type + size)
    2. Upload photo to Supabase Storage
    3. Create task_completions record
    4. Mark task_assignments as complete

    Returns:
        TaskCompletionResponse: The created completion record.

    Raises:
        HTTPException: On validation or upload failures.
        DatabaseException: On database write failures.
    """
    validate_photo(photo_file)

    completed_at = datetime.now(timezone.utc)

    photo_url = await upload_to_storage(
        file=photo_file,
        household_id=household_id,
        task_id=task_id,
        assignment_id=assignment_id,
    )

    supabase = get_supabase_client()

    completion_record = await create_completion_record(
        supabase=supabase,
        assignment_id=assignment_id,
        user_id=user_id,
        photo_url=photo_url,
        completed_at=completed_at,
    )

    await mark_assignment_complete(
        supabase=supabase,
        assignment_id=assignment_id,
        completed_at=completed_at,
    )

    # If this completion brings the household to 100% today, bump its streak
    try:
        from app.services.gamification_service import update_streak_if_complete
        await update_streak_if_complete(UUID(household_id))
    except Exception as streak_exc:
        log_error("Failed to update streak after completion", streak_exc,
                  extra={"household_id": household_id})

    log_info(
        "Task completed successfully",
        extra={"assignment_id": assignment_id, "user_id": user_id},
    )

    return TaskCompletionResponse(
        id=UUID(completion_record["id"]),
        assignment_id=UUID(completion_record["assignment_id"]),
        user_id=UUID(completion_record["user_id"]),
        photo_url=completion_record["photo_url"],
        completed_at=datetime.fromisoformat(completion_record["completed_at"]),
    )
