Lee CLAUDE.md y `.specify/memory/constitution.md` antes de ejecutar este comando.

## Descripción

Análisis de consistencia y calidad entre los tres artefactos principales (`spec.md`, `plan.md`, `tasks.md`). **Solo lectura — no modifica ningún archivo.**

## Input del usuario

```text
$ARGUMENTS
```

## Pre-Execution: Hooks

Comprueba entradas bajo `hooks.before_analyze` en `.specify/extensions.yml`. Aplica la misma lógica de hooks que en `/speckit-specify`.

## Objetivo

Identificar inconsistencias, duplicaciones, ambigüedades e ítems infra-especificados entre los tres artefactos principales ANTES de la implementación. Este comando DEBE ejecutarse solo después de que `/speckit-tasks` haya producido un `tasks.md` completo.

## Restricciones de operación

**ESTRICTAMENTE SOLO LECTURA**: No modifiques ningún archivo. Produce un reporte de análisis estructurado. Ofrece un plan de remediación opcional (el usuario debe aprobarlo explícitamente antes de que cualquier edición sea invocada manualmente).

**Autoridad de la constitución**: La constitución del proyecto (`.specify/memory/constitution.md`) es **no-negociable**. Los conflictos con la constitución son automáticamente CRÍTICOS.

## Pasos de ejecución

### 1. Inicializa el contexto de análisis

Ejecuta `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` desde la raíz del repo y parsea JSON para `FEATURE_DIR` y `AVAILABLE_DOCS`. Deriva rutas absolutas:

- SPEC = FEATURE_DIR/spec.md
- PLAN = FEATURE_DIR/plan.md
- TASKS = FEATURE_DIR/tasks.md

Aborta si algún archivo requerido falta.

### 2. Carga artefactos (Disclosure progresivo)

**Desde spec.md**: Overview, Functional Requirements, Success Criteria, User Stories, Edge Cases

**Desde plan.md**: Decisiones de arquitectura/stack, referencias al Data Model, fases, restricciones técnicas

**Desde tasks.md**: IDs de tareas, descripciones, agrupación por fases, marcadores paralelos [P], rutas de archivos referenciadas

**Desde la constitución**: Carga para validación de principios

### 3. Construye modelos semánticos

Crea representaciones internas (no incluyas artefactos raw en el output):

- **Inventario de requisitos**: Para cada Functional Requirement (FR-###) y Success Criterion (SC-###), registra clave estable
- **Inventario de user stories**: Acciones discretas del usuario con criterios de aceptación
- **Mapeo de cobertura de tareas**: Mapea cada tarea a uno o más requisitos o stories
- **Reglas de la constitución**: Extrae nombres de principios y afirmaciones normativas MUST/SHOULD

### 4. Pasadas de detección (análisis eficiente)

Límite de 50 hallazgos totales; resume el resto en overflow.

#### A. Detección de duplicaciones
- Identifica requisitos casi duplicados
- Marca la redacción de menor calidad para consolidación

#### B. Detección de ambigüedad
- Adjetivos vagos sin criterios medibles (rápido, escalable, seguro, intuitivo, robusto)
- Placeholders no resueltos (TODO, TKTK, ???, `<placeholder>`)

#### C. Infra-especificación
- Requisitos con verbos pero sin objeto o resultado medible
- User stories sin alineación de criterios de aceptación
- Tareas referenciando archivos o componentes no definidos en spec/plan

#### D. Alineación con la constitución
- Cualquier requisito o elemento del plan que conflictúe con un principio MUST
- Secciones obligatorias o quality gates faltantes de la constitución

#### E. Brechas de cobertura
- Requisitos sin tareas asociadas
- Tareas sin requisito/story mapeado
- Success Criteria que requieren trabajo buildable no reflejado en tareas

#### F. Inconsistencias
- Deriva de terminología (mismo concepto nombrado diferente entre archivos)
- Entidades de datos referenciadas en plan pero ausentes en spec (o viceversa)
- Contradicciones en orden de tareas
- Requisitos conflictivos

### 5. Asignación de severidad

- **CRITICAL**: Viola MUST de la constitución, artefacto de spec core faltante, o requisito sin cobertura que bloquea funcionalidad base
- **HIGH**: Requisito duplicado o conflictivo, atributo de seguridad/performance ambiguo, criterio de aceptación no verificable
- **MEDIUM**: Deriva de terminología, cobertura de tareas no funcionales faltante, edge case infra-especificado
- **LOW**: Mejoras de estilo/redacción, redundancia menor sin impacto en ejecución

### 6. Produce reporte de análisis compacto

Output en Markdown (sin escritura de archivos) con esta estructura:

```markdown
## Reporte de Análisis de Especificación

| ID | Categoría | Severidad | Ubicación | Resumen | Recomendación |
|----|-----------|-----------|-----------|---------|---------------|
| A1 | Duplicación | HIGH | spec.md:L120-134 | Dos requisitos similares... | Fusionar redacción |

**Tabla de cobertura:**

| Clave de Requisito | ¿Tiene tarea? | IDs de tarea | Notas |
|-------------------|---------------|--------------|-------|

**Problemas de alineación con la constitución:** (si los hay)

**Tareas sin mapear:** (si las hay)

**Métricas:**
- Total de requisitos
- Total de tareas
- Cobertura % (requisitos con ≥1 tarea)
- Conteo de ambigüedades
- Conteo de duplicaciones
- Conteo de issues críticos
```

### 7. Proporciona Next Actions

- Si hay issues CRÍTICOS: recomienda resolverlos antes de `/speckit-implement`
- Si solo hay LOW/MEDIUM: el usuario puede proceder, pero proporciona sugerencias
- Proporciona sugerencias de comandos explícitas

### 8. Ofrece remediación

Pregunta al usuario: "¿Deseas que sugiera ediciones de remediación concretas para los top N issues?" (NO las apliques automáticamente.)

## Principios de operación

- **NUNCA modifiques archivos**
- **NUNCA alucines secciones faltantes** — si están ausentes, repórtalas con precisión
- **Prioriza violaciones de la constitución** (siempre son CRITICAL)
- **Cero issues**: emite reporte de éxito con estadísticas de cobertura

## Post-Execution: Hooks

Comprueba entradas bajo `hooks.after_analyze` en `.specify/extensions.yml` y aplica la misma lógica de hooks.
