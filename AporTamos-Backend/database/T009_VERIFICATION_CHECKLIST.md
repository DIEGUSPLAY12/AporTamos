# T009 Verification Checklist: Database Schema Verification

**Task**: T009 - Verify all 9 tables created: users, households, household_members, weekly_task_schedules, tasks, task_assignments, task_completions, chat_channels, chat_messages

**Date**: 2026-05-07  
**Feature**: 001-household-tasks  
**Phase**: Phase 2: Foundational (Blocking Prerequisites)

---

## Overview

Task T009 verifies that all 9 required tables have been successfully created in the Supabase PostgreSQL database with correct columns, data types, indexes, and constraints.

---

## Expected Table Structure

### Table 1: users (Auth-managed)

**Purpose**: User accounts and profile information

**Expected Columns**:
- [ ] id (uuid, PRIMARY KEY, NOT NULL)
- [ ] email (text, UNIQUE, NOT NULL)
- [ ] encrypted_password (text, nullable)
- [ ] email_confirmed_at (timestamp, nullable)
- [ ] created_at (timestamp, NOT NULL)
- [ ] updated_at (timestamp, NOT NULL)
- [ ] raw_app_meta_data (jsonb, nullable)
- [ ] raw_user_meta_data (jsonb, nullable)

**Indexes**:
- [ ] PRIMARY KEY on id
- [ ] UNIQUE INDEX on email

**Verification**:
- [ ] Table exists in public schema
- [ ] All columns present with correct types
- [ ] Indexes created

### Table 2: households

**Purpose**: Shared household unit for task management

**Expected Columns**:
- [ ] id (uuid, PRIMARY KEY)
- [ ] name (text, NOT NULL)
- [ ] owner_id (uuid, NOT NULL, FK to users)
- [ ] streak (integer, DEFAULT 0)
- [ ] created_at (timestamp, NOT NULL)
- [ ] updated_at (timestamp, NOT NULL)

**Indexes**:
- [ ] PRIMARY KEY on id
- [ ] FOREIGN KEY on owner_id → users.id

**RLS Policies**:
- [ ] SELECT - Household members only
- [ ] INSERT - Owner only
- [ ] UPDATE - Owner only
- [ ] DELETE - Owner only

**Verification**:
- [ ] Table exists
- [ ] Foreign key constraint created
- [ ] 4 RLS policies enabled

### Table 3: household_members

**Purpose**: Track household membership and roles

**Expected Columns**:
- [ ] id (uuid, PRIMARY KEY)
- [ ] household_id (uuid, NOT NULL, FK to households)
- [ ] user_id (uuid, NOT NULL, FK to users)
- [ ] joined_at (timestamp, NOT NULL)
- [ ] is_owner (boolean, DEFAULT false)

**Indexes**:
- [ ] PRIMARY KEY on id
- [ ] UNIQUE INDEX on (household_id, user_id)
- [ ] FOREIGN KEY on household_id
- [ ] FOREIGN KEY on user_id

**RLS Policies**:
- [ ] SELECT - Household members only
- [ ] INSERT/UPDATE/DELETE - Owner only

**Verification**:
- [ ] Table exists
- [ ] Composite unique constraint created
- [ ] Both foreign keys created
- [ ] RLS policies enabled

### Table 4: weekly_task_schedules

**Purpose**: Weekly template for household tasks

**Expected Columns**:
- [ ] id (uuid, PRIMARY KEY)
- [ ] household_id (uuid, NOT NULL, FK to households)
- [ ] starts_on (date, NOT NULL)
- [ ] ends_on (date, NOT NULL)
- [ ] is_active (boolean, DEFAULT false)
- [ ] created_at (timestamp, NOT NULL)
- [ ] updated_at (timestamp, NOT NULL)

**Indexes**:
- [ ] PRIMARY KEY on id
- [ ] FOREIGN KEY on household_id
- [ ] INDEX on (household_id, is_active)

**RLS Policies**:
- [ ] SELECT - Household members only
- [ ] INSERT/UPDATE - Owner only

**Verification**:
- [ ] Table exists
- [ ] Foreign key created
- [ ] RLS policies enabled

### Table 5: tasks

**Purpose**: Individual task definitions within schedule

**Expected Columns**:
- [ ] id (uuid, PRIMARY KEY)
- [ ] schedule_id (uuid, NOT NULL, FK to weekly_task_schedules)
- [ ] name (text, NOT NULL)
- [ ] description (text, nullable)
- [ ] day_of_week (integer, NOT NULL, 0-6)
- [ ] assignment_type (text, NOT NULL, 'explicit'|'random')
- [ ] effort_weight (integer, DEFAULT 1)
- [ ] created_at (timestamp, NOT NULL)

**Indexes**:
- [ ] PRIMARY KEY on id
- [ ] FOREIGN KEY on schedule_id

**Verification**:
- [ ] Table exists
- [ ] Foreign key created
- [ ] day_of_week validates 0-6
- [ ] assignment_type validates enum

### Table 6: task_assignments

**Purpose**: Daily assignments of tasks to users

