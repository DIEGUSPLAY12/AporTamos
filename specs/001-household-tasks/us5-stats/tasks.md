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
- [x] T080 Implement GET /households/{id}/stats endpoint in AporTamos-Backend/app/routers/stats.py
  - Created AporTamos-Backend/app/routers/stats.py with GET /households/{household_id}/stats
  - Verifies caller is a household member (403 if not)
  - Calls get_household_stats() from gamification_service; maps result to HouseholdStatsResponse
  - Handles HouseholdNotFoundError (404) and StatsCalculationError (500)
  - Created AporTamos-Backend/app/models/stats.py with HouseholdStatsResponse, MemberStats, UserStatsResponse, DailyCompletionEntry
  - Registered stats_router in app/routers/__init__.py and app/main.py
- [x] T081 [P] Implement GET /users/{id}/stats endpoint in AporTamos-Backend/app/routers/stats.py
  - Added GET /users/{user_id}/stats?household_id={id} in stats.py
  - Calls get_user_stats(user_id, household_id) → UserStatsResponse (completion_pct, tasks_today, tasks_completed_today, completion_history)
  - Verifies both requester AND target user_id are household members (prevents IDOR)
  - HouseholdError from access check is now caught and returns 500
  - Uses model_validate() (Pydantic v2 idiomatic) instead of **stats
- [x] T082 [P] Add calculation: completion_pct = (Σ completed_weight / Σ total_weight) × 100 (ver spec.md fórmula)
  - Formula already implemented in gamification_service.py: calculate_completion_pct() (line 148) and calculate_user_completion_pct() (line 259)
  - DB-side equivalent in contracts/database-schema.md: calculate_household_completion() SQL function uses same weighted formula
  - Verified consistent across Python service layer and SQL trigger
- [x] T083 [P] Verify streak logic: increment if 100% completion, reset to 0 if <100%, handled by pg_cron trigger
  - Confirmed in contracts/database-schema.md: update_household_streaks() function increments daily_streak if completion=100%, resets to 0 otherwise
  - Scheduled via pg_cron at 12:05 AM UTC daily: cron.schedule('update-household-streaks', '5 0 * * *', ...)
  - Python service reads daily_streak from households table (read-only); DB owns the mutation

## Frontend

- [x] T084 [P] Create UserStatsWidget component in AporTamos-Frontend/components/stats/UserStatsWidget.tsx
  - Props: completionPct, tasksToday, tasksCompleted, streak, isLoading
  - Shows: percentage label, large % number, animated progress bar (violet → orange at 100%), task count, streak badge
  - Loading state with ActivityIndicator
  - Fully themed (Colors, Spacing, Radius, Shadows from constants/theme)
- [x] T085 [P] Create HouseholdStats component in AporTamos-Frontend/components/stats/HouseholdStats.tsx
  - Props: householdName, completionPct, streak, tasksTotal, tasksCompleted, members[], isLoading
  - Shows: household name + "Progreso del hogar" label, streak badge, large % number, progress bar, task count
  - Member list: avatar initial + name + mini progress bar + % per member (MemberStat[])
  - Progress bar + percentage turn orange (streak color) at 100%
  - Loading state with ActivityIndicator; fully themed
- [x] T086 [P] Create StreakDisplay component in AporTamos-Frontend/components/stats/StreakDisplay.tsx (animated, celebration on milestone)
  - Props: streak (number), size ('compact' | 'default' | 'large')
  - Milestones: 7, 30, 100 días → spring scale × 1.35 + glow halo + label "¡1 semana!" / "¡1 mes!" / "¡100 días!"
  - Normal streak change: subtle pulse (scale × 1.15)
  - Milestone badge turns solid orange; normal badge uses orange tint bg
  - Days sub-label hidden in compact mode; milestone label auto-clears after 3s
  - All animations via Animated API (useNativeDriver: true), no extra dependencies
- [x] T087 Create ProgressBar component in AporTamos-Frontend/components/stats/ProgressBar.tsx
  - Props: value (0-100), height (default 8), color (override), trackColor (override), animated (default true), duration (default 400ms)
  - Uses onLayout to measure real track width → converts % to absolute px for Animated.Value
  - Animated.timing on value/trackWidth changes (useNativeDriver: false — layout property)
  - Snaps immediately on first layout (no animation from 0)
  - Color defaults to primary (violet) and auto-switches to streak (orange) at 100%
- [x] T088 [P] Create useStats hook in AporTamos-Frontend/hooks/useStats.ts (fetch + real-time via task_completions subscription)
  - Exports: useHouseholdStats(householdId), useUserStats(userId, householdId), useStats(userId, householdId) (combined)
  - Real-time: subscribeToTaskAssignments(householdId) — task_assignments UPDATE when is_completed=true triggers refetch
    (task_completions lacks household_id column; task_assignments is the correct table for filtered RT)
  - snake_case → camelCase mappers (mapHouseholdStats, mapUserStats)
  - isMounted guard on all setState calls; auto-cleanup of RT subscription on unmount
  - All 3 hooks follow same pattern as existing useTasks.ts
- [x] T089 Add UserStatsWidget to home screen in AporTamos-Frontend/app/(tabs)/index.tsx
  - Imports: UserStatsWidget, useUserStats, useSelectedHousehold, Spacing
  - Calls useUserStats(authUser?.id, selectedHousehold?.id) at component level
  - Renders UserStatsWidget in renderHeader below the title/create-button row
  - streak taken from selectedHousehold.daily_streak (already in Household type)
  - Widget only shown when selectedHousehold exists; hidden otherwise (no household yet)
  - useCallback deps updated: adds selectedHousehold, userStats, isLoadingStats, containerPadding
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
