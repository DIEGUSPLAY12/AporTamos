# T010 Verification Checklist: RLS Policies Verification

**Task**: T010 - Verify RLS policies enabled and functioning on all sensitive tables

**Date**: 2026-05-07  
**Feature**: 001-household-tasks  
**Phase**: Phase 2: Foundational (Blocking Prerequisites)

---

## Prerequisite Verification

Before verifying RLS policies, ensure:

- [X] **T008 Complete**: Database schema migration deployed to Supabase
- [X] **T009 Complete**: All 9 tables verified as created
- [ ] **RLS Enabled**: Row Level Security available in Supabase project
- [ ] **Supabase Project Active**: PostgreSQL instance is running

---

## RLS Policy Overview

Row Level Security (RLS) ensures data isolation between users and households. Each policy enforces that users can only access data they belong to through their household membership.

### 7 Sensitive Tables Requiring RLS

| # | Table | Purpose | RLS Required | Status |
|---|-------|---------|--------------|--------|
| 1 | households | Household data | YES - Owner only updates | ⏳ |
| 2 | household_members | Membership data | YES - Members only view | ⏳ |
| 3 | tasks | Task definitions | YES - Household members only | ⏳ |
| 4 | task_assignments | Daily assignments | YES - Assigned users + owners | ⏳ |
| 5 | task_completions | Completion records | YES - Household members only | ⏳ |
| 6 | chat_channels | Chat channels | YES - Household members only | ⏳ |
| 7 | chat_messages | Chat messages | YES - Members can insert/read | ⏳ |

---

## RLS Status Verification

### Check 1: RLS Enabled on Tables

Each table must have the `rowsecurity` flag set to `true`.

**Verification Query**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('households', 'household_members', 'tasks', 
                    'task_assignments', 'task_completions', 
                    'chat_channels', 'chat_messages')
ORDER BY tablename;
```

**Expected Result**: All 7 tables with `rowsecurity = true`

**Verification Checklist**:
- [ ] households - rowsecurity = true
- [ ] household_members - rowsecurity = true
- [ ] tasks - rowsecurity = true
- [ ] task_assignments - rowsecurity = true
- [ ] task_completions - rowsecurity = true
- [ ] chat_channels - rowsecurity = true
- [ ] chat_messages - rowsecurity = true

---

## Policy Count Verification

### Check 2: Correct Number of Policies Per Table

Each table must have the expected number of policies.

| Table | Expected Policies | Policy Types |
|-------|-------------------|--------------|
| households | 3 | SELECT, UPDATE, DELETE |
| household_members | 1 | SELECT |
| tasks | 1 | SELECT |
| task_assignments | 2 | SELECT, UPDATE |
| task_completions | 1 | SELECT |
| chat_channels | 1 | SELECT |
| chat_messages | 2 | SELECT, INSERT |

**Verification Query**:
```sql
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('households', 'household_members', 'tasks', 
                    'task_assignments', 'task_completions', 
                    'chat_channels', 'chat_messages')