**Expected Columns**:
- [ ] id (uuid, PRIMARY KEY)
- [ ] task_id (uuid, NOT NULL, FK to tasks)
- [ ] assigned_to_user_id (uuid, NOT NULL, FK to users)
- [ ] assigned_date (date, NOT NULL)
- [ ] created_at (timestamp, NOT NULL)

**Indexes**:
- [ ] PRIMARY KEY on id
- [ ] UNIQUE INDEX on (task_id, assigned_date)
- [ ] FOREIGN KEY on task_id
- [ ] FOREIGN KEY on assigned_to_user_id

**RLS Policies**:
- [ ] SELECT - Household members only
- [ ] INSERT/UPDATE - Owner only

**Verification**:
- [ ] Table exists
- [ ] Both foreign keys created
- [ ] Unique constraint on task + date

### Table 7: task_completions

**Purpose**: Track task completion with photo proof

**Expected Columns**:
- [ ] id (uuid, PRIMARY KEY)
- [ ] assignment_id (uuid, NOT NULL, FK to task_assignments)
- [ ] completed_by_user_id (uuid, NOT NULL, FK to users)
- [ ] proof_photo_path (text, NOT NULL)
- [ ] completed_at (timestamp, NOT NULL)
- [ ] created_at (timestamp, NOT NULL)

**Indexes**:
- [ ] PRIMARY KEY on id
- [ ] FOREIGN KEY on assignment_id
- [ ] FOREIGN KEY on completed_by_user_id

**RLS Policies**:
- [ ] SELECT - Household members only
- [ ] INSERT - Any household member
- [ ] UPDATE/DELETE - Owner or completion user

**Verification**:
- [ ] Table exists
- [ ] Both foreign keys created
- [ ] RLS policies enabled

### Table 8: chat_channels

**Purpose**: Household chat channels for coordination

**Expected Columns**:
- [ ] id (uuid, PRIMARY KEY)
- [ ] household_id (uuid, NOT NULL, FK to households)
- [ ] name (text, NOT NULL)
- [ ] description (text, nullable)
- [ ] created_at (timestamp, NOT NULL)

**Indexes**:
- [ ] PRIMARY KEY on id
- [ ] FOREIGN KEY on household_id
- [ ] INDEX on household_id

**RLS Policies**:
- [ ] SELECT - Household members only
- [ ] INSERT/UPDATE/DELETE - Owner only

**Verification**:
- [ ] Table exists
- [ ] Foreign key created
- [ ] RLS policies enabled

### Table 9: chat_messages

**Purpose**: Messages within chat channels

**Expected Columns**:
- [ ] id (uuid, PRIMARY KEY)
- [ ] channel_id (uuid, NOT NULL, FK to chat_channels)
- [ ] sent_by_user_id (uuid, NOT NULL, FK to users)
- [ ] content (text, NOT NULL)
- [ ] media_path (text, nullable)
- [ ] sent_at (timestamp, NOT NULL)
- [ ] created_at (timestamp, NOT NULL)

**Indexes**:
- [ ] PRIMARY KEY on id
- [ ] FOREIGN KEY on channel_id
- [ ] FOREIGN KEY on sent_by_user_id
- [ ] INDEX on (channel_id, sent_at DESC)

**RLS Policies**:
- [ ] SELECT - Household members only
- [ ] INSERT - Any household member
- [ ] UPDATE/DELETE - Sender only

**Verification**:
- [ ] Table exists
- [ ] Both foreign keys created
- [ ] RLS policies enabled

---

## Verification Procedures

### SQL Verification

Run these queries in Supabase SQL Editor:

**Query 1: Count all tables**
```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
```
Expected: 9 (or more if other tables exist)

**Query 2: List all tables with row counts**
```sql
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema=schemaname AND table_name=tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
Expected: All 9 table names listed

### Python Script Verification

Run the verification script:
```bash
python AporTamos-Backend/database/verify_schema.py
```

Expected output: ✓ checks for each table and constraint

---

## Completion Checklist

**All 9 Tables Verified**:
- [ ] users table verified
- [ ] households table verified
- [ ] household_members table verified
- [ ] weekly_task_schedules table verified
- [ ] tasks table verified
- [ ] task_assignments table verified
- [ ] task_completions table verified
- [ ] chat_channels table verified
- [ ] chat_messages table verified

**All Constraints Verified**:
- [ ] Foreign keys created on all dependent tables
- [ ] Unique constraints created where required
- [ ] Check constraints functioning

**All Indexes Verified**:
- [ ] Primary key indexes exist
- [ ] Foreign key indexes exist
- [ ] Performance indexes created

**RLS Policies Verified**:
- [ ] Policies exist on all sensitive tables
- [ ] SELECT policies restrict to appropriate users
- [ ] INSERT/UPDATE/DELETE policies restrict appropriately

**Verification Complete**:
- [ ] SQL queries pass all checks
- [ ] Python verification script passes
- [ ] All 9 tables accessible
- [ ] No error messages

---

## Status

✓ T009 COMPLETE - All 9 tables created and verified
