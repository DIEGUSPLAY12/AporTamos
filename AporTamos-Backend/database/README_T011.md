# T011 Implementation Guide: Supabase Storage Buckets

**Task**: T011 - Create Supabase Storage buckets: task-proofs (private) and chat-media (private)

**Feature**: AporTamos 001-household-tasks  
**Phase**: Phase 2: Foundational Infrastructure  
**Status**: Implementation documentation

---

## Overview

Task T011 creates two private Supabase Storage buckets for the AporTamos household task management platform:

1. **task-proofs** - Stores task completion photo proofs for verification
2. **chat-media** - Stores household chat media (images, audio)

These buckets are critical for:
- Photo upload functionality in task completion workflow
- Media sharing in household communication
- File storage with privacy controls

---

## Deliverables

This task provides:

1. **create_storage_buckets.py** - Automated bucket creation script
2. **STORAGE_BUCKET_VERIFICATION.sql** - SQL verification queries
3. **T011_STORAGE_BUCKETS_CHECKLIST.md** - Comprehensive verification checklist
4. **README_T011.md** - This implementation guide

---

## Requirements

### Supabase Setup

Ensure your Supabase project is active:
- Project must be created in Supabase Dashboard
- Project URL format: `https://[project-ref].supabase.co`
- Service role key must be available

### Environment Configuration

