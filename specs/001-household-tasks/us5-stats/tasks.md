# Tasks: US5 — Statistics and Gamification (P2)

**Status**: ⬜ PENDIENTE  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  
**Requiere**: US4 completado (TaskCompletion service)

---

## Backend

- [x] T079 [P] Create statistics service in AporTamos-Backend/app/services/gamification_service.py (calculate completion %, streak, member stats)
  - Created comprehensive gamification_service.py module with 700+ lines
  - Exception Classes (gamification-specific errors):
    - GamificationException: Base exception for service errors
    - StatsCalculationError: Stats calculation fails
    - HouseholdNotFoundError: Household not found
    - UserNotFoundError: User not found
  - Completion Percentage Functions:
    - calculate_completion_pct(household_id, target_date=None):
      - Calculates daily completion % for entire household
      - Uses formula: (Σ effort_weight_completed / Σ effort_weight_assigned) × 100
      - Returns None if no tasks assigned on date
      - Fetches task_assignments and tasks tables to compute weighted completion
    - calculate_user_completion_pct(user_id, household_id, target_date=None):
      - Calculates completion % for individual user within household
      - Only counts tasks assigned to that user
      - Returns None if no tasks assigned
  - Household Statistics Functions:
    - get_household_stats(household_id):
      - Returns dict with:
        * completion_pct: Today's weighted completion percentage
        * daily_streak: Current streak from households table
        * tasks_total: Total tasks assigned today
        * tasks_completed: Number of completed tasks
        * last_completion_date: Last date with 100% completion
        * members: List of all member stats
      - Integrates household info with daily calculations
    - get_household_daily_snapshot(household_id, days=7):
      - Returns historical completion data for N days
      - Useful for charting trends
      - Returns list of daily objects with date, completion_pct, task counts
  - User Statistics Functions:
    - get_user_stats(user_id, household_id):
      - Returns dict with:
        * completion_pct: Today's user completion %
        * tasks_today: Total tasks assigned to user
        * tasks_completed_today: Completed task count
        * completion_history: Last 7 days completion %
      - Includes historical trend data
  - Member Aggregation Functions:
    - get_household_members_stats(household_id):
      - Returns list of all household members with stats
      - Each member includes:
        * user_id, user_name
        * completion_pct: Today's completion %
        * tasks_today: Total assigned
        * tasks_completed_today: Completed count
      - Gracefully handles missing users, continues with other members
  - Features:
    - Weighted task scoring via effort_weight (1-10)
    - Accurate completion calculation from database
    - Handles edge cases (no tasks, no completions)
    - Comprehensive error handling with custom exceptions
    - Full audit logging at debug/info/warning/error levels
    - Timezone awareness via household timezone_id
    - 7-day historical snapshots for trending
    - Real-time calculations from task_assignments table
  - Database Operations:
    - Reads from: households, task_assignments, tasks, task_completions, users, household_members
    - Uses calculated data (is_completed flag, effort_weight)
    - Supports arbitrary date queries for historical data
  - Integration Points:
    - Uses Supabase client from app.dependencies
    - Uses logging/exception classes from app.config
    - Called by stats endpoints (T080, T081)
    - Works with real-time subscriptions via task_completions events
  - File: AporTamos-Backend/app/services/gamification_service.py (700+ lines)
- [ ] T080 Implement GET /households/{id}/stats endpoint in AporTamos-Backend/app/routers/stats.py
- [ ] T081 [P] Implement GET /users/{id}/stats endpoint in AporTamos-Backend/app/routers/stats.py
- [ ] T082 [P] Add calculation: completion_pct = (Σ completed_weight / Σ total_weight) × 100 (ver spec.md fórmula)
- [ ] T083 [P] Verify streak logic: increment if 100% completion, reset to 0 if <100%, handled by pg_cron trigger

## Frontend

- [ ] T084 [P] Create UserStatsWidget component in AporTamos-Frontend/components/stats/UserStatsWidget.tsx
- [ ] T085 [P] Create HouseholdStats component in AporTamos-Frontend/components/stats/HouseholdStats.tsx
- [ ] T086 [P] Create StreakDisplay component in AporTamos-Frontend/components/stats/StreakDisplay.tsx (animated, celebration on milestone)
- [ ] T087 Create ProgressBar component in AporTamos-Frontend/components/stats/ProgressBar.tsx
- [ ] T088 [P] Create useStats hook in AporTamos-Frontend/hooks/useStats.ts (fetch + real-time via task_completions subscription)
- [ ] T089 Add UserStatsWidget to home screen in AporTamos-Frontend/app/(tabs)/index.tsx
- [ ] T090 Add HouseholdStats to household header in AporTamos-Frontend/components/household/HouseholdHeader.tsx
- [ ] T091 [P] Subscribe to task_completions real-time events to update stats instantly (<5s)
- [ ] T092 Add MembersSection with individual stats in AporTamos-Frontend/components/household/MembersSection.tsx

**Checkpoint**: ⬜ US5 pendiente — gamification metrics visible and updating in real-time

---

## Acceptance Scenarios Verification

- [ ] Daily completion percentage displays correctly
- [ ] Current streak displays correctly
- [ ] Streak increments when reaching 100%
- [ ] Streak resets to 0 at midnight
- [ ] Member list shows all household users
