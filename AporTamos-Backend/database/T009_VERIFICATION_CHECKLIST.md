# T009 Verification Checklist: Database Schema Verification

**Task**: Verify all 9 tables created: users, households, household_members, weekly_task_schedules, tasks, task_assignments, task_completions, chat_channels, chat_messages

**Date**: 2026-05-07  
**Feature**: 001-household-tasks  
**Phase**: Phase 2: Foundational (Blocking Prerequisites)

---

## Prerequisite Verification

Before verifying the tables, ensure:

- [ ] **T008 Complete**: Database schema migration has been deployed to Supabase
- [ ] **Supabase Project Created**: Project exists at supabase.com
- [ ] **Credentials Configured**: `.env` file contains valid `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **Database Access**: PostgreSQL credentials available for verification queries

---

## Table Existence Verification

### ✓ Core Tables (All MUST Exist)

| # | Table Name | Purpose | Expected Columns |
|---|---|---|---|
| 1 | `users` | User authentication and profile | 8: id, email, password_hash, google_id, name, created_at, updated_at, deleted_at |
| 2 | `households` | Household management | 9: id, owner_id, name, timezone_id, daily_streak, last_completion_date, created_at, updated_at, deleted_at |
| 3 | `household_members` | Household membership | 5: id, household_id, user_id, role, joined_at, updated_at |
| 4 | `weekly_task_schedules` | Weekly task templates | 8: id, household_id, version, created_at, updated_at, active_from, active_until, deleted_at |
| 5 | `tasks` | Individual tasks | 11: id, schedule_id, name, description, day_of_week, effort_weight, assignment_type, assigned_user_id, frequency, created_at, updated_at |
| 6 | `task_assignments` | Daily task assignments | 9: id, task_id, household_id, assigned_to_user_id, assignment_date, is_completed, completed_at, created_at, updated_at |
| 7 | `task_completions` | Task completion records with photos | 6: id, assignment_id, user_id, photo_url, completed_at, created_at |
| 8 | `chat_channels` | Household chat channels | 4: id, household_id, created_at, updated_at |
| 9 | `chat_messages` | Chat messages | 7: id, channel_id, sender_id, message_type, content, media_url, created_at |

**Verification Method**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Result**: All 9 tables listed in alphabetical order

---

## Column Verification

Each table must have ALL expected columns with correct data types. Run the included SQL verification scripts to check:

### Verification Files

- **Python Script**: `AporTamos-Backend/database/verify_schema.py`
  - Connects to Supabase PostgreSQL
  - Verifies all tables exist
  - Checks column presence and types
  - Validates RLS policies
  - Confirms indexes

- **SQL Queries**: `AporTamos-Backend/database/VERIFICATION_QUERIES.sql`
  - Can be run directly in Supabase SQL Editor
  - Multiple verification queries for comprehensive checking
  - Summary query for quick validation

---

## RLS Policy Verification

The following tables MUST have Row Level Security (RLS) policies enabled:

- [ ] `households` - 3 policies (select, update, delete)
- [ ] `household_members` - 1 policy (select)
- [ ] `tasks` - 1 policy (select)
- [ ] `task_assignments` - 2 policies (select, update)
- [ ] `task_completions` - 1 policy (select)
- [ ] `chat_channels` - 1 policy (select)
- [ ] `chat_messages` - 2 policies (select, insert)

**Verification Query**:
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('households', 'household_members', 'tasks', 
                    'task_assignments', 'task_completions', 
                    'chat_channels', 'chat_messages')
GROUP BY tablename
ORDER BY tablename;
```

**Expected Result**: All 7 tables listed with policy_count > 0

---

## Index Verification

All tables should have performance indexes created. Minimum expected indexes:

- [ ] `users`: 3 indexes (email, created_at, google_id)
- [ ] `households`: 2 indexes (owner_id, created_at)
- [ ] `household_members`: 2 indexes (household_id, user_id) + 1 unique constraint
- [ ] `weekly_task_schedules`: 1 conditional index (active schedules)
- [ ] `tasks`: 3 indexes (schedule_id, day_of_week, assignment_type)
- [ ] `task_assignments`: 3 indexes (household_date, user_date, completed)
- [ ] `task_completions`: 2 indexes (assignment_id, user_date)
- [ ] `chat_channels`: 1 index (household_id)
- [ ] `chat_messages`: 2 indexes (channel_date, sender)

