# Spec: US5 — Household Statistics and Personal Progress (P2)

**Prioridad**: P2 — Post-MVP  
**Status**: ⬜ Pendiente  
**Requiere**: [US4 Completion](../us4-completion/) completado (TaskCompletion records existen)

---

## User Story

Users need to see their daily task completion percentage, current streak, and household overview to track collective progress and stay motivated.

**Why this priority**: Statistics and progress visualization are critical for gamification engagement. This directly drives user motivation without blocking core functionality.

**Independent Test**: Can be fully tested by completing tasks and verifying correct calculations appear on home page and household page.

---

## Acceptance Scenarios

1. **Given** I am on the home page, **When** I view my statistics widget, **Then** I see my daily task completion percentage
2. **Given** I am on the home page, **When** I view my statistics widget, **Then** I see my current streak count
3. **Given** I am on a household page, **When** I view the household header, **Then** I see the household's current daily streak
4. **Given** the household completes all tasks, **When** I view the stats next day, **Then** the streak increments and resets to 0% completion
5. **Given** I am on the household page, **When** I view the members section, **Then** I see all household members listed

---

## Functional Requirements

- **FR-008**: System MUST calculate household completion percentage based on assigned tasks and completions each day
- **FR-009**: System MUST track and display daily streak (increments when household reaches 100% completion, resets to 0% next day)
- **FR-010**: System MUST display user statistics: daily completion percentage and current streak
- **FR-011**: System MUST support weighted task scoring (effort_weight)
- **FR-012**: System MUST calculate progress percentage based on weighted scores, NOT task count

---

## Fórmula de progreso

```
completion_pct = (Σ effort_weight de tareas completadas / Σ effort_weight de tareas asignadas) × 100
```

**Ejemplo**: 3 tareas asignadas con pesos [3, 5, 2]. Usuario completa las de peso 3 y 2.
```
completion_pct = (3 + 2) / (3 + 5 + 2) × 100 = 5/10 × 100 = 50%
```

## Lógica de streak

- **Increment**: Si `completion_pct == 100%` al final del día → `daily_streak += 1`
- **Reset**: Al inicio de cada día nuevo → `completion_pct = 0%` (nuevas asignaciones)
- **Horario**: Cálculo ejecutado por pg_cron a las 12:05 AM UTC (ver [00-setup](../00-setup/))
- **Timezone**: Calculado en el timezone configurado del household

---

## Success Criteria

- **SC-005**: System displays accurate household completion percentage that updates within 5 seconds of task completion
