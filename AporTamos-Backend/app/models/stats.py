"""
Stats Pydantic Models for AporTamos

Response models for statistics and gamification endpoints.
"""

from typing import Optional, List
from pydantic import BaseModel


class MemberStats(BaseModel):
    user_id: str
    user_name: str
    completion_pct: float
    tasks_today: int
    tasks_completed_today: int


class HouseholdStatsResponse(BaseModel):
    household_id: str
    household_name: Optional[str] = None
    completion_pct: float
    daily_streak: int
    tasks_total: int
    tasks_completed: int
    last_completion_date: Optional[str] = None
    timezone: Optional[str] = None
    members: List[MemberStats]


class DailyCompletionEntry(BaseModel):
    date: str
    completion_pct: float


class UserStatsResponse(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    household_id: str
    completion_pct: float
    tasks_today: int
    tasks_completed_today: int
    completion_history: List[DailyCompletionEntry]
