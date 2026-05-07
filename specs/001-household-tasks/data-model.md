# Data Model: AporTamos

**Feature**: 001-household-tasks | **Date**: 2026-05-07 | **Status**: Complete

This document defines the core entities, their relationships, validation rules, and state transitions for the AporTamos household task management system.

## Entity Definitions

### 1. User

Represents an individual account holder with authentication credentials and household memberships.

**Fields:**
- `id` (UUID, primary key): Unique identifier
- `email` (string, unique, not null): Email address for login
- `password_hash` (string, nullable): Hashed password for email/password auth
- `google_id` (string, nullable, unique): Google account ID for OAuth login
- `name` (string, not null): User's display name
- `created_at` (timestamp, not null): Account creation time
- `updated_at` (timestamp, not null): Last profile update
- `deleted_at` (timestamp, nullable): Soft delete timestamp

**Relationships:**
- `household_memberships` (one-to-many): Links to HouseholdMember records
- `households` (many-to-many through HouseholdMember): Households user belongs to
- `task_assignments` (one-to-many): Tasks assigned to this user
- `task_completions` (one-to-many): Tasks completed by this user
- `chat_messages` (one-to-many): Messages sent by this user
- `owned_households` (one-to-many): Households where this user is owner

**Validation Rules:**
- Email must be unique and valid email format
- Either `password_hash` OR `google_id` must be present (at least one auth method)
- Name must be 1-100 characters
- Cannot delete own account if only household owner (must transfer ownership)

**Indexes:**
- `email` (unique)
- `google_id` (unique)
- `created_at` (for user discovery)

---

### 2. Household

Represents a shared living space with members, tasks, and gamification metrics.

**Fields:**
- `id` (UUID, primary key): Unique identifier
- `owner_id` (UUID, foreign key, not null): User ID of household creator
- `name` (string, not null): Household display name (e.g., "Diego's Apartment")
- `timezone_id` (string, not null, default "America/New_York"): IANA timezone for streak reset
- `daily_streak` (integer, not null, default 0): Current consecutive days at 100% completion
- `last_completion_date` (date, nullable): Last date household completion was calculated
- `created_at` (timestamp, not null): Household creation time
- `updated_at` (timestamp, not null): Last modification time
- `deleted_at` (timestamp, nullable): Soft delete timestamp

**Relationships:**
- `owner` (many-to-one): The User who created this household
- `members` (many-to-many through HouseholdMember): All users in household
- `task_schedule` (one-to-one): Current WeeklyTaskSchedule
- `task_assignments` (one-to-many): All task assignments in this household
- `chat_channel` (one-to-one): Chat channel for household communication

**Validation Rules:**
- Name must be 1-100 characters
- Owner must be a member of household
- Must have at least 1 member (the owner)
- Timezone must be valid IANA identifier
- Daily streak >= 0

**Indexes:**
- `owner_id`
- `created_at` (for discovery)
- `timezone_id`

---

### 3. HouseholdMember

Junction table for many-to-many relationship between User and Household.

**Fields:**
- `id` (UUID, primary key): Unique identifier
- `household_id` (UUID, foreign key, not null): Reference to Household
- `user_id` (UUID, foreign key, not null): Reference to User
- `role` (enum, not null, default "member"): One of {owner, member}
- `joined_at` (timestamp, not null): When user joined household
- `updated_at` (timestamp, not null): Last role change

**Composite Unique Constraint:** `(household_id, user_id)` - user can only be member once per household

**Validation Rules:**
- Cannot have more than 1 owner per household (enforce in application or via trigger)
- Owner cannot be removed from household without transferring ownership
- User must exist in system before adding to household

**Indexes:**
- `household_id, user_id` (composite)
- `user_id` (for finding all households for a user)

---

### 4. WeeklyTaskSchedule

Defines recurring tasks for a household across the week.

**Fields:**
- `id` (UUID, primary key): Unique identifier
- `household_id` (UUID, foreign key, not null): Reference to Household
- `version` (integer, not null): Version number for tracking changes
- `created_at` (timestamp, not null): When schedule was created
- `updated_at` (timestamp, not null): When schedule was last modified
- `active_from` (date, not null): Date schedule becomes effective
- `active_until` (date, nullable): When schedule expires (null = currently active)
- `deleted_at` (timestamp, nullable): Soft delete

