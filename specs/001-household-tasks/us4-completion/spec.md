# Spec: US4 — View Personal Tasks and Complete Them with Photo Proof (P1)

**Prioridad**: P1 — MVP (última pieza del core loop)  
**Status**: ⬜ Pendiente  
**Requiere**: [US3 Schedule](../us3-schedule/) completado (TaskAssignment records existen)

---

## User Story

Users must see their assigned tasks and mark them complete by submitting a photo as proof of completion, driving engagement through tangible verification.

**Why this priority**: Task completion is the core interaction loop of the app. Without this, the gamification system cannot function.

**Independent Test**: Can be fully tested by viewing assigned tasks, attempting to mark a task complete with a photo, and verifying task appears in completed list.

---

## Acceptance Scenarios

1. **Given** I am on the home page, **When** I click on a household, **Then** I see "My Tasks" section showing my pending tasks for today
2. **Given** I have pending tasks, **When** I click a task, **Then** I can see the task details and a button to mark as complete
3. **Given** I am marking a task complete, **When** I upload a photo as proof, **Then** the task is marked complete and the photo is stored
4. **Given** I have completed tasks, **When** I view the task list, **Then** completed tasks are shown separately from pending tasks
5. **Given** the household reaches 100% task completion, **When** I view the household page, **Then** the daily streak increments by 1

---

## Functional Requirements

- **FR-006**: System MUST display user's daily task list with pending and completed tasks
- **FR-007**: System MUST allow users to mark tasks complete by uploading a photo as proof
- **FR-008**: System MUST calculate household completion percentage based on assigned tasks and completions each day
- **FR-009**: System MUST track and display daily streak (increments when 100% completion, resets next day)
- **FR-019**: System MUST validate that task completion requires a photo submission
- **FR-020**: System MUST handle and store photo evidence of task completion

---

## Key Entity

**TaskCompletion**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| assignment_id | UUID | FK → task_assignments |
| user_id | UUID | FK → users |
| photo_url | string | URL en Supabase Storage |
| completed_at | timestamp | — |

---

## Constraints

- **Foto obligatoria**: No se puede marcar tarea completa sin foto
- **Tamaño máximo**: 5MB por imagen
- **Compresión**: JPEG al 80% de calidad antes de subir
- **Storage path**: `task-proofs/{household_id}/{task_id}/{assignment_id}.jpg`

---

## Edge Cases

- Foto upload falla → tarea permanece pendiente (no se marca completa hasta upload exitoso)
- Usuario offline → photo upload se encola y reintenta al reconectar
- Household con 0 tareas asignadas → streak no puede incrementar ese día
