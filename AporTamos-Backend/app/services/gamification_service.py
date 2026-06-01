"""
Gamification Service for AporTamos

Handles statistics and gamification calculations including:
- Daily task completion percentages (weighted by effort)
- Household and user streaks
- Member statistics aggregation
- Real-time completion tracking

The service works with the database schema:
- households table: tracks daily_streak for the household
- task_assignments: tracks assignment_date, is_completed, and related task effort_weight
- tasks: stores effort_weight (1-10) for each task
- task_completions: tracks when tasks are marked complete with proof photo

Formulas:
- completion_pct = (Î£ effort_weight_completed / Î£ effort_weight_assigned) Ã— 100
- daily_streak: Incremented by pg_cron trigger at 12:05 AM UTC if 100% completion yesterday
"""

import logging
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID

from app.models.task import TaskResponse
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


class GamificationException(DatabaseException):
    """Base exception for gamification service errors."""
    pass


class StatsCalculationError(GamificationException):
    """Exception raised when stats calculation fails."""
    pass


class HouseholdNotFoundError(GamificationException):
    """Exception raised when household is not found."""
    pass


class UserNotFoundError(GamificationException):
    """Exception raised when user is not found."""
    pass


async def calculate_completion_pct(
    household_id: UUID,
    target_date: Optional[date] = None
) -> Optional[float]:
    """
    Calculate the daily task completion percentage for a household.
    
    Formula:
        completion_pct = (Î£ effort_weight_completed / Î£ effort_weight_assigned) Ã— 100
    
    Weighted by task effort_weight (1-10). If no tasks are assigned on the date,
    returns None (no data available).
    
    Args:
        household_id: UUID of the household
        target_date: Date to calculate for (default: today)
        
    Returns:
        float: Completion percentage (0-100), or None if no tasks assigned
        
    Raises:
        StatsCalculationError: If calculation fails
    """
    try:
        supabase = get_supabase_client()
        
        if target_date is None:
            target_date = date.today()
        
        log_debug(
            "Calculating household completion percentage",
            extra={
                "household_id": str(household_id),
                "date": str(target_date)
            }
        )
        
        # Get total effort weight for all assignments on the date
        assignments_response = supabase.table("task_assignments").select(
            "task_id, is_completed"
        ).eq(
            "household_id", str(household_id)
        ).eq(
            "assignment_date", str(target_date)
        ).execute()
        
        assignments = assignments_response.data if assignments_response.data else []
        
        if not assignments:
            log_debug(
                "No task assignments found for household on date",
                extra={
                    "household_id": str(household_id),
                    "date": str(target_date)
                }
            )
            return None
        
        # Get task IDs to fetch effort weights
        task_ids = [str(a["task_id"]) for a in assignments]
        
        if not task_ids:
            return None
        
        # Fetch all tasks to get effort weights
        tasks_response = supabase.table("tasks").select(
            "id, effort_weight"
        ).in_(
            "id", task_ids
        ).execute()
        
        tasks_data = {str(t["id"]): t["effort_weight"] for t in (tasks_response.data or [])}
        
        # Calculate total and completed weights
        total_weight = 0
        completed_weight = 0
        
        for assignment in assignments:
            task_id = str(assignment["task_id"])
            effort_weight = tasks_data.get(task_id, 0)
            total_weight += effort_weight
            
            if assignment.get("is_completed", False):
                completed_weight += effort_weight
        
        if total_weight == 0:
            return None
        
        completion_pct = (completed_weight / total_weight) * 100
        
        log_debug(
            "Household completion calculated",
            extra={
                "household_id": str(household_id),
                "date": str(target_date),
                "completion_pct": completion_pct,
                "completed_weight": completed_weight,
                "total_weight": total_weight
            }
        )
        
        return completion_pct
        
    except Exception as exc:
        log_error(
            "Failed to calculate household completion percentage",
            exc,
            extra={
                "household_id": str(household_id),
                "date": str(target_date)
            }
        )
        raise StatsCalculationError(
            f"Failed to calculate completion for household {household_id}: {str(exc)}",
            operation="calculate_completion_pct"
        ) from exc