**Relationships:**
- `household` (many-to-one): The household this schedule belongs to
- `tasks` (one-to-many): All Task definitions in this schedule

**Validation Rules:**
- Must belong to a valid household
- Only one active (non-expired) schedule per household
- Version starts at 1, increments with each modification

**Indexes:**
- `household_id, active_from` (for finding current schedule)
- `active_until` (for cleanup/archival)

---

### 5. Task

Individual task/chore definition within a weekly schedule.

**Fields:**
- `id` (UUID, primary key): Unique identifier
- `schedule_id` (UUID, foreign key, not null): Reference to WeeklyTaskSchedule
- `name` (string, not null): Task name (e.g., "Wash dishes")
- `description` (text, nullable): Detailed instructions
- `day_of_week` (enum, not null): One of {MON, TUE, WED, THU, FRI, SAT, SUN}
- `effort_weight` (integer, not null): Points assigned to this task (1-10 scale)
- `assignment_type` (enum, not null): One of {explicit, random}
- `assigned_user_id` (UUID, nullable, foreign key): User if explicit assignment
- `frequency` (enum, not null, default "daily"): One of {daily, weekly}
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**Relationships:**
- `schedule` (many-to-one): The schedule this task belongs to
- `assigned_user` (many-to-one, nullable): User if explicitly assigned
- `assignments` (one-to-many): Daily instances of this task (TaskAssignment records)

**Validation Rules:**
- Effort weight must be 1-10 (inclusive)
- If assignment_type = "explicit", assigned_user_id must be set
- If assignment_type = "random", assigned_user_id must be null
- Day of week must be valid
- Description must be < 1000 characters

**Indexes:**
- `schedule_id, day_of_week` (for daily task generation)
- `assignment_type`

---

### 6. TaskAssignment

Daily instantiation of a Task for a specific user in a specific household.

**Fields:**
- `id` (UUID, primary key): Unique identifier
- `task_id` (UUID, foreign key, not null): Reference to Task definition
- `household_id` (UUID, foreign key, not null): Denormalized for query efficiency
- `assigned_to_user_id` (UUID, foreign key, not null): User responsible for task
- `assignment_date` (date, not null): Date task is due
- `is_completed` (boolean, not null, default false): Whether task is marked done
- `completed_at` (timestamp, nullable): When task was marked complete
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**Composite Unique Constraint:** `(task_id, assignment_date)` - only one assignment per task per day

**Relationships:**
- `task` (many-to-one): The task definition
- `household` (many-to-one): The household context
- `assigned_to_user` (many-to-one): The user assigned to this task
- `completion` (one-to-one, optional): Completion record if task is done

**Validation Rules:**
- Assigned user must be member of the household
- Cannot mark as completed if assigned_to_user_id doesn't match completing user
- assignment_date cannot be in past (no retroactive assignments)

