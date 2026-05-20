# Spec: US3 — View and Configure Weekly Task Schedule (P1)

**Prioridad**: P1 — MVP  
**Status**: 🔄 En progreso (T062–T063 pendientes)  
**Requiere**: [00-setup](../00-setup/) completado (DB con tablas tasks, weekly_task_schedules, task_assignments)

---

## User Story

Household managers must be able to create, modify, and assign weekly task schedules to define what chores need to be completed each day.

**Why this priority**: The task schedule is fundamental to the entire system's purpose. Without tasks defined, there's nothing to track or gamify.

**Independent Test**: Can be fully tested by creating a household, defining a weekly schedule with multiple tasks, and verifying tasks appear in user task lists.

---

## Acceptance Scenarios

1. **Given** I am on the household management page, **When** I click "Create Weekly Schedule", **Then** I see a form to define tasks for each day of the week
2. **Given** I am creating a schedule, **When** I add a task (e.g., "Wash dishes") with effort weight, **Then** the task is saved with its point value
3. **Given** I have a task in the schedule, **When** I assign it to a specific user, **Then** it appears in their task list for that day
4. **Given** I have a task in the schedule, **When** I mark it as "Random Assignment" with daily frequency, **Then** the system assigns it randomly to a user each day
5. **Given** I am on the household page, **When** I modify an existing schedule, **Then** changes are reflected in user task lists

---

## Functional Requirements

- **FR-004**: System MUST support explicit task assignment (assign specific task to specific user)
- **FR-005**: System MUST support random daily task assignment (distribute task randomly to any member each day)
- **FR-011**: System MUST support weighted task scoring where each task has an assigned effort value (points)
- **FR-012**: System MUST calculate household progress percentage based on weighted task scores, not task count
- **FR-017**: System MUST create and persist weekly task schedules with tasks assigned to specific days
- **FR-018**: System MUST allow modification of task schedules after creation

---

## Key Entities

**WeeklyTaskSchedule**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| household_id | UUID | FK → households |
| version | integer | Incrementa con cada modificación |
| active_from | date | Inicio de vigencia |
| active_until | date, nullable | Null = activo |
| created_at | timestamp | — |

**Task**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| schedule_id | UUID | FK → weekly_task_schedules |
| name | string | 1-100 chars |
| description | text, nullable | — |
| day_of_week | enum | MON-SUN |
| effort_weight | integer | 1-10 (puntos) |
| assignment_type | enum | `explicit` \| `random` |
| assigned_user_id | UUID, nullable | Solo para explicit |
| frequency | enum | `daily` \| `weekly` |

**TaskAssignment** (instancia diaria de cada task)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| task_id | UUID | FK → tasks |
| household_id | UUID | FK → households |
| assigned_to_user_id | UUID | FK → users |
| assignment_date | date | Fecha específica |
| is_completed | boolean | Default false |

---

## Edge Cases

- Solo puede existir un schedule activo por household a la vez
- Si assignment_type=explicit, assigned_user_id es obligatorio
- Si assignment_type=random, assigned_user_id debe ser null
- Random assignment: selección aleatoria justa entre todos los miembros del household
- Si el household tiene 0 tareas asignadas para un día: el streak no puede incrementar ese día
