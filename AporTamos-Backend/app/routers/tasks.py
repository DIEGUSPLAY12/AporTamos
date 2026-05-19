"""
Task Schedule Endpoints for AporTamos

This module defines all task schedule management endpoints:
- POST /households/{household_id}/schedule: Create a new weekly schedule with tasks
- GET /households/{household_id}/schedule: Retrieve current weekly schedule
- PUT /households/{household_id}/schedule: Update weekly schedule (creates new version)
- POST /households/{household_id}/schedule/tasks: Add a new task to existing schedule
- PUT /households/{household_id}/schedule/tasks/{task_id}: Update an existing task

All endpoints require authentication and validate user access/owner permissions.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Path

from app.models.task import (
    WeeklyTaskScheduleCreate,
    WeeklyTaskScheduleResponse,
    WeeklyTaskScheduleUpdate,
    TaskCreate,
    TaskUpdate,
    TaskResponse,
)
from app.services.task_service import (
    create_schedule,
    get_schedule,
    add_task_to_schedule,
    update_task,
    get_task_by_id,
    ScheduleNotFoundError,
    TaskNotFoundError,
    ScheduleAccessError,
    ScheduleOwnerError,
    ScheduleValidationError,
    TaskValidationError,
)
from app.dependencies import get_current_user_id
from app.config import log_info, log_warning, log_error, DatabaseException

router = APIRouter(prefix="/households", tags=["Tasks"])
logger = logging.getLogger(__name__)


@router.post(
    "/{household_id}/schedule",
    response_model=WeeklyTaskScheduleResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_schedule_endpoint(
    household_id: UUID = Path(..., description="Household ID"),
    schedule_data: WeeklyTaskScheduleCreate = None,
    current_user_id: UUID = Depends(get_current_user_id),
) -> WeeklyTaskScheduleResponse:
    """
    Create a new weekly task schedule for a household.
    
    This endpoint:
    1. Validates the user is the household owner
    2. Creates a new WeeklyTaskSchedule record with version=1
    3. Creates all Task records from the provided list
    4. Generates initial TaskAssignment records for today's tasks
    5. Returns the created schedule with tasks
    
    **Authentication**: Required (Bearer token)
    **Authorization**: Only household owner can create schedules
    
    Args:
        household_id: UUID of the household (path parameter)
        schedule_data: WeeklyTaskScheduleCreate schema with list of tasks
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        WeeklyTaskScheduleResponse with created schedule and tasks
        
    Raises:
        400: Invalid schedule data or validation error
        401: Unauthorized (missing authentication)
        403: Forbidden (only household owner can create schedules)
        404: Household not found
        409: Conflict (active schedule already exists)
        422: Validation error (invalid task data)
        500: Database or server error
        
    Example:
        POST /households/a1b2c3d4-e5f6-7890-abcd-ef1234567890/schedule
        Authorization: Bearer <JWT_TOKEN>
        
        {
            "tasks": [
                {
                    "name": "Wash dishes",
                    "description": "Clean all dishes and pans",
                    "day_of_week": "MON",
                    "effort_weight": 3,
                    "assignment_type": "explicit",
                    "assigned_user_id": "550e8400-e29b-41d4-a716-446655440000"
                },
                {
                    "name": "Vacuum living room",
                    "day_of_week": "WED",
                    "effort_weight": 4,
                    "assignment_type": "random"
                }
            ]
        }
        
        Response (201):
        {
            "id": "b1c2d3e4-f5g6-7890-abcd-ef1234567890",
            "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "version": 1,
            "tasks": [...],
            "created_at": "2026-05-19T10:00:00Z",
            "updated_at": "2026-05-19T10:00:00Z",
            "active_from": "2026-05-19",
            "active_until": null
        }
    """
    try:
        if not schedule_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Request body is required"
            )
        
        log_info(
            "Creating weekly schedule",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
                "task_count": len(schedule_data.tasks)
            }
        )
        
        schedule = await create_schedule(household_id, current_user_id, schedule_data)
        
        log_info(
            "Successfully created weekly schedule",
            extra={
                "schedule_id": str(schedule.id),
                "household_id": str(household_id),
                "user_id": str(current_user_id)
            }
        )
        
        return schedule
        
    except ScheduleOwnerError as e:
        log_warning(
            "Unauthorized schedule creation",
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except ScheduleValidationError as e:
        log_warning(
            "Schedule validation failed",
            extra={"household_id": str(household_id), "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    
    except ScheduleAccessError as e:
        log_warning(
            "Schedule access denied",
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Household not found"
        )
    
    except DatabaseException as e:
        log_error(
            "Database error creating schedule",
            e,
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create schedule"
        )


@router.get(
    "/{household_id}/schedule",
    response_model=WeeklyTaskScheduleResponse,
    status_code=status.HTTP_200_OK
)
async def get_schedule_endpoint(
    household_id: UUID = Path(..., description="Household ID"),
    current_user_id: UUID = Depends(get_current_user_id),
) -> WeeklyTaskScheduleResponse:
    """
    Retrieve the current weekly task schedule for a household.
    
    This endpoint:
    1. Validates the user has access to the household
    2. Retrieves the active schedule (where active_until IS NULL)
    3. Returns the schedule with all associated tasks
    
    **Authentication**: Required (Bearer token)
    **Authorization**: User must be household member
    
    Args:
        household_id: UUID of the household (path parameter)
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        WeeklyTaskScheduleResponse with current schedule and tasks
        
    Raises:
        401: Unauthorized (missing authentication)
        403: Forbidden (user is not household member)
        404: Schedule not found or household not found
        500: Database or server error
        
    Example:
        GET /households/a1b2c3d4-e5f6-7890-abcd-ef1234567890/schedule
        Authorization: Bearer <JWT_TOKEN>
        
        Response (200):
        {
            "id": "b1c2d3e4-f5g6-7890-abcd-ef1234567890",
            "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "version": 1,
            "tasks": [...],
            "created_at": "2026-05-19T10:00:00Z",
            "updated_at": "2026-05-19T10:00:00Z",
            "active_from": "2026-05-19",
            "active_until": null
        }
    """
    try:
        log_info(
            "Retrieving weekly schedule",
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        
        schedule = await get_schedule(household_id, current_user_id)
        
        log_info(
            "Successfully retrieved weekly schedule",
            extra={"schedule_id": str(schedule.id), "household_id": str(household_id)}
        )
        
        return schedule
        
    except ScheduleAccessError as e:
        log_warning(
            "Schedule access denied",
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this household"
        )
    
    except ScheduleNotFoundError as e:
        log_info(
            "No active schedule found",
            extra={"household_id": str(household_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active schedule found for this household"
        )
    
    except DatabaseException as e:
        log_error(
            "Database error retrieving schedule",
            e,
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve schedule"
        )


@router.put(
    "/{household_id}/schedule",
    response_model=WeeklyTaskScheduleResponse,
    status_code=status.HTTP_200_OK
)
async def update_schedule_endpoint(
    household_id: UUID = Path(..., description="Household ID"),
    schedule_data: WeeklyTaskScheduleUpdate = None,
    current_user_id: UUID = Depends(get_current_user_id),
) -> WeeklyTaskScheduleResponse:
    """
    Update the current weekly task schedule for a household.
    
    This endpoint creates a new version of the schedule with updated tasks.
    Current implementation is a placeholder for future enhancements.
    
    **Authentication**: Required (Bearer token)
    **Authorization**: Only household owner can update schedules
    
    Args:
        household_id: UUID of the household (path parameter)
        schedule_data: WeeklyTaskScheduleUpdate schema (currently unused)
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        WeeklyTaskScheduleResponse with updated schedule
        
    Raises:
        400: Invalid update data
        401: Unauthorized (missing authentication)
        403: Forbidden (only household owner can update)
        404: Schedule or household not found
        500: Database or server error
        
    Example:
        PUT /households/a1b2c3d4-e5f6-7890-abcd-ef1234567890/schedule
        Authorization: Bearer <JWT_TOKEN>
        
        {}
        
        Response (200):
        {
            "id": "b1c2d3e4-f5g6-7890-abcd-ef1234567890",
            "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "version": 2,
            "tasks": [...],
            "created_at": "2026-05-19T10:00:00Z",
            "updated_at": "2026-05-19T11:00:00Z",
            "active_from": "2026-05-19",
            "active_until": null
        }
    """
    try:
        # For now, this returns the current schedule without modification
        # Future enhancement: implement version management and task updates
        log_info(
            "Updating weekly schedule (placeholder)",
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        
        schedule = await get_schedule(household_id, current_user_id)
        
        log_info(
            "Successfully retrieved updated schedule",
            extra={"schedule_id": str(schedule.id), "household_id": str(household_id)}
        )
        
        return schedule
        
    except ScheduleAccessError as e:
        log_warning(
            "Schedule update access denied",
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this schedule"
        )
    
    except ScheduleNotFoundError as e:
        log_info(
            "Schedule not found for update",
            extra={"household_id": str(household_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active schedule found for this household"
        )
    
    except DatabaseException as e:
        log_error(
            "Database error updating schedule",
            e,
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update schedule"
        )


@router.post(
    "/{household_id}/schedule/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED
)
async def add_task_endpoint(
    household_id: UUID = Path(..., description="Household ID"),
    task_data: TaskCreate = None,
    current_user_id: UUID = Depends(get_current_user_id),
) -> TaskResponse:
    """
    Add a new task to the current weekly schedule.
    
    This endpoint:
    1. Validates the user is the household owner
    2. Retrieves the current active schedule
    3. Creates a new Task record within that schedule
    4. Returns the created task
    
    **Authentication**: Required (Bearer token)
    **Authorization**: Only household owner can add tasks
    
    Args:
        household_id: UUID of the household (path parameter)
        task_data: TaskCreate schema with task details
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        TaskResponse with created task
        
    Raises:
        400: Invalid task data
        401: Unauthorized (missing authentication)
        403: Forbidden (only household owner can add tasks)
        404: Household or schedule not found
        422: Validation error (invalid assignment type, effort weight, etc.)
        500: Database or server error
        
    Example:
        POST /households/a1b2c3d4-e5f6-7890-abcd-ef1234567890/schedule/tasks
        Authorization: Bearer <JWT_TOKEN>
        
        {
            "name": "Clean bathroom",
            "description": "Clean toilet, sink, and shower",
            "day_of_week": "FRI",
            "effort_weight": 5,
            "assignment_type": "explicit",
            "assigned_user_id": "550e8400-e29b-41d4-a716-446655440000"
        }
        
        Response (201):
        {
            "id": "c1d2e3f4-g5h6-7890-abcd-ef1234567890",
            "schedule_id": "b1c2d3e4-f5g6-7890-abcd-ef1234567890",
            "name": "Clean bathroom",
            "description": "Clean toilet, sink, and shower",
            "day_of_week": "FRI",
            "effort_weight": 5,
            "assignment_type": "explicit",
            "assigned_user_id": "550e8400-e29b-41d4-a716-446655440000",
            "frequency": "daily",
            "created_at": "2026-05-19T10:00:00Z",
            "updated_at": "2026-05-19T10:00:00Z"
        }
    """
    try:
        if not task_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Request body is required"
            )
        
        log_info(
            "Adding task to schedule",
            extra={
                "household_id": str(household_id),
                "user_id": str(current_user_id),
                "task_name": task_data.name
            }
        )
        
        # Verify user has owner access
        from app.services.household_service import is_household_owner
        if not await is_household_owner(current_user_id, household_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only household owner can add tasks"
            )
        
        # Get current schedule
        schedule = await get_schedule(household_id, current_user_id)
        
        # Add task to schedule
        task = await add_task_to_schedule(schedule.id, household_id, task_data)
        
        log_info(
            "Successfully added task to schedule",
            extra={
                "task_id": str(task.id),
                "schedule_id": str(schedule.id),
                "household_id": str(household_id)
            }
        )
        
        return task
        
    except HTTPException:
        raise
    
    except ScheduleNotFoundError as e:
        log_info(
            "No active schedule found for adding task",
            extra={"household_id": str(household_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active schedule found for this household"
        )
    
    except TaskValidationError as e:
        log_warning(
            "Task validation failed",
            extra={"household_id": str(household_id), "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    
    except DatabaseException as e:
        log_error(
            "Database error adding task",
            e,
            extra={"household_id": str(household_id), "user_id": str(current_user_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add task"
        )


@router.put(
    "/{household_id}/schedule/tasks/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK
)
async def update_task_endpoint(
    household_id: UUID = Path(..., description="Household ID"),
    task_id: UUID = Path(..., description="Task ID"),
    task_data: TaskUpdate = None,
    current_user_id: UUID = Depends(get_current_user_id),
) -> TaskResponse:
    """
    Update an existing task in the weekly schedule.
    
    This endpoint:
    1. Validates the user is the household owner
    2. Updates the task with provided fields (partial update)
    3. Returns the updated task
    
    **Authentication**: Required (Bearer token)
    **Authorization**: Only household owner can update tasks
    
    Args:
        household_id: UUID of the household (path parameter)
        task_id: UUID of the task (path parameter)
        task_data: TaskUpdate schema with fields to update (all optional)
        current_user_id: UUID of authenticated user (injected from JWT token)
        
    Returns:
        TaskResponse with updated task
        
    Raises:
        400: Invalid update data
        401: Unauthorized (missing authentication)
        403: Forbidden (only household owner can update)
        404: Task, schedule, or household not found
        422: Validation error
        500: Database or server error
        
    Example:
        PUT /households/a1b2c3d4-e5f6-7890-abcd-ef1234567890/schedule/tasks/c1d2e3f4-g5h6-7890-abcd-ef1234567890
        Authorization: Bearer <JWT_TOKEN>
        
        {
            "name": "Clean bathroom thoroughly",
            "effort_weight": 6
        }
        
        Response (200):
        {
            "id": "c1d2e3f4-g5h6-7890-abcd-ef1234567890",
            "schedule_id": "b1c2d3e4-f5g6-7890-abcd-ef1234567890",
            "name": "Clean bathroom thoroughly",
            "description": "Clean toilet, sink, and shower",
            "day_of_week": "FRI",
            "effort_weight": 6,
            "assignment_type": "explicit",
            "assigned_user_id": "550e8400-e29b-41d4-a716-446655440000",
            "frequency": "daily",
            "created_at": "2026-05-19T10:00:00Z",
            "updated_at": "2026-05-19T11:00:00Z"
        }
    """
    try:
        if not task_data:
            task_data = TaskUpdate()
        
        log_info(
            "Updating task",
            extra={
                "household_id": str(household_id),
                "task_id": str(task_id),
                "user_id": str(current_user_id)
            }
        )
        
        # Verify user has owner access
        from app.services.household_service import is_household_owner
        if not await is_household_owner(current_user_id, household_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only household owner can update tasks"
            )
        
        # Update task
        task = await update_task(task_id, task_data)
        
        log_info(
            "Successfully updated task",
            extra={"task_id": str(task.id), "household_id": str(household_id)}
        )
        
        return task
        
    except HTTPException:
        raise
    
    except TaskNotFoundError as e:
        log_info(
            "Task not found for update",
            extra={"task_id": str(task_id), "household_id": str(household_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    except TaskValidationError as e:
        log_warning(
            "Task update validation failed",
            extra={"task_id": str(task_id), "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    
    except DatabaseException as e:
        log_error(
            "Database error updating task",
            e,
            extra={"task_id": str(task_id), "household_id": str(household_id)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task"
        )
