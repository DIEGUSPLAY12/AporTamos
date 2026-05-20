Lee CLAUDE.md y `.specify/memory/constitution.md` antes de ejecutar este comando.

## Descripción

Genera una checklist personalizada para la feature activa basada en los requisitos del usuario. Las checklists son **"unit tests del inglés"** — validan la calidad, claridad y completitud de los *requisitos escritos*, no la implementación.

## Input del usuario

```text
$ARGUMENTS
```

## Concepto crítico: "Unit Tests for English"

Las checklists validan la **calidad de los requisitos escritos**, NO la implementación.

**NO es para**:
- ❌ "Verifica que el botón funciona correctamente"
- ❌ "Confirma que la API devuelve 200"

**SÍ es para**:
- ✅ "¿Están definidos los requisitos de jerarquía visual para todos los tipos de card?" [Completitud]
- ✅ "¿Está 'visualización prominente' cuantificado con tamaño/posicionamiento específico?" [Claridad]
- ✅ "¿Son los requisitos de estado hover consistentes en todos los elementos interactivos?" [Consistencia]

## Pre-Execution: Hooks

Comprueba entradas bajo `hooks.before_checklist` en `.specify/extensions.yml`. Aplica la misma lógica de hooks que en `/speckit-specify`.

## Pasos de ejecución

1. **Setup**: Ejecuta `.specify/scripts/bash/check-prerequisites.sh --json` desde la raíz del repo y parsea `FEATURE_DIR` y la lista `AVAILABLE_DOCS`.

2. **Clarifica la intención** (dinámico): Genera hasta 3 preguntas contextuales de clarificación. DEBEN:
   - Generarse desde la redacción del usuario + señales extraídas de spec/plan/tasks
   - Solo preguntar sobre información que cambia materialmente el contenido de la checklist
   - Omitirse individualmente si ya son claras en `$ARGUMENTS`

   Algoritmo de generación:
   1. Extrae señales: palabras clave del dominio (auth, latency, UX, API), indicadores de riesgo, hints de stakeholders
   2. Agrupa señales en áreas de enfoque candidatas (máx. 4) ordenadas por relevancia
   3. Identifica audiencia probable y momento (autor, revisor, QA, release)
   4. Detecta dimensiones faltantes: alcance, profundidad, énfasis en riesgos, exclusiones
   5. Formula preguntas de estos arquetipos:
      - Refinamiento de alcance
      - Priorización de riesgos
      - Calibración de profundidad
      - Encuadre de audiencia
      - Exclusión de límites

3. **Comprende la solicitud del usuario**: Combina `$ARGUMENTS` + respuestas de clarificación:
   - Deriva el tema de la checklist (ej. security, review, deploy, ux)
   - Consolida ítems explícitos mencionados por el usuario
   - Infiere contexto faltante desde spec/plan/tasks (NO alucines)

4. **Carga el contexto de la feature** desde `FEATURE_DIR`:
   - `spec.md`: Requisitos y alcance
   - `plan.md` (si existe): Detalles técnicos, dependencias
   - `tasks.md` (si existe): Tareas de implementación

5. **Genera la checklist**:
   - Crea `FEATURE_DIR/checklists/` si no existe
   - Genera nombre de archivo único basado en el dominio (ej. `ux.md`, `api.md`, `security.md`)
   - Si el archivo NO existe: crea nuevo empezando con CHK001
   - Si el archivo existe: añade ítems continuando desde el último ID (CHK015 → CHK016)
   - **Nunca elimines o reemplaces contenido de checklist existente**

   **PRINCIPIO CORE**: Cada ítem debe evaluar los REQUISITOS en sí por:
   - **Completitud**: ¿Están presentes todos los requisitos necesarios?
   - **Claridad**: ¿Son los requisitos específicos y sin ambigüedad?
   - **Consistencia**: ¿Se alinean los requisitos entre sí?
   - **Medibilidad**: ¿Pueden verificarse objetivamente?
   - **Cobertura**: ¿Se abordan todos los escenarios/edge cases?

   **Estructura de categorías**:
   - Completitud de Requisitos
   - Claridad de Requisitos
   - Consistencia de Requisitos
   - Calidad de Criterios de Aceptación
   - Cobertura de Escenarios
   - Cobertura de Edge Cases
   - Requisitos No Funcionales (Performance, Seguridad, Accesibilidad)
   - Dependencias & Suposiciones
   - Ambigüedades & Conflictos

   **Estructura de cada ítem**:
   - Formato de pregunta sobre calidad del requisito
   - Enfocado en lo que está ESCRITO (o no) en la spec/plan
   - Incluye dimensión de calidad en corchetes [Completitud/Claridad/Consistencia/etc.]
   - Referencia sección de spec `[Spec §X.Y]` cuando verifica requisitos existentes
   - Usa marcador `[Gap]` cuando verifica requisitos faltantes

   **🚫 PROHIBIDO** (hacen del ítem un test de implementación):
   - ❌ "Verifica que...", "Confirma que...", "Comprueba que..." + comportamiento de implementación
   - ❌ Referencias a ejecución de código, acciones del usuario, comportamiento del sistema
   - ❌ "Se muestra correctamente", "funciona bien"

   **✅ REQUERIDO** (estos testean calidad de requisitos):
   - ✅ "¿Están [tipo de requisito] definidos/especificados para [escenario]?"
   - ✅ "¿Está [término vago] cuantificado con criterios específicos?"
   - ✅ "¿Son los requisitos consistentes entre [sección A] y [sección B]?"

6. **Sigue la plantilla**: Genera la checklist siguiendo la plantilla en `.specify/templates/checklist-template.md`. Si no está disponible: usa H1 título, secciones `##`, ítems `- [ ] CHK### <ítem>` con IDs incrementales globales desde CHK001.

7. **Reporta**: Ruta completa al archivo de checklist, conteo de ítems, y si se creó un archivo nuevo o se añadió a uno existente.

## Post-Execution: Hooks

Comprueba entradas bajo `hooks.after_checklist` en `.specify/extensions.yml` y aplica la misma lógica de hooks.
