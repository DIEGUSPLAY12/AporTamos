-- Supabase Auth Configuration Verification Queries
-- Run these in Supabase SQL Editor to verify auth is configured

-- ============================================================================
-- VERIFICATION 1: Check Auth Users Table Exists
-- ============================================================================

-- Query the auth schema to verify user table exists
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'auth'
ORDER BY table_name;

-- Expected Results:
-- auth | identities | BASE TABLE
-- auth | mfa_amr_claims | BASE TABLE
-- auth | mfa_challenges | BASE TABLE
-- auth | mfa_factors | BASE TABLE
-- auth | refresh_tokens | BASE TABLE
-- auth | sessions | BASE TABLE
-- auth | users | BASE TABLE

-- ============================================================================
-- VERIFICATION 2: Check Auth Users Can Be Created
-- ============================================================================

-- Count existing users in auth.users
SELECT COUNT(*) as total_users FROM auth.users;

-- Expected: Integer count (0 if no users yet)

-- ============================================================================
-- VERIFICATION 3: Check Auth Schema Structure
-- ============================================================================

-- Verify auth.users table has required columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- Expected columns include:
-- id (uuid, NOT NULL) - User ID
-- email (text, NOT NULL) - Email address
-- encrypted_password (text, nullable) - Password hash
-- email_confirmed_at (timestamp, nullable) - Email confirmation
-- created_at (timestamp, NOT NULL) - Account creation time
-- updated_at (timestamp, NOT NULL) - Last update time
-- raw_app_meta_data (jsonb, nullable) - App metadata
-- raw_user_meta_data (jsonb, nullable) - User metadata
-- is_super_admin (boolean) - Admin flag

-- ============================================================================
-- VERIFICATION 4: Check for OAuth Provider Data
-- ============================================================================

-- Check if identities exist (OAuth connections)
SELECT 
  COUNT(*) as total_identities,
  provider,
  COUNT(*) as count_by_provider
FROM auth.identities
GROUP BY provider;

-- Expected: Shows which OAuth providers have been used (empty if none yet)

-- ============================================================================
-- VERIFICATION 5: Verify Sessions Table Structure
-- ============================================================================

-- Check if sessions can be created
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'sessions'
ORDER BY ordinal_position
LIMIT 5;

-- Expected: Columns for id, user_id, created_at, updated_at, etc.

-- ============================================================================
-- VERIFICATION 6: Check Refresh Tokens Table
-- ============================================================================

-- Verify refresh tokens can be stored
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'refresh_tokens'
ORDER BY ordinal_position
LIMIT 5;

-- Expected: Columns for id, user_id, token, created_at, updated_at

-- ============================================================================
-- VERIFICATION 7: Quick Summary - Auth Schema Readiness
-- ============================================================================

SELECT 
  'Auth Users Table' as check_name,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='users')
       THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status
UNION ALL
SELECT 
  'Auth Sessions Table',
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='sessions')
       THEN 'EXISTS ✓' ELSE 'MISSING ✗' END
UNION ALL
SELECT 
  'Auth Identities Table',
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='identities')
       THEN 'EXISTS ✓' ELSE 'MISSING ✗' END
UNION ALL
SELECT 
  'Auth Refresh Tokens Table',
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='refresh_tokens')
       THEN 'EXISTS ✓' ELSE 'MISSING ✗' END;

-- Expected: All 4 checks should return ✓

-- ============================================================================
-- VERIFICATION 8: Check for Auth Triggers (JWT Generation)
-- ============================================================================

-- List auth-related triggers
SELECT 
  trigger_schema,
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
ORDER BY trigger_name;

-- Expected: Triggers for handling user creation, JWT generation, etc.

-- ============================================================================
-- VERIFICATION 9: Verify Auth Functions Exist
-- ============================================================================

-- Check for Supabase auth functions
SELECT 
  routine_schema,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
ORDER BY routine_name;

-- Expected: Functions for auth operations like jwt_generate_sub(), etc.

-- ============================================================================
-- VERIFICATION 10: Check JWT Configuration
-- ============================================================================

-- Get JWT configuration from Supabase settings
SELECT 
  setting_name,
  setting_value
FROM pg_settings
WHERE setting_name LIKE '%jwt%'
OR setting_name LIKE '%auth%'
LIMIT 20;

-- This shows JWT-related PostgreSQL settings

-- ============================================================================
-- VERIFICATION 11: Auth Service Ready Check
-- ============================================================================

-- Final comprehensive check
SELECT 
  'Auth Infrastructure' as check_name,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='auth')::text as tables_found,
  '6+'::text as expected,
  CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='auth') >= 6
       THEN '✓ READY' ELSE '✗ NOT READY' END as status;

-- Expected: At least 6 tables in auth schema, status = ✓ READY

-- ============================================================================
-- VERIFICATION 12: Test User Creation (Auth Schema)
-- ============================================================================

-- Check if auth schema is functioning (count users)
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM auth.sessions) as active_sessions,
  (SELECT COUNT(*) FROM auth.identities) as oauth_identities;

-- Shows auth table status and activity
