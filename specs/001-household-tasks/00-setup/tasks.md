# Tasks: Setup & Foundational Infrastructure

**Status**: ✅ COMPLETO  
**Bloquea**: US1, US2, US3, US4, US5, US6

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create project folders per implementation plan in AporTamos-Backend/ and AporTamos-Frontend/
- [x] T002 [P] Initialize Python venv and install FastAPI, Supabase client in AporTamos-Backend/requirements.txt
- [x] T003 [P] Initialize Node environment and lock dependency versions in AporTamos-Frontend/package.json (React 19.1.0, React Native 0.81.5, Expo ~54.0.33)
- [x] T004 [P] Configure linting (ESLint, Black for Python) in both frontend and backend
- [x] T005 Create environment configuration files (.env.example) for Supabase credentials in both projects
- [x] T006 [P] Setup error handling and logging infrastructure in AporTamos-Backend/app/config.py
- [x] T007 Create shared TypeScript types file at AporTamos-Frontend/types/models.ts matching API contracts

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T008 Deploy Supabase PostgreSQL schema from contracts/database-schema.md to Supabase project
- [x] T009 [P] Verify all 9 tables created: users, households, household_members, weekly_task_schedules, tasks, task_assignments, task_completions, chat_channels, chat_messages
- [x] T010 [P] Verify RLS policies enabled and functioning on all sensitive tables
- [x] T011 [P] Create Supabase Storage buckets: task-proofs (private) and chat-media (private)
- [x] T012 [P] Setup Supabase Auth configuration: enable email/password and Google OAuth
- [x] T013 [P] Configure Supabase real-time publication for chat_messages, task_assignments, task_completions
- [x] T014 [P] Setup pg_cron job in Supabase for daily 12:05 AM UTC streak calculation
- [x] T015 Create FastAPI app initialization in AporTamos-Backend/app/main.py with CORS, middleware, health endpoint
- [x] T016 [P] Create Supabase client initialization in AporTamos-Backend/app/dependencies.py
- [x] T017 [P] Create Supabase client initialization in AporTamos-Frontend/services/supabase.ts
- [x] T018 Setup Expo Router navigation structure in AporTamos-Frontend/app/_layout.tsx (root layout)
- [x] T019 [P] Setup tab-based bottom navigation in AporTamos-Frontend/app/(tabs)/_layout.tsx
- [x] T020 [P] Create base error handling middleware in AporTamos-Backend/app/dependencies.py
- [x] T021 Create base authentication context in AporTamos-Frontend/context/AuthContext.tsx
- [x] T022 Setup Tailwind CSS configuration for React Native in AporTamos-Frontend/

**Checkpoint**: ✅ Foundation ready — user story implementation puede comenzar en paralelo
