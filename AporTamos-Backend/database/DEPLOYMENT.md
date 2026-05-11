# Database Schema Deployment Guide

This document provides step-by-step instructions for deploying the AporTamos database schema to a Supabase PostgreSQL project.

## Prerequisites

1. Active Supabase project created at [supabase.com](https://supabase.com)
2. Project credentials stored in `.env` file:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role key)

## Deployment Steps

### Step 1: Access Supabase Dashboard

1. Log in to [supabase.com](https://supabase.com)
2. Select your AporTamos project
3. Navigate to the **SQL Editor** section

### Step 2: Execute Migration Script

1. In the SQL Editor, click **"New query"**
2. Copy the entire contents from `database/migrations/2026-05-07-001-initial-schema.sql`
3. Paste the SQL into the query editor
4. Click **"Run"** to execute the migration

**Expected output:**
- 9 tables created
- Multiple indexes created
- Functions and triggers created
- RLS policies applied to all tables
- pg_cron job scheduled

### Step 3: Verify Schema Deployment

Execute the following verification queries in the SQL Editor:

**Check all tables exist:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

Expected tables:
- chat_channels
- chat_messages
- households
- household_members
- task_assignments
- task_completions
- tasks
- users
- weekly_task_schedules

**Check indexes:**
```sql
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
```

**Check functions:**
```sql
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
```

**Check RLS is enabled:**
```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relkind = 'r' AND relname IN (
  'households', 'household_members', 'weekly_task_schedules', 'tasks', 
  'task_assignments', 'task_completions', 'chat_channels', 'chat_messages'
);
```

All tables should show `relrowsecurity = true`.

### Step 4: Configure Storage Buckets

**Create task-proofs bucket:**
1. Navigate to **Storage** in Supabase dashboard
2. Click **"New bucket"**
3. Name: `task-proofs`
4. Privacy: Private
5. Create

**Create chat-media bucket:**
1. Click **"New bucket"** again
2. Name: `chat-media`
3. Privacy: Private
4. Create

### Step 5: Setup Storage RLS Policies (Optional)

To restrict bucket access, add RLS policies via SQL Editor:

```sql
-- Task proofs bucket: users can view their household's proofs
CREATE POLICY "Users can view task proofs from their households"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'task-proofs' AND
  (storage.foldername(name))[1] IN (
    SELECT household_id::text FROM household_members 
    WHERE user_id = auth.uid()
  )
);

-- Chat media bucket: users can view chat media from their households
CREATE POLICY "Users can view chat media from their households"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[1] IN (
    SELECT household_id::text FROM household_members 
    WHERE user_id = auth.uid()
  )
);
```

## Schema Summary

### 9 Tables

| Table | Records | Purpose |
|-------|---------|---------|
| users | N/A | User accounts (email, Google OAuth, hashed passwords) |
| households | N/A | Shared living spaces with streaks and settings |
| household_members | N/A | Junction table for user-household relationships |
| weekly_task_schedules | N/A | Recurring task definitions per household |
| tasks | N/A | Individual task definitions for a schedule |
| task_assignments | N/A | Daily task assignments to specific users |
| task_completions | N/A | Completion records with photo evidence |
| chat_channels | N/A | One per household for coordination |
| chat_messages | N/A | Messages within chat channels |

### Key Features

✅ **Row Level Security (RLS)**
- All tables protected with RLS policies
- Users can only see data from households they belong to
- Assignment ownership restrictions
- Chat message access control

✅ **Automatic Timestamps**
- Triggers automatically update `updated_at` on all relevant tables
- `created_at` defaults to current timestamp

✅ **Data Validation**
- Constraints enforce effort_weight (1-10)
- Day of week validation
- Assignment type constraints (explicit vs random)
- Message content validation (exactly one of content/media_url)

✅ **Performance Optimization**
- Strategic indexes on frequently queried columns
- Composite indexes for common query patterns
- Unique constraints where needed

✅ **Gamification**
- `calculate_household_completion()` function computes weighted scores
- `update_household_streaks()` function runs daily at 12:05 AM UTC via pg_cron
- Automatic streak updates based on 100% completion threshold

✅ **Automation**
- Chat channels auto-created when households are created
- Scheduled daily streak calculation

## Troubleshooting

### Issue: "Extension pg_cron not found"

**Solution:** pg_cron is already available on Supabase. If you get this error, check that your Supabase plan includes pg_cron (available on Pro and higher tiers).

### Issue: "Permission denied" errors

**Solution:** Ensure you're using the service role key in backend code, not the anon key, when performing administrative operations.

### Issue: RLS policies blocking data access

**Check your auth.uid():** Make sure Supabase authentication is properly configured and users are signed in with valid JWT tokens.

### Issue: "Unique constraint violation"

**Check composite constraints:**
- `household_members(household_id, user_id)` - user can only join once
- `task_assignments(task_id, assignment_date)` - one assignment per task per day
- `chat_channels(household_id)` - one channel per household

## Rollback/Recovery

To rollback the entire schema (development only):

```sql
-- Drop all tables and objects
DROP EXTENSION IF EXISTS pg_cron CASCADE;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Reapply schema
-- (Re-run the migration script)
```

## Next Steps

After schema deployment:

1. ✅ T008 - Deploy schema (THIS TASK)
2. ⏳ T009 - Verify all 9 tables created
3. ⏳ T010 - Verify RLS policies enabled
4. ⏳ T011 - Create storage buckets
5. ⏳ T012 - Setup Supabase Auth
6. ⏳ T013 - Configure real-time publication
7. ⏳ T014 - Verify pg_cron job scheduled

## References

- [Supabase SQL Editor Documentation](https://supabase.com/docs/guides/getting-started/sql-editor)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [pg_cron Extension](https://supabase.com/docs/guides/database/extensions/pg_cron)
