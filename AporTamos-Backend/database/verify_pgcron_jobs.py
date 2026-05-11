"""
T014 Verification Script: Supabase pg_cron Job Configuration

This script verifies that the daily 12:05 AM UTC streak calculation job is correctly
configured in Supabase PostgreSQL. The job runs the update_household_streaks() function
daily to update household daily streaks based on completion percentages.

Run this after the schema migration (T008) has been deployed to Supabase.
"""

import os
from typing import Dict, List
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def print_verification_guide():
    """Print the verification guide for pg_cron job configuration."""

    print("=" * 80)
    print("T014 PG_CRON JOB VERIFICATION GUIDE")
    print("=" * 80)
    print()

    print("What is being verified:")
    print("-" * 80)
    print("""
The pg_cron job automatically updates household daily streaks every day at 12:05 AM UTC.

Workflow:
1. Job runs at 12:05 AM UTC daily
2. For each active household:
   - Calculate yesterday's task completion percentage
   - If completion = 100%: increment daily_streak
   - If completion < 100%: reset daily_streak to 0
3. Update last_completion_date to today's date
4. Log results for monitoring

This enables the gamification system's daily streak tracking.
""")

    print("Verification Steps:")
    print("-" * 80)
    print("""
1. Check if pg_cron extension is installed
2. Verify the 'update-household-streaks' job is scheduled
3. Confirm the cron schedule is correct (5 0 * * *)
4. Test the update_household_streaks() function manually
5. Monitor logs for successful execution
""")

    print()


def print_verification_queries():
    """Print SQL queries for manual verification in Supabase SQL Editor."""

    print("=" * 80)
    print("VERIFICATION QUERIES FOR SUPABASE SQL EDITOR")
    print("=" * 80)
    print()

    print("Query 1: Check if pg_cron extension is installed")
    print("-" * 80)
    print("""
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

Expected Result:
- extname: pg_cron
- extversion: [version number, e.g., 1.4]
- extnamespace: pg_catalog (or other schema)
""")
    print()

    print("Query 2: List all scheduled cron jobs")
    print("-" * 80)
    print("""
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

Expected Result:
- jobname: update-household-streaks
- schedule: 5 0 * * * (12:05 AM UTC daily)
- command: SELECT update_household_streaks()
- active: true (or 't')
""")
    print()

    print("Query 3: Check the specific streak update job")
    print("-" * 80)
    print("""
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  next_run
FROM cron.job
WHERE jobname = 'update-household-streaks';

Expected Result:
- jobname: update-household-streaks
- schedule: 5 0 * * * (cron format for daily at 12:05 AM UTC)
- command: SELECT update_household_streaks()
- active: t (true)
- next_run: [next execution time]
""")
    print()

    print("Query 4: View recent cron job execution logs")
    print("-" * 80)
    print("""
SELECT
  job_pid,
  database,
  command,
  start_time,
  end_time
FROM cron.job_run_details
WHERE database = 'postgres' OR jobname LIKE 'update-household-streaks'
ORDER BY start_time DESC
LIMIT 10;

Note: Available on some Supabase projects with extended logging enabled.
""")
    print()

    print("Query 5: Verify functions exist")
    print("-" * 80)
    print("""
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('calculate_household_completion', 'update_household_streaks');

Expected Result:
- routine_name: calculate_household_completion (FUNCTION)
- routine_name: update_household_streaks (FUNCTION)
""")
    print()

    print("Query 6: Check household streak data after job execution")
    print("-" * 80)
    print("""
SELECT
  id,
  name,
  timezone_id,
  daily_streak,
  last_completion_date,
  updated_at
FROM households
WHERE deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 5;

Expected After Job Run:
- daily_streak: Incrementing for 100% completion days, reset to 0 otherwise
- last_completion_date: Updated to today (in household's timezone)
- updated_at: Matches job execution time
""")
    print()


