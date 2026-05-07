# Real-Time Events: Supabase Subscriptions

**Feature**: 001-household-tasks | **Date**: 2026-05-07 | **Status**: Complete

This document specifies all real-time event subscriptions powered by Supabase PostgreSQL LISTEN/NOTIFY.

---

## Overview

The AporTamos frontend subscribes to real-time changes on three core tables:
1. `chat_messages` — Instant message delivery to household members
2. `task_assignments` — Live updates when tasks are assigned
3. `task_completions` — Instant household completion percentage updates

Subscriptions use Supabase's built-in real-time functionality via WebSocket connections.

---

## 1. Chat Messages Subscription

### Subscribe to Household Chat

**Frontend Code:**
```typescript
// AporTamos-Frontend/hooks/useChat.ts
import { useEffect } from 'react';
import { supabaseClient } from '../services/supabase';

export function useChatSubscription(householdId: string) {
  useEffect(() => {
    // Subscribe to new messages in chat channel
    const subscription = supabaseClient
      .channel(`chat:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${householdId}` // Requires channel lookup
        },
        (payload) => {
          console.log('New message:', payload.new);
          // Update UI with new message
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [householdId]);
}
```

### Event Payload: New Chat Message

**Event Type:** `INSERT`

**Payload:**
```json
{
  "type": "INSERT",
  "schema": "public",
  "table": "chat_messages",
  "record": {
    "id": "m1n2o3p4-q5r6-7890-abcd-ef1234567890",
    "channel_id": "c1d2e3f4-g5h6-7890-abcd-ef1234567890",
    "sender_id": "550e8400-e29b-41d4-a716-446655440000",
    "message_type": "text",
    "content": "Just finished the dishes!",
    "media_url": null,
    "created_at": "2026-05-07T14:30:00Z"
  },
  "old_record": null
}
```

### Frontend Handling

**Component Update:**
```typescript
// AporTamos-Frontend/components/chat/ChatMessage.tsx
function ChatListComponent({ householdId, messages, setMessages }) {
  useChatSubscription(householdId);

  const handleNewMessage = (message) => {
    setMessages([...messages, message]);
    // Scroll to bottom
    scrollToLatest();
    // Play notification sound
    playMessageSound();
  };

  return (
    <FlatList
      data={messages}
      renderItem={({ item }) => <ChatMessage message={item} />}
    />
  );
}
```

---

## 2. Task Assignment Subscription

### Subscribe to Task Assignment Changes