**Verification Query**:
```sql
SELECT tablename, COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

---

## Triggers and Functions Verification

The following functions and triggers MUST be created:

### Functions
- [ ] `enforce_assignment_type_fn()` - Validates task assignment types
- [ ] `enforce_message_content_fn()` - Validates chat message content
- [ ] `update_updated_at_column()` - Auto-updates timestamp fields

### Triggers
- [ ] `enforce_assignment_type` - On tasks table (INSERT/UPDATE)
- [ ] `enforce_message_content` - On chat_messages table (INSERT/UPDATE)
- [ ] `update_household_updated_at` - On households table (UPDATE)

**Verification Query**:
```sql
SELECT trigger_name, event_object_table, trigger_enabled
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

---

## Constraints Verification

### Unique Constraints
- [ ] `users.email` - UNIQUE
- [ ] `users.google_id` - UNIQUE
- [ ] `households_members(household_id, user_id)` - UNIQUE
- [ ] `task_assignments(task_id, assignment_date)` - UNIQUE
- [ ] `chat_channels.household_id` - UNIQUE
- [ ] `task_completions.assignment_id` - UNIQUE

### Check Constraints
- [ ] `household_members.role` - IN ('owner', 'member')
- [ ] `tasks.day_of_week` - IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')
- [ ] `tasks.effort_weight` - >= 1 AND <= 10
- [ ] `tasks.assignment_type` - IN ('explicit', 'random')
- [ ] `tasks.frequency` - IN ('daily', 'weekly')
- [ ] `chat_messages.message_type` - IN ('text', 'audio', 'image')

---

## Foreign Key Verification

All foreign key relationships must be properly configured:

- [ ] `households.owner_id` → `users.id` (ON DELETE RESTRICT)
- [ ] `household_members.household_id` → `households.id` (ON DELETE CASCADE)
- [ ] `household_members.user_id` → `users.id` (ON DELETE CASCADE)
- [ ] `weekly_task_schedules.household_id` → `households.id` (ON DELETE CASCADE)
- [ ] `tasks.schedule_id` → `weekly_task_schedules.id` (ON DELETE CASCADE)
- [ ] `tasks.assigned_user_id` → `users.id` (ON DELETE SET NULL)
- [ ] `task_assignments.task_id` → `tasks.id` (ON DELETE CASCADE)
- [ ] `task_assignments.household_id` → `households.id` (ON DELETE CASCADE)
- [ ] `task_assignments.assigned_to_user_id` → `users.id` (ON DELETE CASCADE)
- [ ] `task_completions.assignment_id` → `task_assignments.id` (ON DELETE CASCADE)
- [ ] `task_completions.user_id` → `users.id` (ON DELETE CASCADE)
- [ ] `chat_channels.household_id` → `households.id` (ON DELETE CASCADE)
- [ ] `chat_messages.channel_id` → `chat_channels.id` (ON DELETE CASCADE)
- [ ] `chat_messages.sender_id` → `users.id` (ON DELETE CASCADE)

---

## Verification Steps

### Option 1: Quick Verification (Supabase Dashboard)

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `AporTamos-Backend/database/VERIFICATION_QUERIES.sql`
3. Run each query to verify
4. Check results against expected values in this checklist

### Option 2: Python Verification

1. Ensure `.env` file has valid Supabase credentials
2. Install dependency: `pip install psycopg2-binary python-dotenv`
3. Run: `python AporTamos-Backend/database/verify_schema.py`
4. Review output for any failures

### Option 3: Manual Verification

1. Connect to Supabase PostgreSQL directly using psql or pgAdmin
2. Execute each verification query from this checklist
3. Manually compare results against expected values

---

## Completion Checklist

- [ ] All 9 tables exist and are accessible
- [ ] All 9 tables have correct columns with proper data types
- [ ] All RLS policies are enabled on sensitive tables
- [ ] All indexes are created for performance
- [ ] All triggers and functions are in place
- [ ] All constraints (unique, check, foreign key) are configured
- [ ] No error messages or warnings in verification
- [ ] Verification date and time recorded: _______________
- [ ] Verification executed by: _______________

---

## Sign-Off

**Verification Status**: ⭕ PENDING

When all checks pass, mark as COMPLETE and update T009 status to [X] in tasks.md

**Notes**:
```
[Space for verification notes]
```

---

## References

- Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Schema Specification: [specs/001-household-tasks/contracts/database-schema.md](../../../specs/001-household-tasks/contracts/database-schema.md)
- Migration File: [migrations/2026-05-07-001-initial-schema.sql](migrations/2026-05-07-001-initial-schema.sql)
- Verification Script: [verify_schema.py](verify_schema.py)
- Verification Queries: [VERIFICATION_QUERIES.sql](VERIFICATION_QUERIES.sql)
