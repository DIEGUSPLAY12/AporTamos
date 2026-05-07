# Implementation Plan: AporTamos - Household Task Management Platform

**Branch**: `001-household-tasks` | **Date**: 2026-05-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-household-tasks/spec.md`

## Summary

AporTamos is a household task management and gamification platform designed to distribute household responsibilities equitably among household members. The system enables creation of households, definition of weekly task schedules with weighted effort scoring, task completion tracking with photo evidence, and real-time chat coordination. Gamification through daily streak tracking and completion percentage metrics motivates sustained task completion. The application uses React Native with Expo for cross-platform mobile delivery, FastAPI for backend services, and Supabase for authentication, real-time messaging, and file storage.

## Technical Context

**Language/Version**: 
- Frontend: TypeScript with React 19.1.0, React Native 0.81.5, Expo ~54.0.33
- Backend: Python 3.10+ with FastAPI

**Primary Dependencies**: 
- Frontend: Expo Router, React Navigation, React Native Web, Tailwind
- Backend: FastAPI, Supabase (auth, real-time, storage), Pydantic, SQLAlchemy

**Storage**: 
- Primary: Supabase PostgreSQL database
- Files: Supabase Storage for task completion photos
- Real-time: Supabase real-time subscriptions for chat and status updates

**Testing**: 
- No automated testing required per AporTamos Constitution Principle V
- Manual verification and code review are primary quality gates

**Target Platform**: 
- Primary: iOS/Android via React Native/Expo
- Secondary: Web via React Native Web

**Project Type**: Mobile-first cross-platform SaaS application with cloud backend

**Performance Goals**:
- Chat message delivery: <2 seconds end-to-end
- Task completion percentage update: <5 seconds after submission
- Registration/login: <2 minutes user journey
- Support: 100+ households, 500+ concurrent active users

**Constraints**: 
- Photo uploads: max 5MB per image
- Responsive across viewports: mobile (<600px), tablet (600px-1024px), desktop (>1024px)
- No external testing frameworks; manual testing only
- Minimal dependencies per Constitution Principle IV

**Scale/Scope**: 
- Households: 100+ target
- Users per household: 2-6
- Monthly active users target: 1000+
- Features: 6 core user stories (P1: 4, P2: 2)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Constitution Compliance Status

**Principle I - Clean Code**: ✅ PASS
- All code must prioritize clarity and maintainability with self-documenting names and single-purpose functions.
- *Plan alignment*: Component structure will enforce separation of concerns. Feature modules will be organized by domain (auth, households, tasks, chat). Clear naming conventions for API endpoints and database schemas.

**Principle II - Simple UX**: ✅ PASS
- UI must be straightforward, intuitive, with every feature justified by user value. No feature creep.
- *Plan alignment*: 6 core user stories represent lean feature set focused on core value (task management + coordination). Chat and statistics are P2 (non-blocking). Simple tab-based navigation. Single-purpose screens.

**Principle III - Responsive Design**: ✅ PASS
- Mobile-first required. Test viewports: <600px, 600-1024px, >1024px.
- *Plan alignment*: React Native provides cross-platform consistency. Expo Router enables native navigation. Layout testing across target viewports is manual verification responsibility.

**Principle IV - Minimal Dependencies**: ✅ PASS
- Dependencies justified. Evaluate against stdlib/built-ins. Security and maintenance burden weighted equally with features.
- *Plan alignment*: Tech stack is minimal: React Native (core), Expo (development), Tailwind (styling), FastAPI (backend), Supabase (backend-as-a-service). No unnecessary libraries. Existing packages in package.json already validated.

**Principle V - No Testing Required**: ✅ PASS
- Tests explicitly not required. Supersedes all other guidance.
- *Plan alignment*: No test tasks in task generation. Manual verification and code review are primary quality gates. No CI/CD testing pipelines required.

### Complexity Tracking

No violations detected. All technology choices align with constitutional principles and are justified by business requirements.

## Project Structure

### Documentation (this feature)

```text
specs/001-household-tasks/
├── plan.md                          # This file (implementation planning)
├── spec.md                          # Feature specification
├── research.md                      # Phase 0: Technical research and decisions
├── data-model.md                    # Phase 1: Entity definitions and relationships
├── quickstart.md                    # Phase 1: Developer quickstart guide
├── contracts/                       # Phase 1: API and interface contracts
│   ├── api-endpoints.md             # FastAPI endpoints specification
│   ├── database-schema.md           # Supabase schema and relationships
│   └── realtime-events.md           # Chat and subscription events
└── checklists/
    └── requirements.md              # Quality validation
