-- Migration: 2026-05-07-001-initial-schema.sql
-- Description: Initial AporTamos database schema with tables, indexes, RLS policies, and triggers
-- Deployment: Run this in Supabase SQL Editor

-- ============================================================================
-- PART 1: Create Tables
-- ============================================================================

-- Table 1: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Table 2: households
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  timezone_id TEXT NOT NULL DEFAULT 'America/New_York',
  daily_streak INTEGER NOT NULL DEFAULT 0,
  last_completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_households_owner_id ON households(owner_id);
CREATE INDEX idx_households_created_at ON households(created_at);

-- Table 3: household_members
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(household_id, user_id)
);

CREATE INDEX idx_household_members_household_id ON household_members(household_id);
CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE UNIQUE INDEX idx_households_one_owner ON household_members(household_id) WHERE role = 'owner';

-- Table 4: weekly_task_schedules
CREATE TABLE weekly_task_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active_from DATE NOT NULL DEFAULT CURRENT_DATE,
  active_until DATE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_schedules_household_active ON weekly_task_schedules(household_id) WHERE active_until IS NULL;

-- Table 5: tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES weekly_task_schedules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')),
  effort_weight INTEGER NOT NULL CHECK (effort_weight >= 1 AND effort_weight <= 10),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('explicit', 'random')),
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_tasks_schedule_id ON tasks(schedule_id);
CREATE INDEX idx_tasks_day_of_week ON tasks(day_of_week);
CREATE INDEX idx_tasks_assignment_type ON tasks(assignment_type);

-- Table 6: task_assignments
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(task_id, assignment_date)
);

CREATE INDEX idx_task_assignments_household_date ON task_assignments(household_id, assignment_date);
CREATE INDEX idx_task_assignments_user_date ON task_assignments(assigned_to_user_id, assignment_date);
CREATE INDEX idx_task_assignments_completed ON task_assignments(is_completed);

-- Table 7: task_completions
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE REFERENCES task_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_task_completions_assignment_id ON task_completions(assignment_id);
CREATE INDEX idx_task_completions_user_date ON task_completions(user_id, completed_at);

-- Table 8: chat_channels
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL UNIQUE REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chat_channels_household_id ON chat_channels(household_id);

-- Table 9: chat_messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'audio', 'image')),
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chat_messages_channel_date ON chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);

-- ============================================================================
-- PART 2: Create Functions and Triggers
-- ============================================================================

-- Function: enforce_assignment_type
CREATE OR REPLACE FUNCTION enforce_assignment_type_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignment_type = 'explicit' AND NEW.assigned_user_id IS NULL THEN
    RAISE EXCEPTION 'Explicit assignment must have assigned_user_id';
  END IF;
  IF NEW.assignment_type = 'random' AND NEW.assigned_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Random assignment must not have assigned_user_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: enforce_assignment_type on tasks
CREATE TRIGGER enforce_assignment_type
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION enforce_assignment_type_fn();

-- Function: enforce_message_content
CREATE OR REPLACE FUNCTION enforce_message_content_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.content IS NULL AND NEW.media_url IS NULL) OR 
     (NEW.content IS NOT NULL AND NEW.media_url IS NOT NULL) THEN
    RAISE EXCEPTION 'Exactly one of content or media_url must be set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: enforce_message_content on chat_messages
