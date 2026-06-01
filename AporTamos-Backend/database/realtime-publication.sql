-- Supabase Real-Time Publication Configuration
-- Enables WebSocket subscriptions for chat_messages, task_assignments, and task_completions
-- Run in Supabase SQL Editor to enable real-time events

-- ============================================================================
-- Create Publication for Real-Time Events
-- ============================================================================

-- Supabase ya crea la publicación 'supabase_realtime' por defecto.
-- Añade las tablas (ADD TABLE falla si ya está, así que se ignora el error).
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- REPLICA IDENTITY FULL hace que payload.new incluya TODAS las columnas
-- (necesario para leer is_completed en el evento de realtime).
ALTER TABLE task_assignments REPLICA IDENTITY FULL;
ALTER TABLE task_completions REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

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
