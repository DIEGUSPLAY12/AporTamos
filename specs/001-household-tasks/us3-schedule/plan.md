# Plan: US3 — Weekly Task Schedule

**Ref**: [spec.md](spec.md) | [tasks.md](tasks.md)  
**Contratos**: [../contracts/api-endpoints.md](../contracts/api-endpoints.md)

---

## Flujo principal

```
Crear schedule:
  POST /households/{id}/schedule
    → solo owner
    → crea WeeklyTaskSchedule (version=1, active_from=today)
    → crea Task records
    → genera TaskAssignment records para el día de hoy
    → devuelve WeeklyTaskScheduleResponse

Consultar schedule:
  GET /households/{id}/schedule
    → cualquier miembro
    → devuelve schedule activo (active_until IS NULL) con tasks[]

Añadir tarea:
  POST /households/{id}/schedule/tasks
    → solo owner
    → crea Task dentro del schedule activo

Modificar tarea:
  PUT /households/{id}/schedule/tasks/{task_id}
    → solo owner
    → partial update (solo campos enviados)
```

## Algoritmo de asignación diaria (TaskAssignment)

Ejecutado en `task_service.generate_daily_assignments()` al crear el schedule y por pg_cron diariamente:

```
Para cada task del día de hoy (day_of_week == hoy):
  Si assignment_type == "explicit":
    → Crear TaskAssignment(assigned_to_user_id = task.assigned_user_id)
  Si assignment_type == "random":
    → Obtener lista de household_members
    → Seleccionar random.choice(members)
    → Crear TaskAssignment(assigned_to_user_id = miembro_elegido)
```

## Validaciones de integridad

- `assignment_type=explicit` + `assigned_user_id=null` → error 422
- `assignment_type=random` + `assigned_user_id!=null` → error 422
- Schedule activo duplicado → error 409 Conflict
- Usuario no owner intentando crear/modificar → error 403

## Archivos Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `app/models/task.py` | DayOfWeek, AssignmentType, TaskFrequency enums; TaskCreate, TaskResponse, WeeklyTaskScheduleResponse |
| `app/services/task_service.py` | create_schedule, get_schedule, add_task_to_schedule, update_task, generate_daily_assignments |
| `app/routers/tasks.py` | POST/GET/PUT /households/{id}/schedule, POST/PUT /schedule/tasks |

## Archivos Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `components/task/ScheduleEditor.tsx` | Vista semanal: 7 días, lista de tasks por día |
| `components/task/TaskForm.tsx` | Form: nombre, descripción, effort_weight (1-10), day_of_week, frequency |
| `components/task/AssignmentSelector.tsx` | Selector: "Assign to user" (picker) vs "Random" (toggle) |
| `hooks/useTasks.ts` | Fetch schedule + tasks, mutations (add, update) |
| `app/(tabs)/[householdId]/schedule.tsx` | Pantalla owner-only: ver + editar schedule ← **PENDIENTE T062** |

## Pendiente (T062, T063)

**T062** — Pantalla `schedule.tsx`:
- Accesible desde HouseholdDetail (solo visible para owner)
- Muestra el ScheduleEditor con los tasks actuales
- Permite añadir/editar tareas

**T063** — Validación en frontend:
- Si AssignmentSelector = explicit → user picker obligatorio
- Si AssignmentSelector = random → user picker oculto/deshabilitado
- Validar antes de submit del TaskForm
