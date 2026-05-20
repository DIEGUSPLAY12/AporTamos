Lee CLAUDE.md y `.specify/memory/constitution.md` antes de ejecutar este comando.

## Descripción

Genera un `tasks.md` accionable y ordenado por dependencias para la feature activa, basado en los artefactos de diseño disponibles.

## Input del usuario

```text
$ARGUMENTS
```

## Pre-Execution: Hooks

Comprueba entradas bajo `hooks.before_tasks` en `.specify/extensions.yml`. Aplica la misma lógica de hooks que en `/speckit-specify`.

## Outline

1. **Setup**: Ejecuta `.specify/scripts/bash/setup-tasks.sh --json` desde la raíz del repo y parsea `FEATURE_DIR`, `TASKS_TEMPLATE` y la lista `AVAILABLE_DOCS`.

2. **Carga documentos de diseño** desde `FEATURE_DIR`:
   - **Requerido**: `plan.md` (tech stack, librerías, estructura), `spec.md` (user stories con prioridades)
   - **Opcional**: `data-model.md`, `contracts/`, `research.md`, `quickstart.md`

3. **Flujo de generación de tareas**:
   - Carga `plan.md` y extrae tech stack, librerías, estructura del proyecto
   - Carga `spec.md` y extrae user stories con prioridades (P1, P2, P3...)
   - Si `data-model.md` existe: extrae entidades y mapea a user stories
   - Si `contracts/` existe: mapea contratos a user stories
   - Si `research.md` existe: extrae decisiones para tareas de setup
   - Genera tareas organizadas por user story
   - Genera grafo de dependencias
   - Valida completitud (cada user story tiene todas las tareas necesarias, verificable independientemente)

4. **Genera `tasks.md`**: Lee la plantilla desde `TASKS_TEMPLATE` (o `.specify/templates/tasks-template.md` como fallback). Rellena con:
   - Nombre correcto de feature desde `plan.md`
   - Fase 1: Tareas de setup (inicialización del proyecto)
   - Fase 2: Tareas fundacionales (prerrequisitos bloqueantes para todas las user stories)
   - Fase 3+: Una fase por user story (en orden de prioridad desde `spec.md`)
   - Fase final: Polish & cross-cutting concerns
   - Todas las tareas en formato checklist estricto

5. **Reporta**:
   - Ruta al `tasks.md` generado
   - Total de tareas
   - Tareas por user story
   - Oportunidades de paralelización identificadas
   - Criterios de test independientes por story
   - Alcance MVP sugerido (típicamente solo User Story 1)

## Reglas de generación de tareas

**CRÍTICO**: Las tareas DEBEN organizarse por user story para habilitar implementación y testing independientes.

**Los tests son OPCIONALES**: Solo genera tareas de test si se solicitan explícitamente en la spec o si el usuario pide TDD.

### Formato de checklist (REQUERIDO)

Cada tarea DEBE seguir este formato:

```text
- [ ] [TaskID] [P?] [Story?] Descripción con ruta de archivo
```

**Componentes**:
1. **Checkbox**: Siempre empieza con `- [ ]`
2. **Task ID**: Número secuencial (T001, T002...) en orden de ejecución
3. **[P] marker**: Solo si la tarea es paralelizable (archivos distintos, sin dependencias incompletas)
4. **[Story] label**: Requerido para tareas de fase de user story (`[US1]`, `[US2]`, etc.)
   - Fase Setup: SIN story label
   - Fase Foundational: SIN story label
   - Fases User Story: DEBEN tener story label
   - Fase Polish: SIN story label
5. **Descripción**: Acción clara con ruta exacta del archivo

**Ejemplos**:
- ✅ `- [ ] T001 Create project structure per implementation plan`
- ✅ `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ `- [ ] Create User model` (sin ID ni Story label)
- ❌ `T001 [US1] Create model` (sin checkbox)

### Estructura de fases

- **Fase 1**: Setup (inicialización del proyecto)
- **Fase 2**: Foundational (prerrequisitos bloqueantes — DEBEN completarse antes de las user stories)
- **Fase 3+**: User Stories en orden de prioridad (P1, P2, P3...)
  - Dentro de cada story: Modelos → Servicios → Endpoints → Integración
  - Cada fase debe ser un incremento completo, verificable independientemente
- **Fase final**: Polish & Cross-Cutting Concerns

## Post-Execution: Hooks

Comprueba entradas bajo `hooks.after_tasks` en `.specify/extensions.yml` y aplica la misma lógica de hooks.
