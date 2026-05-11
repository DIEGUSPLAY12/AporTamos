-- Supabase Storage Bucket Verification Queries
-- Run these in Supabase SQL Editor to verify storage buckets exist

-- ============================================================================
-- VERIFICATION 1: Check if Storage Buckets Exist
-- ============================================================================

-- Query storage.buckets table to see all buckets
SELECT 
  id,
  name,
  owner,
  public,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;

-- Expected Results:
-- Two rows for task-proofs and chat-media (or more if other buckets exist)

-- ============================================================================
-- VERIFICATION 2: Check Specific Buckets
-- ============================================================================

-- Check if task-proofs bucket exists
SELECT 
  id,
  name,
  public,
  CASE WHEN public = false THEN '✓ PRIVATE' ELSE '⚠ PUBLIC' END as access_level,
  created_at
FROM storage.buckets
WHERE name = 'task-proofs';

-- Expected: One row with public = false

-- Check if chat-media bucket exists
SELECT 
  id,
  name,
  public,
  CASE WHEN public = false THEN '✓ PRIVATE' ELSE '⚠ PUBLIC' END as access_level,
  created_at
FROM storage.buckets
WHERE name = 'chat-media';

-- Expected: One row with public = false

-- ============================================================================
-- VERIFICATION 3: List All Buckets with Access Level
-- ============================================================================

SELECT 
  name,
  id,
  CASE WHEN public = true THEN 'PUBLIC' ELSE 'PRIVATE' END as access_level,
  CASE WHEN public = false THEN '✓' ELSE '✗' END as private_check,
  created_at
FROM storage.buckets
WHERE name IN ('task-proofs', 'chat-media')
ORDER BY name;

-- Expected Results:
-- task-proofs  | <id> | PRIVATE | ✓ | <created_at>
-- chat-media   | <id> | PRIVATE | ✓ | <created_at>

-- ============================================================================
-- VERIFICATION 4: Check Storage Policies
-- ============================================================================

-- List all policies on storage buckets
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- Expected: Policies for object access control (if any are set up)

-- ============================================================================
-- VERIFICATION 5: Quick Summary Check
-- ============================================================================

-- Summary: All required buckets
WITH required_buckets AS (
  SELECT 'task-proofs' as bucket_name
  UNION ALL
  SELECT 'chat-media'
),
actual_buckets AS (
  SELECT name as bucket_name, public, id
  FROM storage.buckets
)
SELECT 
  r.bucket_name,
  CASE WHEN a.bucket_name IS NOT NULL THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status,
  CASE WHEN a.public = false THEN 'PRIVATE ✓' WHEN a.public = true THEN 'PUBLIC ✗' ELSE 'N/A' END as access_level,
  a.id as bucket_id
FROM required_buckets r
LEFT JOIN actual_buckets a ON r.bucket_name = a.bucket_name
ORDER BY r.bucket_name;

-- Expected Results:
-- task-proofs | EXISTS ✓ | PRIVATE ✓ | <id>
-- chat-media  | EXISTS ✓ | PRIVATE ✓ | <id>

-- ============================================================================
-- VERIFICATION 6: Check Bucket Structure
-- ============================================================================

-- See if any objects exist in buckets (for future uploads)
SELECT 
  bucket_id,
  name as file_path,
  owner,
  created_at,
  updated_at,
  metadata
FROM storage.objects
WHERE bucket_id IN (
  SELECT id FROM storage.buckets 
  WHERE name IN ('task-proofs', 'chat-media')
)
ORDER BY bucket_id, created_at;

-- Expected: Empty initially (no files yet)

-- ============================================================================
-- VERIFICATION 7: Test Bucket Accessibility (Requires Active Session)
-- ============================================================================

-- Get bucket info for API usage
SELECT 
  id as bucket_id,
  name as bucket_name,
  public,
  owner,
  created_at
FROM storage.buckets
WHERE name IN ('task-proofs', 'chat-media');

-- Use these IDs for storage URLs:
-- https://<project>.supabase.co/storage/v1/object/public/task-proofs/...  (if public)
-- https://<project>.supabase.co/storage/v1/object/authenticated/task-proofs/...  (if private)

-- ============================================================================
-- VERIFICATION 8: Final Comprehensive Check
-- ============================================================================

SELECT 
  'Storage Buckets' as check_name,
  (SELECT COUNT(*) FROM storage.buckets WHERE name IN ('task-proofs', 'chat-media')) as buckets_found,
  2 as expected,
  CASE 
    WHEN (SELECT COUNT(*) FROM storage.buckets WHERE name IN ('task-proofs', 'chat-media')) = 2 
    THEN '✓ PASS' 
    ELSE '✗ FAIL' 
  END as status
UNION ALL
SELECT 
  'Bucket Access Control',
  (SELECT COUNT(*) FROM storage.buckets WHERE name IN ('task-proofs', 'chat-media') AND public = false),
  2,
  CASE 
    WHEN (SELECT COUNT(*) FROM storage.buckets WHERE name IN ('task-proofs', 'chat-media') AND public = false) = 2 
    THEN '✓ PASS (All Private)' 
    ELSE '✗ FAIL (Some Public)' 
  END;
