-- Add avatar_url column to users for DiceBear avatar selection.
-- Run once in the Supabase SQL Editor.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
