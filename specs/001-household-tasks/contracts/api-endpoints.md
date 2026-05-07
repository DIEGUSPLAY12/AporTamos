# API Endpoints: AporTamos FastAPI Specification

**Feature**: 001-household-tasks | **Date**: 2026-05-07 | **Status**: Complete

This document specifies all REST API endpoints for the AporTamos backend.

---

## Base URL
```
http://localhost:8000  (development)
https://aporTamos-api.example.com  (production)
```

## Authentication

All endpoints except `/auth/*` require Bearer token in Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

JWT tokens obtained from login/register endpoints and refreshed automatically by Supabase.

---

## 1. Authentication Endpoints

### POST /auth/register

Create a new user account with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "name": "John Doe"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors:**
- `400`: Email already exists
- `422`: Invalid email format or weak password

---

### POST /auth/login

Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors:**
- `401`: Invalid credentials
- `404`: User not found

---

### POST /auth/google-login

Authenticate or register with Google OAuth.

**Request:**
```json
{
  "google_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@google.com",
    "name": "John Doe",
    "is_new_user": false
  }
}
```

**Errors:**
- `400`: Invalid Google token
- `401`: Token expired

---

### POST /auth/logout

Logout the current user and invalidate refresh token.

**Request:** (No body required)

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

---

### POST /auth/refresh

Refresh an expired access token using refresh token (handled automatically by Supabase).

**Request:** (Automatic via Supabase client)

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

## 2. User Endpoints

### GET /users/{user_id}

Retrieve user profile information.

**Parameters:**
- `user_id` (path, UUID): User ID

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2026-05-07T10:00:00Z",
  "updated_at": "2026-05-07T10:00:00Z"
}
```

**Errors:**
- `404`: User not found
- `401`: Unauthorized

---

### PUT /users/{user_id}

Update user profile (name, timezone preference).

**Request:**
```json
{
  "name": "John Smith",
  "preferred_timezone": "America/Los_Angeles"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Smith",
  "created_at": "2026-05-07T10:00:00Z",
  "updated_at": "2026-05-07T11:30:00Z"
}
```

---

## 3. Household Endpoints

### POST /households

Create a new household.

**Request:**
```json
{
  "name": "Diego's Apartment",
  "timezone_id": "America/New_York"
}
```

**Response (201):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Diego's Apartment",
  "timezone_id": "America/New_York",
  "daily_streak": 0,
  "created_at": "2026-05-07T10:00:00Z",
  "updated_at": "2026-05-07T10:00:00Z"
}
```

---

### GET /households/{household_id}

Retrieve household details and members.

