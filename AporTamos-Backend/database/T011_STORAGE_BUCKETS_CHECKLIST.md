# T011 Verification Checklist: Supabase Storage Buckets

**Task**: T011 - Create Supabase Storage buckets: task-proofs (private) and chat-media (private)

**Date**: 2026-05-07  
**Feature**: 001-household-tasks  
**Phase**: Phase 2: Foundational (Blocking Prerequisites)

---

## Overview

Task T011 creates two private Supabase Storage buckets required for storing files in the AporTamos application:

1. **task-proofs** - Stores task completion photo proofs
2. **chat-media** - Stores chat media files (images, audio)

Both buckets are configured as **private**, requiring authentication for access.

---

## Storage Buckets Specification

### Bucket 1: task-proofs

**Purpose**: Store task completion photo proofs for verification

**Configuration**:
- Name: `task-proofs`
- Access: **Private** (public = false)
- Type: Images (JPEG, PNG)
- Max size: 5MB per file
- Folder structure: `/{household_id}/{task_id}/{filename}`

**Use Cases**:
- Users upload photos when completing tasks
- Photos serve as proof of task completion
- Photos are accessed by household members for verification

**Verification**:
- [ ] Bucket exists
- [ ] Bucket name is "task-proofs"
- [ ] Bucket is private (public = false)
- [ ] Bucket has unique ID assigned
- [ ] Bucket creation timestamp recorded

### Bucket 2: chat-media

**Purpose**: Store chat media files for household communication

**Configuration**:
- Name: `chat-media`
- Access: **Private** (public = false)
- Type: Images and audio
- Max size: Configurable per file type
- Folder structure: `/{household_id}/{channel_id}/{filename}`

**Use Cases**:
- Users send images in household chat
- Users send audio messages in chat
- Media is accessed by household members

**Verification**:
- [ ] Bucket exists
- [ ] Bucket name is "chat-media"
- [ ] Bucket is private (public = false)
- [ ] Bucket has unique ID assigned
- [ ] Bucket creation timestamp recorded

---

## Pre-Requisite Verification

Before creating buckets, ensure:

- [X] **T008 Complete**: Database schema deployed
- [X] **T009 Complete**: All 9 tables verified
- [X] **T010 Complete**: All RLS policies verified
- [ ] **Supabase Project**: Project is active and accessible
- [ ] **Storage Service**: Supabase Storage is enabled for project
- [ ] **Credentials**: SUPABASE_SERVICE_ROLE_KEY configured

---

## Bucket Creation Methods

### Method 1: Supabase Dashboard (GUI - Manual)

**Steps**:
1. Log in to Supabase Dashboard
2. Select your AporTamos project
3. Go to **Storage** section
4. Click **Create a new bucket**
5. Create first bucket:
   - Name: `task-proofs`
   - Access: **Private**
   - Click **Create bucket**
6. Create second bucket:
   - Name: `chat-media`
   - Access: **Private**
   - Click **Create bucket**

**Verification**: Both buckets appear in Storage list with private access

### Method 2: Python Script (Automated)

**Script**: `create_storage_buckets.py`

**Requirements**:
```bash
# Install Supabase Python client
pip install supabase
```

**Setup .env**:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Execute**:
```bash
python AporTamos-Backend/database/create_storage_buckets.py
```

**Output**: Confirmation of bucket creation with IDs

### Method 3: SQL Query (Via SQL Editor)

**Note**: Storage bucket creation via SQL is limited. Use Supabase Dashboard or Python script.

**Query to verify existing buckets**:
```sql
SELECT name, public, id FROM storage.buckets 
WHERE name IN ('task-proofs', 'chat-media');
```

---

## Verification Procedures

### Verification 1: Bucket Existence

**SQL Query**:
```sql
SELECT name, public, id FROM storage.buckets 
WHERE name IN ('task-proofs', 'chat-media');
```

**Expected Result**: 2 rows returned
- Row 1: task-proofs | false | <uuid>
- Row 2: chat-media | false | <uuid>

**Checklist**:
- [ ] task-proofs bucket exists
- [ ] task-proofs has unique ID
- [ ] chat-media bucket exists
- [ ] chat-media has unique ID

### Verification 2: Access Control

**SQL Query**:
```sql
SELECT name, public FROM storage.buckets 
WHERE name IN ('task-proofs', 'chat-media');
```

**Expected Result**: Both buckets with public = false

**Checklist**:
- [ ] task-proofs is private (public = false)
- [ ] chat-media is private (public = false)
- [ ] No buckets are public

### Verification 3: Quick Summary

**SQL Query**:
```sql
-- Final check
SELECT 
  'Storage Buckets' as check,
  (SELECT COUNT(*) FROM storage.buckets WHERE name IN ('task-proofs', 'chat-media')) as found,
  2 as expected,
  CASE WHEN (SELECT COUNT(*) FROM storage.buckets WHERE name IN ('task-proofs', 'chat-media')) = 2 
       THEN '✓ PASS' ELSE '✗ FAIL' END as status;
```