**Indexes:**
- `household_id, assignment_date` (for daily list queries)
- `assigned_to_user_id, is_completed` (for user's task list)
- `assignment_date` (for streak calculation)

---

### 7. TaskCompletion

Records when a user completes a task with photo evidence.

**Fields:**
- `id` (UUID, primary key): Unique identifier
- `assignment_id` (UUID, foreign key, not null, unique): Reference to TaskAssignment
- `user_id` (UUID, foreign key, not null): User who completed task
- `photo_url` (string, not null): URL to photo in Supabase Storage
- `completed_at` (timestamp, not null): When task was marked complete
- `created_at` (timestamp, not null): When completion record was created

**Relationships:**
- `assignment` (one-to-one): The daily task assignment
- `user` (many-to-one): The user who completed it

**Validation Rules:**
- photo_url must be valid URL in Supabase Storage bucket
- User must be the assigned_to_user on the assignment
- Cannot have multiple completions for same assignment

**Indexes:**
- `assignment_id` (unique, for 1:1 lookup)
- `user_id, completed_at` (for user completion history)

---

### 8. ChatChannel

Automatic communication space created per household.

**Fields:**
- `id` (UUID, primary key): Unique identifier
- `household_id` (UUID, foreign key, not null, unique): Reference to Household
- `created_at` (timestamp, not null): Channel creation time
- `updated_at` (timestamp, not null): Last message timestamp

**Relationships:**
- `household` (one-to-one): The household owning this channel
- `messages` (one-to-many): All messages in this channel

**Validation Rules:**
- One channel per household (uniqueness constraint)
- Channel is automatically created when household is created

**Indexes:**
- `household_id` (unique, for direct lookup)

---

### 9. ChatMessage

Individual message in a chat channel.

**Fields:**
- `id` (UUID, primary key): Unique identifier
- `channel_id` (UUID, foreign key, not null): Reference to ChatChannel
- `sender_id` (UUID, foreign key, not null): User who sent message
- `message_type` (enum, not null): One of {text, audio, image}
- `content` (text, nullable): Message text (for text messages)
- `media_url` (string, nullable): URL to audio/image in Supabase Storage
- `created_at` (timestamp, not null): Message timestamp

**Relationships:**
- `channel` (many-to-one): The chat channel
- `sender` (many-to-one): The user who sent the message

**Validation Rules:**
- If message_type = "text", content must be 1-5000 characters and media_url must be null
- If message_type = "audio" or "image", media_url must be valid Supabase Storage URL and content must be null
- Sender must be member of the household owning this channel

**Indexes:**
- `channel_id, created_at` (for message history retrieval)
- `sender_id` (for user message history)

---

## Entity Relationship Diagram (Conceptual)

```
User (1) ──has──(many) HouseholdMember (1)──belongs to──(1) Household
  │
  ├─(many) TaskAssignment
  ├─(many) TaskCompletion
  └─(many) ChatMessage

Household (1) ──has──(many) HouseholdMember
  │
  ├─(1) WeeklyTaskSchedule ──has──(many) Task ──generates──(many) TaskAssignment
  │
  ├─(many) TaskAssignment ──creates──(optional 1) TaskCompletion
  │
  └─(1) ChatChannel ──has──(many) ChatMessage

Task (1) ──assigned to──(optional 1) User  [only if assignment_type=explicit]
```

---

## State Transitions

### Task Lifecycle
```
NOT_ASSIGNED (implicit) 
  → ASSIGNED (TaskAssignment created daily)
    → IN_PROGRESS (user viewing task)
      → COMPLETED (TaskCompletion record created with photo)
        → ARCHIVED (after 30 days)
```

### Household Streak
```
ACTIVE (created with daily_streak=0)
  → INCREASING (consecutive 100% completion days)
    → BROKEN (failure to reach 100% on any day) → RESET (streak = 0)
```

### User Membership
```
NOT_MEMBER
  → INVITED (email invitation sent)
    → MEMBER (user accepts/joins)
      → OWNER (if membership.role updated) [only 1 per household]
        → INACTIVE (user deleted) [if transferred ownership]
```

---

## Constraints Summary

| Entity | Type | Description |
|--------|------|-------------|
| User | UNIQUE | email, google_id |
| HouseholdMember | UNIQUE | (household_id, user_id) |
| WeeklyTaskSchedule | CHECK | Only 1 active per household |
| Task | CHECK | effort_weight between 1-10 |
| Task | CHECK | (assignment_type=explicit AND assigned_user_id NOT NULL) OR (assignment_type=random AND assigned_user_id IS NULL) |
| TaskAssignment | UNIQUE | (task_id, assignment_date) |
| TaskCompletion | UNIQUE | assignment_id (one-to-one) |
| ChatChannel | UNIQUE | household_id (one-to-one) |
| ChatMessage | CHECK | Exactly one of content or media_url is set |

---

## Indexes Summary (Performance Optimization)

Recommended indexes for optimal query performance:

```sql
-- User queries
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_created_at ON users(created_at);

-- Household discovery and membership
CREATE INDEX idx_household_owner_id ON households(owner_id);
CREATE INDEX idx_household_member_household_date ON household_members(household_id, joined_at);
CREATE INDEX idx_household_member_user_id ON household_members(user_id);

-- Task assignment and completion
CREATE INDEX idx_task_assignment_household_date ON task_assignments(household_id, assignment_date);
CREATE INDEX idx_task_assignment_user_completed ON task_assignments(assigned_to_user_id, is_completed);
CREATE INDEX idx_task_completion_user_date ON task_completions(user_id, completed_at);

-- Chat messaging
CREATE INDEX idx_chat_message_channel_date ON chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_message_sender ON chat_messages(sender_id);

-- Schedule management
CREATE INDEX idx_schedule_household_active ON weekly_task_schedules(household_id) WHERE active_until IS NULL;
```

This data model fully supports all 6 user stories and 20 functional requirements defined in the specification.