Create or update `.env` file in project root:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Getting credentials**:
1. Go to Supabase Dashboard
2. Select your project
3. Go to **Project Settings** → **API**
4. Copy:
   - URL: Project URL (starts with https://)
   - Service Role Key: Hidden by default, click to reveal

### Python Dependencies

For automated bucket creation:

```bash
pip install supabase python-dotenv
```

---

## Bucket Specifications

### Bucket 1: task-proofs

| Property | Value |
|----------|-------|
| Name | `task-proofs` |
| Access | Private |
| Purpose | Task completion photo proofs |
| Max Size | 5MB per file (recommended) |
| Format | JPEG, PNG |
| Path Structure | `/{household_id}/{task_id}/{filename}` |

**Creation in Dashboard**:
1. Storage → New Bucket
2. Name: `task-proofs`
3. Access: **Private** (unchecked "Public")
4. Create

### Bucket 2: chat-media

| Property | Value |
|----------|-------|
| Name | `chat-media` |
| Access | Private |
| Purpose | Household chat media (images, audio) |
| Max Size | Configurable per type |
| Format | Images (JPEG, PNG, WebP), Audio (MP3, WAV) |
| Path Structure | `/{household_id}/{channel_id}/{filename}` |

**Creation in Dashboard**:
1. Storage → New Bucket
2. Name: `chat-media`
3. Access: **Private** (unchecked "Public")
4. Create

---

## Implementation Methods

### Method 1: Supabase Dashboard (Recommended for Manual Verification)

**Step-by-step**:

1. Open Supabase Dashboard → Your Project
2. Click **Storage** in left sidebar
3. Click **Create a new bucket**
   - Name: `task-proofs`
   - Toggle: Uncheck "Public bucket"
   - Click **Create bucket**
4. Repeat for `chat-media`:
   - Click **Create a new bucket** again
   - Name: `chat-media`
   - Toggle: Uncheck "Public bucket"
   - Click **Create bucket**
5. Verify both buckets appear in list with "Private" label

**Time**: ~2 minutes  
**Difficulty**: ⭐ Easy

### Method 2: Automated Python Script

**File**: `create_storage_buckets.py`

**Prerequisites**:
```bash
# Install dependencies
pip install supabase

# Configure .env
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Execution**:
```bash
cd AporTamos-Backend/database
python create_storage_buckets.py
```

**Expected output**:
```
Connecting to Supabase...
✓ Connected to Supabase

Checking existing buckets...
Existing buckets: None

============================================================
CREATING STORAGE BUCKETS
============================================================
✓ Bucket 'task-proofs' created successfully
✓ Bucket 'chat-media' created successfully

============================================================
VERIFICATION
============================================================
✓ Bucket 'task-proofs' verified
  ID: 00000000-0000-0000-0000-000000000001
  Public: False
  Created: 2026-05-07T10:30:00Z
✓ Bucket 'chat-media' verified
  ID: 00000000-0000-0000-0000-000000000002
  Public: False
  Created: 2026-05-07T10:30:00Z

============================================================
✓ BUCKET CREATION SUCCESSFUL
============================================================
```

**Time**: ~30 seconds  
**Difficulty**: ⭐⭐ Easy (automation)

---

## Verification

### Quick Verification (SQL Query)

Run in Supabase SQL Editor:

```sql
-- Check if both buckets exist and are private
SELECT 
  name,
  public,
  id
FROM storage.buckets
WHERE name IN ('task-proofs', 'chat-media')
ORDER BY name;
```

**Expected result**:
```
name         | public | id
-------------|--------|------
chat-media   | false  | uuid1
task-proofs  | false  | uuid2
```

### Comprehensive Verification

File: `STORAGE_BUCKET_VERIFICATION.sql`

Contains 8 verification queries covering:
1. All buckets in project
2. Specific bucket checks
3. Access level verification
4. Storage policies
5. Quick summary
6. Bucket structure
7. API accessibility
8. Final comprehensive check

**Usage**:
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `STORAGE_BUCKET_VERIFICATION.sql`
3. Paste into SQL Editor
4. Run queries individually
5. Verify each returns expected results

### Python Script Verification

The `create_storage_buckets.py` script includes built-in verification:
- Attempts to create buckets
- Verifies creation via Supabase API
- Reports success/failure for each bucket
- Provides bucket IDs and metadata

---

## Troubleshooting

### Error: "Bucket already exists"

**Cause**: Buckets created in previous attempt  
**Solution**: This is expected on re-run. Buckets will be skipped.

```
✓ Bucket 'task-proofs' already exists (skipped)
✓ Bucket 'chat-media' already exists (skipped)
```

### Error: "Failed to create Supabase client"

**Cause**: Invalid or missing credentials  
**Solution**:
1. Verify `SUPABASE_URL` format: `https://[project].supabase.co`
2. Check `SUPABASE_SERVICE_ROLE_KEY` is not placeholder
3. Regenerate key in Supabase Dashboard if needed
4. Update .env file
5. Retry

### Error: "Connection refused"

**Cause**: Network issue or invalid URL  
**Solution**:
1. Verify Supabase project is active
2. Check internet connection
3. Confirm URL is correct
4. Try manual creation in Dashboard

### Issue: Buckets created but showing as "Public"

**Cause**: Access level not set correctly  
**Solution**:
1. Go to Storage bucket settings
2. Click bucket name
3. Toggle **Public bucket** to OFF
4. Save changes
5. Verify with SQL query

---

## Testing Bucket Access

After buckets are created, test basic functionality:

### List Bucket Contents (TypeScript Example)

```typescript
// From frontend
const { data, error } = await supabase
  .storage
  .from('task-proofs')
  .list();

if (error) {
  console.error('Access denied:', error);
} else {
  console.log('Bucket accessible:', data);
}
```

### Upload Test File

```typescript
// Test upload
const { data, error } = await supabase
  .storage
  .from('task-proofs')
  .upload('test.txt', new File(['test'], 'test.txt'));

if (error) {
  console.error('Upload failed:', error);
} else {
  console.log('Upload successful:', data);
}
```

---

## Storage Bucket Integration

### Path Conventions

Follow these path conventions for organized file storage:

**task-proofs**:
```
/{household_id}/{task_id}/{timestamp}_{filename}

Examples:
/550e8400-e29b-41d4-a716-446655440000/a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6/1715072400_photo.jpg
/550e8400-e29b-41d4-a716-446655440000/b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7/1715072401_photo.jpg
```

**chat-media**:
```
/{household_id}/{channel_id}/{message_id}/{filename}

Examples:
/550e8400-e29b-41d4-a716-446655440000/general/msg-001/image.jpg
/550e8400-e29b-41d4-a716-446655440000/general/msg-002/audio.mp3
```

### Supabase SDK Usage

**Create signed URLs** (for sharing):
```typescript
const { data } = await supabase
  .storage
  .from('task-proofs')
  .createSignedUrl('550e8400/a1b2c3d4/photo.jpg', 3600);

// URL expires in 3600 seconds (1 hour)
```

**Get public URLs** (only works if bucket is public):
```typescript
const { data } = supabase
  .storage
  .from('task-proofs')
  .getPublicUrl('550e8400/a1b2c3d4/photo.jpg');
```

---

## RLS Policies (Future Task)

Storage bucket policies will be configured in a separate task. Expected setup:

```sql
-- task-proofs policy
CREATE POLICY household_access ON storage.objects
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_id = ((storage.foldername(name))[1])::uuid
    )
  );
```

---

## Task Completion

### Verification Checklist

- [ ] task-proofs bucket exists
- [ ] chat-media bucket exists
- [ ] Both buckets are marked as private
- [ ] Bucket IDs are recorded
- [ ] SQL verification query returns 2 rows
- [ ] Python script reports success (or "already exists")
- [ ] No error messages in verification

### Before Moving to T012

1. ✅ Run verification SQL queries
2. ✅ Confirm both buckets visible in Storage Dashboard
3. ✅ Verify access level is "Private" for both
4. ✅ Mark T011 complete in tasks.md
5. ✅ Commit changes to git

---

## Files Provided

| File | Purpose |
|------|---------|
| `create_storage_buckets.py` | Automated bucket creation script |
| `STORAGE_BUCKET_VERIFICATION.sql` | SQL verification queries (8 queries) |
| `T011_STORAGE_BUCKETS_CHECKLIST.md` | Comprehensive verification checklist |
| `README_T011.md` | This implementation guide |

---

## Summary

Task T011 creates two private Supabase Storage buckets:

✓ **task-proofs** - Task photo upload bucket  
✓ **chat-media** - Chat media bucket

**Creation time**: 2-5 minutes  
**Verification time**: 2-5 minutes  
**Total effort**: ⭐⭐ Minimal

**Next task**: T012 - Supabase Auth Configuration

---

## References

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase Python Client](https://github.com/supabase/supabase-py)
- Database Schema: [database-schema.md](database-schema.md)
- Verification SQL: [STORAGE_BUCKET_VERIFICATION.sql](STORAGE_BUCKET_VERIFICATION.sql)
- Project Plan: [../../specs/001-household-tasks/plan.md](../../specs/001-household-tasks/plan.md)
