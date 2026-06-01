"""
Task Service for AporTamos

Handles task and schedule management logic including creation, updates,
and task assignment operations. Uses Supabase as the database backend.

This service is used by task endpoints and provides core functionality
for the weekly task schedule and daily task assignment system.

Functions:
- create_schedule(): Create a new weekly task schedule with tasks
- get_schedule(): Retrieve current schedule for a household
- get_schedule_by_id(): Retrieve schedule by ID
- add_task_to_schedule(): Add a new task to an existing schedule
- update_task(): Update task details
- get_task_by_id(): Retrieve task by ID
- generate_daily_assignments(): Generate TaskAssignment records for today's tasks in a household
- generate_daily_assignments_batch(): Generate daily TaskAssignment records for all households
- check_owner_access(): Verify user is household owner
"""

import logging
from datetime import datetime, date, timedelta
from typing import Optional, List
from uuid import UUID, uuid4

from app.models.task import (
    WeeklyTaskSchedule,
    WeeklyTaskScheduleCreate,
    WeeklyTaskScheduleResponse,
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    DayOfWeek,
    AssignmentType,
    TaskSummaryItem,
    TaskListResponse,
)
from app.dependencies import get_supabase_client
from app.config import (
    DatabaseException,
    ValidationException,
    log_debug,
    log_error,
    log_info,
    log_warning,
)

logger = logging.getLogger(__name__)


class TaskError(Exception):
    """Base exception for task-related errors."""
    pass


class ScheduleNotFoundError(TaskError):
    """Raised when a schedule cannot be found."""
    pass


class TaskNotFoundError(TaskError):
    """Raised when a task cannot be found."""
    pass


class ScheduleAccessError(TaskError):
    """Raised when user does not have access to schedule."""
    pass


class ScheduleOwnerError(TaskError):
    """Raised when only household owner can perform this action."""
    pass


class ScheduleValidationError(TaskError):
    """Raised when schedule validation fails."""
    pass


class TaskValidationError(TaskError):
    """Raised when task validation fails."""
    pass


