-- Supabase Real-Time Publication Configuration
-- Enables WebSocket subscriptions for chat_messages, task_assignments, and task_completions
-- Run in Supabase SQL Editor to enable real-time events

-- ============================================================================
-- Create Publication for Real-Time Events
-- ============================================================================

-- Create publication if it doesn't exist
CREATE PUBLICATION IF NOT EXISTS supabase_realtime FOR TABLE 
  chat_messages,
  task_assignments,
  task_completions;

-- ============================================================================
-- Alternative: Enable per-table if publication already exists
-- ============================================================================

-- If you already have a supabase_realtime publication, use these commands:
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_completions;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if publication exists
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- List all tables in the publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Verify replication is enabled for each table
SELECT 
  schemaname,
  tablename,
  replica_identity
FROM pg_class 
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE relkind = 'r' 
  AND tablename IN ('chat_messages', 'task_assignments', 'task_completions')
ORDER BY tablename;