async def calculate_user_completion_pct(
    user_id: UUID,
    household_id: UUID,
    target_date: Optional[date] = None
) -> Optional[float]:
    """
    Calculate the daily task completion percentage for a user within a household.
    
    Only counts tasks assigned to the specific user on the date.
    
    Formula:
        completion_pct = (Î£ effort_weight_completed / Î£ effort_weight_assigned) Ã— 100
    
    Args:
        user_id: UUID of the user
        household_id: UUID of the household
        target_date: Date to calculate for (default: today)
        
    Returns:
        float: Completion percentage (0-100), or None if no tasks assigned
        
    Raises:
        StatsCalculationError: If calculation fails
    """
    try:
        supabase = get_supabase_client()
        
        if target_date is None:
            target_date = date.today()
        
        log_debug(
            "Calculating user completion percentage",
            extra={
                "user_id": str(user_id),
                "household_id": str(household_id),
                "date": str(target_date)
            }
        )
        
        # Get task assignments for this user
        assignments_response = supabase.table("task_assignments").select(
            "task_id, is_completed"
        ).eq("assigned_to_user_id", str(user_id)).eq("household_id", str(household_id)
        ).eq(
            "assignment_date", str(target_date)
        ).execute()
        
        assignments = assignments_response.data if assignments_response.data else []
        
        if not assignments:
            return None
        
        # Get task IDs and fetch effort weights
        task_ids = [str(a["task_id"]) for a in assignments]
        
        tasks_response = supabase.table("tasks").select(
            "id, effort_weight"
        ).in_(
            "id", task_ids
        ).execute()
        
        tasks_data = {str(t["id"]): t["effort_weight"] for t in (tasks_response.data or [])}
        
        # Calculate weights
        total_weight = 0
        completed_weight = 0
        
        for assignment in assignments:
            task_id = str(assignment["task_id"])
            effort_weight = tasks_data.get(task_id, 0)
            total_weight += effort_weight
            
            if assignment.get("is_completed", False):
                completed_weight += effort_weight
        
        if total_weight == 0:
            return None
        
        completion_pct = (completed_weight / total_weight) * 100
        
        log_debug(
            "User completion calculated",
            extra={
                "user_id": str(user_id),
                "household_id": str(household_id),
                "date": str(target_date),
                "completion_pct": completion_pct
            }
        )
        
        return completion_pct
        
    except Exception as exc:
        log_error(
            "Failed to calculate user completion percentage",
            exc,
            extra={
                "user_id": str(user_id),
                "household_id": str(household_id),
                "date": str(target_date)
            }
        )
        raise StatsCalculationError(
            f"Failed to calculate completion for user {user_id}: {str(exc)}",
            operation="calculate_user_completion_pct"
        ) from exc


async def get_household_stats(household_id: UUID) -> Dict[str, Any]:
    """
    Get comprehensive household statistics.
    
    Returns:
        {
            "household_id": UUID,
            "completion_pct": float,        # Today's completion %
            "daily_streak": int,            # Current streak
            "tasks_total": int,             # Total tasks assigned today
            "tasks_completed": int,         # Completed tasks today
            "last_completion_date": str,    # Last date with 100% completion
            "members": [...]                # List of member stats
        }
    
    Args:
        household_id: UUID of the household
        
    Returns:
        dict: Comprehensive household stats
        
    Raises:
        HouseholdNotFoundError: If household not found
        StatsCalculationError: If stats calculation fails
    """
    try:
        supabase = get_supabase_client()
        
        log_debug(
            "Fetching household stats",
            extra={"household_id": str(household_id)}
        )
        
        # Get household info (streak, timezone, etc)
        household_response = supabase.table("households").select(
            "id, name, timezone_id, daily_streak, last_completion_date"
        ).eq(
            "id", str(household_id)
        ).single().execute()
        
        household = household_response.data
        if not household:
            raise HouseholdNotFoundError(
                f"Household {household_id} not found",
                operation="get_household_stats"
            )
        
        # Calculate today's completion percentage
        today = date.today()
        completion_pct = await calculate_completion_pct(household_id, today)
        
        # Get today's assignments for task counts
        assignments_response = supabase.table("task_assignments").select(
            "id, is_completed"
        ).eq(
            "household_id", str(household_id)
        ).eq(
            "assignment_date", str(today)
        ).execute()
        
        assignments = assignments_response.data or []
        tasks_total = len(assignments)
        tasks_completed = sum(1 for a in assignments if a.get("is_completed", False))
        
        # Get household members with their stats
        members = await get_household_members_stats(household_id)
        
        stats = {
            "household_id": str(household_id),
            "household_name": household.get("name"),
            "completion_pct": completion_pct if completion_pct is not None else 0.0,
            "daily_streak": household.get("daily_streak", 0),
            "tasks_total": tasks_total,
            "tasks_completed": tasks_completed,
            "last_completion_date": household.get("last_completion_date"),
            "timezone": household.get("timezone_id"),
            "members": members
        }
        
        log_info(
            "Household stats retrieved",
            extra={
                "household_id": str(household_id),
                "completion_pct": stats["completion_pct"],
                "daily_streak": stats["daily_streak"],
                "members_count": len(members)
            }
        )
        
        return stats
        
    except HouseholdNotFoundError:
        raise
    except Exception as exc:
        log_error(
            "Failed to fetch household stats",
            exc,
            extra={"household_id": str(household_id)}
        )
        raise StatsCalculationError(
            f"Failed to fetch stats for household {household_id}: {str(exc)}",
            operation="get_household_stats"
        ) from exc