```

### Source Code (repository root)

```text
AporTamos-Backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI app initialization
│   ├── config.py                    # Configuration and environment
│   ├── dependencies.py              # Database, auth, shared dependencies
│   ├── models/                      # Pydantic models and database ORM
│   │   ├── user.py
│   │   ├── household.py
│   │   ├── task.py
│   │   ├── task_completion.py
│   │   └── chat.py
│   ├── routers/                     # FastAPI route handlers
│   │   ├── auth.py                  # Registration, login, OAuth
│   │   ├── households.py            # Household CRUD and membership
│   │   ├── tasks.py                 # Task schedule and assignments
│   │   ├── completions.py           # Task completion tracking
│   │   └── chat.py                  # Chat message endpoints
│   └── services/                    # Business logic
│       ├── auth_service.py
│       ├── household_service.py
│       ├── task_service.py
│       ├── gamification_service.py  # Streak and scoring logic
│       └── chat_service.py
├── migrations/                      # Supabase SQL migrations
├── requirements.txt
└── README.md

AporTamos-Frontend/
├── app/
│   ├── _layout.tsx                  # Root layout with navigation
│   ├── modal.tsx
│   └── (tabs)/
│       ├── _layout.tsx              # Tab navigation
│       ├── index.tsx                # Home: stats, households list
│       ├── explore.tsx              # Browse/join households
│       ├── chat/                    # Chat tab
│       │   ├── _layout.tsx
│       │   ├── index.tsx            # Chat list
│       │   └── [id].tsx             # Chat detail
│       └── profile/                 # Profile tab
│           ├── index.tsx
│           └── [householdId]/       # Household management
├── components/
│   ├── household/
│   │   ├── HouseholdCard.tsx        # Household list item
│   │   ├── HouseholdHeader.tsx      # Household detail header
│   │   ├── MembersSection.tsx
│   │   └── TaskTabs.tsx             # My Tasks / All Tasks toggle
│   ├── task/
│   │   ├── TaskListItem.tsx
│   │   ├── TaskDetail.tsx
│   │   ├── PhotoUpload.tsx          # Photo proof submission
│   │   └── CompletionStatus.tsx     # Pending/Completed status
│   ├── chat/
│   │   ├── ChatMessage.tsx
│   │   ├── MessageInput.tsx         # Text, audio, media input
│   │   └── ChatList.tsx
│   ├── stats/
│   │   ├── UserStatsWidget.tsx      # Daily completion %, streak
│   │   ├── HouseholdStats.tsx       # Household completion %, streak
│   │   └── StreakDisplay.tsx
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
├── hooks/
│   ├── useAuth.ts                   # Authentication context
│   ├── useHousehold.ts              # Household data fetching
│   ├── useTasks.ts                  # Task management
│   ├── useChat.ts                   # Chat subscriptions
│   └── useStats.ts                  # Statistics calculations
├── services/
│   ├── api.ts                       # FastAPI client (axios/fetch)
│   ├── supabase.ts                  # Supabase client initialization
│   ├── storage.ts                   # Photo upload to Supabase Storage
│   └── realtime.ts                  # Supabase real-time subscriptions
├── context/
│   ├── AuthContext.tsx
│   ├── HouseholdContext.tsx
│   └── AppTheme.tsx
├── types/
│   ├── models.ts                    # TypeScript interfaces matching API
│   └── api.ts                       # API response types
├── constants/
│   ├── config.ts                    # API URLs, Supabase config
│   └── theme.ts                     # Colors, typography (Tailwind)
├── app.json                         # Expo configuration
├── package.json                     # Dependencies (locked versions)
├── tsconfig.json
├── expo-env.d.ts
└── README.md
```

**Structure Decision**: Monorepo pattern with separate backend (FastAPI/Python) and frontend (React Native/Expo). Frontend uses tab-based navigation (Expo Router + React Navigation). Backend implements RESTful API with real-time websocket support via Supabase. This structure supports independent development of frontend and backend while maintaining clear separation of concerns per Constitution Principle I.

## Phase 0: Research & Clarification

### Research Tasks

The following unknowns from Technical Context require research:

1. **Supabase Real-Time Architecture for Chat**
   - How to implement real-time message delivery with Supabase subscriptions
   - Handling offline message queueing and retry logic
   - Websocket vs. polling performance trade-offs
   
2. **Weighted Task Scoring Calculation**
   - Formula for daily progress percentage based on weighted scores vs. task count
   - How to calculate household-wide completion when tasks have different weights
   - Handling edge case: household with 0 assigned tasks

3. **Random Task Assignment Algorithm**
   - Fair distribution algorithm for daily random assignments
   - Preventing unbalanced workload distribution over time
   - Coexistence of random + explicit assignments

4. **Photo Storage and Management**
   - Supabase Storage integration and size limits (5MB per image)
   - Photo compression for mobile uploads
   - Cleanup strategy for old proofs

5. **Authentication: Email/Password vs. Google OAuth**
   - Supabase Auth configuration for both flows
   - Session management and token refresh
   - Logout behavior across devices

6. **Streak Reset and Timezone Handling**
   - Daily streak reset at midnight in household's timezone
   - Timezone detection and persistence
   - Handling daylight saving time transitions

### Output: research.md

This phase will produce a research.md file documenting:
- Decision on Supabase real-time messaging approach
- Weighted scoring formula with examples
- Random assignment algorithm pseudocode
- Photo storage strategy
- Auth flow diagrams (email/password + OAuth)
- Timezone handling strategy

## Phase 1: Design & Contracts

### Phase 1a: Data Model

**Extract entities from spec** → `data-model.md`:

Core entities defined in spec requirements:

1. **User**
   - id (UUID)
   - email (string, unique)
   - password_hash (string, nullable for OAuth)
   - google_id (string, nullable)
   - name (string)
   - created_at (timestamp)
   - updated_at (timestamp)
   - household_ids (relationship: many-to-many through membership)

2. **Household**
   - id (UUID)
   - owner_id (UUID, foreign key to User)
   - name (string)
   - created_at (timestamp)
   - daily_streak (integer, default 0)
   - last_completion_date (date)
   - members (relationship: many User through membership)
   - tasks (relationship: one-to-many with Task)
   - chat_channel (relationship: one-to-one with ChatChannel)

3. **HouseholdMember** (junction table)
   - household_id (UUID, foreign key)
   - user_id (UUID, foreign key)
   - joined_at (timestamp)
   - role (enum: owner, member)

4. **WeeklyTaskSchedule**
   - id (UUID)
   - household_id (UUID, foreign key)
   - version (integer)
   - created_at (timestamp)
   - updated_at (timestamp)
   - tasks (relationship: one-to-many with Task)

5. **Task**
   - id (UUID)
   - schedule_id (UUID, foreign key)
   - name (string)
   - description (text, nullable)
   - day_of_week (enum: MON-SUN)
   - effort_weight (integer, 1-10)
   - assignment_type (enum: explicit, random)
   - assigned_user_id (UUID, nullable, for explicit assignments)
   - frequency (enum: daily, weekly)

6. **TaskAssignment** (daily instantiation)
   - id (UUID)
   - task_id (UUID, foreign key)
   - household_id (UUID, foreign key)
   - assigned_to_user_id (UUID, foreign key)
   - assignment_date (date)
   - is_completed (boolean)

7. **TaskCompletion**
   - id (UUID)
   - assignment_id (UUID, foreign key)
   - user_id (UUID, foreign key)
   - photo_url (string, URL to Supabase Storage)
   - completed_at (timestamp)

8. **ChatChannel**
   - id (UUID)
   - household_id (UUID, foreign key, unique)
   - created_at (timestamp)
   - messages (relationship: one-to-many with ChatMessage)

9. **ChatMessage**
   - id (UUID)
   - channel_id (UUID, foreign key)
   - sender_id (UUID, foreign key)
   - message_type (enum: text, audio, image)
   - content (text for text messages)
   - media_url (string, URL to media in Supabase Storage, nullable)
   - created_at (timestamp)

### Phase 1b: API & Interface Contracts

**Define interface contracts** → `/contracts/`:

Create three contract files documenting:

1. **api-endpoints.md**: RESTful FastAPI endpoints
   - POST /auth/register
   - POST /auth/login
   - POST /auth/google-login
   - POST /auth/logout
   - GET /users/{id}
   - POST /households
   - GET /households/{id}
   - POST /households/{id}/members
   - DELETE /households/{id}/members/{user_id}
   - POST /households/{id}/schedule
   - PUT /households/{id}/schedule
   - GET /households/{id}/tasks (my tasks)
   - GET /households/{id}/tasks/all (all tasks)
   - POST /tasks/{id}/complete (with photo upload)
   - GET /chat/{household_id}
   - POST /chat/{household_id}/message
   - GET /stats/user
   - GET /stats/household/{id}

2. **database-schema.md**: Supabase PostgreSQL schema
   - Table definitions with all fields and relationships
   - Constraints and indexes
   - Row-level security (RLS) policies
   - Triggers for streak calculation

3. **realtime-events.md**: Supabase real-time subscriptions
   - chat_messages table changes
   - task_assignments changes (for status updates)
   - task_completions changes (for progress updates)

### Phase 1c: Agent Context Update

Update `.github/copilot-instructions.md` to point to this plan:

```
<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the implementation
plan at specs/001-household-tasks/plan.md
<!-- SPECKIT END -->
```

### Phase 1d: Developer Quickstart

Create `quickstart.md` with:
- Local development setup (Python venv, npm/yarn)
- Supabase project setup
- Environment variables configuration
- Running FastAPI dev server
- Running Expo development client
- Example API calls
- Testing manual verification procedures

### Output: Phase 1 Artifacts

- ✅ `data-model.md` — 9 core entities with relationships
- ✅ `contracts/api-endpoints.md` — Complete REST API specification
- ✅ `contracts/database-schema.md` — Database schema and RLS policies
- ✅ `contracts/realtime-events.md` — Real-time subscription events
- ✅ `quickstart.md` — Developer setup guide
- ✅ Updated `.github/copilot-instructions.md` — Agent context

## Complexity Justification

All technology and architectural choices directly address core requirements and comply with AporTamos Constitution:

| Decision | Reason | Alternatives Considered |
|----------|--------|------------------------|
| React Native + Expo | Cross-platform mobile (iOS/Android) with shared codebase; Expo accelerates development | Native iOS/Android: higher maintenance burden; Flutter: unfamiliar tech stack |
| FastAPI | Modern, minimal Python framework for API; async support; automatic OpenAPI docs | Django: over-engineered for this scope; Flask: less structure |
| Supabase | Integrated auth + database + real-time + storage; eliminates infrastructure complexity | Firebase: less control; custom backend: higher operational burden |
| Tailwind CSS | Utility-first styling for consistency; minimal bundle impact | Bootstrap: unnecessary complexity; styled-components: more JS |
| No testing framework | Constitution Principle V; manual verification sufficient for team size | pytest/Jest: violates constitutional principle; increases complexity |

## Governance & Next Steps

This plan is ready for Phase 2: Task generation. The `/speckit.tasks` command will:
1. Parse this plan and spec
2. Break down into atomic, dependency-ordered tasks
3. Organize by user story for parallel development
4. Track manual verification points instead of test points

All tasks will reference specific file paths and comply with the AporTamos Constitution, particularly Principles I (Clean Code) and V (No Testing Required).

---

**Plan Status**: Ready for Phase 2 (Task Generation)
**Requires**: User approval to proceed to `/speckit.tasks`
**Next Artifact**: tasks.md with actionable, prioritized implementation tasks