GROUP BY tablename
ORDER BY tablename;
```

**Expected Result**: 
- households: 3
- household_members: 1
- tasks: 1
- task_assignments: 2
- task_completions: 1
- chat_channels: 1
- chat_messages: 2

**Verification Checklist**:
- [ ] households - 3 policies
- [ ] household_members - 1 policy
- [ ] tasks - 1 policy
- [ ] task_assignments - 2 policies
- [ ] task_completions - 1 policy
- [ ] chat_channels - 1 policy
- [ ] chat_messages - 2 policies

---

## Policy Logic Verification

### Check 3: households Table Policies

**Policy 1: households_select** (SELECT)
- **Purpose**: Users can view households they belong to
- **Logic**: `id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())`
- **Verification**: 
  - [ ] Uses auth.uid() to identify user
  - [ ] Checks household_members table for membership
  - [ ] Only returns households user belongs to

**Policy 2: households_update** (UPDATE)
- **Purpose**: Only owner can update household
- **Logic**: `owner_id = auth.uid()`
- **Verification**:
  - [ ] Uses auth.uid() to identify user
  - [ ] Only allows owner to modify
  - [ ] Protects household data from member tampering

**Policy 3: households_delete** (DELETE)
- **Purpose**: Only owner can delete household
- **Logic**: `owner_id = auth.uid()`
- **Verification**:
  - [ ] Uses auth.uid() to identify user
  - [ ] Only allows owner to delete
  - [ ] Prevents accidental data loss by members

---

### Check 4: household_members Table Policies

**Policy: household_members_select** (SELECT)
- **Purpose**: Users can view members of their households
- **Logic**: `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())`
- **Verification**:
  - [ ] Uses auth.uid() to identify user
  - [ ] Only shows members of user's households
  - [ ] Prevents viewing members of other households

---

### Check 5: tasks Table Policies

**Policy: tasks_select** (SELECT)
- **Purpose**: Users can view tasks from their household schedules
- **Logic**: `schedule_id IN (SELECT id FROM weekly_task_schedules WHERE household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))`
- **Verification**:
  - [ ] Uses auth.uid() to identify user
  - [ ] Checks household membership
  - [ ] Only shows tasks from user's households

---

### Check 6: task_assignments Table Policies

**Policy 1: task_assignments_select** (SELECT)
- **Purpose**: Users can view assignments for their households
- **Logic**: `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())`
- **Verification**:
  - [ ] Uses auth.uid() to identify user
  - [ ] Only shows assignments from user's households
  - [ ] All household members can view all assignments

**Policy 2: task_assignments_update** (UPDATE)
- **Purpose**: Assigned users and owners can update assignments
- **Logic**: `assigned_to_user_id = auth.uid() OR household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'owner')`
- **Verification**:
  - [ ] Users can update their own assignments
  - [ ] Owners can update any household assignment
  - [ ] Members cannot modify others' assignments

---

### Check 7: task_completions Table Policies

**Policy: task_completions_select** (SELECT)
- **Purpose**: Users can view completions from their households
- **Logic**: `assignment_id IN (SELECT id FROM task_assignments WHERE household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))`
- **Verification**:
  - [ ] Uses auth.uid() to identify user
  - [ ] Only shows completions from user's households
  - [ ] Prevents viewing completions from other households

---

### Check 8: chat_channels Table Policies

**Policy: chat_channels_select** (SELECT)
- **Purpose**: Users can view channels for their households
- **Logic**: `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())`
- **Verification**:
  - [ ] Uses auth.uid() to identify user
  - [ ] Only shows channels from user's households
  - [ ] Each household has exactly one channel

---

### Check 9: chat_messages Table Policies

**Policy 1: chat_messages_select** (SELECT)
- **Purpose**: Users can view messages from channels in their households
- **Logic**: `channel_id IN (SELECT id FROM chat_channels WHERE household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))`
- **Verification**:
  - [ ] Uses auth.uid() to identify user
  - [ ] Only shows messages from user's household channels
  - [ ] Prevents viewing other households' messages

**Policy 2: chat_messages_insert** (INSERT)
- **Purpose**: Users can only send messages to their household channels
- **Logic**: `sender_id = auth.uid() AND channel_id IN (SELECT id FROM chat_channels WHERE household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))`
- **Verification**:
  - [ ] Messages attributed to authenticated user (sender_id = auth.uid())
  - [ ] User can only send to their household channels
  - [ ] Prevents impersonation or cross-household messages

---

## auth.uid() Verification

### Check 10: All Policies Use auth.uid()

All policies MUST use `auth.uid()` to reference the current authenticated user.

**Verification Query**:
```sql
SELECT 
  tablename,
  policyname,
  CASE WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' 
       THEN '✓ YES' 
       ELSE '✗ NO' 
  END as uses_auth_uid
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('households', 'household_members', 'tasks', 
                    'task_assignments', 'task_completions', 
                    'chat_channels', 'chat_messages')