**Response (200):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Diego's Apartment",
  "timezone_id": "America/New_York",
  "daily_streak": 2,
  "last_completion_date": "2026-05-07",
  "members": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "role": "owner",
      "joined_at": "2026-05-07T10:00:00Z"
    },
    {
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Jane Doe",
      "role": "member",
      "joined_at": "2026-05-08T14:30:00Z"
    }
  ],
  "created_at": "2026-05-07T10:00:00Z",
  "updated_at": "2026-05-07T18:45:00Z"
}
```

---

### POST /households/{household_id}/members

Invite a user to household by email.

**Request:**
```json
{
  "email": "newmember@example.com"
}
```

**Response (201):**
```json
{
  "message": "Invitation sent to newmember@example.com"
}
```

**Errors:**
- `403`: Only household owner can invite
- `400`: Email already member of household

---

### DELETE /households/{household_id}/members/{user_id}

Remove a member from household.

**Response (204):** No content

**Errors:**
- `403`: Only owner can remove members
- `400`: Cannot remove owner without transfer

---

### PUT /households/{household_id}/members/{user_id}

Accept household invitation or update member role.

**Request:**
```json
{
  "action": "accept",
  "role": "member"
}
```

**Response (200):**
```json
{
  "message": "Successfully joined household"
}
```

---

## 4. Task Schedule Endpoints

### POST /households/{household_id}/schedule

Create a new weekly task schedule.

**Request:**
```json
{
  "tasks": [
    {
      "name": "Wash dishes",
      "description": "Clean all dishes and pans",
      "day_of_week": "MON",
      "effort_weight": 3,
      "assignment_type": "explicit",
      "assigned_user_id": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "name": "Vacuum living room",
      "day_of_week": "WED",
      "effort_weight": 4,
      "assignment_type": "random",
      "assigned_user_id": null
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "b1c2d3e4-f5g6-7890-abcd-ef1234567890",
  "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 1,
  "tasks": [
    {
      "id": "c1d2e3f4-g5h6-7890-abcd-ef1234567890",
      "name": "Wash dishes",
      "day_of_week": "MON",
      "effort_weight": 3,
      "assignment_type": "explicit",
      "assigned_user_id": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "id": "d1e2f3g4-h5i6-7890-abcd-ef1234567890",
      "name": "Vacuum living room",
      "day_of_week": "WED",
      "effort_weight": 4,
      "assignment_type": "random",
      "assigned_user_id": null
    }
  ],
  "created_at": "2026-05-07T10:00:00Z"
}
```

---

### GET /households/{household_id}/schedule

Get current weekly task schedule.

**Response (200):** Same as POST response above

---

### PUT /households/{household_id}/schedule

Update weekly task schedule (creates new version).

**Request:** Same as POST

**Response (200):** Updated schedule with incremented version

---

## 5. Task Endpoints

### GET /households/{household_id}/tasks

Get user's assigned tasks for today/this week.

**Query Parameters:**
- `date` (optional, ISO date): Specific date (default: today)
- `view` (optional, enum: day|week, default: day)

**Response (200):**
```json
{
  "date": "2026-05-07",
  "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "household_name": "Diego's Apartment",
  "daily_completion_pct": 50,
  "tasks": [
    {
      "id": "c1d2e3f4-g5h6-7890-abcd-ef1234567890",
      "assignment_id": "e1f2g3h4-i5j6-7890-abcd-ef1234567890",
      "name": "Wash dishes",
      "effort_weight": 3,
      "is_completed": true,
      "assigned_to": "John Doe",
      "assignment_date": "2026-05-07"
    },
    {
      "id": "d1e2f3g4-h5i6-7890-abcd-ef1234567890",
      "assignment_id": "f1g2h3i4-j5k6-7890-abcd-ef1234567890",
      "name": "Vacuum living room",
      "effort_weight": 4,
      "is_completed": false,
      "assigned_to": "Jane Doe",
      "assignment_date": "2026-05-07"
    }
  ]
}
```

---

### GET /households/{household_id}/tasks/all

Get all household tasks (not just current user's).

**Query Parameters:**
- `date` (optional, ISO date)
- `view` (optional, enum: day|week)

**Response (200):** Same structure as /tasks but includes all members' assignments

---

## 6. Task Completion Endpoints

### POST /tasks/{task_assignment_id}/complete

Mark task complete with photo proof.

**Request:** (multipart/form-data)
```
assignment_id: string (UUID)
photo: file (JPEG/PNG, max 5MB)
```

**Response (201):**
```json
{
  "id": "g1h2i3j4-k5l6-7890-abcd-ef1234567890",
  "assignment_id": "e1f2g3h4-i5j6-7890-abcd-ef1234567890",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "photo_url": "https://supabase-storage.com/task-proofs/a1b2c3d4/g1h2i3j4/photo.jpg",
  "completed_at": "2026-05-07T14:30:00Z"
}
```

**Errors:**
- `400`: Photo required
- `413`: Photo exceeds 5MB
- `409`: Task already completed

---

## 7. Statistics Endpoints

### GET /stats/user

Get user's personal statistics.

**Response (200):**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_name": "John Doe",
  "daily_completion_pct": 75,
  "personal_streak": 5,
  "total_tasks_completed": 42,
  "total_tasks_assigned": 50,
  "households_count": 2
}
```

---

### GET /stats/household/{household_id}

Get household statistics.

**Response (200):**
```json
{
  "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "household_name": "Diego's Apartment",
  "daily_completion_pct": 85,
  "daily_streak": 3,
  "members_count": 2,
  "member_stats": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "tasks_completed_today": 2,
      "tasks_assigned_today": 2,
      "completion_pct": 100
    },
    {
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Jane Doe",
      "tasks_completed_today": 1,
      "tasks_assigned_today": 2,
      "completion_pct": 50
    }
  ]
}
```

---

## 8. Chat Endpoints

### GET /chat/{household_id}

Retrieve chat message history for household.

**Query Parameters:**
- `limit` (optional, int, default: 50): Number of messages to return
- `offset` (optional, int, default: 0): For pagination
- `before` (optional, ISO datetime): Messages before timestamp

**Response (200):**
```json
{
  "household_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "channel_id": "c1d2e3f4-g5h6-7890-abcd-ef1234567890",
  "messages": [
    {
      "id": "m1n2o3p4-q5r6-7890-abcd-ef1234567890",
      "sender_id": "550e8400-e29b-41d4-a716-446655440000",
      "sender_name": "John Doe",
      "message_type": "text",
      "content": "Let's clean today!",
      "media_url": null,
      "created_at": "2026-05-07T10:30:00Z"
    },
    {
      "id": "n1o2p3q4-r5s6-7890-abcd-ef1234567890",
      "sender_id": "660e8400-e29b-41d4-a716-446655440000",
      "sender_name": "Jane Doe",
      "message_type": "image",
      "content": null,
      "media_url": "https://supabase-storage.com/chat-media/household_id/message_id/image.jpg",
      "created_at": "2026-05-07T10:31:00Z"
    }
  ],
  "has_more": false
}
```

---

### POST /chat/{household_id}/message

Send a message to household chat.

**Request:** (multipart/form-data for media, application/json for text)

Text message:
```json
{
  "message_type": "text",
  "content": "Looking good everyone!"
}
```

Media message:
```
message_type: "image"
content: (empty)
media: file (max 20MB)
```

**Response (201):**
```json
{
  "id": "o1p2q3r4-s5t6-7890-abcd-ef1234567890",
  "channel_id": "c1d2e3f4-g5h6-7890-abcd-ef1234567890",
  "sender_id": "550e8400-e29b-41d4-a716-446655440000",
  "message_type": "text",
  "content": "Looking good everyone!",
  "created_at": "2026-05-07T15:45:00Z"
}
```

**Errors:**
- `400`: Invalid message type
- `413`: Media file too large

---

## 9. Health & Status Endpoints

### GET /health

Service health check (no authentication required).

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-05-07T15:45:00Z"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "detail": "Specific error message",
  "error_code": "INVALID_REQUEST",
  "status_code": 400
}
```

**Common Status Codes:**
- `200`: Success
- `201`: Created
- `204`: No content (success with no response body)
- `400`: Bad request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (permission denied)
- `404`: Not found
- `409`: Conflict (e.g., already exists)
- `422`: Unprocessable entity (invalid data)
- `429`: Too many requests (rate limited)
- `500`: Server error

---

## Rate Limiting

All endpoints (except /health) are rate limited:
- **Authenticated users**: 1000 requests per hour
- **Per-IP**: 100 requests per hour

Rate limit headers in response:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1620000000
```

---

## WebSocket (Real-Time Chat)

Connect to real-time chat via WebSocket:

```
ws://localhost:8000/ws/chat/{household_id}?token={jwt_token}
```

**Messages received (automatic from Supabase subscriptions):**
```json
{
  "type": "INSERT",
  "table": "chat_messages",
  "record": {
    "id": "...",
    "channel_id": "...",
    "sender_id": "...",
    "content": "New message!",
    "created_at": "2026-05-07T16:00:00Z"
  }
}
```

---

This API specification is complete and ready for implementation.