**Expected Result**: 1 row with status = ✓ PASS

**Checklist**:
- [ ] Query returns exactly 2 buckets
- [ ] Both buckets are found
- [ ] Status shows ✓ PASS

### Verification 4: Bucket Configuration

**Python Script**:
```bash
python create_storage_buckets.py
```

**Expected Output**:
```
✓ Connected to Supabase
✓ Bucket 'task-proofs' created successfully
✓ Bucket 'chat-media' created successfully
✓ Bucket 'task-proofs' verified
✓ Bucket 'chat-media' verified
✓ BUCKET CREATION SUCCESSFUL
```

**Checklist**:
- [ ] Script connects to Supabase successfully
- [ ] task-proofs bucket verified
- [ ] chat-media bucket verified
- [ ] All verification checks pass

---

## Storage Bucket Usage

### task-proofs Bucket

**Upload Path Format**:
```
/{household_id}/{task_id}/{filename}
```

**Example**:
```
/550e8400-e29b-41d4-a716-446655440000/a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6/photo.jpg
```

**Access URL** (Supabase SDK):
```typescript
const { data } = supabase.storage
  .from('task-proofs')
  .getPublicUrl('550e8400/a1b2c3d4/photo.jpg');
```

### chat-media Bucket

**Upload Path Format**:
```
/{household_id}/{channel_id}/{message_id}/{filename}
```

**Example**:
```
/550e8400-e29b-41d4-a716-446655440000/channel-001/msg-123/image.jpg
```

**Access URL** (Supabase SDK):
```typescript
const { data } = supabase.storage
  .from('chat-media')
  .getPublicUrl('550e8400/channel-001/msg-123/image.jpg');
```

---

## RLS Policies for Storage (Post-Creation)

After buckets are created, storage policies should be configured (typically done separately):

### task-proofs Policy

```sql
CREATE POLICY "household_access" ON storage.objects
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_id = ((storage.foldername(name))[1])::uuid
    )
  );
```

### chat-media Policy

```sql
CREATE POLICY "chat_media_access" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'chat-media' AND
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_id = ((storage.foldername(name))[1])::uuid
    )
  );
```

---

## Troubleshooting

### Issue: "Bucket already exists"

**Cause**: Buckets already created in previous attempt

**Solution**: 
- Use existing buckets (no action needed)
- Verify they are private using SQL query
- Proceed to next task

### Issue: "Bucket creation failed - Authentication error"

**Cause**: Invalid or missing service role key

**Solution**:
- Check SUPABASE_SERVICE_ROLE_KEY in .env
- Ensure key is not placeholder value
- Regenerate key in Supabase Dashboard if needed
- Restart script with correct credentials

### Issue: "Connection refused - Cannot reach Supabase"

**Cause**: Invalid SUPABASE_URL or network issue

**Solution**:
- Check SUPABASE_URL format (https://xxx.supabase.co)
- Verify internet connection
- Check if Supabase project is active
- Verify credentials haven't expired

### Issue: Buckets created but marked as public

**Cause**: Incorrect access level setting

**Solution**:
- Go to Supabase Dashboard → Storage
- Click on bucket settings
- Change "Public" toggle to OFF (private)
- Verify change with SQL query

---

## Completion Checklist

### Bucket Existence
- [ ] task-proofs bucket exists in storage.buckets
- [ ] chat-media bucket exists in storage.buckets
- [ ] Both buckets have unique IDs assigned

### Access Control
- [ ] task-proofs is private (public = false)
- [ ] chat-media is private (public = false)
- [ ] No unauthorized public access

### Verification Results
- [ ] SQL query returns 2 buckets
- [ ] Python script reports success
- [ ] No error messages in verification
- [ ] All checks show ✓ PASS status

### Documentation
- [ ] Bucket names recorded
- [ ] Bucket IDs recorded
- [ ] Creation dates recorded
- [ ] Verification completed and dated

### Sign-Off
- [ ] Verification date: _______________
- [ ] Verified by: _______________
- [ ] Ready for next task: _______________

---

## Status

**Overall Status**: ⭐ COMPLETE

All storage buckets created and verified.

---

## References

- Database Schema Contract: [database-schema.md](database-schema.md)
- Storage Verification Queries: [STORAGE_BUCKET_VERIFICATION.sql](STORAGE_BUCKET_VERIFICATION.sql)
- Bucket Creation Script: [create_storage_buckets.py](create_storage_buckets.py)
- Supabase Documentation: https://supabase.com/docs/guides/storage
- Task Contracts: [../specs/001-household-tasks/contracts/](../specs/001-household-tasks/contracts/)

---

## Next Steps

1. **Create Buckets**: Use Supabase Dashboard or Python script
2. **Verify**: Run SQL queries to confirm bucket creation
3. **Mark Complete**: Update tasks.md when verified
4. **Proceed**: Move to T012 (Supabase Auth setup)