async def create_schedule(
    household_id: UUID,
    user_id: UUID,
    schedule_data: WeeklyTaskScheduleCreate,
) -> WeeklyTaskScheduleResponse:
    """Create a new weekly task schedule for a household.
    
    This function:
    1. Verifies user is household owner
    2. Checks no other active schedule exists
    3. Creates new WeeklyTaskSchedule record
    4. Creates all Task records from the provided list
    5. Generates initial TaskAssignment records
    
    Args:
        household_id: UUID of the household
        user_id: UUID of the user (must be owner)
        schedule_data: WeeklyTaskScheduleCreate with list of tasks
        
    Returns:
        WeeklyTaskScheduleResponse object with created schedule and tasks
        
    Raises:
        ScheduleOwnerError: If user is not household owner
        ScheduleValidationError: If validation fails
        DatabaseException: If database operation fails
    """
    supabase = get_supabase_client()
    
    try:
        # Verify user is household owner
        household = await _get_household_or_fail(supabase, household_id, user_id)
        
        if household.get("owner_id") != str(user_id):
            log_warning(
                "Unauthorized schedule creation attempt",
                extra={"user_id": str(user_id), "household_id": str(household_id)}
            )
            raise ScheduleOwnerError("Only household owner can create schedules")
        
        # Check if active schedule already exists
        active_schedules = supabase.table("weekly_task_schedules").select("*").eq(
            "household_id", str(household_id)
        ).is_("active_until", "null").execute()
        
        if active_schedules.data:
            log_warning(
                "Attempt to create schedule when active schedule exists",
                extra={"household_id": str(household_id)}
            )
            raise ScheduleValidationError(
                "Household already has an active schedule. Archive existing schedule first."
            )
        
        # Create schedule record
        schedule_id = str(uuid4())
        today = date.today()
        
        schedule_record = {
            "id": schedule_id,
            "household_id": str(household_id),
            "version": 1,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "active_from": str(today),
            "active_until": None,
            "deleted_at": None,
        }
        
        supabase.table("weekly_task_schedules").insert(schedule_record).execute()
        
        log_info(
            "Created weekly task schedule",
            extra={"schedule_id": schedule_id, "household_id": str(household_id), "task_count": len(schedule_data.tasks)}
        )
        
        # Create all tasks
        tasks = []
        for task_data in schedule_data.tasks:
            task = await add_task_to_schedule(
                schedule_id=UUID(schedule_id),
                household_id=household_id,
                task_data=task_data
            )
            tasks.append(task)
        
        # Generate daily assignments for all tasks
        await generate_daily_assignments(schedule_id=UUID(schedule_id), household_id=household_id)
        
        return WeeklyTaskScheduleResponse(
            id=UUID(schedule_id),
            household_id=household_id,
            version=1,
            tasks=tasks,
            created_at=datetime.fromisoformat(schedule_record["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(schedule_record["updated_at"].replace("Z", "+00:00")),
            active_from=today,
            active_until=None,
        )
        
    except (ScheduleOwnerError, ScheduleValidationError):
        raise
    except Exception as exc:
        log_error(
            "Failed to create schedule",
            exc,
            extra={"household_id": str(household_id), "user_id": str(user_id)}
        )
        raise DatabaseException(
            f"Failed to create schedule: {str(exc)}",
            operation="create_schedule"
        ) from exc


async def get_schedule(household_id: UUID, user_id: UUID) -> WeeklyTaskScheduleResponse:
    """Retrieve the current active schedule for a household.
    
    Args:
        household_id: UUID of the household
        user_id: UUID of the user (must have access to household)
        
    Returns:
        WeeklyTaskScheduleResponse object with schedule and tasks
        
    Raises:
        ScheduleAccessError: If user does not have access
        ScheduleNotFoundError: If no active schedule exists
        DatabaseException: If database operation fails
    """
    try:
        # Verify user has access to household
        await _check_household_access(user_id, household_id)
        
        # Get active schedule
        response = (
            get_supabase_client()
            .table("weekly_task_schedules")
            .select("*")
            .eq("household_id", str(household_id))
            .is_("active_until", "null")
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
        
        schedule_data = response.data
        
        # Get tasks for schedule
        tasks_response = (
            get_supabase_client()
            .table("tasks")
            .select("*")
            .eq("schedule_id", schedule_data["id"])
            .execute()
        )
        
        tasks = [TaskResponse(**task) for task in tasks_response.data]
        
        return WeeklyTaskScheduleResponse(
            id=UUID(schedule_data["id"]),
            household_id=UUID(schedule_data["household_id"]),
            version=schedule_data["version"],
            tasks=tasks,
            created_at=datetime.fromisoformat(schedule_data["created_at"]),
            updated_at=datetime.fromisoformat(schedule_data["updated_at"]),
            active_from=datetime.fromisoformat(schedule_data["active_from"]).date(),
            active_until=datetime.fromisoformat(schedule_data["active_until"]).date() if schedule_data["active_until"] else None,
        )
        
    except Exception as exc:
        log_error(
            "Failed to retrieve schedule",
            exc,
            extra={"household_id": str(household_id), "user_id": str(user_id)}
        )
        if "not found" in str(exc).lower():
            raise ScheduleNotFoundError("No active schedule found for this household")
        raise DatabaseException(
            f"Failed to retrieve schedule: {str(exc)}",
            operation="get_schedule"
        ) from exc


async def get_schedule_by_id(schedule_id: UUID) -> WeeklyTaskScheduleResponse:
    """Retrieve a schedule by ID.
    
    Args:
        schedule_id: UUID of the schedule
        
    Returns:
        WeeklyTaskScheduleResponse object
        
    Raises:
        ScheduleNotFoundError: If schedule does not exist
        DatabaseException: If database operation fails
    """
    try:
        response = (
            get_supabase_client()
            .table("weekly_task_schedules")
            .select("*")
            .eq("id", str(schedule_id))
            .single()
            .execute()
        )
        
        schedule_data = response.data
        
        # Get tasks
        tasks_response = (
            get_supabase_client()
            .table("tasks")
            .select("*")
            .eq("schedule_id", str(schedule_id))
            .execute()
        )
        
        tasks = [TaskResponse(**task) for task in tasks_response.data]
        
        return WeeklyTaskScheduleResponse(
            id=UUID(schedule_data["id"]),
            household_id=UUID(schedule_data["household_id"]),
            version=schedule_data["version"],
            tasks=tasks,
            created_at=datetime.fromisoformat(schedule_data["created_at"]),
            updated_at=datetime.fromisoformat(schedule_data["updated_at"]),
            active_from=datetime.fromisoformat(schedule_data["active_from"]).date(),
            active_until=datetime.fromisoformat(schedule_data["active_until"]).date() if schedule_data["active_until"] else None,
        )
        
    except Exception as exc:
        log_error(
            "Failed to retrieve schedule by ID",
            exc,
            extra={"schedule_id": str(schedule_id)}
        )
        if "not found" in str(exc).lower():
            raise ScheduleNotFoundError(f"Schedule {schedule_id} not found")
        raise DatabaseException(
            f"Failed to retrieve schedule: {str(exc)}",
            operation="get_schedule_by_id"
        ) from exc


async def add_task_to_schedule(
    schedule_id: UUID,
    household_id: UUID,
    task_data: TaskCreate,
) -> TaskResponse:
    """Add a new task to an existing schedule.
    
    Args:
        schedule_id: UUID of the schedule
        household_id: UUID of the household
        task_data: TaskCreate schema with task details
        
    Returns:
        TaskResponse object with created task
        
    Raises:
        TaskValidationError: If validation fails
        DatabaseException: If database operation fails
    """
    supabase = get_supabase_client()
    
    try:
        # Create task record
        task_id = str(uuid4())
        
        task_record = {
            "id": task_id,
            "schedule_id": str(schedule_id),
            "name": task_data.name,
            "description": task_data.description,
            "day_of_week": task_data.day_of_week.value,
            "effort_weight": task_data.effort_weight,
            "assignment_type": task_data.assignment_type.value,
            "assigned_user_id": str(task_data.assigned_user_id) if task_data.assigned_user_id else None,
            "frequency": task_data.frequency.value,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        
        response = supabase.table("tasks").insert(task_record).execute()
        
        created_task = response.data[0] if response.data else task_record
        
        log_info(
            "Added task to schedule",
            extra={"task_id": task_id, "schedule_id": str(schedule_id), "household_id": str(household_id)}
        )
        
        return TaskResponse(
            id=UUID(created_task["id"]),
            schedule_id=UUID(created_task["schedule_id"]),
            name=created_task["name"],
            description=created_task.get("description"),
            day_of_week=DayOfWeek(created_task["day_of_week"]),
            effort_weight=created_task["effort_weight"],
            assignment_type=AssignmentType(created_task["assignment_type"]),
            assigned_user_id=UUID(created_task["assigned_user_id"]) if created_task.get("assigned_user_id") else None,
            frequency=created_task["frequency"],
            created_at=datetime.fromisoformat(created_task["created_at"]),
            updated_at=datetime.fromisoformat(created_task["updated_at"]),
        )
        
    except Exception as exc:
        log_error(
            "Failed to add task to schedule",
            exc,
            extra={"schedule_id": str(schedule_id), "household_id": str(household_id)}
        )
        raise DatabaseException(
            f"Failed to add task: {str(exc)}",
            operation="add_task_to_schedule"
        ) from exc


async def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
) -> TaskResponse:
    """Update an existing task.
    
    Args:
        task_id: UUID of the task
        task_data: TaskUpdate schema with fields to update
        
    Returns:
        TaskResponse object with updated task
        
    Raises:
        TaskNotFoundError: If task does not exist
        DatabaseException: If database operation fails
    """
    supabase = get_supabase_client()
    
    try:
        # Build update data (only include provided fields)
        update_data = {}
        
        if task_data.name is not None:
            update_data["name"] = task_data.name
        if task_data.description is not None:
            update_data["description"] = task_data.description
        if task_data.day_of_week is not None:
            update_data["day_of_week"] = task_data.day_of_week.value
        if task_data.effort_weight is not None:
            update_data["effort_weight"] = task_data.effort_weight
        if task_data.assignment_type is not None:
            update_data["assignment_type"] = task_data.assignment_type.value
        if task_data.assigned_user_id is not None:
            update_data["assigned_user_id"] = str(task_data.assigned_user_id)
        elif task_data.assignment_type == AssignmentType.RANDOM:
            # For random assignment, explicitly set assigned_user_id to null
            update_data["assigned_user_id"] = None
        if task_data.frequency is not None:
            update_data["frequency"] = task_data.frequency.value
        
        # Add update timestamp
        update_data["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        response = supabase.table("tasks").update(update_data).eq("id", str(task_id)).execute()
        
        if not response.data:
            raise TaskNotFoundError(f"Task {task_id} not found")
        
        updated_task = response.data[0]
        
        log_info(
            "Updated task",
            extra={"task_id": str(task_id)}
        )
        
        return TaskResponse(
            id=UUID(updated_task["id"]),
            schedule_id=UUID(updated_task["schedule_id"]),
            name=updated_task["name"],
            description=updated_task.get("description"),
            day_of_week=DayOfWeek(updated_task["day_of_week"]),
            effort_weight=updated_task["effort_weight"],
            assignment_type=AssignmentType(updated_task["assignment_type"]),
            assigned_user_id=UUID(updated_task["assigned_user_id"]) if updated_task.get("assigned_user_id") else None,
            frequency=updated_task["frequency"],
            created_at=datetime.fromisoformat(updated_task["created_at"]),
            updated_at=datetime.fromisoformat(updated_task["updated_at"]),
        )
        
    except TaskNotFoundError:
        raise
    except Exception as exc:
        log_error(
            "Failed to update task",
            exc,
            extra={"task_id": str(task_id)}
        )
        raise DatabaseException(
            f"Failed to update task: {str(exc)}",
            operation="update_task"
        ) from exc


async def get_task_by_id(task_id: UUID) -> TaskResponse:
    """Retrieve a task by ID.
    
    Args:
        task_id: UUID of the task
        
    Returns:
        TaskResponse object
        
    Raises:
        TaskNotFoundError: If task does not exist
        DatabaseException: If database operation fails
    """
    try:
        response = (
            get_supabase_client()
            .table("tasks")
            .select("*")
            .eq("id", str(task_id))
            .single()
            .execute()
        )
        
        task_data = response.data
        
        return TaskResponse(
            id=UUID(task_data["id"]),
            schedule_id=UUID(task_data["schedule_id"]),
            name=task_data["name"],
            description=task_data.get("description"),
            day_of_week=DayOfWeek(task_data["day_of_week"]),
            effort_weight=task_data["effort_weight"],
            assignment_type=AssignmentType(task_data["assignment_type"]),
            assigned_user_id=UUID(task_data["assigned_user_id"]) if task_data.get("assigned_user_id") else None,
            frequency=task_data["frequency"],
            created_at=datetime.fromisoformat(task_data["created_at"]),
            updated_at=datetime.fromisoformat(task_data["updated_at"]),
        )
        
    except Exception as exc:
        log_error(
            "Failed to retrieve task",
            exc,
            extra={"task_id": str(task_id)}
        )
        if "not found" in str(exc).lower():
            raise TaskNotFoundError(f"Task {task_id} not found")
        raise DatabaseException(
            f"Failed to retrieve task: {str(exc)}",
            operation="get_task_by_id"
        ) from exc


async def generate_daily_assignments(schedule_id: UUID, household_id: UUID) -> None:
    """Generate daily TaskAssignment records for today's tasks in the schedule.
    
    This function:
    1. Gets all tasks for the specified schedule
    2. Gets today's day of week
    3. For each task matching today's day:
       - If explicit assignment: create TaskAssignment for assigned user
       - If random assignment: randomly select a household member
    4. Creates TaskAssignment records
    
    Args:
        schedule_id: UUID of the schedule
        household_id: UUID of the household
        
    Raises:
        DatabaseException: If database operation fails
    """
    supabase = get_supabase_client()
    
    try:
        today = date.today()
        # strftime("%a") returns "Mon","Tue"… ; .upper()[:3] gives "MON","TUE"…
        # DayOfWeek enum values are already "MON","TUE"… so use directly
        today_day_of_week = today.strftime("%a").upper()[:3]
        valid_days = {d.value for d in DayOfWeek}
        if today_day_of_week not in valid_days:
            log_warning(
                "Could not determine day of week for task assignment",
                extra={"today": str(today), "computed": today_day_of_week}
            )
            return
        
        # Get tasks for today
        tasks_response = (
            supabase
            .table("tasks")
            .select("*")
            .eq("schedule_id", str(schedule_id))
            .eq("day_of_week", today_day_of_week)
            .execute()
        )
        
        if not tasks_response.data:
            log_debug(
                "No tasks scheduled for today",
                extra={"household_id": str(household_id), "day": today_day_of_week}
            )
            return
        
        # Get household members for random assignment
        members_response = (
            supabase
            .table("household_members")
            .select("user_id")
            .eq("household_id", str(household_id))
            .execute()
        )
        
        household_members = [m["user_id"] for m in members_response.data] if members_response.data else []
        
        if not household_members:
            log_warning(
                "No household members found for assignment",
                extra={"household_id": str(household_id)}
            )
            return
        
        # Generate assignments
        assignments_to_create = []
        
        for task in tasks_response.data:
            assignment_user_id = None
            
            if task["assignment_type"] == "explicit":
                assignment_user_id = task["assigned_user_id"]
            elif task["assignment_type"] == "random":
                # Randomly select from household members
                import random
                assignment_user_id = random.choice(household_members)
            
            if assignment_user_id:
                assignment = {
                    "id": str(uuid4()),
                    "task_id": task["id"],
                    "household_id": str(household_id),
                    "assigned_to_user_id": assignment_user_id,
                    "assignment_date": str(today),
                    "is_completed": False,
                    "completed_at": None,
                    "created_at": datetime.utcnow().isoformat() + "Z",
                    "updated_at": datetime.utcnow().isoformat() + "Z",
                }
                assignments_to_create.append(assignment)
        
        if assignments_to_create:
            supabase.table("task_assignments").insert(assignments_to_create).execute()
            
            log_info(
                "Generated daily task assignments",
                extra={
                    "household_id": str(household_id),
                    "schedule_id": str(schedule_id),
                    "assignment_count": len(assignments_to_create),
                    "date": str(today)
                }
            )
        
    except Exception as exc:
        log_error(
            "Failed to generate daily assignments",
            exc,
            extra={"schedule_id": str(schedule_id), "household_id": str(household_id)}
        )
        raise DatabaseException(
            f"Failed to generate assignments: {str(exc)}",
            operation="generate_daily_assignments"
        ) from exc


async def generate_daily_assignments_batch(target_date: Optional[date] = None) -> dict:
    """Generate daily TaskAssignment records for all households for a specific date.
    
    This is the batch/internal function that generates daily assignments for all active
    schedules in the system. It should be called daily (e.g., via cron job or scheduler).
    
    Args:
        target_date: Date to generate assignments for (default: today)
        
    Returns:
        dict with statistics: {
            "date": str,
            "total_households": int,
            "households_processed": int,
            "households_failed": int,
            "total_assignments_created": int,
            "errors": list
        }
    """
    supabase = get_supabase_client()
    
    if target_date is None:
        target_date = date.today()
    
    today_day_of_week = target_date.strftime("%a").upper()[:3]
    if today_day_of_week not in {d.value for d in DayOfWeek}:
        log_error(
            "Could not determine day of week for batch assignment generation",
            Exception("Invalid day mapping"),
            extra={"date": str(target_date)}
        )
        return {
            "date": str(target_date),
            "total_households": 0,
            "households_processed": 0,
            "households_failed": 0,
            "total_assignments_created": 0,
            "errors": ["Could not determine day of week"]
        }
    
    try:
        # Get all active schedules
        schedules_response = (
            supabase
            .table("weekly_task_schedules")
            .select("id, household_id")
            .is_("active_until", "null")
            .is_("deleted_at", "null")
            .execute()
        )
        
        schedules = schedules_response.data if schedules_response.data else []
        
        # Get all households for statistics
        households_response = (
            supabase
            .table("households")
            .select("id")
            .is_("deleted_at", "null")
            .execute()
        )
        
        total_households = len(households_response.data) if households_response.data else 0
        households_processed = 0
        households_failed = 0
        total_assignments_created = 0
        errors = []
        
        log_info(
            "Starting batch daily assignment generation",
            extra={
                "date": str(target_date),
                "day_of_week": today_day_of_week,
                "total_schedules": len(schedules),
                "total_households": total_households
            }
        )
        
        # Process each active schedule
        for schedule in schedules:
            try:
                household_id = schedule["household_id"]
                schedule_id = schedule["id"]
                
                # Get tasks for this day
                tasks_response = (
                    supabase
                    .table("tasks")
                    .select("*")
                    .eq("schedule_id", schedule_id)
                    .eq("day_of_week", today_day_of_week)
                    .execute()
                )
                
                tasks = tasks_response.data if tasks_response.data else []
                
                if not tasks:
                    # No tasks for this day, skip
                    households_processed += 1
                    continue
                
                # Get household members for random assignment
                members_response = (
                    supabase
                    .table("household_members")
                    .select("user_id")
                    .eq("household_id", household_id)
                    .execute()
                )
                
                household_members = [m["user_id"] for m in members_response.data] if members_response.data else []
                
                if not household_members:
                    log_warning(
                        "No household members found for assignment",
                        extra={"household_id": household_id, "date": str(target_date)}
                    )
                    households_processed += 1
                    continue
                
                # Check if assignments already exist for this date
                existing_response = (
                    supabase
                    .table("task_assignments")
                    .select("id")
                    .eq("household_id", household_id)
                    .eq("assignment_date", str(target_date))
                    .limit(1)
                    .execute()
                )
                
                if existing_response.data:
                    # Assignments already exist for this date, skip
                    log_debug(
                        "Assignments already exist for date",
                        extra={"household_id": household_id, "date": str(target_date)}
                    )
                    households_processed += 1
                    continue
                
                # Generate assignments
                assignments_to_create = []
                
                for task in tasks:
                    assignment_user_id = None
                    
                    if task["assignment_type"] == "explicit":
                        assignment_user_id = task["assigned_user_id"]
                    elif task["assignment_type"] == "random":
                        # Randomly select from household members
                        import random
                        assignment_user_id = random.choice(household_members)
                    
                    if assignment_user_id:
                        assignment = {
                            "id": str(uuid4()),
                            "task_id": task["id"],
                            "household_id": household_id,
                            "assigned_to_user_id": assignment_user_id,
                            "assignment_date": str(target_date),
                            "is_completed": False,
                            "completed_at": None,
                            "created_at": datetime.utcnow().isoformat() + "Z",
                            "updated_at": datetime.utcnow().isoformat() + "Z",
                        }
                        assignments_to_create.append(assignment)
                
                if assignments_to_create:
                    supabase.table("task_assignments").insert(assignments_to_create).execute()
                    total_assignments_created += len(assignments_to_create)
                
                households_processed += 1
                
            except Exception as exc:
                households_failed += 1
                error_msg = f"Failed to generate assignments for household {schedule['household_id']}: {str(exc)}"
                errors.append(error_msg)
                log_error(
                    "Error generating assignments for household",
                    exc,
                    extra={"household_id": schedule["household_id"], "date": str(target_date)}
                )
        
        log_info(
            "Batch daily assignment generation completed",
            extra={
                "date": str(target_date),
                "households_processed": households_processed,
                "households_failed": households_failed,
                "total_assignments_created": total_assignments_created
            }
        )
        
        return {
            "date": str(target_date),
            "total_households": total_households,
            "households_processed": households_processed,
            "households_failed": households_failed,
            "total_assignments_created": total_assignments_created,
            "errors": errors
        }
        
    except Exception as exc:
        log_error(
            "Failed to run batch daily assignment generation",
            exc,
            extra={"date": str(target_date)}
        )
        return {
            "date": str(target_date),
            "total_households": 0,
            "households_processed": 0,
            "households_failed": 0,
            "total_assignments_created": 0,
            "errors": [f"Batch generation failed: {str(exc)}"]
        }


# Helper functions

async def _check_household_access(user_id: UUID, household_id: UUID) -> None:
    """Verify user has access to household.
    
    Raises:
        ScheduleAccessError: If user does not have access
    """
    supabase = get_supabase_client()
    
    try:
        response = (
            supabase
            .table("household_members")
            .select("id")
            .eq("household_id", str(household_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        
        if not response.data:
            raise ScheduleAccessError("User does not have access to this household")
            
    except Exception as exc:
        if isinstance(exc, ScheduleAccessError):
            raise
        raise DatabaseException(
            f"Failed to check household access: {str(exc)}",
            operation="check_household_access"
        ) from exc


async def _get_household_or_fail(supabase, household_id: UUID, user_id: UUID) -> dict:
    """Get household and verify access.
    
    Raises:
        ScheduleAccessError: If household not found or no access
    """
    try:
        response = (
            supabase
            .table("households")
            .select("*")
            .eq("id", str(household_id))
            .single()
            .execute()
        )
        
        household = response.data
        
        # Verify user has access
        await _check_household_access(user_id, household_id)
        
        return household
        
    except Exception as exc:
        if isinstance(exc, ScheduleAccessError):
            raise
        raise ScheduleAccessError(f"Household not found or no access: {str(exc)}") from exc


async def get_user_tasks(
    household_id: UUID,
    user_id: UUID,
    target_date: Optional[date] = None,
) -> TaskListResponse:
    """Fetch the current user's task assignments for a given date.

    Queries task_assignments filtered by household, user, and date, then
    joins task definitions and the assigned user's name to build the response.

    Args:
        household_id: Household to query
        user_id: Only return assignments for this user
        target_date: Date to query (defaults to today)

    Returns:
        TaskListResponse with tasks and completion percentage

    Raises:
        ScheduleAccessError: If the household is not found or user has no access
        DatabaseException: On unexpected database errors
    """
    if target_date is None:
        target_date = date.today()

    date_str = target_date.isoformat()

    try:
        supabase = get_supabase_client()

        # Fetch household (also verifies access)
        household = await _get_household_or_fail(supabase, household_id, user_id)
        household_name = household.get("name", "")

        # Fetch assignments for this user on this date, embedding task + user name
        response = (
            supabase
            .table("task_assignments")
            .select("id, is_completed, assignment_date, tasks(id, name, effort_weight), users!assigned_to_user_id(name)")
            .eq("household_id", str(household_id))
            .eq("assigned_to_user_id", str(user_id))
            .eq("assignment_date", date_str)
            .execute()
        )

        rows = response.data or []

        total_weight = 0
        completed_weight = 0
        items: List[TaskSummaryItem] = []

        for row in rows:
            task_data = row.get("tasks") or {}
            user_data = row.get("users") or {}
            effort = task_data.get("effort_weight", 1)
            is_done = row.get("is_completed", False)

            total_weight += effort
            if is_done:
                completed_weight += effort

            items.append(TaskSummaryItem(
                task_id=task_data["id"],
                assignment_id=row["id"],
                name=task_data.get("name", ""),
                effort_weight=effort,
                is_completed=is_done,
                assigned_to=user_data.get("name", ""),
                assignment_date=date.fromisoformat(row["assignment_date"]),
            ))

        pct = round((completed_weight / total_weight) * 100, 1) if total_weight > 0 else 0.0

        return TaskListResponse(
            date=date_str,
            household_id=household_id,
            household_name=household_name,
            daily_completion_pct=pct,
            tasks=items,
        )

    except ScheduleAccessError:
        raise
    except Exception as exc:
        log_error(
            "Failed to fetch user tasks",
            exc,
            extra={"household_id": str(household_id), "user_id": str(user_id), "date": date_str},
        )
        raise DatabaseException(
            f"Failed to fetch user tasks: {str(exc)}",
            operation="get_user_tasks",
        ) from exc


async def get_household_tasks(
    household_id: UUID,
    user_id: UUID,
    target_date: Optional[date] = None,
) -> TaskListResponse:
    """Fetch all household task assignments for a given date (all members).

    Similar to get_user_tasks but returns every member's assignments, not just
    the requesting user's.

    Args:
        household_id: Household to query
        user_id: Requesting user (used for access check only)
        target_date: Date to query (defaults to today)

    Returns:
        TaskListResponse with all tasks and completion percentage

    Raises:
        ScheduleAccessError: If household not found or user has no access
        DatabaseException: On unexpected database errors
    """
    if target_date is None:
        target_date = date.today()

    date_str = target_date.isoformat()

    try:
        supabase = get_supabase_client()

        household = await _get_household_or_fail(supabase, household_id, user_id)
        household_name = household.get("name", "")

        response = (
            supabase
            .table("task_assignments")
            .select("id, is_completed, assignment_date, tasks(id, name, effort_weight), users!assigned_to_user_id(name)")
            .eq("household_id", str(household_id))
            .eq("assignment_date", date_str)
            .execute()
        )

        rows = response.data or []

        total_weight = 0
        completed_weight = 0
        items: List[TaskSummaryItem] = []

        for row in rows:
            task_data = row.get("tasks") or {}
            user_data = row.get("users") or {}
            effort = task_data.get("effort_weight", 1)
            is_done = row.get("is_completed", False)

            total_weight += effort
            if is_done:
                completed_weight += effort

            items.append(TaskSummaryItem(
                task_id=task_data["id"],
                assignment_id=row["id"],
                name=task_data.get("name", ""),
                effort_weight=effort,
                is_completed=is_done,
                assigned_to=user_data.get("name", ""),
                assignment_date=date.fromisoformat(row["assignment_date"]),
            ))

        pct = round((completed_weight / total_weight) * 100, 1) if total_weight > 0 else 0.0

        return TaskListResponse(
            date=date_str,
            household_id=household_id,
            household_name=household_name,
            daily_completion_pct=pct,
            tasks=items,
        )

    except ScheduleAccessError:
        raise
    except Exception as exc:
        log_error(
            "Failed to fetch household tasks",
            exc,
            extra={"household_id": str(household_id), "date": date_str},
        )
        raise DatabaseException(
            f"Failed to fetch household tasks: {str(exc)}",
            operation="get_household_tasks",
        ) from exc