**Frontend Code:**
```typescript
// AporTamos-Frontend/hooks/useTasks.ts
export function useTaskAssignmentSubscription(householdId: string) {
  useEffect(() => {
    // Subscribe to task assignment changes
    const subscription = supabaseClient
      .channel(`tasks:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'task_assignments',
          filter: `household_id=eq.${householdId}`
        },
        (payload) => {
          console.log('Task assignment changed:', payload);
          // Update task list
          if (payload.eventType === 'INSERT') {
            // New assignment
          } else if (payload.eventType === 'UPDATE') {
            // Assignment updated (completed)
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [householdId]);
}
```

### Event Payload: New Task Assignment

**Event Type:** `INSERT`

**Payload:**
```json
{
  "type": "INSERT",
  "schema": "public",
  "table": "task_assignments",
  "record": {
    "id": "e1f2g3h4-i5j6-7890-abcd-ef1234567890",
    "task_id": "c1d2e3f4-g5h6-7890-abcd-ef1234567890",
    "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "assigned_to_user_id": "550e8400-e29b-41d4-a716-446655440000",
    "assignment_date": "2026-05-08",
    "is_completed": false,
    "completed_at": null,
    "created_at": "2026-05-07T23:59:00Z",
    "updated_at": "2026-05-07T23:59:00Z"
  },
  "old_record": null
}
```

### Event Payload: Task Completion

**Event Type:** `UPDATE`

**Payload:**
```json
{
  "type": "UPDATE",
  "schema": "public",
  "table": "task_assignments",
  "record": {
    "id": "e1f2g3h4-i5j6-7890-abcd-ef1234567890",
    "task_id": "c1d2e3f4-g5h6-7890-abcd-ef1234567890",
    "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "assigned_to_user_id": "550e8400-e29b-41d4-a716-446655440000",
    "assignment_date": "2026-05-08",
    "is_completed": true,
    "completed_at": "2026-05-08T14:30:00Z",
    "created_at": "2026-05-07T23:59:00Z",
    "updated_at": "2026-05-08T14:30:00Z"
  },
  "old_record": {
    "id": "e1f2g3h4-i5j6-7890-abcd-ef1234567890",
    "is_completed": false,
    "completed_at": null,
    "updated_at": "2026-05-07T23:59:00Z"
  }
}
```

### Frontend Handling

**Update Task List:**
```typescript
function TaskListComponent({ householdId, tasks, setTasks }) {
  useTaskAssignmentSubscription(householdId);

  const handleTaskUpdate = (assignment) => {
    if (assignment.is_completed) {
      // Task completed
      setTasks(tasks.map(t => 
        t.assignment_id === assignment.id 
          ? { ...t, is_completed: true, completed_at: assignment.completed_at }
          : t
      ));
      
      // Trigger household completion recalculation
      recalculateHouseholdStats();
      
      // Show celebration animation
      showCompletionAnimation();
    }
  };

  return (
    <FlatList
      data={tasks}
      renderItem={({ item }) => (
        <TaskItem 
          task={item}
          completed={item.is_completed}
        />
      )}
    />
  );
}
```

---

## 3. Task Completion Subscription

### Subscribe to Task Completions

**Frontend Code:**
```typescript
// AporTamos-Frontend/hooks/useStats.ts
export function useCompletionSubscription(householdId: string) {
  useEffect(() => {
    // Subscribe to task completions for stats update
    const subscription = supabaseClient
      .channel(`completions:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_completions',
          filter: `assignment_id.in.(
            SELECT id FROM task_assignments 
            WHERE household_id = ${householdId}
          )`
        },
        (payload) => {
          console.log('Task completed:', payload);
          // Update completion stats
          updateHouseholdCompletion();
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [householdId]);
}
```

### Event Payload: Task Completion

**Event Type:** `INSERT`

**Payload:**
```json
{
  "type": "INSERT",
  "schema": "public",
  "table": "task_completions",
  "record": {
    "id": "g1h2i3j4-k5l6-7890-abcd-ef1234567890",
    "assignment_id": "e1f2g3h4-i5j6-7890-abcd-ef1234567890",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "photo_url": "https://supabase-storage.com/task-proofs/a1b2c3d4/g1h2i3j4/photo.jpg",
    "completed_at": "2026-05-08T14:30:00Z",
    "created_at": "2026-05-08T14:30:01Z"
  },
  "old_record": null
}
```

### Frontend Handling

**Update Household Statistics:**
```typescript
async function updateHouseholdCompletion(householdId: string) {
  try {
    // Recalculate completion % from backend
    const { data: stats } = await api.get(`/stats/household/${householdId}`);
    
    setHouseholdStats({
      completionPct: stats.daily_completion_pct,
      streak: stats.daily_streak,
      members: stats.member_stats
    });

    // If reached 100%, show special animation
    if (stats.daily_completion_pct === 100) {
      showStreakAchievement(stats.daily_streak);
    }

    // Update progress bar in real-time
    updateProgressBar(stats.daily_completion_pct);
  } catch (error) {
    console.error('Failed to update completion:', error);
  }
}
```

---

## 4. Multi-Subscription Pattern

### Complete Household Subscription Setup

**Frontend Implementation:**
```typescript
// AporTamos-Frontend/hooks/useHouseholdSubscriptions.ts
export function useHouseholdSubscriptions(householdId: string) {
  useEffect(() => {
    if (!householdId) return;

    // Create channel for all household events
    const channel = supabaseClient.channel(`household:${householdId}`);

    // 1. Chat messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${householdId}`
      },
      handleNewMessage
    );

    // 2. Task assignments
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'task_assignments',
        filter: `household_id=eq.${householdId}`
      },
      handleTaskUpdate
    );

    // 3. Task completions
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'task_completions'
      },
      handleCompletion
    );

    // Subscribe to all events
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Real-time subscribed for household:', householdId);
      } else if (status === 'CLOSED') {
        console.log('Real-time subscription closed');
      }
    });

    // Cleanup on unmount or householdId change
    return () => {
      channel.unsubscribe();
    };
  }, [householdId]);
}
```

---

## 5. Connection Management

### Handle Connection Interruptions

**Frontend Resilience:**
```typescript
// AporTamos-Frontend/services/realtime.ts
export function setupRealtimeErrorHandling() {
  supabaseClient.realtime.setAuth(getAuthToken());

  // Auto-reconnect on connection loss
  supabaseClient.realtime.onConnStateChange((state) => {
    if (state === 'CHANNEL_ERROR') {
      console.error('Realtime channel error, retrying...');
      reconnectWithBackoff();
    } else if (state === 'SUBSCRIBED') {
      console.log('Realtime connection established');
    }
  });
}

