Lee CLAUDE.md y `.specify/memory/constitution.md` antes de ejecutar este comando.

## Descripción

Detecta y reduce ambigüedades en la spec activa haciendo hasta 5 preguntas de clarificación y codifica las respuestas directamente en la spec.

## Input del usuario

```text
$ARGUMENTS
```

## Pre-Execution: Hooks

Comprueba entradas bajo `hooks.before_clarify` en `.specify/extensions.yml`. Aplica la misma lógica de hooks que en `/speckit-specify`.

## Outline

**Objetivo**: Detectar y reducir ambigüedades o puntos de decisión faltantes en la especificación activa.

**Nota**: Este flujo se ejecuta ANTES de invocar `/speckit-plan`. Si el usuario indica explícitamente que omite la clarificación, puedes proceder, pero advierte que el riesgo de retrabajo aumenta.

### Pasos de ejecución

1. **Setup**: Ejecuta `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` desde la raíz del repo y parsea los campos JSON:
   - `FEATURE_DIR`
   - `FEATURE_SPEC`
   - Si el parseo falla: aborta e instruye al usuario a ejecutar `/speckit-specify` o verificar el entorno.

2. **Carga la spec** y realiza un escaneo de ambigüedades por taxonomía. Para cada categoría, marca: Clear / Partial / Missing.

   Categorías a escanear:
   - Alcance & Comportamiento funcional (objetivos de usuario, declaraciones fuera de alcance, roles/personas)
   - Dominio & Modelo de datos (entidades, ciclo de vida, volumen)
   - Flujo de interacción & UX (journeys críticos, estados de error/vacío/carga)
   - Atributos de calidad no funcionales (performance, escalabilidad, seguridad, compliance)
   - Integración & Dependencias externas (servicios externos, formatos)
   - Edge Cases & Manejo de errores (escenarios negativos, conflictos)
   - Restricciones & Tradeoffs
   - Terminología & Consistencia
   - Señales de completitud (criterios de aceptación, DoD)
   - Misc / Placeholders (TODO, términos vagos sin cuantificar)

3. **Genera una cola priorizada** de hasta 5 preguntas de clarificación. NO las muestre todas a la vez.

   Restricciones:
   - Máximo 5 preguntas en toda la sesión
   - Cada pregunta debe poder responderse con opciones múltiples (2-5) O una respuesta corta (≤5 palabras)
   - Solo incluye preguntas cuyas respuestas impacten arquitectura, datos, tareas, UX u operaciones
   - Cubre las categorías de mayor impacto primero

4. **Bucle de preguntas secuencial** (interactivo):
   - Presenta EXACTAMENTE UNA pregunta a la vez
   - Para preguntas de opción múltiple:
     - Analiza las opciones e indica la **opción recomendada** con razonamiento (1-2 frases)
     - Formato: `**Recomendado:** Opción [X] - <razonamiento>`
     - Muestra las opciones en tabla Markdown:

     | Opción | Descripción |
     |--------|-------------|
     | A | <descripción A> |
     | B | <descripción B> |
     | Otra | Proporciona una respuesta corta (≤5 palabras) |

     - Indica: `Puedes responder con la letra (ej. "A"), aceptar la recomendación con "sí" o "recomendado", o dar tu propia respuesta corta.`
   - Para respuestas cortas: ofrece una sugerencia con razonamiento
   - Detente cuando: ambigüedades críticas resueltas / usuario dice "listo" / 5 preguntas alcanzadas
   - Nunca reveles preguntas futuras

5. **Integración después de CADA respuesta aceptada**:
   - Mantén representación en memoria de la spec
   - Primera respuesta integrada: crea sección `## Clarifications` con `### Session YYYY-MM-DD`
   - Añade bullet: `- Q: <pregunta> → A: <respuesta>`
   - Aplica la clarificación en la sección apropiada de la spec:
     - Ambigüedad funcional → Functional Requirements
     - Interacción/actor → User Stories o Actors
     - Datos → Data Model
     - No funcional → Success Criteria
     - Edge case → Edge Cases / Error Handling
     - Terminología → Normaliza en todo el documento
   - Guarda la spec DESPUÉS de cada integración (sobrescritura atómica)

6. **Validación** (después de cada escritura):
   - Sin duplicados en la sección de clarificaciones
   - Total de preguntas ≤ 5
   - Sin placeholders vagos que la respuesta debía resolver
   - Sin afirmaciones contradictorias anteriores
   - Estructura Markdown válida

7. **Escribe la spec actualizada** en `FEATURE_SPEC`.

8. **Reporta la finalización**:
   - Número de preguntas hechas y respondidas
   - Ruta de la spec actualizada
   - Secciones modificadas
   - Tabla resumen de cobertura por categoría (Resolved / Deferred / Clear / Outstanding)
   - Si quedan Outstanding/Deferred, recomienda si proceder a `/speckit-plan` o repetir `/speckit-clarify`

**Reglas de comportamiento**:
- Si no se encuentran ambigüedades significativas: responde "No se detectaron ambigüedades críticas" y sugiere proceder
- Si la spec no existe: instruye a ejecutar `/speckit-specify` primero
- Respeta señales de terminación temprana del usuario ("para", "listo", "procede")

## Post-Execution: Hooks

Comprueba entradas bajo `hooks.after_clarify` en `.specify/extensions.yml` y aplica la misma lógica de hooks.
