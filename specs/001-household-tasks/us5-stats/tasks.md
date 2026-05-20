# Tasks: US5 — Statistics and Gamification (P2)

**Status**: ⬜ PENDIENTE  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  
**Requiere**: US4 completado (TaskCompletion service)

---

## Backend

- [ ] T079 [P] Create statistics service in AporTamos-Backend/app/services/gamification_service.py (calculate completion %, streak, member stats)
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
