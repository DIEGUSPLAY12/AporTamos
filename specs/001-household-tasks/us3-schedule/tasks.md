# Tasks: US3 — Weekly Task Schedule (P1)

**Status**: 🔄 EN PROGRESO — T062 y T063 pendientes  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Backend ✅

- [x] T050 [P] Create WeeklyTaskSchedule and Task Pydantic models in AporTamos-Backend/app/models/task.py
- [x] T051 [P] Create task service in AporTamos-Backend/app/services/task_service.py
- [x] T052 Implement POST /households/{id}/schedule endpoint in AporTamos-Backend/app/routers/tasks.py
- [x] T053 Implement PUT /households/{id}/schedule endpoint in AporTamos-Backend/app/routers/tasks.py
- [x] T054 [P] Implement GET /households/{id}/schedule endpoint in AporTamos-Backend/app/routers/tasks.py
- [x] T055 [P] Implement POST /households/{id}/schedule/tasks endpoint (add task to schedule)
- [x] T056 [P] Implement PUT /households/{id}/schedule/tasks/{task_id} endpoint (update task)
- [x] T057 [P] Add task assignment logic to create daily TaskAssignment records for each task

## Frontend ✅ (parcial)

- [x] T058 Create ScheduleEditor component in AporTamos-Frontend/components/task/ScheduleEditor.tsx
- [x] T059 [P] Create TaskForm component in AporTamos-Frontend/components/task/TaskForm.tsx
- [x] T060 [P] Create AssignmentSelector component in AporTamos-Frontend/components/task/AssignmentSelector.tsx
- [x] T061 [P] Create useTasks hook in AporTamos-Frontend/hooks/useTasks.ts

## Frontend ⬜ (pendientes)

- [ ] T062 Create ScheduleManagement screen in AporTamos-Frontend/app/(tabs)/[householdId]/schedule.tsx
  - Accesible solo para owners desde HouseholdDetail
  - Usa ScheduleEditor, TaskForm, AssignmentSelector
  - GET /households/{id}/schedule para cargar datos
  - POST/PUT /households/{id}/schedule/tasks para mutaciones

- [ ] T063 Add validation that explicit assignments have user_id and random assignments don't
  - Validar en TaskForm antes de submit
  - Mostrar error claro si explicit sin usuario seleccionado
  - Ocultar/deshabilitar user picker cuando assignment=random

**Checkpoint**: ⬜ US3 pendiente completar (T062, T063)

---

## Acceptance Scenarios Verification

- [ ] Can create weekly schedule with multiple days
- [ ] Can add tasks with names, descriptions, and effort weights
- [ ] Can assign task to specific user
- [ ] Can set task as random assignment
- [ ] Changes to schedule appear in user task lists