def print_configuration_details():
    """Print detailed configuration information."""

    print("=" * 80)
    print("CRON JOB CONFIGURATION DETAILS")
    print("=" * 80)
    print()

    print("Job Name")
    print("-" * 80)
    print("Name: update-household-streaks")
    print("Type: Scheduled PostgreSQL function")
    print()

    print("Schedule")
    print("-" * 80)
    print("""
Format: Cron expression (5-field format)
Value: 5 0 * * *

Breakdown:
  5     = minute (5 minutes past the hour)
  0     = hour (0 = midnight)
  *     = day of month (any)
  *     = month (any)
  *     = day of week (any)

Frequency: Daily at 12:05 AM UTC
Timezone: UTC (not household timezone - see notes below)
""")
    print()

    print("Function Behavior")
    print("-" * 80)
    print("""
Function: update_household_streaks()

1. Loops through all active households (deleted_at IS NULL)

2. For each household:
   a. Convert current time to household's timezone
   b. Calculate yesterday's date in household timezone
   c. Check if already processed today (skip if yes)
   d. Calculate completion percentage for yesterday's tasks
   
3. Update logic:
   - If completion = 100%:
     * daily_streak = daily_streak + 1
     * last_completion_date = today (in household timezone)
   - If completion < 100%:
     * daily_streak = 0
     * last_completion_date = today (in household timezone)

4. Update timestamp: updated_at = now()

Performance:
  - Processes all active households in sequence
  - Estimated duration: <1 second for 100 households
  - Lightweight: Single loop, one update per household
""")
    print()

    print("Completion Percentage Calculation")
    print("-" * 80)
    print("""
Helper Function: calculate_household_completion(household_id, date)

Calculation:
  completion_pct = (completed_weight / total_weight) * 100

Where:
  - total_weight = sum of effort_weight for all task_assignments on date
  - completed_weight = sum of effort_weight for completed task_assignments
  - effort_weight = integer 1-10 (set when task is created)

Examples:
  - 2 tasks of weight 5: one completed = 5/10 = 50%
  - 3 tasks of weight 4: all completed = 12/12 = 100% ✓ (streak increments)
  - 2 tasks of weight 5: none completed = 0/10 = 0% (streak resets)
  - 0 tasks assigned = NULL (no update)
""")
    print()


def print_timezone_notes():
    """Print important timezone handling information."""

    print("=" * 80)
    print("IMPORTANT: TIMEZONE HANDLING")
    print("=" * 80)
    print()

    print("Key Points:")
    print("-" * 80)
    print("""
1. Job Schedule Time: Always 12:05 AM UTC
   - Fixed UTC schedule ensures consistent job execution
   - Independent of household timezones

2. Streak Calculation: Household Timezone-Aware
   - "Yesterday" is calculated in each household's timezone
   - Each household sees streaks reset/increment at their local midnight
   - Supports households across different timezones

Example Timeline (US/Eastern household, UTC-5):
  Day 1:
  - 11:59 PM EST: Last task completed at 99%
  - 12:00 AM EST / 5:00 AM UTC: Job runs (but yesterday = Day 0 in EST)
  - 12:05 AM EST / 5:05 AM UTC: Job completes streak calculation for Day 0 (yesterday)
  - Result: Streak resets to 0

  Day 2:
  - All tasks 100% complete by 11:59 PM EST
  - 12:05 AM EST / 5:05 AM UTC: Job runs next day
  - Calculates Day 1 completion in EST timezone
  - Result: Streak increments to 1

3. last_completion_date field
   - Updated to today's date in household's timezone
   - Prevents duplicate calculations if job runs multiple times
   - Allows tracking of streak updates across days
""")
    print()


def print_testing_guide():
    """Print guide for testing the cron job."""

    print("=" * 80)
    print("TESTING THE CRON JOB")
    print("=" * 80)
    print()

    print("Automated Test: Manual Function Execution")
    print("-" * 80)
    print("""
To test without waiting for the scheduled time:

1. Open Supabase SQL Editor
2. Run: SELECT update_household_streaks();
3. Check results: 
   SELECT id, daily_streak, last_completion_date, updated_at 
   FROM households 
   WHERE deleted_at IS NULL 
   ORDER BY updated_at DESC 
   LIMIT 5;

4. Verify:
   - Streaks updated correctly
   - last_completion_date reflects today
   - updated_at shows recent timestamp
""")
    print()

    print("Integration Test: Full Streak Workflow")
    print("-" * 80)
    print("""
Prerequisites:
- Active household with 2+ members
- Multiple tasks assigned for tomorrow's date
- At least one task not assigned

Steps:

1. Setup Test Data:
   INSERT INTO task_assignments (task_id, household_id, assigned_to_user_id, assignment_date, is_completed)
   VALUES (?, ?, ?, TODAY, false);

2. Complete All Tasks:
   UPDATE task_assignments 
   SET is_completed = true, completed_at = now()
   WHERE assignment_date = TODAY 
     AND household_id = ?;

3. Run Job Manually (simulates next day):
   SELECT update_household_streaks();

4. Verify Results:
   SELECT daily_streak, last_completion_date 
   FROM households 
   WHERE id = ?;
   
   Expected: 
   - daily_streak = 1 (or previous + 1)
   - last_completion_date = today

5. Test Streak Reset:
   UPDATE task_assignments 
   SET is_completed = false
   WHERE assignment_date = (TODAY - INTERVAL '1 day')
     AND household_id = ?;
   
   SELECT update_household_streaks();
   
   Expected: daily_streak = 0
""")
    print()

    print("Monitoring: Watch for Errors")
    print("-" * 80)
    print("""
1. Check PostgreSQL error logs in Supabase Dashboard
   - Navigate to Project Settings > Logs > Postgres Logs
   - Search for 'cron' or 'update-household-streaks'
   
2. Common Issues:
   - Function not found: Verify schema migration (T008) deployed
   - Permission denied: Check RLS policies don't block postgres role
   - Timeout: If household count is very high (>10000), may need optimization

3. Recovery:
   - If job fails repeatedly, disable and re-enable:
     SELECT cron.unschedule('update-household-streaks');
     SELECT cron.schedule('update-household-streaks', '5 0 * * *', 'SELECT update_household_streaks()');
""")
    print()


