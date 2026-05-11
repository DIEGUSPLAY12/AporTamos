-- T014: pg_cron Job Verification Queries
-- Run these in Supabase SQL Editor to verify daily streak calculation job
-- Date: 2026-05-11

-- ============================================================================
-- Query 1: Check if pg_cron extension is installed
-- ============================================================================
-- Expected: Returns one row with pg_cron extension details
-- Status: ✓ PASS if returns a row | ✗ FAIL if no results

SELECT 
  extname,
  extversion,
  extnamespace
FROM pg_extension 
WHERE extname = 'pg_cron';

-- ============================================================================
-- Query 2: List all scheduled cron jobs (includes update-household-streaks)
-- ============================================================================
-- Expected: Returns all scheduled jobs including 'update-household-streaks'
-- Status: ✓ PASS if update-household-streaks job appears | ✗ FAIL if missing

SELECT
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
ORDER BY jobname;

-- ============================================================================
-- Query 3: Check the specific streak update job
-- ============================================================================
-- Expected: Returns one row with:
--   jobname: update-household-streaks
--   schedule: 5 0 * * * (12:05 AM UTC daily)
--   command: SELECT update_household_streaks()
--   active: t (true)
-- Status: ✓ PASS if job exists and is active | ✗ FAIL if inactive or missing

SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  next_run
FROM cron.job
WHERE jobname = 'update-household-streaks';

-- ============================================================================
-- Query 4: Verify both required functions exist
-- ============================================================================
-- Expected: Returns 2 rows:
--   1. calculate_household_completion (FUNCTION)
--   2. update_household_streaks (FUNCTION)
-- Status: ✓ PASS if both functions exist | ✗ FAIL if either is missing

SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_name IN ('calculate_household_completion', 'update_household_streaks')
  AND routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- Query 5: View recent cron job execution history
-- ============================================================================
-- Expected: Returns execution logs with timestamps
-- Note: Availability depends on Supabase project log retention settings
-- Status: ℹ️ INFO - Shows execution history if available

SELECT
  job_pid,
  database,
  command,
  start_time,
  end_time,
  succeeded
FROM cron.job_run_details
WHERE command LIKE '%update_household_streaks%'
ORDER BY start_time DESC
LIMIT 10;

-- ============================================================================
-- Query 6: Check household streak data (sample current state)
-- ============================================================================
-- Expected: Returns households with current streak and completion tracking
-- Status: ℹ️ INFO - Shows current streak state

SELECT
  h.id,
  h.name,
  h.timezone_id,
  h.daily_streak,
  h.last_completion_date,
  h.updated_at,
  COUNT(hm.user_id) as member_count
FROM households h
LEFT JOIN household_members hm ON h.id = hm.household_id
WHERE h.deleted_at IS NULL
GROUP BY h.id, h.name, h.timezone_id, h.daily_streak, h.last_completion_date, h.updated_at
ORDER BY h.updated_at DESC
LIMIT 10;

-- ============================================================================
-- Query 7: Manual function test (run to trigger streak calculation)
-- ============================================================================
-- Purpose: Test the function works before automatic execution
-- Expected: Completes without errors, updates household streaks
-- Status: ✓ PASS if no errors | ✗ FAIL if error occurs
-- WARNING: This will update streaks for all households!

-- UNCOMMENT ONLY TO TEST:
-- SELECT update_household_streaks();

-- ============================================================================
-- Query 8: Test completion percentage calculation for a household
-- ============================================================================
-- Expected: Returns completion percentage (0-100) or NULL if no tasks
-- Status: ℹ️ INFO - Useful for debugging
-- USAGE: Replace household_id and date with actual values

-- EXAMPLE (replace with actual household_id and date):
-- SELECT calculate_household_completion(
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
--   CURRENT_DATE - INTERVAL '1 day'
-- );

-- ============================================================================
-- Query 9: List all households with their timezones (for streak tracking)
-- ============================================================================
-- Expected: Shows timezone distribution across households
-- Status: ℹ️ INFO - Useful for understanding timezone coverage

SELECT
  timezone_id,
  COUNT(*) as household_count,
  STRING_AGG(DISTINCT name, ', ' ORDER BY name) as household_names
FROM households
WHERE deleted_at IS NULL
GROUP BY timezone_id
ORDER BY household_count DESC;

-- ============================================================================
-- Query 10: Verify RLS doesn't block postgres role from updating households
-- ============================================================================
-- Expected: Policies should not restrict postgres role
-- Status: ✓ PASS if no restrictive policies for postgres | ℹ️ INFO

SELECT
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'households'
ORDER BY policyname;

-- ============================================================================
-- VERIFICATION SUMMARY CHECKLIST
-- ============================================================================
-- Run these queries to verify complete setup:

-- 1. pg_cron extension installed
SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') as "pg_cron_installed";

-- 2. update-household-streaks job exists and is active
SELECT EXISTS(
  SELECT 1 FROM cron.job 
  WHERE jobname = 'update-household-streaks' 
    AND active = true
) as "cron_job_active";

-- 3. calculate_household_completion function exists
SELECT EXISTS(
  SELECT 1 FROM information_schema.routines 
  WHERE routine_name = 'calculate_household_completion'
    AND routine_schema = 'public'
) as "calculate_function_exists";

-- 4. update_household_streaks function exists
SELECT EXISTS(
  SELECT 1 FROM information_schema.routines 
  WHERE routine_name = 'update_household_streaks'
    AND routine_schema = 'public'
) as "update_function_exists";

-- 5. Households table has required columns
SELECT EXISTS(
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'households' 
    AND column_name = 'daily_streak'
) and EXISTS(
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'households' 
    AND column_name = 'last_completion_date'
) as "household_columns_exist";

-- Expected: All results should be TRUE