async def get_user_stats(
    user_id: UUID,
    household_id: UUID
) -> Dict[str, Any]:
    """
    Get user's personal statistics within a household.
    
    Returns:
        {
            "user_id": UUID,
            "household_id": UUID,
            "completion_pct": float,        # Today's completion %
            "tasks_today": int,             # Total tasks assigned today
            "tasks_completed_today": int,   # Completed tasks today
            "completion_history": [...]     # Last 7 days completion %
        }
    
    Args:
        user_id: UUID of the user
        household_id: UUID of the household
        
    Returns:
        dict: User stats for the household
        
    Raises:
        UserNotFoundError: If user not found
        StatsCalculationError: If stats calculation fails
    """
    try:
        supabase = get_supabase_client()
        
        log_debug(
            "Fetching user stats",
            extra={
                "user_id": str(user_id),
                "household_id": str(household_id)
            }
        )
        
        # Verify user exists
        user_response = supabase.table("users").select(
            "id, name, email"
        ).eq(
            "id", str(user_id)
        ).single().execute()
        
        user = user_response.data
        if not user:
            raise UserNotFoundError(
                f"User {user_id} not found",
                operation="get_user_stats"
            )
        
        # Calculate today's completion percentage
        today = date.today()
        completion_pct = await calculate_user_completion_pct(
            user_id, household_id, today
        )
        
        # Get today's assignments for task counts
        assignments_response = supabase.table("task_assignments").select(
            "id, is_completed"
        ).eq("assigned_to_user_id", str(user_id)).eq("household_id", str(household_id)
        ).eq(
            "assignment_date", str(today)
        ).execute()
        
        assignments = assignments_response.data or []
        tasks_today = len(assignments)
        tasks_completed_today = sum(1 for a in assignments if a.get("is_completed", False))
        
        # Get completion history for last 7 days
        completion_history = []
        for i in range(7):
            history_date = today - timedelta(days=i)
            pct = await calculate_user_completion_pct(
                user_id, household_id, history_date
            )
            completion_history.append({
                "date": str(history_date),
                "completion_pct": pct if pct is not None else 0.0
            })
        
        stats = {
            "user_id": str(user_id),
            "user_name": user.get("name"),
            "household_id": str(household_id),
            "completion_pct": completion_pct if completion_pct is not None else 0.0,
            "tasks_today": tasks_today,
            "tasks_completed_today": tasks_completed_today,
            "completion_history": completion_history
        }
        
        log_info(
            "User stats retrieved",
            extra={
                "user_id": str(user_id),
                "household_id": str(household_id),
                "completion_pct": stats["completion_pct"],
                "tasks_completed": tasks_completed_today
            }
        )
        
        return stats
        
    except (UserNotFoundError, HouseholdNotFoundError):
        raise
    except Exception as exc:
        log_error(
            "Failed to fetch user stats",
            exc,
            extra={
                "user_id": str(user_id),
                "household_id": str(household_id)
            }
        )
        raise StatsCalculationError(
            f"Failed to fetch stats for user {user_id}: {str(exc)}",
            operation="get_user_stats"
        ) from exc


