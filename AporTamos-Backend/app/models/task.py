"""
Task Pydantic Models for AporTamos Task Management

This module defines Pydantic models for task entities, including weekly task
schedules, individual task definitions, and related schemas for API responses.

Models:
- DayOfWeek: Enum for days of the week
- AssignmentType: Enum for task assignment type
- TaskFrequency: Enum for task frequency (daily/weekly)
- WeeklyTaskScheduleCreate: Schema for creating a new weekly schedule
- WeeklyTaskScheduleUpdate: Schema for updating an existing schedule
- WeeklyTaskScheduleResponse: Response schema with tasks included
- TaskCreate: Schema for creating a new task
- TaskUpdate: Schema for updating an existing task
- TaskResponse: Response schema for a single task
- WeeklyTaskSchedule: Complete weekly schedule model with all fields
"""

from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, validator


class DayOfWeek(str, Enum):
    """Days of the week for task scheduling."""
    MON = "MON"
    TUE = "TUE"
    WED = "WED"
    THU = "THU"
    FRI = "FRI"
    SAT = "SAT"
    SUN = "SUN"


class AssignmentType(str, Enum):
    """Type of task assignment."""
    EXPLICIT = "explicit"
    RANDOM = "random"


class TaskFrequency(str, Enum):
    """Frequency of task recurrence."""
    DAILY = "daily"
    WEEKLY = "weekly"


class TaskCreate(BaseModel):
    """Schema for creating a new task within a weekly schedule.
    
    Attributes:
        name: Task name/title (e.g., "Wash dishes")
        description: Optional detailed task instructions
        day_of_week: Day of week when task is scheduled (MON-SUN)
        effort_weight: Points/effort required (1-10 scale)
        assignment_type: How task is assigned (explicit or random)
        assigned_user_id: User ID if explicitly assigned, null if random
        frequency: How often task repeats (daily or weekly)
    """
    
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Task name/title (1-100 characters)"
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional detailed task instructions (<1000 characters)"
    )
    day_of_week: DayOfWeek = Field(..., description="Day of week (MON-SUN)")
    effort_weight: int = Field(
        ...,
        ge=1,
        le=10,
        description="Effort points assigned to this task (1-10 scale)"
    )
    assignment_type: AssignmentType = Field(..., description="explicit or random assignment")
    assigned_user_id: Optional[UUID] = Field(
        None,
        description="User ID if explicitly assigned (required if assignment_type=explicit)"
    )
    frequency: TaskFrequency = Field(
        default=TaskFrequency.DAILY,
        description="Task recurrence frequency (daily or weekly)"
    )
    
    @validator('name')
    def validate_name(cls, v):
        """Validate task name is not just whitespace."""
        if not v or not v.strip():
            raise ValueError('Task name cannot be empty or whitespace only')
        return v.strip()
    
    @validator('description')
    def validate_description(cls, v):
        """Validate description if provided."""
        if v is not None:
            if v.strip():
                return v.strip()
            return None
        return None
    
    @validator('assigned_user_id')
    def validate_assignment_type_consistency(cls, v, values):
        """Validate that explicit assignments have user_id and random don't."""
        if 'assignment_type' in values:
            assignment_type = values['assignment_type']
            
            if assignment_type == AssignmentType.EXPLICIT:
                if v is None:
                    raise ValueError(
                        'assigned_user_id is required when assignment_type is explicit'
                    )
            elif assignment_type == AssignmentType.RANDOM:
                if v is not None:
                    raise ValueError(
                        'assigned_user_id must be null when assignment_type is random'
                    )
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Wash dishes",
                "description": "Wash and dry all dishes in kitchen",
                "day_of_week": "MON",
                "effort_weight": 3,
                "assignment_type": "explicit",
                "assigned_user_id": "550e8400-e29b-41d4-a716-446655440000",
                "frequency": "daily"
            }
        }


class TaskUpdate(BaseModel):
    """Schema for updating an existing task.
    
    All fields are optional - only provided fields will be updated.
    """
    
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Task name/title (1-100 characters)"
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional detailed task instructions (<1000 characters)"
    )
    day_of_week: Optional[DayOfWeek] = Field(None, description="Day of week (MON-SUN)")
    effort_weight: Optional[int] = Field(
        None,
        ge=1,
        le=10,
        description="Effort points assigned to this task (1-10 scale)"
    )
    assignment_type: Optional[AssignmentType] = Field(
        None,
        description="explicit or random assignment"
    )
    assigned_user_id: Optional[UUID] = Field(
        None,
        description="User ID if explicitly assigned"
    )
    frequency: Optional[TaskFrequency] = Field(
        None,
        description="Task recurrence frequency (daily or weekly)"
    )
    
    @validator('name')
    def validate_name(cls, v):
        """Validate task name is not just whitespace."""
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Task name cannot be empty or whitespace only')
            return v.strip()
        return None
    
    @validator('description')
    def validate_description(cls, v):
        """Validate description if provided."""
        if v is not None:
            if v.strip():
                return v.strip()
            return None
        return None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Wash dishes",
                "effort_weight": 4
            }
        }


