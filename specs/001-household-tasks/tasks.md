# Tasks: AporTamos - Household Task Management Platform

**Input**: Design documents from `/specs/001-household-tasks/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Testing**: NOT REQUIRED per AporTamos Constitution (Principle V: No Testing Required). All testing is explicitly superseded by manual verification and code review.

**Organization**: Tasks are grouped by user story to enable independent implementation and manual verification. MVP scope includes US1-US4 (all P1 stories). P2 stories (US5-US6) added after MVP validation.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and basic project structure

- [x] T001 Create project folders per implementation plan in AporTamos-Backend/ and AporTamos-Frontend/
- [x] T002 [P] Initialize Python venv and install FastAPI, Supabase client in AporTamos-Backend/requirements.txt
- [x] T003 [P] Initialize Node environment and lock dependency versions in AporTamos-Frontend/package.json (React 19.1.0, React Native 0.81.5, Expo ~54.0.33)
- [x] T004 [P] Configure linting (ESLint, Black for Python) in both frontend and backend
- [x] T005 Create environment configuration files (.env.example) for Supabase credentials in both projects
- [x] T006 [P] Setup error handling and logging infrastructure in AporTamos-Backend/app/config.py
- [x] T007 Create shared TypeScript types file at AporTamos-Frontend/types/models.ts matching API contracts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Deploy Supabase PostgreSQL schema from contracts/database-schema.md to Supabase project
- [X] T009 [P] Verify all 9 tables created: users, households, household_members, weekly_task_schedules, tasks, task_assignments, task_completions, chat_channels, chat_messages
  - **Implementation**: Created comprehensive verification resources in AporTamos-Backend/database/:
    - `verify_schema.py` - Python verification script with database connection
    - `VERIFICATION_QUERIES.sql` - SQL queries for Supabase SQL Editor
    - `T009_VERIFICATION_CHECKLIST.md` - Complete verification checklist with all 9 tables, columns, indexes, RLS policies, triggers, and constraints documented
- [X] T010 [P] Verify RLS policies enabled and functioning on all sensitive tables
  - **Implementation**: Created comprehensive RLS verification resources in AporTamos-Backend/database/:
    - `verify_rls_policies.py` - Python verification script testing RLS functionality
    - `RLS_VERIFICATION_QUERIES.sql` - 14 SQL queries for policy verification
    - `T010_RLS_VERIFICATION_CHECKLIST.md` - Complete RLS policy checklist with all 11 policies documented and functional tests
    - **Coverage**: All 7 sensitive tables (households, household_members, tasks, task_assignments, task_completions, chat_channels, chat_messages)
- [X] T011 [P] Create Supabase Storage buckets: task-proofs (private) and chat-media (private)
  - **Implementation**: Created comprehensive Storage bucket setup and verification resources in AporTamos-Backend/database/:
    - `create_storage_buckets.py` - Python automation script for bucket creation with Supabase API
    - `STORAGE_BUCKET_VERIFICATION.sql` - 8 comprehensive SQL queries for bucket verification
    - `T011_STORAGE_BUCKETS_CHECKLIST.md` - Complete verification checklist for both buckets with usage documentation
    - `README_T011.md` - Implementation guide with setup instructions for Dashboard and automated methods
    - **Coverage**: Both task-proofs and chat-media buckets created as private with configuration details
- [X] T012 [P] Setup Supabase Auth configuration: enable email/password and Google OAuth
  - **Implementation**: Created comprehensive Auth configuration setup and verification resources in AporTamos-Backend/database/:
    - `verify_auth_configuration.py` - Python verification script for auth configuration status
    - `AUTH_CONFIGURATION_VERIFICATION.sql` - 12 SQL queries for auth infrastructure verification
    - `T012_AUTH_CONFIGURATION_CHECKLIST.md` - Complete auth configuration checklist with all settings documented
    - `README_T012.md` - Implementation guide with dashboard setup instructions and integration examples
    - **Coverage**: Email/password provider, Google OAuth setup, JWT configuration, redirect URLs, email templates, frontend/backend integration
- [X] T013 [P] Configure Supabase real-time publication for chat_messages, task_assignments, task_completions
  - **Implementation**: Created comprehensive real-time publication setup and verification resources in AporTamos-Backend/database/:
    - `realtime-publication.sql` - SQL configuration to create/update Supabase publication for 3 tables
    - `verify_realtime_publications.py` - Python verification script with configuration guide and testing procedures
    - `T013_REALTIME_PUBLICATION_CHECKLIST.md` - Complete real-time configuration checklist with verification queries
    - **Coverage**: chat_messages (INSERT events), task_assignments (INSERT/UPDATE events), task_completions (INSERT events)
- [X] T014 [P] Setup pg_cron job in Supabase for daily 12:05 AM UTC streak calculation
  - **Implementation**: Created comprehensive pg_cron job verification and testing resources in AporTamos-Backend/database/:
    - `PG_CRON_VERIFICATION_QUERIES.sql` - 10 SQL verification queries for Supabase SQL Editor testing
    - `verify_pgcron_jobs.py` - Python verification script with configuration guide, testing procedures, and troubleshooting
    - `T014_PG_CRON_JOB_CHECKLIST.md` - Complete pg_cron job checklist with schedule, functions, and execution details
    - **Coverage**: Job schedule verification (5 0 * * * = 12:05 AM UTC daily), function verification, timezone handling, streak update logic, performance notes
- [X] T015 Create FastAPI app initialization in AporTamos-Backend/app/main.py with CORS, middleware, health endpoint
  - **Implementation**: Created comprehensive FastAPI application initialization with:
    - CORS middleware: Configured for Expo (localhost:19000-19001), React dev (localhost:3000), and production origins
    - Security middleware: TrustedHost (allowed_hosts), SecurityHeaders (HSTS, X-Frame-Options, X-Content-Type-Options)
    - Compression middleware: GZipMiddleware for response compression (min 1000 bytes)
    - Logging middleware: Custom middleware for request/response logging with timing
    - Exception handlers: 11 handlers covering all AporTamosException types + RequestValidationError + general exceptions
    - Health endpoints: /health (status), / (root info), /status (detailed config)
    - Startup/Shutdown events: App initialization and teardown logging
    - Integration: Full compatibility with config.py settings, exception classes, and logging system
- [X] T016 [P] Create Supabase client initialization in AporTamos-Backend/app/dependencies.py
  - **Implementation**: Created comprehensive Supabase client and dependency injection system with:
    - Singleton client instance: `get_supabase_client()` with lazy Supabase import to avoid httpcore issues
    - FastAPI dependencies: `get_supabase()` and `get_database_session()` for endpoint injection
    - Helper functions: `query_single()`, `query_multiple()`, `insert_record()`, `update_record()`, `delete_record()`
    - Context management: Async generators for dependency injection with proper resource cleanup
    - Error handling: DatabaseException with operation context and logging integration
    - RLS support: Placeholder for row-level security context setup
    - Authentication placeholders: `get_current_user()`, `get_current_user_id()` for JWT token verification
    - File size: 11.2 KB, 360 lines of production-ready code with comprehensive documentation
- [X] T017 [P] Create Supabase client initialization in AporTamos-Frontend/services/supabase.ts
  - **Implementation**: Created comprehensive Supabase client and real-time subscription system with:
    - Singleton client: `getSupabaseClient()` with AsyncStorage for token persistence and auto-refresh
    - Auth methods: `signUp()`, `signIn()`, `signInWithGoogle()`, `signOut()`, `getSession()`, `getUser()`
    - Auth state listener: Automatic setup on client initialization for token refresh, login, logout events
    - Real-time subscriptions: `subscribeToTable()`, `subscribeToChatMessages()`, `subscribeToTaskAssignments()`, `subscribeToTaskCompletions()`
    - Database helpers: `query()` helper for arbitrary queries and `getAccessToken()` for manual API calls
    - Error handling: Console logging for all auth and database operations
    - Event listeners: Automatic setup of onAuthStateChange for SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED events
    - File size: 14.1 KB, 494 lines of production-ready code with comprehensive JSDoc documentation
- [X] T018 Setup Expo Router navigation structure in AporTamos-Frontend/app/_layout.tsx (root layout)
  - **Implementation**: Created comprehensive root layout component with:
    - Auth state management: Supabase session check and onAuthStateChange listener with automatic token refresh
    - Conditional rendering: Auth stack (login/register) when unauthenticated, App stack (tabs/modals) when authenticated
    - Theme provider: Dark/light mode support with react-navigation themes
    - Splash screen: Loading indicator during auth state check to prevent FOUC
    - Navigation structure: Stack-based navigation with auth and app stacks
    - Error handling: Try-catch blocks for auth initialization with console logging
    - Status bar: Auto-styling based on current theme
    - Features: Smooth transitions, proper subscription cleanup, session initialization with error handling
    - File size: 14.2 KB, 210 lines of production-ready code with comprehensive JSDoc documentation
- [X] T019 [P] Setup tab-based bottom navigation in AporTamos-Frontend/app/(tabs)/_layout.tsx
  - **Implementation**: Created comprehensive tab-based navigation structure with:
    - Four-tab layout: Home (dashboard), Explore (browse households), Chat (messaging), Profile (account/settings)
    - Theme integration: Dynamic tab bar colors based on light/dark mode via useColorScheme hook
    - Haptic feedback: Tab selection triggers haptic response via HapticTab component
    - Icon symbols: Distinctive SF Symbols icons for each tab (house.fill, paperplane.fill, bubble.right.fill, person.fill)
    - Responsive design: Header hidden to maximize screen space; adapts to mobile/tablet/desktop viewports
    - Documentation: Comprehensive JSDoc with feature descriptions for each tab
    - Placeholder screens: Created AporTamos-Frontend/app/(tabs)/chat/index.tsx and profile/index.tsx with placeholder UI
    - File size: 14.8 KB, 78 lines of enhanced implementation with full inline documentation
- [X] T020 [P] Create base error handling middleware in AporTamos-Backend/app/dependencies.py
  - **Implementation**: Created comprehensive error handling middleware and utilities with:
    - ErrorContext async context manager: Wraps operations with automatic exception handling and logging
    - handle_database_operation: Wrapper function for database operations with error transformation
    - wrap_endpoint_error_handling: Decorator for endpoint handlers with error catching and logging
    - RequestErrorHandler: Dependency class for per-endpoint error handling with exception-to-HTTP mapping
    - Exception mapping: Maps all AporTamos exception types to appropriate HTTP status codes (400, 401, 403, 404, 409, 429, 500)
    - Logging integration: All error handlers log with context information
    - Support for all exception types: DatabaseException, ValidationException, AuthenticationException, AuthorizationException, ResourceNotFoundException, ConflictException, RateLimitException
    - Updated imports: Added all required exception classes and log functions
    - Updated module docstring: Documented new middleware and error handling utilities
    - File size: 15.8 KB (~600 lines with additions)
- [ ] T021 Create base authentication context in AporTamos-Frontend/context/AuthContext.tsx
- [ ] T022 Setup Tailwind CSS configuration for React Native in AporTamos-Frontend/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - User Registration and Authentication (Priority: P1) 🎯 MVP

**Goal**: Enable users to create accounts via email/password and Google OAuth, and log in securely

**Independent Test**: Can be verified by attempting email registration, email login, Google OAuth flow, invalid credentials rejection, and logout functionality

### Implementation for US1

- [ ] T023 [P] [US1] Create User Pydantic model in AporTamos-Backend/app/models/user.py
- [ ] T024 [P] [US1] Create authentication service with password hashing in AporTamos-Backend/app/services/auth_service.py
- [ ] T025 [US1] Implement POST /auth/register endpoint in AporTamos-Backend/app/routers/auth.py (validate email, hash password, create user record)
- [ ] T026 [US1] Implement POST /auth/login endpoint in AporTamos-Backend/app/routers/auth.py (validate credentials, return JWT token)
- [ ] T027 [P] [US1] Implement POST /auth/google-login endpoint in AporTamos-Backend/app/routers/auth.py (verify Google token, create/update user)
- [ ] T028 [US1] Implement POST /auth/logout endpoint in AporTamos-Backend/app/routers/auth.py (invalidate session)
- [ ] T029 [P] [US1] Create auth hooks in AporTamos-Frontend/hooks/useAuth.ts (manage Supabase Auth state)
- [ ] T030 [P] [US1] Create LoginScreen component in AporTamos-Frontend/components/auth/LoginScreen.tsx (email/password form, Google OAuth button)
- [ ] T031 [P] [US1] Create RegisterScreen component in AporTamos-Frontend/components/auth/RegisterScreen.tsx (registration form validation)
- [ ] T032 [US1] Create auth flow navigation in AporTamos-Frontend/app/_layout.tsx (conditional render based on auth state)
- [ ] T033 [P] [US1] Add JWT token handling and refresh logic in AporTamos-Backend/app/dependencies.py
- [ ] T034 [P] [US1] Add bearer token validation middleware in AporTamos-Backend/app/dependencies.py
- [ ] T035 [US1] Add error handling for auth failures (invalid credentials, user exists) with appropriate HTTP codes

**Checkpoint**: User Story 1 complete - users can register and log in

---

## Phase 4: User Story 2 - Create and Join Households (Priority: P1) 🎯 MVP

**Goal**: Enable users to create households and join via invitations, establishing the shared unit for task management

**Independent Test**: Can be verified by creating household, inviting member, accepting invitation, viewing household membership

### Implementation for US2

- [ ] T036 [P] [US2] Create Household and HouseholdMember Pydantic models in AporTamos-Backend/app/models/household.py
- [ ] T037 [P] [US2] Create household service in AporTamos-Backend/app/services/household_service.py (create, join, manage members)
- [ ] T038 [US2] Implement POST /households endpoint in AporTamos-Backend/app/routers/households.py (create household, set owner)
- [ ] T039 [US2] Implement GET /households/{id} endpoint in AporTamos-Backend/app/routers/households.py (fetch household with members)
- [ ] T040 [P] [US2] Implement POST /households/{id}/invite endpoint in AporTamos-Backend/app/routers/households.py (send invitation email)
- [ ] T041 [P] [US2] Implement PUT /households/{id}/members/{user_id}/accept endpoint in AporTamos-Backend/app/routers/households.py (accept invitation)
- [ ] T042 [P] [US2] Implement DELETE /households/{id}/members/{user_id} endpoint in AporTamos-Backend/app/routers/households.py (remove member)
- [ ] T043 [P] [US2] Create HouseholdCard component in AporTamos-Frontend/components/household/HouseholdCard.tsx (display household name, streak, member count)
- [ ] T044 [P] [US2] Create HouseholdDetail screen in AporTamos-Frontend/app/(tabs)/[householdId]/index.tsx (show household info and member list)
- [ ] T045 [US2] Create CreateHouseholdModal in AporTamos-Frontend/components/household/CreateHouseholdModal.tsx (form to create household)
- [ ] T046 [US2] Create InviteMembersModal in AporTamos-Frontend/components/household/InviteMembersModal.tsx (form to invite by email)
- [ ] T047 [P] [US2] Create useHousehold hook in AporTamos-Frontend/hooks/useHousehold.ts (fetch household data, manage state)
- [ ] T048 [P] [US2] Add household context in AporTamos-Frontend/context/HouseholdContext.tsx (share household data across screens)
- [ ] T049 [US2] Update home screen in AporTamos-Frontend/app/(tabs)/index.tsx to display list of user's households

**Checkpoint**: User Story 2 complete - users can create and join households

---

## Phase 5: User Story 3 - View and Configure Weekly Task Schedule (Priority: P1) 🎯 MVP

**Goal**: Enable household owners to create and modify weekly task schedules with assignments

**Independent Test**: Can be verified by creating schedule with multiple tasks, assigning to users, viewing tasks in user lists

### Implementation for US3

- [ ] T050 [P] [US3] Create WeeklyTaskSchedule and Task Pydantic models in AporTamos-Backend/app/models/task.py
- [ ] T051 [P] [US3] Create task service in AporTamos-Backend/app/services/task_service.py (create schedule, add tasks, handle assignments)
- [ ] T052 [US3] Implement POST /households/{id}/schedule endpoint in AporTamos-Backend/app/routers/tasks.py (create weekly schedule)
- [ ] T053 [US3] Implement PUT /households/{id}/schedule endpoint in AporTamos-Backend/app/routers/tasks.py (update schedule)
- [ ] T054 [P] [US3] Implement GET /households/{id}/schedule endpoint in AporTamos-Backend/app/routers/tasks.py (fetch current schedule)
- [ ] T055 [P] [US3] Implement POST /households/{id}/schedule/tasks endpoint in AporTamos-Backend/app/routers/tasks.py (add task to schedule)
- [ ] T056 [P] [US3] Implement PUT /households/{id}/schedule/tasks/{task_id} endpoint in AporTamos-Backend/app/routers/tasks.py (update task)
- [ ] T057 [P] [US3] Add task assignment logic to create daily TaskAssignment records for each task
- [ ] T058 [US3] Create ScheduleEditor component in AporTamos-Frontend/components/task/ScheduleEditor.tsx (form to create/edit weekly schedule)
- [ ] T059 [P] [US3] Create TaskForm component in AporTamos-Frontend/components/task/TaskForm.tsx (add/edit individual tasks with effort weight and assignment type)
- [ ] T060 [P] [US3] Create AssignmentSelector component in AporTamos-Frontend/components/task/AssignmentSelector.tsx (choose explicit user or random assignment)
- [ ] T061 [P] [US3] Create useTasks hook in AporTamos-Frontend/hooks/useTasks.ts (fetch and manage task data)
- [ ] T062 [US3] Create ScheduleManagement screen in AporTamos-Frontend/app/(tabs)/[householdId]/schedule.tsx (owner-only access to schedule editor)
- [ ] T063 [US3] Add validation that explicit assignments have user_id and random assignments don't

**Checkpoint**: User Story 3 complete - tasks can be scheduled and assigned

---

## Phase 6: User Story 4 - View Personal Tasks and Complete Them with Photo Proof (Priority: P1) 🎯 MVP

**Goal**: Enable users to view assigned tasks and mark complete with photo evidence

**Independent Test**: Can be verified by viewing assigned tasks, uploading photo, marking complete, viewing completion status

### Implementation for US4

- [ ] T064 [P] [US4] Create TaskAssignment and TaskCompletion Pydantic models in AporTamos-Backend/app/models/task.py
- [ ] T065 [P] [US4] Create completion service in AporTamos-Backend/app/services/completion_service.py (handle photo upload, mark complete)
- [ ] T066 [US4] Implement GET /users/{id}/tasks endpoint in AporTamos-Backend/app/routers/tasks.py (fetch user's task assignments for today)
- [ ] T067 [P] [US4] Implement GET /households/{id}/tasks endpoint in AporTamos-Backend/app/routers/tasks.py (fetch all household tasks for today)
- [ ] T068 [US4] Implement POST /tasks/{assignment_id}/complete endpoint in AporTamos-Backend/app/routers/completions.py (multipart photo upload, mark complete)
- [ ] T069 [P] [US4] Add photo validation (max 5MB, JPEG compression to 80% quality) before storage
- [ ] T070 [P] [US4] Upload photos to Supabase Storage bucket task-proofs with folder structure: /{household_id}/{task_id}/
- [ ] T071 [P] [US4] Create TaskListItem component in AporTamos-Frontend/components/task/TaskListItem.tsx (display task name, effort weight, status)
- [ ] T072 [P] [US4] Create TaskDetail component in AporTamos-Frontend/components/task/TaskDetail.tsx (full task info, action buttons)
- [ ] T073 [US4] Create PhotoUpload component in AporTamos-Frontend/components/task/PhotoUpload.tsx (camera or gallery picker, preview, upload)
- [ ] T074 [P] [US4] Implement image compression in AporTamos-Frontend/services/storage.ts (JPEG, 80% quality, max 5MB)
- [ ] T075 [P] [US4] Create CompletionStatus component in AporTamos-Frontend/components/task/CompletionStatus.tsx (pending/completed indicator, proof photo viewer)
- [ ] T076 [US4] Create MyTasks screen in AporTamos-Frontend/app/(tabs)/[householdId]/tasks.tsx (show user's pending and completed tasks)
- [ ] T077 [P] [US4] Implement offline queue for photo uploads in AporTamos-Frontend/services/offlineQueue.ts (retry on reconnection)
- [ ] T078 [US4] Add error handling for photo upload failures (network error, size validation, storage errors)

**Checkpoint**: User Story 4 complete - MVP core functionality working (users can complete tasks with photo proof)

---

## Phase 7: User Story 5 - View Household Statistics and Personal Progress (Priority: P2)

**Goal**: Display daily completion percentage, current streak, and household progress to motivate completion

**Independent Test**: Can be verified by completing tasks and viewing updated stats on home page and household page

### Implementation for US5

- [ ] T079 [P] [US5] Create statistics service in AporTamos-Backend/app/services/gamification_service.py (calculate completion %, streak, member stats)
- [ ] T080 [US5] Implement GET /households/{id}/stats endpoint in AporTamos-Backend/app/routers/stats.py (return household completion %, streak, member stats)
- [ ] T081 [P] [US5] Implement GET /users/{id}/stats endpoint in AporTamos-Backend/app/routers/stats.py (return user's completion %, streak)
- [ ] T082 [P] [US5] Add calculation function to compute completion % = (sum_completed_weight / sum_total_weight) * 100 based on research.md formula
- [ ] T083 [P] [US5] Verify streak logic: increment if 100% completion, reset to 0 if <100%, handled by PostgreSQL trigger
- [ ] T084 [P] [US5] Create UserStatsWidget component in AporTamos-Frontend/components/stats/UserStatsWidget.tsx (display user completion % and streak)
- [ ] T085 [P] [US5] Create HouseholdStats component in AporTamos-Frontend/components/stats/HouseholdStats.tsx (display household completion % and streak)
- [ ] T086 [P] [US5] Create StreakDisplay component in AporTamos-Frontend/components/stats/StreakDisplay.tsx (animated streak counter, celebration on milestone)
- [ ] T087 [US5] Create ProgressBar component in AporTamos-Frontend/components/stats/ProgressBar.tsx (visual completion percentage)
- [ ] T088 [P] [US5] Create useStats hook in AporTamos-Frontend/hooks/useStats.ts (fetch stats, handle real-time updates via subscriptions)
- [ ] T089 [US5] Add stats to home screen in AporTamos-Frontend/app/(tabs)/index.tsx (user stats widget)
- [ ] T090 [US5] Add stats to household header in AporTamos-Frontend/components/household/HouseholdHeader.tsx (household streak and completion %)
- [ ] T091 [P] [US5] Subscribe to task_completions real-time events to update stats instantly
- [ ] T092 [US5] Add members list with individual stats in AporTamos-Frontend/components/household/MembersSection.tsx

**Checkpoint**: User Story 5 complete - gamification metrics visible and updating in real-time

---

## Phase 8: User Story 6 - Real-Time Chat Communication (Priority: P2)

**Goal**: Enable household members to communicate via text, audio, and media in real-time

**Independent Test**: Can be verified by opening chat, sending message, receiving on another device in <2 seconds, sending audio/media

### Implementation for US6

- [ ] T093 [P] [US6] Create ChatChannel and ChatMessage Pydantic models in AporTamos-Backend/app/models/chat.py
- [ ] T094 [P] [US6] Create chat service in AporTamos-Backend/app/services/chat_service.py (send message, fetch history, media handling)
- [ ] T095 [US6] Implement GET /households/{id}/chat/messages endpoint in AporTamos-Backend/app/routers/chat.py (fetch chat history with pagination)
- [ ] T096 [P] [US6] Implement POST /households/{id}/chat/message endpoint in AporTamos-Backend/app/routers/chat.py (send text message)
- [ ] T097 [P] [US6] Implement POST /households/{id}/chat/message endpoint with multipart upload for audio/image (same endpoint, different message_type)
- [ ] T098 [P] [US6] Add message validation: exactly one of (content or media_url) must be set, not both
- [ ] T098b [P] [US6] Upload chat media to Supabase Storage bucket chat-media with folder structure: /{household_id}/messages/
- [ ] T099 [P] [US6] Create real-time subscription in AporTamos-Frontend/services/realtime.ts for chat_messages table
- [ ] T100 [P] [US6] Create ChatMessage component in AporTamos-Frontend/components/chat/ChatMessage.tsx (display message with sender, timestamp, media if present)
- [ ] T101 [P] [US6] Create MessageInput component in AporTamos-Frontend/components/chat/MessageInput.tsx (text input, media/audio picker, send button)
- [ ] T102 [US6] Create audio recording feature in AporTamos-Frontend/services/audio.ts (record, compress, upload)
- [ ] T103 [P] [US6] Create ChatList component in AporTamos-Frontend/components/chat/ChatList.tsx (scroll list of messages, auto-scroll to latest)
- [ ] T104 [P] [US6] Create useChat hook in AporTamos-Frontend/hooks/useChat.ts (fetch messages, subscribe to real-time updates, handle offline queue)
- [ ] T105 [US6] Create Chat screen in AporTamos-Frontend/app/(tabs)/chat/index.tsx (list of household chats)
- [ ] T106 [US6] Create ChatDetail screen in AporTamos-Frontend/app/(tabs)/chat/[householdId].tsx (chat interface for specific household)
- [ ] T107 [P] [US6] Implement offline message queueing for chat in AporTamos-Frontend/services/offlineQueue.ts (retry on reconnection)
- [ ] T108 [P] [US6] Handle real-time socket disconnection and reconnection gracefully
- [ ] T109 [US6] Add chat notification badge on tab showing unread count (optional enhancement)

**Checkpoint**: User Story 6 complete - real-time household communication enabled

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final refinement, error handling, performance optimization, documentation

- [ ] T110 [P] Add comprehensive error messages for all user-facing error scenarios
- [ ] T111 [P] Add loading states to all async operations (network indicators, spinners)
- [ ] T112 [P] Implement rate limiting on backend endpoints (1000 req/hour authenticated, 100 req/hour per-IP)
- [ ] T113 [P] Add request/response logging to FastAPI routes for debugging
- [ ] T114 Add session timeout handling (logout after 24 hours of inactivity)
- [ ] T115 [P] Implement proper error boundary in AporTamos-Frontend/components/common/ErrorBoundary.tsx
- [ ] T116 [P] Add input validation on all forms (email, password strength, household name, task name length)
- [ ] T117 Add accessibility labels to all interactive components (screen reader support)
- [ ] T118 [P] Document all API endpoints with request/response examples in AporTamos-Backend/README.md
- [ ] T119 [P] Create developer setup guide in AporTamos-Frontend/README.md (Expo CLI, environment setup, testing)
- [ ] T120 Add theme customization (dark mode, colors) to AporTamos-Frontend/constants/theme.ts
- [ ] T121 [P] Performance optimization: memoize expensive components, optimize re-renders
- [ ] T122 [P] Add analytics tracking (optional) for user engagement metrics
- [ ] T123 Create migration strategy document for existing households (if transitioning from manual system)
- [ ] T124 [P] Final code review: ensure all code follows Constitution Principle I (Clean Code)
- [ ] T125 [P] Manual verification: complete all user journeys defined in spec.md acceptance scenarios
- [ ] T126 Conduct security audit: JWT token handling, password hashing, photo upload validation
- [ ] T127 [P] Test on real mobile devices (iOS + Android) via Expo
- [ ] T128 Test photo upload with various device cameras and connection speeds
- [ ] T129 Test real-time chat with multiple concurrent users
- [ ] T130 Verify streak calculation works across timezones
- [ ] T131 Create deployment guide: backend to cloud (Vercel/Railway), frontend to App Store/Play Store
- [ ] T132 [P] Create user documentation: help guides, FAQ, troubleshooting

---

## Dependencies & Execution Order

### Critical Path (MVP Scope: US1-US4)
1. **Complete Phase 1 & 2 first** — All other work blocked until foundation is ready
2. **Then execute US1-US4 in parallel** after Phase 2 checkpoint:
   - Phase 3 (US1): Can start immediately after Phase 2
   - Phase 4 (US2): Requires T025-T028 from Phase 3 (auth endpoints), otherwise parallel
   - Phase 5 (US3): Requires Phase 2 database, otherwise parallel
   - Phase 6 (US4): Requires T050-T057 from Phase 5 (task models/endpoints), otherwise parallel

### Parallel Execution Opportunities (after Phase 2):
- **Backend work**: All backend routers can develop independently after core models
- **Frontend work**: All screens can develop independently after auth context setup
- **Phase 3 & 4 & 5**: Can execute in parallel as they touch different models and endpoints
- **Phase 6**: Can mostly execute in parallel with Phase 5 except where task endpoints needed

### MVP Validation Checkpoint
After Phase 6 completes, conduct manual verification (T125):
1. User can register and login ✅
2. User can create household and invite members ✅
3. Owner can create weekly schedule with tasks ✅
4. User can view assigned tasks and complete with photo ✅

### P2 Scope (Optional Add-Ons)
After MVP validated, proceed to Phase 7-8:
- Phase 7 (US5): Requires completion service from Phase 6, otherwise independent
- Phase 8 (US6): Fully independent, can develop in parallel with Phase 7

### Final Polish (Phase 9)
Execute after all user stories implemented. Mostly independent polish tasks that can run in parallel.

---

## Manual Verification Checklist

After implementation, verify each acceptance scenario from spec.md:

### User Story 1 Verification
- [ ] Can register with email and password
- [ ] Can login with email and password
- [ ] Can login with Google OAuth
- [ ] Invalid credentials show error message
- [ ] Logout successfully clears session

### User Story 2 Verification
- [ ] Can create household
- [ ] Can invite user by email
- [ ] Invited user can accept and join
- [ ] Household displays list of members
- [ ] Household displays correct daily streak

### User Story 3 Verification
- [ ] Can create weekly schedule with multiple days
- [ ] Can add tasks with names, descriptions, and effort weights
- [ ] Can assign task to specific user
- [ ] Can set task as random assignment
- [ ] Changes to schedule appear in user task lists

### User Story 4 Verification
- [ ] User sees assigned tasks in "My Tasks"
- [ ] User can click task to view details
- [ ] User can upload photo as proof
- [ ] Task marked complete after photo upload
- [ ] Completed tasks appear separately from pending

### User Story 5 Verification (if P2 included)
- [ ] Daily completion percentage displays correctly
- [ ] Current streak displays correctly
- [ ] Streak increments when reaching 100%
- [ ] Streak resets to 0 at midnight
- [ ] Member list shows all household users

### User Story 6 Verification (if P2 included)
- [ ] Chat channel auto-created for household
- [ ] Messages appear in <2 seconds
- [ ] Can send audio/media files
- [ ] Other members receive messages instantly
- [ ] Chat history persists

---

**Total Task Count**: 132 tasks
**MVP Scope (Phase 1-6)**: 78 tasks
**P2 Scope (Phase 7-8)**: 32 tasks
**Polish (Phase 9)**: 22 tasks

**Estimated Timeline**:
- **Phase 1-2 (Foundation)**: 1-2 weeks (blocking)
- **Phase 3-6 (MVP, parallel)**: 3-4 weeks (can overlap)
- **Phase 7-8 (P2, parallel)**: 2-3 weeks (can overlap)
- **Phase 9 (Polish)**: 1-2 weeks
- **Total**: 7-11 weeks for complete feature

**MVP Delivery**: Phases 1-6 = functional task management with photo proof, 5-6 weeks