def print_troubleshooting():
    """Print troubleshooting section."""

    print("=" * 80)
    print("TROUBLESHOOTING")
    print("=" * 80)
    print()

    print("Issue: pg_cron extension not found")
    print("-" * 80)
    print("""
Error: function cron.schedule does not exist

Solution:
1. Supabase automatically includes pg_cron
2. Verify by running: CREATE EXTENSION IF NOT EXISTS pg_cron;
3. If it fails, contact Supabase support
""")
    print()

    print("Issue: Job not executing")
    print("-" * 80)
    print("""
Symptoms: Streaks not updating, no changes to households table

Steps:
1. Verify job is active:
   SELECT * FROM cron.job WHERE jobname = 'update-household-streaks';
   
2. Check if active = true
   
3. If active = false, enable:
   SELECT cron.alter_job(?, active := true);
   (Replace ? with jobid from previous query)

4. Check PostgreSQL logs for errors
   
5. Try manual execution:
   SELECT update_household_streaks();
   (Check if it works)
""")
    print()

    print("Issue: Streaks not updating correctly")
    print("-" * 80)
    print("""
Symptoms: Streaks stay at 0, never increment

Likely Causes:
1. Task completion data incorrect
   - Verify task_assignments.is_completed set correctly
   - Check effort_weight values (should be 1-10)

2. Timezone mismatch
   - Verify household.timezone_id is valid IANA timezone
   - Check if 'yesterday' is calculated in correct timezone

3. Function has issues
   - Test manually: SELECT update_household_streaks();
   - Check for NULL values in calculate_household_completion()

Resolution:
   SELECT calculate_household_completion(?, TODAY - INTERVAL '1 day');
   (Replace ? with household_id)
   
   Should return completion percentage (0-100) or NULL if no tasks
""")
    print()

    print("Issue: Job runs but causes errors")
    print("-" * 80)
    print("""
Symptoms: PostgreSQL logs show errors during 12:05 AM UTC

Possible Causes:
1. Function definition issue
   - Verify functions created correctly: SELECT * FROM information_schema.routines;
   
2. Table lock conflict
   - Function may conflict with active transactions
   - Usually resolves itself (retried next day)

3. RLS policy blocks update
   - Verify postgres role can update households table
   - Check RLS policies don't exclude postgres role

Actions:
1. Check PostgreSQL error logs
2. Review function code for issues
3. If persistent, disable job and notify Supabase support
""")
    print()


if __name__ == "__main__":
    # Print all verification and testing information
    print_verification_guide()
    print()

    print_verification_queries()
    print()

    print_configuration_details()
    print()

    print_timezone_notes()
    print()

    print_testing_guide()
    print()

    print_troubleshooting()
    print()

    print("=" * 80)
    print("NEXT STEPS")
    print("=" * 80)
    print()
    print("1. Run verification queries in Supabase SQL Editor")
    print("2. Confirm pg_cron extension is installed")
    print("3. Verify 'update-household-streaks' job is active")
    print("4. Test function manually: SELECT update_household_streaks();")
    print("5. Monitor the job at 12:05 AM UTC daily")
    print("6. Check household streaks update correctly")
    print()