class TaskResponse(BaseModel):
    """Response schema for a single task.
    
    Attributes:
        id: Unique task identifier
        schedule_id: Reference to the weekly schedule
        name: Task name
        description: Task description if provided
        day_of_week: Day of week
        effort_weight: Effort points
        assignment_type: Assignment type
        assigned_user_id: Assigned user if explicit
        frequency: Task frequency
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    id: UUID = Field(..., description="Unique task identifier")
    schedule_id: UUID = Field(..., description="Reference to weekly schedule")
    name: str = Field(..., description="Task name")
    description: Optional[str] = Field(None, description="Task description")
    day_of_week: DayOfWeek = Field(..., description="Day of week")
    effort_weight: int = Field(..., ge=1, le=10, description="Effort points (1-10)")
    assignment_type: AssignmentType = Field(..., description="Assignment type")
    assigned_user_id: Optional[UUID] = Field(None, description="Assigned user if explicit")
    frequency: TaskFrequency = Field(..., description="Task frequency")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "schedule_id": "660e8400-e29b-41d4-a716-446655440000",
                "name": "Wash dishes",
                "description": "Wash and dry all dishes in kitchen",
                "day_of_week": "MON",
                "effort_weight": 3,
                "assignment_type": "explicit",
                "assigned_user_id": "770e8400-e29b-41d4-a716-446655440000",
                "frequency": "daily",
                "created_at": "2026-05-19T10:00:00Z",
                "updated_at": "2026-05-19T10:00:00Z"
            }
        }


class WeeklyTaskScheduleCreate(BaseModel):
    """Schema for creating a new weekly task schedule.
    
    Attributes:
        tasks: List of tasks to add to the schedule
    """
    
    tasks: List[TaskCreate] = Field(
        default_factory=list,
        description="Initial list of tasks for the schedule"
    )
    
    @validator('tasks')
    def validate_tasks(cls, v):
        """Validate tasks list is not empty."""
        if not v:
            raise ValueError('Schedule must have at least one task')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "tasks": [
                    {
                        "name": "Wash dishes",
                        "description": "Clean all dishes",
                        "day_of_week": "MON",
                        "effort_weight": 3,
                        "assignment_type": "explicit",
                        "assigned_user_id": "550e8400-e29b-41d4-a716-446655440000",
                        "frequency": "daily"
                    },
                    {
                        "name": "Vacuum living room",
                        "day_of_week": "WED",
                        "effort_weight": 4,
                        "assignment_type": "random",
                        "frequency": "weekly"
                    }
                ]
            }
        }


class WeeklyTaskScheduleUpdate(BaseModel):
    """Schema for updating an existing weekly task schedule.
    
    Allows updating schedule metadata. Task modifications use separate endpoints.
    """
    
    # Currently no updatable fields at schedule level beyond tasks
    # This is a placeholder for future enhancements (e.g., active_until)
    pass


class WeeklyTaskScheduleResponse(BaseModel):
    """Response schema for a weekly task schedule with tasks.
    
    Attributes:
        id: Unique schedule identifier
        household_id: Reference to the household
        version: Schedule version number
        tasks: List of tasks in this schedule
        created_at: Creation timestamp
        updated_at: Last update timestamp
        active_from: Date schedule becomes active
        active_until: Date schedule expires (null if currently active)
    """
    
    id: UUID = Field(..., description="Unique schedule identifier")
    household_id: UUID = Field(..., description="Reference to household")
    version: int = Field(..., ge=1, description="Schedule version number")
    tasks: List[TaskResponse] = Field(
        default_factory=list,
        description="List of tasks in schedule"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    active_from: date = Field(..., description="Date schedule becomes active")
    active_until: Optional[date] = Field(
        None,
        description="Date schedule expires (null if currently active)"
    )
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "household_id": "660e8400-e29b-41d4-a716-446655440000",
                "version": 1,
                "tasks": [
                    {
                        "id": "770e8400-e29b-41d4-a716-446655440000",
                        "schedule_id": "550e8400-e29b-41d4-a716-446655440000",
                        "name": "Wash dishes",
                        "description": "Clean all dishes",
                        "day_of_week": "MON",
                        "effort_weight": 3,
                        "assignment_type": "explicit",
                        "assigned_user_id": "880e8400-e29b-41d4-a716-446655440000",
                        "frequency": "daily",
                        "created_at": "2026-05-19T10:00:00Z",
                        "updated_at": "2026-05-19T10:00:00Z"
                    }
                ],
                "created_at": "2026-05-19T10:00:00Z",
                "updated_at": "2026-05-19T10:00:00Z",
                "active_from": "2026-05-19",
                "active_until": None
            }
        }


class WeeklyTaskSchedule(BaseModel):
    """Complete weekly task schedule model with all fields.
    
    Represents a weekly recurring task schedule for a household.
    Only one active schedule per household at any time.
    
    Attributes:
        id: Unique schedule identifier
        household_id: Reference to the household
        version: Schedule version number (starts at 1, increments with updates)
        tasks: List of tasks in this schedule
        created_at: When schedule was created
        updated_at: When schedule was last modified
        active_from: Date schedule becomes effective
        active_until: When schedule expires (null = currently active)
        deleted_at: Soft delete timestamp (null if not deleted)
    """
    
    id: UUID = Field(..., description="Unique schedule identifier")
    household_id: UUID = Field(..., description="Reference to household")
    version: int = Field(..., ge=1, description="Schedule version (starts at 1)")
    tasks: List[TaskResponse] = Field(
        default_factory=list,
        description="List of tasks in schedule"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    active_from: date = Field(..., description="Date schedule becomes active")
    active_until: Optional[date] = Field(
        None,
        description="Date schedule expires (null if currently active)"
    )
    deleted_at: Optional[datetime] = Field(
        None,
        description="Soft delete timestamp (null if not deleted)"
    )
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "household_id": "660e8400-e29b-41d4-a716-446655440000",
                "version": 1,
                "tasks": [],
                "created_at": "2026-05-19T10:00:00Z",
                "updated_at": "2026-05-19T10:00:00Z",
                "active_from": "2026-05-19",
                "active_until": None,
                "deleted_at": None
            }
        }
