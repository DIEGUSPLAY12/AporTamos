# Research: AporTamos Technical Decisions

**Feature**: 001-household-tasks | **Date**: 2026-05-07 | **Status**: Complete

This document resolves all technical unknowns identified in the implementation plan's Phase 0 research phase. Each research item includes the decision made, rationale, and alternatives considered.

## 1. Supabase Real-Time Architecture for Chat

### Decision
Implement chat using Supabase real-time subscriptions with WebSocket connections. Use Supabase's PostgreSQL LISTEN/NOTIFY functionality combined with client-side subscriptions for instant message delivery.

### Rationale
- **Low operational burden**: Supabase handles infrastructure; no separate message broker (Redis/RabbitMQ) needed
- **Native integration**: Supabase is already the database and auth provider; no additional services to manage
- **Performance**: WebSocket provides sub-100ms latency for real-time delivery
- **Scaling**: Supabase real-time handles concurrent connections efficiently
- **Cost**: No additional service costs beyond Supabase database tier

### Implementation Details
```
Message flow:
1. Client sends POST /chat/{household_id}/message with text/audio/media
2. FastAPI endpoint inserts row into chat_messages table
3. Supabase NOTIFY triggers on insert
4. Connected clients receive real-time event via WebSocket
5. Message appears instantly in chat UI
```

### Offline Message Queueing
- Use local SQLite (React Native) or IndexedDB (web) to queue messages while offline
- Implement retry mechanism: attempt send every 30 seconds when connection restored
- Add optimistic UI updates: show message immediately, validate server response

### Alternatives Considered
- **Firebase Firestore**: Less control over data; higher costs at scale
- **Dedicated service (Socket.io)**: Adds operational complexity; not justified for this scale
- **Polling**: Excessive battery drain on mobile; violates responsive design principle

---

## 2. Weighted Task Scoring Calculation

### Decision
Calculate household completion percentage using weighted scores:

```
completion_percentage = (sum of completed_task_effort_weights / sum of all_assigned_task_effort_weights) × 100
```

Where effort_weight is 1-10 integer assigned per task.

### Examples

**Example 1: Balanced tasks**
- Assigned tasks: Dishwashing (weight 3), Vacuum (weight 3), Laundry (weight 4)
- Total weight: 10
- Completed: Dishwashing (3) + Vacuum (3) = 6 weight
- Completion %: (6/10) × 100 = 60%

**Example 2: Different effort weights**
- Assigned tasks: Take out trash (weight 1), Deep clean bathroom (weight 5)
- Total weight: 6
- Completed: Take out trash (1) = 1 weight
- Completion %: (1/6) × 100 = 16.7%
- Household cannot reach 100% without the bathroom task

### Edge Cases

**Zero assigned tasks for a day**
- If a household has 0 tasks assigned, completion percentage is undefined
- Streak does NOT increment that day (no progress to track)
- Display message: "No tasks assigned today"

**Random task selection**
- When household reaches 100% completion, increment streak by 1
- Reset completion percentage to 0% at midnight (household timezone)
- Streak resets only on days with tasks and <100% completion at midnight

### Calculation Service
Location: `AporTamos-Backend/app/services/gamification_service.py`

```python
def calculate_household_completion(household_id: UUID, date: date) -> float:
    assignments = get_assignments_for_date(household_id, date)
    if not assignments:
        return None  # No tasks assigned
    
    total_weight = sum(a.task.effort_weight for a in assignments)
    completed_weight = sum(
        a.task.effort_weight for a in assignments 
        if a.is_completed
    )
    return (completed_weight / total_weight) * 100
```

### Alternatives Considered
- **Equal weighting**: All tasks count as 1 point (rejected: violates spec requirement for weighted scoring)
- **Exponential scaling**: Effort weight multiplied by complexity factor (rejected: over-engineering)
- **Percentage of task count**: 4/6 tasks = 66% (rejected: violates weighted scoring requirement)

---

## 3. Random Task Assignment Algorithm

### Decision
Implement daily random assignment using weighted fairness distribution:

1. **At assignment time** (11:59 PM each day for next day's tasks):
   - For each "random assignment" task in schedule
   - Select eligible household members
   - Assign randomly to 1 member per random task
   
2. **Fairness mechanism** (optional, for future):
   - Track historical assignments per user over 30-day window
   - Weight selection probability inversely: users with fewer recent assignments have higher selection probability
   - Prevents same person getting all random tasks

### Example Scenario
```
Household: Alice, Bob, Charlie
Weekly Schedule:
- Dishwashing: Random daily
- Trash: Assigned to Alice
- Vacuum: Assigned to Bob

Day 1:
- Dishwashing (random) → assigned to Charlie
- Trash → Alice
- Vacuum → Bob

Day 2:
- Dishwashing (random) → assigned to Alice (fair distribution)
- Trash → Alice
- Vacuum → Bob
```

### Coexistence of Random + Explicit
- Random and explicit assignments are independent
- Same person can be explicitly assigned + randomly assigned on same day
- Completion percentage counts all assigned tasks regardless of assignment method

### Implementation Details
Location: `AporTamos-Backend/app/services/task_service.py`

```python
async def create_daily_assignments(household_id: UUID, target_date: date):
    schedule = get_current_schedule(household_id)
    members = get_household_members(household_id)
    
    for task in schedule.tasks:
        if task.assignment_type == "explicit":
            # Create assignment for explicitly assigned user
            create_assignment(task, task.assigned_user_id, target_date)
        else:  # random
            # Randomly select member
            selected_member = random.choice(members)
            create_assignment(task, selected_member.id, target_date)
```

### Alternatives Considered
- **Round-robin rotation**: Predictable but can feel repetitive
- **Machine learning**: Over-engineered for MVP; violates minimal dependencies
- **All members equally weighted**: Simplest option; may lead to imbalance (selected)

---

## 4. Photo Storage and Management

### Decision
Store task completion photos in Supabase Storage with the following constraints:
- Maximum file size: 5MB per image
- Storage format: JPEG with 80% quality (auto-compressed by client)
- Retention: Indefinite (no automatic cleanup)
- Access: Private to household members (row-level security policy)

### Supabase Storage Bucket
```
Bucket name: task-proofs
Path structure: {household_id}/{task_completion_id}/photo.jpg
Example: 550e8400-e29b-41d4-a716-446655440000/a1b2c3d4-e5f6-7890-abcd-ef1234567890/photo.jpg
```

### Mobile Client Implementation
Location: `AporTamos-Frontend/services/storage.ts`

```typescript
async function uploadTaskProof(
  householdId: string,
  completionId: string,
  photoUri: string
): Promise<string> {
  // 1. Compress photo to JPEG 80% quality
  const compressed = await compressImage(photoUri, { quality: 0.8 });
  
  // 2. Validate file size (<5MB)
  if (compressed.size > 5 * 1024 * 1024) {
    throw new Error('Photo exceeds 5MB limit');
  }
  
  // 3. Upload to Supabase Storage
  const path = `${householdId}/${completionId}/photo.jpg`;
  const { data, error } = await supabaseClient.storage
    .from('task-proofs')
    .upload(path, compressed);
  
  if (error) throw error;
  
  // 4. Return public URL
  return supabaseClient.storage
    .from('task-proofs')
    .getPublicUrl(path).data.publicUrl;
}
```

### Row-Level Security Policy
```sql
-- RLS Policy: Users can only see photos in households they belong to
CREATE POLICY household_access ON storage.objects
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.household_members 
      WHERE household_id = ((storage.foldername(name))[1])::uuid
    )
  );
```

### Cleanup Strategy
- **MVP (no cleanup)**: Storage costs are minimal at target scale (100 households × 10 photos/day = 1000 photos/day)
- **Future optimization**: Archive old proofs (>1 year) to cheaper cold storage

### Alternatives Considered
- **Firebase Storage**: Works but less integrated with Supabase auth
- **AWS S3**: Higher operational complexity
- **Database blob storage**: Supabase Storage more efficient and cheaper

---

## 5. Authentication: Email/Password vs. Google OAuth

### Decision
Implement dual authentication using Supabase Auth:
1. **Email/Password**: Standard registration and login flow
2. **Google OAuth**: Social login for faster signup

Both flows manage sessions via Supabase JWT tokens.

### Email/Password Flow

```
Registration:
1. User enters email + password on RegisterScreen
2. POST /auth/register → validates email uniqueness
3. Supabase Auth creates user account
4. App stores JWT in secure storage
5. Redirect to home dashboard

Login:
1. User enters email + password on LoginScreen
2. POST /auth/login → Supabase Auth validates
3. Returns JWT access token
4. App stores token and sets auth context
5. All subsequent API requests include Bearer token
```

### Google OAuth Flow

```
1. User taps "Login with Google"
2. Redirect to Supabase OAuth flow
3. User authenticates with Google
4. Supabase receives Google token, creates/links user account
5. Returns JWT to app
6. App stores token same as email/password
7. Redirect to home dashboard
```

### Session Management

- **Token storage**: Secure storage (Keychain on iOS, Keystore on Android via Expo SecureStore)
- **Refresh token rotation**: Supabase automatically rotates tokens; app checks expiration before API calls
- **Logout**: Clear stored token and auth context; remove refresh token from Supabase

### Logout Behavior Across Devices

```
When user logs out on Device A:
1. DELETE /auth/logout endpoint called
2. Supabase invalidates refresh token
3. JWT becomes invalid after expiration (default 1 hour)
4. Other devices: JWT continues working until expiration or refresh fails
5. Next API call on Device B: refresh fails, user redirected to login
```

### Implementation Details
Location: `AporTamos-Frontend/hooks/useAuth.ts`

```typescript
async function loginWithGoogle() {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'aporTamos://auth/callback' }
  });
  
  if (error) throw error;
  
  const { session } = data;
  if (session?.access_token) {
    storeToken(session.access_token);
    setAuthContext({ user: session.user, isAuthenticated: true });
  }
}
```

### Alternatives Considered
- **Supabase Magic Links**: Passwordless but more setup for users
- **Custom JWT implementation**: Adds operational burden; Supabase Auth is more secure
- **Firebase Auth**: Equivalent functionality; Supabase more integrated with database

---

## 6. Streak Reset and Timezone Handling

### Decision
Reset daily streaks at midnight in the household's local timezone using scheduled job:

1. **Timezone persistence**: Store `timezone_id` (e.g., "America/New_York") on Household record
2. **Midnight calculation**: Use Cron job (or webhook trigger) to check completion daily
3. **Streak increment**: If completion % == 100%, increment streak by 1
4. **Completion reset**: Set completion % to 0% for new day

### Timezone Detection & Storage

```
During household creation:
1. User's device timezone: detected via Intl.DateTimeFormat().resolvedOptions()
2. Default: "America/New_York" if not detectable
3. Can be changed in household settings later
4. Store as IANA timezone identifier (e.g., "Europe/London")
```

### Implementation: PostgreSQL Trigger

Location: `AporTamos-Backend/migrations/[timestamp]_add_streak_reset_trigger.sql`

```sql
-- Function to check and update streak daily
CREATE OR REPLACE FUNCTION update_household_streaks()
RETURNS void AS $$
DECLARE
  household RECORD;
  today_date DATE;
  completion_pct FLOAT;
BEGIN
  FOR household IN 
    SELECT id, timezone_id, last_completion_date FROM households
  LOOP
    -- Calculate "today" in household timezone
    today_date := (NOW() AT TIME ZONE household.timezone_id)::DATE;
    
    -- Only process if we haven't already processed today
    IF household.last_completion_date < today_date THEN
      -- Calculate yesterday's completion percentage
      SELECT calculate_household_completion(household.id, today_date - 1) 
      INTO completion_pct;
      
      -- Update streak if completion was 100%
      IF completion_pct = 100 THEN
        UPDATE households 
        SET daily_streak = daily_streak + 1 
        WHERE id = household.id;
      ELSE
        -- Reset streak if not 100%
        UPDATE households 
        SET daily_streak = 0 
        WHERE id = household.id;
      END IF;
      
      -- Mark as processed for today
      UPDATE households 
      SET last_completion_date = today_date 
      WHERE id = household.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run daily at 12:05 AM UTC
-- Using pg_cron extension or external scheduler
SELECT cron.schedule('update-streaks', '5 0 * * *', 'SELECT update_household_streaks()');
```

### Daylight Saving Time Handling
- PostgreSQL's AT TIME ZONE operator automatically handles DST transitions
- No manual adjustment needed; timezone database (tzdata) keeps schedules correct
- Example: "America/New_York" automatically switches between EST/EDT

### Edge Case: Midnight Exactly at Completion
```
Scenario: User completes task at 11:59:59 PM EST
- Task completion recorded in UTC
- Calculation uses household timezone for "today"
- Streak increments correctly even if local midnight is imminent
```

### Alternatives Considered
- **UTC-only with client-side conversion**: Confusing for users; schedule would appear off
- **Server stores only UTC**: Still need timezone for display and calculation
- **Manual timezone adjustments**: Error-prone; DST transitions would break

---

## Summary: Research Decisions

| Topic | Decision | Risk Level |
|-------|----------|------------|
| Real-time Chat | Supabase WebSocket subscriptions | Low (proven technology) |
| Task Scoring | Weighted effort scores (1-10) | Low (straightforward formula) |
| Random Assignment | Daily randomization with optional fairness | Low (simple algorithm) |
| Photo Storage | Supabase Storage, 5MB limit, indefinite retention | Low (integrated service) |
| Authentication | Email/password + Google OAuth via Supabase Auth | Low (managed service) |
| Streak/Timezone | PostgreSQL trigger at midnight in household TZ | Medium (requires testing across TZ) |

All research decisions align with AporTamos Constitution principles and are ready for implementation.
