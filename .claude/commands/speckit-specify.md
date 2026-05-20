Lee CLAUDE.md y `.specify/memory/constitution.md` antes de ejecutar este comando.

## Descripción

Crea o actualiza la especificación de una feature a partir de una descripción en lenguaje natural.

## Input del usuario

```text
$ARGUMENTS
```

Debes considerar el input del usuario antes de proceder (si no está vacío).

## Pre-Execution: Hooks

Comprueba si `.specify/extensions.yml` existe. Si existe, lee las entradas bajo `hooks.before_specify`.
Filtra hooks con `enabled: false`. Para cada hook ejecutable sin `condition`, muestra:
- Si `optional: true`: informa al usuario del hook opcional y el comando para ejecutarlo
- Si `optional: false`: ejecuta el comando del hook antes de continuar

## Outline

El texto que el usuario escribió después de `/speckit-specify` **es** la descripción de la feature. Asume que siempre está disponible en `$ARGUMENTS`.

1. **Genera un nombre corto** (2-4 palabras) para la feature:
   - Formato acción-sustantivo: "add-user-auth", "fix-payment-bug"
   - Preserva términos técnicos (OAuth2, API, JWT)

2. **Crea el directorio de la feature**:
   - Lee `.specify/feature.json` para ver si hay feature activa
   - Lee `.specify/init-options.json` para `branch_numbering` (sequential/timestamp)
   - Si `sequential`: prefijo `NNN` (siguiente número disponible en `specs/`)
   - Si `timestamp`: prefijo `YYYYMMDD-HHMMSS`
   - Directorio: `specs/<prefijo>-<nombre-corto>/`
   - Copia `.specify/templates/spec-template.md` a `<dir>/spec.md`
   - Actualiza `.specify/feature.json`:
     ```json
     { "feature_directory": "specs/<dir>" }
     ```

3. **Carga la plantilla**: Lee `.specify/templates/spec-template.md` para entender las secciones requeridas.

4. **Flujo de ejecución**:
   1. Parsea la descripción del usuario desde `$ARGUMENTS`
      Si está vacío: ERROR "No feature description provided"
   2. Extrae conceptos clave: actores, acciones, datos, restricciones
   3. Para aspectos poco claros: haz suposiciones informadas y márcalos con `[NEEDS CLARIFICATION: pregunta específica]`
      **LÍMITE: Máximo 3 marcadores [NEEDS CLARIFICATION] en total**
   4. Rellena User Scenarios & Testing
   5. Genera Functional Requirements (cada uno debe ser verificable)
   6. Define Success Criteria (medibles, sin detalles de implementación)
   7. Identifica Key Entities (si hay datos involucrados)

5. **Escribe la spec** en `SPEC_FILE` usando la estructura de la plantilla.

6. **Validación de calidad**: Después de escribir, valida contra esta checklist:
   - Crea `<dir>/checklists/requirements.md` con los siguientes ítems:
     ```markdown
     # Specification Quality Checklist: [FEATURE NAME]
     
     ## Content Quality
     - [ ] Sin detalles de implementación (lenguajes, frameworks, APIs)
     - [ ] Enfocado en valor de usuario y necesidades de negocio
     - [ ] Escrito para stakeholders no técnicos
     - [ ] Todas las secciones obligatorias completadas
     
     ## Requirement Completeness
     - [ ] Sin marcadores [NEEDS CLARIFICATION]
     - [ ] Requisitos verificables y sin ambigüedad
     - [ ] Success criteria medibles
     - [ ] Success criteria sin detalles de implementación
     - [ ] Todos los escenarios de aceptación definidos
     - [ ] Edge cases identificados
     - [ ] Alcance claramente delimitado
     - [ ] Dependencias y suposiciones identificadas
     
     ## Feature Readiness
     - [ ] Todos los requisitos funcionales tienen criterios de aceptación claros
     - [ ] User scenarios cubren los flujos principales
     - [ ] Sin detalles de implementación en la spec
     ```

   - Revisa la spec contra cada ítem:
     - Si todos pasan: procede al paso 7
     - Si hay ítems fallando: actualiza la spec y re-valida (máx. 3 iteraciones)
     - Si quedan marcadores [NEEDS CLARIFICATION]: presenta las preguntas al usuario (máx. 3)

7. **Presenta preguntas de clarificación** (si las hay), en este formato:

   ```markdown
   ## Pregunta [N]: [Tema]
   
   **Contexto**: [Cita la sección relevante de la spec]
   
   **Qué necesitamos saber**: [Pregunta específica]
   
   **Opciones sugeridas**:
   
   | Opción | Respuesta | Implicaciones |
   |--------|-----------|---------------|
   | A | [Primera opción] | [Qué significa para la feature] |
   | B | [Segunda opción] | [Qué significa para la feature] |
   | Custom | Proporciona tu propia respuesta | — |
   ```

8. **Reporta la finalización** con:
   - `SPECIFY_FEATURE_DIRECTORY` — ruta del directorio
   - `SPEC_FILE` — ruta del archivo spec
   - Resumen de la checklist
   - Próximo paso recomendado (`/speckit-clarify` o `/speckit-plan`)

## Post-Execution: Hooks

Comprueba entradas bajo `hooks.after_specify` en `.specify/extensions.yml` y aplica la misma lógica que en los pre-hooks.

## Guías rápidas

- Enfócate en el **QUÉ** y el **POR QUÉ**, no en el **CÓMO**
- Sin detalles técnicos en la spec (stack, APIs, estructura de código)
- Escrito para stakeholders de negocio, no desarrolladores
- Máximo 3 marcadores [NEEDS CLARIFICATION]