async def get_household_members_stats(household_id: UUID) -> List[Dict[str, Any]]:
    """
    Get statistics for all members of a household.
    
    Returns list of members with their today's completion percentage and task counts.
    
    Returns:
        List of {
            "user_id": UUID,
            "user_name": str,
            "completion_pct": float,
            "tasks_today": int,
            "tasks_completed_today": int
        }
    
    Args:
        household_id: UUID of the household
        
    Returns:
        list: Member stats for all household members
        
    Raises:
        StatsCalculationError: If retrieval fails
    """
    try:
        supabase = get_supabase_client()
        
        log_debug(
            "Fetching household members stats",
            extra={"household_id": str(household_id)}
        )
        
        # Get all household members
        members_response = supabase.table("household_members").select(
            "user_id"
        ).eq(
            "household_id", str(household_id)
        ).execute()
        
        members_data = members_response.data or []
        
        # Get stats for each member
        members_stats = []
        today = date.today()
        
        for member in members_data:
            user_id = member.get("user_id")
            
            try:
                # Get user info
                user_response = supabase.table("users").select(
                    "id, name"
                ).eq(
                    "id", str(user_id)
                ).single().execute()
                
                user = user_response.data
                
                # Calculate user's completion
                completion_pct = await calculate_user_completion_pct(
                    UUID(str(user_id)),
                    household_id,
                    today
                )
                
                # Get task counts
                assignments_response = supabase.table("task_assignments").select(
                    "id, is_completed"
                ).eq("assigned_to_user_id", str(user_id)).eq("household_id", str(household_id)
                ).eq(
                    "assignment_date", str(today)
                ).execute()
                
                assignments = assignments_response.data or []
                tasks_today = len(assignments)
                tasks_completed_today = sum(1 for a in assignments if a.get("is_completed", False))
                
                members_stats.append({
                    "user_id": str(user_id),
                    "user_name": user.get("name", "Unknown") if user else "Unknown",
                    "completion_pct": completion_pct if completion_pct is not None else 0.0,
                    "tasks_today": tasks_today,
                    "tasks_completed_today": tasks_completed_today
                })
                
            except Exception as exc:
                log_warning(
                    "Failed to fetch stats for household member",
                    extra={
                        "user_id": str(user_id),
                        "household_id": str(household_id),
                        "error": str(exc)
                    }
                )
                # Continue with other members if one fails
                continue
        
        log_debug(
            "Household members stats retrieved",
            extra={
                "household_id": str(household_id),
                "members_count": len(members_stats)
            }
        )
        
        return members_stats
        
    except Exception as exc:
        log_error(
            "Failed to fetch household members stats",
            exc,
            extra={"household_id": str(household_id)}
        )
        raise StatsCalculationError(
            f"Failed to fetch members stats for household {household_id}: {str(exc)}",
            operation="get_household_members_stats"
        ) from exc


async def get_household_daily_snapshot(
    household_id: UUID,
    days: int = 7
) -> List[Dict[str, Any]]:
    """
    Get historical completion data for a household over the last N days.
    
    Useful for charting completion trends.
    
    Returns:
        List of {
            "date": str,
            "completion_pct": float,
            "tasks_total": int,
            "tasks_completed": int
        }
    
    Args:
        household_id: UUID of the household
        days: Number of days to look back (default: 7)
        
    Returns:
        list: Daily snapshots of household completion
    """
    try:
        log_debug(
            "Fetching household daily snapshot",
            extra={
                "household_id": str(household_id),
                "days": days
            }
        )
        
        snapshots = []
        today = date.today()
        
        for i in range(days):
            snapshot_date = today - timedelta(days=i)
            
            # Calculate completion for this date
            completion_pct = await calculate_completion_pct(household_id, snapshot_date)
            
            # Get task counts for this date
            supabase = get_supabase_client()
            assignments_response = supabase.table("task_assignments").select(
                "id, is_completed"
            ).eq(
                "household_id", str(household_id)
            ).eq(
                "assignment_date", str(snapshot_date)
            ).execute()
            
            assignments = assignments_response.data or []
            tasks_total = len(assignments)
            tasks_completed = sum(1 for a in assignments if a.get("is_completed", False))
            
            snapshots.append({
                "date": str(snapshot_date),
                "completion_pct": completion_pct if completion_pct is not None else 0.0,
                "tasks_total": tasks_total,
                "tasks_completed": tasks_completed
            })
        
        log_debug(
            "Household daily snapshot retrieved",
            extra={
                "household_id": str(household_id),
                "snapshots_count": len(snapshots)
            }
        )
        
        return snapshots
        
    except Exception as exc:
        log_error(
            "Failed to fetch household daily snapshot",
            exc,
            extra={"household_id": str(household_id)}
        )
        raise StatsCalculationError(
            f"Failed to fetch daily snapshot for household {household_id}: {str(exc)}",
            operation="get_household_daily_snapshot"
        ) from exc

