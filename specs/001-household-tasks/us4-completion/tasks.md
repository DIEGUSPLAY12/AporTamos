# Tasks: US4 — Task Completion with Photo Proof (P1)

**Status**: ✅ COMPLETADO — T064–T078 todos completados  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  
**Requiere**: US3 completado (T050–T063)

---

## Backend

- [x] T064 [P] Create TaskAssignment and TaskCompletion Pydantic models in AporTamos-Backend/app/models/task.py
- [x] T065 [P] Create completion service in AporTamos-Backend/app/services/completion_service.py (handle photo upload, mark complete)
- [x] T066 Implement GET /users/{id}/tasks endpoint in AporTamos-Backend/app/routers/tasks.py (fetch user's task assignments for today)
- [x] T067 [P] Implement GET /households/{id}/tasks endpoint in AporTamos-Backend/app/routers/tasks.py (fetch all household tasks for today)
- [x] T068 Implement POST /tasks/{assignment_id}/complete endpoint in AporTamos-Backend/app/routers/completions.py (multipart photo upload, mark complete)
- [x] T069 [P] Add photo validation (max 5MB, JPEG compression to 80% quality) before storage
- [x] T070 [P] Upload photos to Supabase Storage bucket task-proofs with path: /{household_id}/{task_id}/{assignment_id}.jpg

## Frontend

- [x] T071 [P] Create TaskListItem component in AporTamos-Frontend/components/task/TaskListItem.tsx (task name, effort weight, status)
- [x] T072 [P] Create TaskDetail component in AporTamos-Frontend/components/task/TaskDetail.tsx (full task info, "Mark Complete" button)
- [x] T073 Create PhotoUpload component in AporTamos-Frontend/components/task/PhotoUpload.tsx (camera or gallery picker, preview, upload)
- [x] T074 [P] Implement image compression in AporTamos-Frontend/services/storage.ts (JPEG, 80% quality, max 5MB)
- [x] T075 [P] Create CompletionStatus component in AporTamos-Frontend/components/task/CompletionStatus.tsx (pending/completed indicator, proof photo viewer)
- [x] T076 Create MyTasks screen in AporTamos-Frontend/app/(tabs)/[householdId]/tasks.tsx (pending and completed tasks)
- [x] T077 [P] Implement offline queue for photo uploads in AporTamos-Frontend/services/offlineQueue.ts (retry on reconnection)
- [x] T078 Add error handling for photo upload failures (network error, size validation, storage errors)

**Checkpoint**: ✅ US4 completo — MVP core loop implementado

---

## Acceptance Scenarios Verification

- [x] User sees assigned tasks in "My Tasks"
- [x] User can click task to view details
- [x] User can upload photo as proof
- [x] Task marked complete after photo upload
- [x] Completed tasks appear separately from pending
