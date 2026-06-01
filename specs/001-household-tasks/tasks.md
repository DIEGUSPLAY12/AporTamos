# Tasks: AporTamos — Household Task Management Platform

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  
**Testing**: NOT REQUIRED per AporTamos Constitution (Principle V)

---

## Índice de User Stories

| Carpeta | User Story | Tareas | Estado |
|---------|-----------|--------|--------|
| [00-setup/](00-setup/tasks.md) | Setup & Foundational Infrastructure | T001–T022 | ✅ Completo |
| [us1-auth/](us1-auth/tasks.md) | US1: Authentication (P1) | T023–T035 | ✅ Completo |
| [us2-households/](us2-households/tasks.md) | US2: Households (P1) | T036–T049 | ✅ Completo |
| [us3-schedule/](us3-schedule/tasks.md) | US3: Weekly Schedule (P1) | T050–T063 | ✅ Completo |
| [us4-completion/](us4-completion/tasks.md) | US4: Task Completion + Photo (P1) | T064–T078 | ✅ Completo |
| [us5-stats/](us5-stats/tasks.md) | US5: Statistics & Gamification (P2) | T079–T092 | ✅ Completo |
| [us6-chat/](us6-chat/tasks.md) | US6: Real-Time Chat (P2) | T093–T109 | ⬜ Pendiente |

---

## Próximas tareas

### Empezar US4 (siguiente sprint)

Ver [us4-completion/tasks.md](us4-completion/tasks.md): T064 → T065 → T066/T067/T068 → T069/T070 (backend), T071–T078 (frontend)

---

## Dependencias entre User Stories

```
00-setup (Foundation)
    ├── us1-auth
    │   └── us2-households
    │       └── us3-schedule
    │           └── us4-completion  ← MVP completo aquí
    │               └── us5-stats
    └── us6-chat (independiente, puede ir en paralelo con us4/us5)
```

---

## MVP Validation (después de US4)

1. ✅ User can register and login
2. ✅ User can create household and invite members
3. ✅ Owner can create weekly schedule with tasks
4. ⬜ User can view assigned tasks and complete with photo

---

## Estructura de carpetas

```
specs/001-household-tasks/
├── spec.md              ← Feature overview completa
├── plan.md              ← Plan técnico general
├── data-model.md        ← Entidades y relaciones
├── research.md          ← Decisiones técnicas investigadas
├── quickstart.md        ← Setup de desarrollo
├── contracts/           ← Contratos API, DB schema, real-time events
├── checklists/          ← Quality checklists
├── 00-setup/            ← spec + plan + tasks de infraestructura
├── us1-auth/            ← spec + plan + tasks de autenticación
├── us2-households/      ← spec + plan + tasks de households
├── us3-schedule/        ← spec + plan + tasks de schedules
├── us4-completion/      ← spec + plan + tasks de task completion
├── us5-stats/           ← spec + plan + tasks de statistics
└── us6-chat/            ← spec + plan + tasks de chat
```

**Total Tasks**: 109 (T001–T109) + 23 polish = 132
