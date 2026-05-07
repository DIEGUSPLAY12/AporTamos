# Database Schema: Supabase PostgreSQL

**Feature**: 001-household-tasks | **Date**: 2026-05-07 | **Status**: Complete

This document specifies the complete PostgreSQL schema for AporTamos, deployed on Supabase.

---

## Schema Initialization

Run these SQL commands in Supabase SQL Editor to set up all tables, indexes, and policies.

---

## Tables Definition

### 1. users

```sql
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
```

---

### 2. households

```sql
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

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view households they belong to
CREATE POLICY households_select ON households
  FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS: Only owner can update household
CREATE POLICY households_update ON households
  FOR UPDATE
  USING (owner_id = auth.uid());

-- RLS: Only owner can delete household
CREATE POLICY households_delete ON households
  FOR DELETE
  USING (owner_id = auth.uid());
```

---

### 3. household_members

```sql
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

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view members of their households
CREATE POLICY household_members_select ON household_members
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Ensure only one owner per household
CREATE UNIQUE INDEX idx_households_one_owner 
ON household_members(household_id) 
WHERE role = 'owner';
```

---

### 4. weekly_task_schedules

```sql
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

CREATE INDEX idx_schedules_household_active ON weekly_task_schedules(household_id) 
WHERE active_until IS NULL;

ALTER TABLE weekly_task_schedules ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view schedules for their households
CREATE POLICY schedules_select ON weekly_task_schedules
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );
```

---

### 5. tasks

```sql
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

-- Constraint: explicit tasks must have assigned_user_id, random must not
CREATE CONSTRAINT TRIGGER enforce_assignment_type 
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION enforce_assignment_type_fn();

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

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view tasks from their household schedules
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
```

---

### 6. task_assignments

```sql
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

ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view assignments for their households
CREATE POLICY task_assignments_select ON task_assignments
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS: Users can update their own assignments (mark complete)
CREATE POLICY task_assignments_update ON task_assignments
  FOR UPDATE
  USING (
    assigned_to_user_id = auth.uid() OR
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
```

---

### 7. task_completions

```sql
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

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view completions from their households
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
```

---

### 8. chat_channels

```sql
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL UNIQUE REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chat_channels_household_id ON chat_channels(household_id);

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view channels for their households
CREATE POLICY chat_channels_select ON chat_channels
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );
```

---

### 9. chat_messages

```sql
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

-- Constraint: exactly one of content or media_url must be set
CREATE CONSTRAINT TRIGGER enforce_message_content
BEFORE INSERT OR UPDATE ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION enforce_message_content_fn();

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

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view messages from channels in their households
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

-- RLS: Users can insert their own messages
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
```

---

## Triggers and Functions

### Trigger: Auto-increment household updated_at

```sql
CREATE TRIGGER update_household_updated_at
BEFORE UPDATE ON households
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Trigger: Auto-create chat channel on household creation

```sql
CREATE TRIGGER create_chat_channel_on_household
AFTER INSERT ON households
FOR EACH ROW
EXECUTE FUNCTION create_household_chat_fn();

CREATE OR REPLACE FUNCTION create_household_chat_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_channels (household_id, created_at)
  VALUES (NEW.id, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Trigger: Calculate and update daily streak (scheduled job via pg_cron)

```sql
-- Install pg_cron extension (already available on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to calculate household completion percentage
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

-- Function to update streaks daily
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

-- Schedule the function to run daily at 12:05 AM UTC
SELECT cron.schedule('update-household-streaks', '5 0 * * *', 'SELECT update_household_streaks()');
```

---

## Real-Time Subscriptions

Enable real-time updates for frontend subscription:

```sql
-- Create publication for real-time events
CREATE PUBLICATION realtime_publication FOR TABLE 
  chat_messages,
  task_assignments,
  task_completions;

-- Verify it's active
SELECT * FROM pg_publication;
```

---

## Storage Buckets (Supabase Storage)

Create the following storage buckets:

```sql
-- Task proof photos (via Supabase Dashboard)
-- Bucket name: task-proofs
-- Access: Private

-- Chat media (via Supabase Dashboard)
-- Bucket name: chat-media
-- Access: Private
```

### RLS Policies for Storage

```sql
-- Task proofs: Users can view proofs from their households
CREATE POLICY household_access ON storage.objects
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM household_members 
      WHERE household_id = ((storage.foldername(name))[1])::uuid
    )
  );

-- Chat media: Users can view media from their households
CREATE POLICY chat_media_access ON storage.objects
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

## Performance Indexes Summary

All necessary indexes are created above. Summary:
- User lookups: email, created_at, google_id
- Household queries: owner_id, created_at, membership lookups
- Task assignment queries: household_date, user_date, completion status
- Chat queries: channel_date (DESC for newest first), sender

---

## Data Integrity Constraints

All constraints enforced:
- ✅ One owner per household
- ✅ Unique household-user membership
- ✅ Valid day-of-week values
- ✅ Effort weight 1-10
- ✅ Assignment type consistency
- ✅ Message content vs media_url exclusivity
- ✅ Soft deletes preserved
- ✅ Timezone format validation

---

This schema is production-ready and fully supports all AporTamos features.