ORDER BY tablename, policyname;
```

**Expected Result**: All policies with `uses_auth_uid = ✓ YES`

**Verification Checklist**:
- [ ] households_select uses auth.uid()
- [ ] households_update uses auth.uid()
- [ ] households_delete uses auth.uid()
- [ ] household_members_select uses auth.uid()
- [ ] tasks_select uses auth.uid()
- [ ] task_assignments_select uses auth.uid()
- [ ] task_assignments_update uses auth.uid()
- [ ] task_completions_select uses auth.uid()
- [ ] chat_channels_select uses auth.uid()
- [ ] chat_messages_select uses auth.uid()
- [ ] chat_messages_insert uses auth.uid()

---

## Verification Methods

### Method 1: Quick Check (5 minutes)
Use the summary query from RLS_VERIFICATION_QUERIES.sql

```sql
-- Run final comprehensive check query
SELECT * FROM (summary query results)
WHERE status = '✓ PASS';
```

Expected: All rows should show PASS status

### Method 2: Automated Verification (10 minutes)
```bash
# Requires: .env with SUPABASE_URL configured
python AporTamos-Backend/database/verify_rls_policies.py
```

### Method 3: Manual Verification (20 minutes)
Follow the SQL queries from RLS_VERIFICATION_QUERIES.sql sequentially in Supabase SQL Editor

---

## Functional Testing

### Test 1: Household Isolation
**Purpose**: Verify users cannot see other households' data

**Test Steps**:
1. Create User A and User B
2. Create Household 1 (owned by User A)
3. Create Household 2 (owned by User B)
4. Attempt to query households as User A
5. Verify: User A sees only Household 1
6. Verify: User A cannot see Household 2

### Test 2: Membership Verification
**Purpose**: Verify only household members can access data

**Test Steps**:
1. Create Household with User A as owner
2. Query household_members as User A (should succeed)
3. Query household_members as User B (should return empty or fail)

### Test 3: Ownership Enforcement
**Purpose**: Verify only owners can modify households

**Test Steps**:
1. Create Household owned by User A
2. Attempt to UPDATE household as User A (should succeed)
3. Attempt to UPDATE household as User B (should fail)
4. Attempt to DELETE household as User A (should succeed)
5. Attempt to DELETE household as User B (should fail)

### Test 4: Task Assignment Permissions
**Purpose**: Verify users can only update their own assignments

**Test Steps**:
1. Create task assignment for User A
2. Attempt to UPDATE as User A (should succeed)
3. Attempt to UPDATE as User B (should fail unless owner)

---

## Completion Checklist

### RLS Status
- [ ] All 7 sensitive tables have rowsecurity = true
- [ ] All 11 policies created (3+1+1+2+1+1+2)
- [ ] All policies reference auth.uid()

### Policy Verification
- [ ] households: 3 policies (select, update, delete)
- [ ] household_members: 1 policy (select)
- [ ] tasks: 1 policy (select)
- [ ] task_assignments: 2 policies (select, update)
- [ ] task_completions: 1 policy (select)
- [ ] chat_channels: 1 policy (select)
- [ ] chat_messages: 2 policies (select, insert)

### Logic Verification
- [ ] All SELECT policies use auth.uid() with household_members check
- [ ] All UPDATE policies enforce owner or assigned user restrictions
- [ ] All INSERT policies enforce sender_id = auth.uid()
- [ ] All policies properly restrict access to user's households only

### Functional Tests
- [ ] Household isolation working
- [ ] Membership verification working
- [ ] Ownership enforcement working
- [ ] Task assignment permissions working

### Final Sign-Off
- [ ] Verification date: _______________
- [ ] Verified by: _______________
- [ ] All checks passed: _______________
- [ ] Ready for T011: _______________

---

## Status

**Overall Status**: ⭕ PENDING

**Completion Status**: Mark as COMPLETE when all verification checks pass

---

## References

- Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Schema Specification: [../specs/001-household-tasks/contracts/database-schema.md](../specs/001-household-tasks/contracts/database-schema.md)
- Migration File: [migrations/2026-05-07-001-initial-schema.sql](migrations/2026-05-07-001-initial-schema.sql)
- T009 Verification: [T009_VERIFICATION_CHECKLIST.md](T009_VERIFICATION_CHECKLIST.md)
- RLS Queries: [RLS_VERIFICATION_QUERIES.sql](RLS_VERIFICATION_QUERIES.sql)
- Python Script: [verify_rls_policies.py](verify_rls_policies.py)
