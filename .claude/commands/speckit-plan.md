Lee CLAUDE.md y `.specify/memory/constitution.md` antes de ejecutar este comando.

## Descripción

Ejecuta el flujo de planificación técnica usando la plantilla de plan para generar los artefactos de diseño.

## Input del usuario

```text
$ARGUMENTS
```

## Pre-Execution: Hooks

Comprueba entradas bajo `hooks.before_plan` en `.specify/extensions.yml`. Aplica la misma lógica de hooks que en `/speckit-specify`.

## Outline

1. **Setup**: Ejecuta `.specify/scripts/bash/setup-plan.sh --json` desde la raíz del repo y parsea JSON para `FEATURE_SPEC`, `IMPL_PLAN`, `SPECS_DIR`, `BRANCH`.

2. **Carga contexto**: Lee `FEATURE_SPEC` y `.specify/memory/constitution.md`. Carga la plantilla `IMPL_PLAN` (ya copiada).

3. **Ejecuta el flujo de plan**: Sigue la estructura de la plantilla `IMPL_PLAN`:
   - Rellena Technical Context (marca desconocidos como "NEEDS CLARIFICATION")
   - Rellena la sección Constitution Check desde la constitución
   - Evalúa gates (ERROR si hay violaciones no justificadas)
   - **Fase 0**: Genera `research.md` (resuelve todos los NEEDS CLARIFICATION)
   - **Fase 1**: Genera `data-model.md`, `contracts/`, `quickstart.md`
   - **Fase 1**: Actualiza el contexto del agente
   - Re-evalúa Constitution Check post-diseño

4. **Para y reporta**: El comando termina después de la Fase 1 de planificación. Reporta branch, ruta de `IMPL_PLAN` y artefactos generados.

## Fases de planificación

### Fase 0: Outline & Research

1. **Extrae desconocidos del Technical Context**:
   - Para cada NEEDS CLARIFICATION → tarea de investigación
   - Para cada dependencia → tarea de mejores prácticas
   - Para cada integración → tarea de patrones

2. **Consolida hallazgos** en `research.md` con este formato:
   - Decisión: [qué se eligió]
   - Razonamiento: [por qué se eligió]
   - Alternativas consideradas: [qué más se evaluó]

**Output**: `research.md` con todos los NEEDS CLARIFICATION resueltos

### Fase 1: Diseño & Contratos

**Prerequisito**: `research.md` completo

1. **Extrae entidades de la spec** → `data-model.md`:
   - Nombre de entidad, campos, relaciones
   - Reglas de validación desde los requisitos
   - Transiciones de estado si aplica

2. **Define contratos de interfaz** (si el proyecto tiene interfaces externas) → `/contracts/`:
   - Identifica qué interfaces expone el proyecto
   - Documenta el formato de contrato apropiado para el tipo de proyecto
   - Ejemplos: APIs públicas, esquemas de comandos CLI, endpoints de servicios web

3. **Actualización del contexto del agente**:
   - Actualiza la referencia del plan entre los marcadores `<!-- SPECKIT START -->` y `<!-- SPECKIT END -->` en `.github/copilot-instructions.md` para apuntar al archivo del plan

**Output**: `data-model.md`, `/contracts/*`, `quickstart.md`, archivo de contexto actualizado

## Reglas clave

- Usa rutas absolutas para operaciones del sistema de archivos; rutas relativas al proyecto para referencias en documentación
- ERROR en fallos de gate o clarificaciones no resueltas
- Respeta los principios de la constitución (sin testing, commits a main, dependencias mínimas)

## Post-Execution: Hooks

Comprueba entradas bajo `hooks.after_plan` en `.specify/extensions.yml` y aplica la misma lógica de hooks.
