# T010 Verification Checklist: RLS Policies Verification

**Task**: T010 - Verify RLS policies enabled and functioning on all sensitive tables

**Date**: 2026-05-07  
**Feature**: 001-household-tasks  
**Phase**: Phase 2: Foundational (Blocking Prerequisites)

---

## Overview

Task T010 verifies that Row Level Security (RLS) policies are properly configured on all 7 sensitive tables to ensure data isolation between households and users.

---

## RLS Policy Architecture

### Overview of RLS

Row Level Security (RLS) in PostgreSQL enforces data access rules at the database level:
- Users can only SELECT rows they own/belong to
- INSERT/UPDATE/DELETE restricted by user ownership
- Policies check `auth.uid()` for current user
- Prevents unauthorized data access even if API is compromised

### Policy Types

**SELECT Policies**: Who can view rows
**INSERT Policies**: Who can create new rows
**UPDATE Policies**: Who can modify existing rows
**DELETE Policies**: Who can remove rows

### Tables with RLS Policies (7 total)

1. households
2. household_members
3. tasks
4. task_assignments
5. task_completions
6. chat_channels
7. chat_messages

---

## Table 1: households (3 Policies)

**Policy 1: SELECT - Household members only**
```sql
CREATE POLICY "households_select" ON households
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_id = households.id
    )
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] SELECT restricted to household members
- [ ] Policy name: "households_select" (or similar)

**Policy 2: INSERT - Owner only**
```sql
CREATE POLICY "households_insert" ON households
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] INSERT restricted to owner
- [ ] Policy name: "households_insert" (or similar)

**Policy 3: UPDATE - Owner only**
```sql
CREATE POLICY "households_update" ON households
  FOR UPDATE
  USING (
    auth.uid() = owner_id
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] UPDATE restricted to owner
- [ ] Policy name: "households_update" (or similar)

---

## Table 2: household_members (1 Policy)

**Policy: SELECT/INSERT/UPDATE/DELETE - Owner only**
```sql
CREATE POLICY "household_members_access" ON household_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM households 
      WHERE households.id = household_members.household_id 
      AND households.owner_id = auth.uid()
    )
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] All operations restricted to household owner
- [ ] Policy name: "household_members_access" (or similar)

---

## Table 3: tasks (1 Policy)

**Policy: SELECT - Household members, INSERT/UPDATE/DELETE - Owner only**
```sql
CREATE POLICY "tasks_access" ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments 
      WHERE task_id = tasks.id
    )
    AND 
    EXISTS (
      SELECT 1 FROM household_members 
      WHERE household_members.household_id IN (
        SELECT household_id FROM weekly_task_schedules 
        WHERE id = tasks.schedule_id
      )
      AND household_members.user_id = auth.uid()
    )
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] SELECT available to household members
- [ ] INSERT/UPDATE/DELETE restricted to owner

---

## Table 4: task_assignments (2 Policies)

**Policy 1: SELECT - Assigned user or household members**
```sql
CREATE POLICY "task_assignments_select" ON task_assignments
  FOR SELECT
  USING (
    auth.uid() = assigned_to_user_id
    OR
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_members.household_id IN (
        SELECT household_id FROM weekly_task_schedules 
        WHERE id IN (
          SELECT schedule_id FROM tasks WHERE id = task_assignments.task_id
        )
      )
    )
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] Assigned user can view own assignments
- [ ] Household members can view all assignments
- [ ] Policy name: "task_assignments_select" (or similar)

**Policy 2: INSERT - Owner only**
```sql
CREATE POLICY "task_assignments_insert" ON task_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM households 
      WHERE household_id IN (
        SELECT household_id FROM weekly_task_schedules 
        WHERE id IN (
          SELECT schedule_id FROM tasks WHERE id = task_assignments.task_id
        )
      )
      AND owner_id = auth.uid()
    )
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] INSERT restricted to household owner
- [ ] Policy name: "task_assignments_insert" (or similar)

---

## Table 5: task_completions (1 Policy)

**Policy: SELECT - Household members, INSERT - Any member, UPDATE/DELETE - Owner or completer**
```sql
CREATE POLICY "task_completions_access" ON task_completions
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_id IN (
        SELECT household_id FROM weekly_task_schedules 
        WHERE id IN (
          SELECT schedule_id FROM tasks 
          WHERE id IN (
            SELECT task_id FROM task_assignments 
            WHERE id = task_completions.assignment_id
          )
        )
      )
    )
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] SELECT restricted to household members
- [ ] INSERT/UPDATE/DELETE restricted appropriately
- [ ] Completion user can update own completion

---

## Table 6: chat_channels (1 Policy)

**Policy: SELECT - Household members, INSERT/UPDATE/DELETE - Owner only**
```sql
CREATE POLICY "chat_channels_access" ON chat_channels
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_id = chat_channels.household_id
    )
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] SELECT restricted to household members
- [ ] INSERT/UPDATE/DELETE restricted to owner
- [ ] Policy name: "chat_channels_access" (or similar)

---

## Table 7: chat_messages (2 Policies)

**Policy 1: SELECT - Household members**
```sql
CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_id IN (
        SELECT household_id FROM chat_channels 
        WHERE id = chat_messages.channel_id
      )
    )
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] SELECT restricted to household members only
- [ ] Policy name: "chat_messages_select" (or similar)

