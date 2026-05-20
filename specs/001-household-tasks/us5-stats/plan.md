# Plan: US5 — Statistics and Gamification

**Ref**: [spec.md](spec.md) | [tasks.md](tasks.md)

---

## Flujo de datos

```
Task completed (US4)
    ↓ TaskCompletion creado
    ↓ Supabase real-time → INSERT en task_completions
Frontend subscription
    ↓ useStats hook recibe evento
    ↓ recalcula completion_pct en tiempo real
Stats actualizados en UI (<5 segundos — SC-005)
```

## API Stats

```
GET /households/{id}/stats
  → {
      completion_pct: float,         # Σweight_done / Σweight_total × 100
      daily_streak: int,
      tasks_total: int,
      tasks_completed: int,
      members: [{ user_id, name, completion_pct }]
    }

GET /users/{id}/stats
  → {
      completion_pct: float,         # Solo tareas del usuario
      daily_streak: int,             # Streak personal
      tasks_today: int,
      tasks_completed_today: int
    }
```

## Archivos Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `app/services/gamification_service.py` | calculate_completion_pct(), calculate_streak(), get_household_stats(), get_user_stats() |
| `app/routers/stats.py` | GET /households/{id}/stats, GET /users/{id}/stats |

## Archivos Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `components/stats/UserStatsWidget.tsx` | Widget compacto: completion % + streak counter |
| `components/stats/HouseholdStats.tsx` | Stats del household: completion % + streak + lista miembros |
| `components/stats/StreakDisplay.tsx` | Display animado del streak (🔥 + número + celebración en milestones) |
| `components/stats/ProgressBar.tsx` | Barra de progreso visual (0-100%) |
| `components/household/MembersSection.tsx` | Lista de miembros con sus stats individuales |
| `hooks/useStats.ts` | Fetch stats + subscribe a task_completions real-time |
| `app/(tabs)/index.tsx` | Añadir UserStatsWidget al home screen |
| `components/household/HouseholdHeader.tsx` | Añadir HouseholdStats (streak + completion %) |

## Real-time

El hook `useStats.ts` usa la suscripción a `task_completions` (ya configurada en Phase 2) para:
1. Recibir INSERT events cuando alguien completa una tarea
2. Llamar a `refetch()` del endpoint de stats
3. Actualizar UI en <5 segundos (SC-005)

## Streak milestones (UX)

Celebración visual en `StreakDisplay` cuando se alcanzan:
- 7 días (1 semana)
- 30 días (1 mes)
- 100 días