function reconnectWithBackoff(attempt = 0) {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  setTimeout(() => {
    supabaseClient.realtime.connect();
  }, delay);
}
```

---

## 6. Offline Handling

### Queue Messages While Offline

**Frontend Offline Queue:**
```typescript
// AporTamos-Frontend/services/offlineQueue.ts
class MessageQueue {
  queue: PendingMessage[] = [];

  async enqueueMessage(message: ChatMessage) {
    this.queue.push({ ...message, pending: true });
    // Store in local SQLite
    await saveToLocalDb(message);
  }

  async flushQueue() {
    for (const msg of this.queue) {
      try {
        await api.post(`/chat/${msg.channel_id}/message`, msg);
        await removeFromLocalDb(msg.id);
        this.queue = this.queue.filter(m => m.id !== msg.id);
      } catch (error) {
        console.error('Failed to send message:', error);
        // Retry on next connection
        break;
      }
    }
  }
}

// Usage
useEffect(() => {
  if (isOnline) {
    messageQueue.flushQueue();
  }
}, [isOnline]);
```

---

## 7. Broadcast Events (Optional)

### Send Custom Broadcast Events

For notifications not tied to table changes:

```typescript
// Example: Notify household members of streak achievement
supabaseClient
  .channel(`household:${householdId}:broadcast`)
  .on('broadcast', { event: 'streak_achieved' }, (payload) => {
    console.log('Streak achieved!', payload.newStreak);
    showStreakNotification(payload.newStreak);
  })
  .subscribe();

// Trigger broadcast from backend
// (FastAPI endpoint calls Supabase broadcast)
POST /households/{id}/broadcast
{
  "event": "streak_achieved",
  "data": { "newStreak": 5 }
}
```

---

## 8. Performance Considerations

### Optimize Subscriptions

**Best Practices:**

1. **Filter at subscription level** (not in application code):
   ```typescript
   // ✅ Good: Filter in subscription
   filter: `household_id=eq.${householdId}`

   // ❌ Bad: Filter in application
   .on('postgres_changes', {...}, (payload) => {
     if (payload.household_id === householdId) { ... }
   })
   ```

2. **Unsubscribe when not needed**:
   ```typescript
   useEffect(() => {
     // Subscribe only if visible
     if (!isVisible) return;
     return () => channel.unsubscribe();
   }, [isVisible]);
   ```

3. **Batch updates** for many changes:
   ```typescript
   let updateBatch = [];
   const flushBatch = () => {
     if (updateBatch.length > 0) {
       setTasks([...updateBatch]);
       updateBatch = [];
     }
   };
   const timer = setInterval(flushBatch, 500); // Update UI every 500ms
   ```

---

## 9. Testing Real-Time Features

### Manual Testing Checklist

- [ ] Open app on two devices simultaneously
- [ ] Send chat message on Device A → appears on Device B in <2 seconds
- [ ] Complete task on Device A → completion % updates on Device B in <5 seconds
- [ ] Close app, reopen → latest messages/tasks appear
- [ ] Disconnect WiFi while chat open, reconnect → messages queue and send
- [ ] Switch between households → subscriptions update correctly
- [ ] Multiple households open → events don't cross between households

---

This real-time event specification enables instant collaboration and gamification engagement in AporTamos.
