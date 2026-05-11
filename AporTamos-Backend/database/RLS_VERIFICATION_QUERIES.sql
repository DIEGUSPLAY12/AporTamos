-- RLS Policy Verification Queries for AporTamos
-- Run these in Supabase SQL Editor to verify RLS policies

-- ============================================================================
-- VERIFICATION 1: Check RLS Status on All Sensitive Tables
-- ============================================================================

-- Check if RLS is enabled on all 7 sensitive tables
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                    'task_completions', 'chat_channels', 'chat_messages')
ORDER BY tablename;

-- Expected Results: All 7 tables with rowsecurity = true

-- ============================================================================
-- VERIFICATION 2: Count Policies Per Table
-- ============================================================================

-- Count policies for each sensitive table
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                    'task_completions', 'chat_channels', 'chat_messages')
GROUP BY tablename
ORDER BY tablename;

-- Expected Results:
-- households | 3 | households_select, households_update, households_delete
-- household_members | 1 | household_members_select
-- tasks | 1 | tasks_select
-- task_assignments | 2 | task_assignments_select, task_assignments_update
-- task_completions | 1 | task_completions_select
-- chat_channels | 1 | chat_channels_select
-- chat_messages | 2 | chat_messages_insert, chat_messages_select

-- ============================================================================
-- VERIFICATION 3: List All RLS Policies with Details
-- ============================================================================

-- List all policies with their command type and whether they use auth.uid()
SELECT 
  tablename,
  policyname,
  cmd as command_type,
  CASE WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' 
       THEN '✓ Uses auth.uid()' 
       ELSE '⚠ No auth.uid() reference' 
  END as auth_reference,
  CASE WHEN permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END as policy_type
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                    'task_completions', 'chat_channels', 'chat_messages')
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFICATION 4: Check Specific Policy Logic - households Table
-- ============================================================================

-- Verify households RLS policies
SELECT 
  policyname,
  cmd as command,
  qual as select_condition,
  with_check as insert_update_condition,
  'households' as table_name
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'households'
ORDER BY policyname;

-- Expected:
-- households_select  | SELECT | id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
-- households_update  | UPDATE | owner_id = auth.uid()
-- households_delete  | DELETE | owner_id = auth.uid()

-- ============================================================================
-- VERIFICATION 5: Check Specific Policy Logic - household_members Table
-- ============================================================================

SELECT 
  policyname,
  cmd as command,
  qual as select_condition,
  'household_members' as table_name
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'household_members'
ORDER BY policyname;

-- Expected:
-- household_members_select | SELECT | household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())

-- ============================================================================
-- VERIFICATION 6: Check Specific Policy Logic - tasks Table
-- ============================================================================

SELECT 
  policyname,
  cmd as command,
  qual as select_condition,
  'tasks' as table_name
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY policyname;

-- Expected:
-- tasks_select | SELECT | schedule_id IN (SELECT id FROM weekly_task_schedules ...)

-- ============================================================================
-- VERIFICATION 7: Check Specific Policy Logic - task_assignments Table
-- ============================================================================

SELECT 
  policyname,
  cmd as command,
  qual as select_condition,
  with_check as insert_update_condition,
  'task_assignments' as table_name
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'task_assignments'
ORDER BY policyname;

-- Expected:
-- task_assignments_select | SELECT | household_id IN (SELECT household_id FROM household_members ...)
-- task_assignments_update | UPDATE | assigned_to_user_id = auth.uid() OR household_id IN (...)

-- ============================================================================
-- VERIFICATION 8: Check Specific Policy Logic - task_completions Table
-- ============================================================================

SELECT 
  policyname,
  cmd as command,
  qual as select_condition,
  'task_completions' as table_name
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'task_completions'
ORDER BY policyname;

-- Expected:
-- task_completions_select | SELECT | assignment_id IN (SELECT id FROM task_assignments ...)

-- ============================================================================
-- VERIFICATION 9: Check Specific Policy Logic - chat_channels Table
-- ============================================================================

