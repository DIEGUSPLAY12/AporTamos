Lee CLAUDE.md y `.specify/memory/constitution.md` antes de ejecutar este comando.

## Descripción

Crea o actualiza la constitución del proyecto a partir de inputs proporcionados por el usuario o de forma interactiva, asegurando que todos los templates dependientes se mantengan sincronizados.

## Input del usuario

```text
$ARGUMENTS
```

## Pre-Execution: Hooks

Comprueba entradas bajo `hooks.before_constitution` en `.specify/extensions.yml`. Aplica la misma lógica de hooks que en `/speckit-specify`.

## Outline

Estás actualizando la constitución del proyecto en `.specify/memory/constitution.md`. Este archivo contiene tokens placeholder entre corchetes (ej. `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`). Tu trabajo es: (a) recopilar/derivar valores concretos, (b) rellenar el template con precisión, y (c) propagar cualquier enmienda por los artefactos dependientes.

**Nota**: Si `.specify/memory/constitution.md` no existe aún, debe haberse inicializado desde `.specify/templates/constitution-template.md`. Si falta, cópialo primero.

### Flujo de ejecución

1. **Carga la constitución existente** en `.specify/memory/constitution.md`.
   - Identifica cada token placeholder del tipo `[ALL_CAPS_IDENTIFIER]`
   - El usuario puede requerir más o menos principios que los del template. Si se especifica un número, respétalo.

2. **Recopila/deriva valores para los placeholders**:
   - Si el usuario proporciona un valor en la conversación, úsalo
   - De lo contrario, infiere del contexto del repo (README, docs, versiones anteriores de la constitución)
   - Para fechas de gobernanza: `RATIFICATION_DATE` es la fecha de adopción original; `LAST_AMENDED_DATE` es hoy si se hacen cambios
   - `CONSTITUTION_VERSION` debe incrementar según reglas de versionado semántico:
     - MAJOR: Redefiniciones o eliminaciones de principios incompatibles hacia atrás
     - MINOR: Nuevo principio/sección añadido o guía materialmente ampliada
     - PATCH: Clarificaciones, redacción, correcciones sin cambio semántico
   - Si el tipo de bump es ambiguo, propón razonamiento antes de finalizar

3. **Redacta el contenido actualizado de la constitución**:
   - Reemplaza cada placeholder con texto concreto (sin tokens entre corchetes restantes)
   - Preserva la jerarquía de headings y la estructura del template
   - Asegura que cada sección de Principio tenga: nombre conciso, párrafo (o lista de bullets) con reglas no-negociables, y razonamiento explícito si no es obvio
   - Asegura que la sección de Governance liste el procedimiento de enmienda, política de versionado y expectativas de revisión de cumplimiento

4. **Checklist de propagación de consistencia**:
   - Lee `.specify/templates/plan-template.md` y asegúrate de que cualquier "Constitution Check" o reglas se alineen con los principios actualizados
   - Lee `.specify/templates/spec-template.md` — actualiza si la constitución añade/elimina secciones obligatorias o restricciones
   - Lee `.specify/templates/tasks-template.md` — asegúrate de que la categorización de tareas refleje principios nuevos o eliminados
   - Lee cualquier doc de guidance del runtime (README.md, docs/ si existe)

5. **Produce un Sync Impact Report** (como comentario HTML al inicio del archivo de constitución después de actualizar):
   - Cambio de versión: antigua → nueva
   - Lista de principios modificados (título antiguo → nuevo si fue renombrado)
   - Secciones añadidas
   - Secciones eliminadas
   - Templates que requieren actualización (✅ actualizado / ⚠ pendiente) con rutas de archivo
   - TODOs de seguimiento si algún placeholder fue intencionalmente diferido

6. **Validación antes del output final**:
   - Sin tokens entre corchetes no explicados
   - La línea de versión coincide con el reporte
   - Fechas en formato ISO YYYY-MM-DD
   - Los principios son declarativos, verificables y libres de lenguaje vago ("should" → reemplazar con MUST/SHOULD donde aplique)

7. **Escribe la constitución completada** de vuelta a `.specify/memory/constitution.md` (sobreescritura).

8. **Output del resumen final** para el usuario con:
   - Nueva versión y razonamiento del bump
   - Archivos marcados para seguimiento manual
   - Mensaje de commit sugerido (ej. `docs: amend constitution to vX.Y.Z (principle additions + governance update)`)

### Requisitos de formato & estilo

- Usa headings Markdown exactamente como en el template (no los promuevas ni degradues)
- Líneas largas de razonamiento: intenta mantenerlas <100 chars
- Una línea en blanco entre secciones
- Evita espacios al final de línea

Si el usuario proporciona actualizaciones parciales (ej. solo una revisión de principio), igualmente realiza los pasos de validación y decisión de versión.

Si falta información crítica (ej. fecha de ratificación realmente desconocida): inserta `TODO(<FIELD_NAME>): explicación` e inclúyelo en el Sync Impact Report bajo ítems diferidos.

No crees un nuevo template; opera siempre en el archivo `.specify/memory/constitution.md` existente.

## Post-Execution: Hooks

Comprueba entradas bajo `hooks.after_constitution` en `.specify/extensions.yml` y aplica la misma lógica de hooks.
