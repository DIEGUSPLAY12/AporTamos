"""
Task Completion Endpoints for AporTamos

POST /tasks/{assignment_id}/complete — Mark a task assignment as complete
    with a required photo proof (multipart/form-data).

Photo validation (5 MB max, image/* content-type) and Supabase Storage
upload are handled by the completion service (T065/T069/T070).
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Path, UploadFile, status

from app.dependencies import get_current_user_id, get_supabase_client
from app.models.task import TaskCompletionResponse
from app.services.completion_service import complete_task
from app.config import DatabaseException, log_error, log_info

router = APIRouter(prefix="/tasks", tags=["Completions"])
logger = logging.getLogger(__name__)


@router.post(
    "/{assignment_id}/complete",
    response_model=TaskCompletionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def complete_task_endpoint(
    assignment_id: UUID = Path(..., description="TaskAssignment ID to mark as complete"),
    photo: UploadFile = File(..., description="Proof photo (JPEG/PNG, max 5 MB)"),
    current_user_id: UUID = Depends(get_current_user_id),
) -> TaskCompletionResponse:
    """Mark a task assignment as complete with a photo proof.

    Request: multipart/form-data
        - photo: image file (JPEG / PNG / WebP, max 5 MB)

    The endpoint:
    1. Validates the photo (type and size)
    2. Verifies the assignment exists and belongs to the current user
    3. Checks the assignment is not already completed
    4. Uploads the photo to Supabase Storage (task-proofs bucket)
    5. Creates a task_completions record
    6. Sets task_assignments.is_completed = true

    Returns:
        TaskCompletionResponse with completion id, photo_url (signed), and timestamps.

    Raises:
        400: No photo provided or invalid file type
        400: Photo exceeds 5 MB
        403: Assignment does not belong to the current user
        404: Assignment not found
        409: Task already completed
        500: Storage or database failure
    """
    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo is required to complete a task.",
        )

    try:
        supabase = get_supabase_client()

        # Fetch the assignment to validate ownership and state
        resp = (
            supabase
            .table("task_assignments")
            .select("id, task_id, household_id, assigned_to_user_id, is_completed")
            .eq("id", str(assignment_id))
            .single()
            .execute()
        )

        assignment = resp.data
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task assignment not found.",
            )

        if assignment["assigned_to_user_id"] != str(current_user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this task.",
            )

        if assignment["is_completed"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This task has already been completed.",
            )

        completion = await complete_task(
            assignment_id=str(assignment_id),
            user_id=str(current_user_id),
            household_id=assignment["household_id"],
            task_id=assignment["task_id"],
            photo_file=photo,
        )

        log_info(
            "Task completed",
            extra={
                "assignment_id": str(assignment_id),
                "user_id": str(current_user_id),
            },
        )

        return completion

    except HTTPException:
        raise
    except DatabaseException as exc:
        log_error(
            "Database error completing task",
            exc,
            extra={"assignment_id": str(assignment_id)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete task. Please try again.",
        )
    except Exception as exc:
        log_error(
            "Unexpected error completing task",
            exc,
            extra={"assignment_id": str(assignment_id)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred.",
        )