CREATE TRIGGER enforce_message_content
BEFORE INSERT OR UPDATE ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION enforce_message_content_fn();

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: update_household_updated_at
CREATE TRIGGER update_household_updated_at
BEFORE UPDATE ON households
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_weekly_task_schedules_updated_at
CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON weekly_task_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_tasks_updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_task_assignments_updated_at
CREATE TRIGGER update_task_assignments_updated_at
BEFORE UPDATE ON task_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_household_members_updated_at
CREATE TRIGGER update_household_members_updated_at
BEFORE UPDATE ON household_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_users_updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_chat_channels_updated_at
CREATE TRIGGER update_chat_channels_updated_at
BEFORE UPDATE ON chat_channels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function: create_household_chat
CREATE OR REPLACE FUNCTION create_household_chat_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_channels (household_id, created_at)
  VALUES (NEW.id, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: create_chat_channel_on_household
CREATE TRIGGER create_chat_channel_on_household
AFTER INSERT ON households
FOR EACH ROW
EXECUTE FUNCTION create_household_chat_fn();

-- ============================================================================
-- PART 3: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_task_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Households RLS
CREATE POLICY households_select ON households
  FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY households_update ON households
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY households_delete ON households
  FOR DELETE
  USING (owner_id = auth.uid());

-- Household Members RLS
CREATE POLICY household_members_select ON household_members
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Weekly Task Schedules RLS
CREATE POLICY schedules_select ON weekly_task_schedules
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Tasks RLS
CREATE POLICY tasks_select ON tasks
  FOR SELECT
  USING (
    schedule_id IN (
      SELECT id FROM weekly_task_schedules 
      WHERE household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Task Assignments RLS
CREATE POLICY task_assignments_select ON task_assignments
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY task_assignments_update ON task_assignments
  FOR UPDATE
  USING (
    assigned_to_user_id = auth.uid() OR
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Task Completions RLS
CREATE POLICY task_completions_select ON task_completions
  FOR SELECT
  USING (
    assignment_id IN (
      SELECT id FROM task_assignments 
      WHERE household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Chat Channels RLS
CREATE POLICY chat_channels_select ON chat_channels
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Chat Messages RLS
CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM chat_channels 
      WHERE household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    channel_id IN (
      SELECT id FROM chat_channels 
      WHERE household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- PART 4: Gamification Functions and Scheduled Jobs
-- ============================================================================

-- Install pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: calculate_household_completion
CREATE OR REPLACE FUNCTION calculate_household_completion(
  p_household_id UUID,
  p_date DATE
)
RETURNS FLOAT AS $$
DECLARE
  v_total_weight INTEGER;
  v_completed_weight INTEGER;
BEGIN
  -- Get total effort weight for all assignments on date
  SELECT COALESCE(SUM(t.effort_weight), 0)
  INTO v_total_weight
  FROM task_assignments ta
  JOIN tasks t ON ta.task_id = t.id
  WHERE ta.household_id = p_household_id 
    AND ta.assignment_date = p_date;

  IF v_total_weight = 0 THEN
    RETURN NULL;  -- No tasks assigned
  END IF;

  -- Get completed weight
  SELECT COALESCE(SUM(t.effort_weight), 0)
  INTO v_completed_weight
  FROM task_assignments ta
  JOIN tasks t ON ta.task_id = t.id
  WHERE ta.household_id = p_household_id 
    AND ta.assignment_date = p_date
    AND ta.is_completed = true;

  RETURN (v_completed_weight::FLOAT / v_total_weight) * 100;
END;
$$ LANGUAGE plpgsql;

-- Function: update_household_streaks
CREATE OR REPLACE FUNCTION update_household_streaks()
RETURNS void AS $$
DECLARE
  v_household RECORD;
  v_yesterday_date DATE;
  v_completion_pct FLOAT;
BEGIN
  FOR v_household IN SELECT id, timezone_id FROM households WHERE deleted_at IS NULL
  LOOP
    -- Calculate yesterday's date in household timezone
    v_yesterday_date := (NOW() AT TIME ZONE v_household.timezone_id)::DATE - INTERVAL '1 day';
    
    -- Skip if already processed today
    IF v_household.last_completion_date IS NOT NULL 
       AND v_household.last_completion_date >= (NOW() AT TIME ZONE v_household.timezone_id)::DATE
    THEN
      CONTINUE;
    END IF;

    -- Calculate yesterday's completion
    v_completion_pct := calculate_household_completion(v_household.id, v_yesterday_date);

    -- Update streak
    IF v_completion_pct = 100 THEN
      UPDATE households 
      SET daily_streak = daily_streak + 1,
          last_completion_date = (NOW() AT TIME ZONE timezone_id)::DATE,
          updated_at = now()
      WHERE id = v_household.id;
    ELSE
      UPDATE households 
      SET daily_streak = 0,
          last_completion_date = (NOW() AT TIME ZONE timezone_id)::DATE,
          updated_at = now()
      WHERE id = v_household.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily streak calculation at 12:05 AM UTC
SELECT cron.schedule('update-household-streaks', '5 0 * * *', 'SELECT update_household_streaks()');