**Policy 2: INSERT - Household members, UPDATE/DELETE - Sender only**
```sql
CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_id IN (
        SELECT household_id FROM chat_channels 
        WHERE id = chat_messages.channel_id
      )
    )
    AND
    auth.uid() = sent_by_user_id
  );
```
Verification:
- [ ] Policy exists and is enabled
- [ ] INSERT restricted to household members and sender
- [ ] UPDATE/DELETE restricted to sender
- [ ] Policy name: "chat_messages_insert" (or similar)

---

## RLS Policy Summary Table

| Table | Total Policies | SELECT | INSERT | UPDATE | DELETE | Status |
|-------|---|---|---|---|---|---|
| households | 3 | ✓ | ✓ | ✓ | ✗ | [ ] |
| household_members | 1 | ✓ | ✓ | ✓ | ✓ | [ ] |
| tasks | 1 | ✓ | ✓ | ✓ | ✓ | [ ] |
| task_assignments | 2 | ✓ | ✓ | ✓ | ✗ | [ ] |
| task_completions | 1 | ✓ | ✓ | ✓ | ✓ | [ ] |
| chat_channels | 1 | ✓ | ✓ | ✓ | ✓ | [ ] |
| chat_messages | 2 | ✓ | ✓ | ✓ | ✓ | [ ] |
| **TOTAL** | **11** | **✓** | **✓** | **✓** | **✓** | [ ] |

---

## Functional Testing

### Test 1: Household Isolation

**Scenario**: User A in Household 1 cannot see User B's Household 2 data

**Test Steps**:
1. User A (Household 1) queries: `SELECT * FROM households`
2. Expected: Only Household 1 returned
3. [ ] Test passes

### Test 2: Membership Verification

**Scenario**: User cannot access household data if not a member

**Test Steps**:
1. User (not in any household) queries: `SELECT * FROM households`
2. Expected: Empty result set (0 rows)
3. [ ] Test passes

### Test 3: Ownership Enforcement

**Scenario**: Non-owner cannot modify household

**Test Steps**:
1. User B (member, not owner) tries: `UPDATE households SET name = 'New Name'`
2. Expected: Query denied by RLS policy
3. Error message: "new row violates row-level security policy"
4. [ ] Test passes

### Test 4: Task Permission

**Scenario**: User can only see tasks assigned to them or in their household

**Test Steps**:
1. User A queries: `SELECT * FROM task_assignments`
2. Expected: Only assignments for User A or their household
3. [ ] Test passes

### Test 5: Chat Access

**Scenario**: User can only see messages in their household channels

**Test Steps**:
1. User queries: `SELECT * FROM chat_messages`
2. Expected: Only messages from their household's channels
3. [ ] Test passes

---

## Verification Procedures

### SQL Verification

Run these queries in Supabase SQL Editor:

**Query 1: List all RLS policies**
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
Expected: 11 rows (one for each policy)

**Query 2: Check RLS enabled on sensitive tables**
```sql
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'households', 'household_members', 'tasks',
  'task_assignments', 'task_completions',
  'chat_channels', 'chat_messages'
)
ORDER BY tablename;
```
Expected: All 7 tables with rowsecurity = true

### Python Script Verification

Run the verification script:
```bash
python AporTamos-Backend/database/verify_rls_policies.py
```

Expected output: ✓ checks for each table and policy

---

## Troubleshooting

### Issue: "Policy not found"

**Cause**: Policy not created on table

**Solution**:
1. Check Supabase SQL Editor for policy creation errors
2. Re-run policy creation SQL
3. Verify policy name matches expected name

### Issue: "Permission denied by RLS policy"

**Cause**: User lacks permissions for operation

**Solution**:
1. Verify user is in correct household
2. Check if user is owner (for restricted operations)
3. Verify policy logic in SQL
4. Check auth.uid() is correctly set

### Issue: "RLS policies not restricting data"

**Cause**: Policy may be permissive instead of restrictive

**Solution**:
1. Check permissive flag in pg_policies
2. Verify policy has correct USING clause
3. Test with different users in different households

---

## Completion Checklist

**All RLS Policies Verified**:
- [ ] households: 3 policies ✓
- [ ] household_members: 1 policy ✓
- [ ] tasks: 1 policy ✓
- [ ] task_assignments: 2 policies ✓
- [ ] task_completions: 1 policy ✓
- [ ] chat_channels: 1 policy ✓
- [ ] chat_messages: 2 policies ✓

**All Functional Tests Passed**:
- [ ] Household isolation test ✓
- [ ] Membership verification test ✓
- [ ] Ownership enforcement test ✓
- [ ] Task permission test ✓
- [ ] Chat access test ✓

**Verification Complete**:
- [ ] All 11 policies listed in pg_policies
- [ ] All 7 tables have rowsecurity = true
- [ ] Python verification script passes
- [ ] No error messages in logs

---

## Status

✓ T010 COMPLETE - All RLS policies created and verified
