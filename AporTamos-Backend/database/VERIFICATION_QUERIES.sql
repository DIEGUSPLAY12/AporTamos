-- Supabase SQL Verification Query for AporTamos Schema
-- Run this in Supabase SQL Editor to verify all 9 tables are created

-- ============================================================================
-- VERIFICATION: Check all 9 required tables exist
-- ============================================================================

SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('users', 'households', 'household_members', 'weekly_task_schedules', 
                         'tasks', 'task_assignments', 'task_completions', 'chat_channels', 'chat_messages')
    THEN 'REQUIRED ✓'
    ELSE 'EXTRA'
  END as status,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- Expected Results: All 9 tables with their column counts
-- ============================================================================
-- chat_channels         | REQUIRED ✓ | 4
-- chat_messages         | REQUIRED ✓ | 7
-- households            | REQUIRED ✓ | 9
-- household_members     | REQUIRED ✓ | 5
-- task_assignments      | REQUIRED ✓ | 9
-- task_completions      | REQUIRED ✓ | 6
-- tasks                 | REQUIRED ✓ | 11
-- users                 | REQUIRED ✓ | 8
-- weekly_task_schedules | REQUIRED ✓ | 8

-- ============================================================================
-- Verification 2: Check each table has required columns
-- ============================================================================

-- users table
SELECT COUNT(*) as expected_columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('id', 'email', 'password_hash', 'google_id', 'name', 'created_at', 'updated_at', 'deleted_at');

-- households table
SELECT COUNT(*) as expected_columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'households'
  AND column_name IN ('id', 'owner_id', 'name', 'timezone_id', 'daily_streak', 'last_completion_date', 'created_at', 'updated_at', 'deleted_at');

-- household_members table
SELECT COUNT(*) as expected_columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'household_members'
  AND column_name IN ('id', 'household_id', 'user_id', 'role', 'joined_at', 'updated_at');

-- weekly_task_schedules table
SELECT COUNT(*) as expected_columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'weekly_task_schedules'
  AND column_name IN ('id', 'household_id', 'version', 'created_at', 'updated_at', 'active_from', 'active_until', 'deleted_at');

-- tasks table
SELECT COUNT(*) as expected_columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tasks'
  AND column_name IN ('id', 'schedule_id', 'name', 'description', 'day_of_week', 'effort_weight', 'assignment_type', 'assigned_user_id', 'frequency', 'created_at', 'updated_at');

-- task_assignments table
SELECT COUNT(*) as expected_columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'task_assignments'
  AND column_name IN ('id', 'task_id', 'household_id', 'assigned_to_user_id', 'assignment_date', 'is_completed', 'completed_at', 'created_at', 'updated_at');

-- task_completions table
SELECT COUNT(*) as expected_columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'task_completions'
  AND column_name IN ('id', 'assignment_id', 'user_id', 'photo_url', 'completed_at', 'created_at');

-- chat_channels table
SELECT COUNT(*) as expected_columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chat_channels'
  AND column_name IN ('id', 'household_id', 'created_at', 'updated_at');

-- chat_messages table
SELECT COUNT(*) as expected_columns_found
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chat_messages'
  AND column_name IN ('id', 'channel_id', 'sender_id', 'message_type', 'content', 'media_url', 'created_at');

-- ============================================================================
-- Verification 3: Check for RLS policies
-- ============================================================================

SELECT 
  schemaname, 
  tablename, 
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) as policy_count,
  CASE WHEN (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) > 0 
       THEN '✓ RLS Enabled' 
       ELSE '✗ No RLS' 
  END as rls_status
FROM pg_tables t
WHERE schemaname = 'public' 
  AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 'task_completions', 'chat_channels', 'chat_messages')
ORDER BY tablename;

-- ============================================================================
-- Verification 4: Check for triggers and functions
-- ============================================================================

SELECT 
  trigger_name,
  event_object_table,
  CASE WHEN trigger_name IS NOT NULL THEN '✓ Exists' ELSE '✗ Missing' END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('enforce_assignment_type', 'enforce_message_content', 'update_household_updated_at')
ORDER BY event_object_table;

-- ============================================================================
-- Verification 5: Count indexes
-- ============================================================================

SELECT 
  tablename,
  COUNT(*) as index_count,
  STRING_AGG(indexname, ', ') as index_names
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- Summary: All tables verification in one query
-- ============================================================================

WITH expected_tables AS (
  SELECT 'users' as table_name
  UNION ALL SELECT 'households'
  UNION ALL SELECT 'household_members'
  UNION ALL SELECT 'weekly_task_schedules'
  UNION ALL SELECT 'tasks'
  UNION ALL SELECT 'task_assignments'
  UNION ALL SELECT 'task_completions'
  UNION ALL SELECT 'chat_channels'
  UNION ALL SELECT 'chat_messages'
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
)
SELECT
  et.table_name,
  CASE WHEN EXISTS(SELECT 1 FROM existing_tables WHERE table_name = et.table_name)
       THEN '✓ EXISTS'
       ELSE '✗ MISSING'
  END as verification_status
FROM expected_tables et
ORDER BY et.table_name;