SELECT 
  policyname,
  cmd as command,
  qual as select_condition,
  'chat_channels' as table_name
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'chat_channels'
ORDER BY policyname;

-- Expected:
-- chat_channels_select | SELECT | household_id IN (SELECT household_id FROM household_members ...)

-- ============================================================================
-- VERIFICATION 10: Check Specific Policy Logic - chat_messages Table
-- ============================================================================

SELECT 
  policyname,
  cmd as command,
  qual as select_condition,
  with_check as insert_update_condition,
  'chat_messages' as table_name
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'chat_messages'
ORDER BY policyname;

-- Expected:
-- chat_messages_insert | INSERT | WITH CHECK (sender_id = auth.uid() AND channel_id IN (...))
-- chat_messages_select | SELECT | channel_id IN (SELECT id FROM chat_channels ...)

-- ============================================================================
-- VERIFICATION 11: Summary - All RLS Configured Correctly
-- ============================================================================

WITH expected_tables AS (
  SELECT 'households' as table_name, 3 as expected_policies
  UNION ALL SELECT 'household_members', 1
  UNION ALL SELECT 'tasks', 1
  UNION ALL SELECT 'task_assignments', 2
  UNION ALL SELECT 'task_completions', 1
  UNION ALL SELECT 'chat_channels', 1
  UNION ALL SELECT 'chat_messages', 2
),
actual_counts AS (
  SELECT 
    tablename,
    COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
)
SELECT 
  e.table_name,
  e.expected_policies,
  COALESCE(a.policy_count, 0) as actual_policies,
  CASE 
    WHEN COALESCE(a.policy_count, 0) = e.expected_policies THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = e.table_name AND schemaname = 'public') as rls_enabled
FROM expected_tables e
LEFT JOIN actual_counts a ON a.tablename = e.table_name
ORDER BY e.table_name;

-- ============================================================================
-- VERIFICATION 12: Check for auth.uid() Usage in Policies
-- ============================================================================

-- Count how many policies actually use auth.uid()
SELECT 
  tablename,
  COUNT(*) as total_policies,
  SUM(CASE WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' 
           THEN 1 ELSE 0 END) as policies_with_auth,
  CASE WHEN COUNT(*) = SUM(CASE WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' 
                                  THEN 1 ELSE 0 END)
       THEN '✓ All policies use auth.uid()'
       ELSE '⚠ Some policies missing auth.uid()'
  END as auth_usage
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                    'task_completions', 'chat_channels', 'chat_messages')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- VERIFICATION 13: Test RLS by Checking Policy Definitions
-- ============================================================================

-- Get full policy definition for each sensitive table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                    'task_completions', 'chat_channels', 'chat_messages')
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFICATION 14: Final Comprehensive Check
-- ============================================================================

-- One query to verify all RLS requirements are met
SELECT 
  'RLS Configuration' as check_name,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
   AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                     'task_completions', 'chat_channels', 'chat_messages')) as tables_with_rls,
  7 as expected_tables,
  CASE WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
             AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                               'task_completions', 'chat_channels', 'chat_messages')) = 7
       THEN '✓ PASS' ELSE '✗ FAIL' END as rls_status
UNION ALL
SELECT 
  'Total Policies Created',
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
   AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                     'task_completions', 'chat_channels', 'chat_messages')),
  11 as expected,
  CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
             AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                               'task_completions', 'chat_channels', 'chat_messages')) >= 11
       THEN '✓ PASS' ELSE '✗ FAIL' END
UNION ALL
SELECT 
  'auth.uid() Usage',
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
   AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
   AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                     'task_completions', 'chat_channels', 'chat_messages')),
  11 as expected,
  CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
             AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
             AND tablename IN ('households', 'household_members', 'tasks', 'task_assignments', 
                               'task_completions', 'chat_channels', 'chat_messages')) >= 11
       THEN '✓ PASS' ELSE '✗ FAIL' END;
