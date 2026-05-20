Lee CLAUDE.md y `.specify/memory/constitution.md` antes de ejecutar este comando.

## Descripción

Ejecuta el plan de implementación procesando y ejecutando todas las tareas definidas en `tasks.md`.

## Input del usuario

```text
$ARGUMENTS
```

## Pre-Execution: Hooks

Comprueba entradas bajo `hooks.before_implement` en `.specify/extensions.yml`. Aplica la misma lógica de hooks que en `/speckit-specify`.

## Outline

1. **Setup**: Ejecuta `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` desde la raíz del repo y parsea `FEATURE_DIR` y la lista `AVAILABLE_DOCS`.

2. **Verifica checklists** (si `FEATURE_DIR/checklists/` existe):
   - Escanea todos los archivos de checklist en `checklists/`
   - Para cada checklist, cuenta: total de ítems, completados (`- [X]`), incompletos (`- [ ]`)
   - Crea una tabla de estado:
     ```
     | Checklist  | Total | Completado | Incompleto | Estado  |
     |------------|-------|------------|------------|---------|
     | ux.md      | 12    | 12         | 0          | ✓ PASS  |
     | test.md    | 8     | 5          | 3          | ✗ FAIL  |
     ```
   - Si algún checklist está incompleto: muestra la tabla y pregunta "¿Deseas continuar con la implementación de todos modos? (sí/no)"
   - Espera respuesta antes de continuar

3. **Carga el contexto de implementación**:
   - **REQUERIDO**: Lee `tasks.md` para la lista completa de tareas
   - **REQUERIDO**: Lee `plan.md` para tech stack, arquitectura y estructura de archivos
   - **SI EXISTE**: Lee `data-model.md` para entidades y relaciones
   - **SI EXISTE**: Lee `contracts/` para especificaciones de API
   - **SI EXISTE**: Lee `research.md` para decisiones técnicas y restricciones
   - **SI EXISTE**: Lee `.specify/memory/constitution.md` para restricciones de gobernanza
   - **SI EXISTE**: Lee `quickstart.md` para escenarios de integración

4. **Verificación de setup del proyecto**:
   - Verifica/crea archivos de ignore según el setup real del proyecto:
     - Si es git repo: verifica `.gitignore`
     - Si hay `package.json`: verifica patrones para Node.js (`node_modules/`, `dist/`, `.env*`)
     - Si hay archivos Python: verifica patrones Python (`__pycache__/`, `.venv/`, `*.pyc`)
   - Si el archivo de ignore ya existe: verifica que contenga patrones esenciales, añade solo los críticos que falten
   - Si no existe: crea con el conjunto completo de patrones para la tecnología detectada

5. **Parsea la estructura de `tasks.md`** y extrae:
   - Fases de tareas (Setup, Foundational, User Stories, Polish)
   - Dependencias (ejecución secuencial vs paralela)
   - Detalles de cada tarea (ID, descripción, rutas de archivos, marcadores [P])
   - Flujo de ejecución y requisitos de dependencias

6. **Ejecuta la implementación** siguiendo el plan de tareas:
   - **Ejecución fase por fase**: Completa cada fase antes de pasar a la siguiente
   - **Respeta dependencias**: Tareas secuenciales en orden; tareas paralelas [P] pueden ejecutarse juntas
   - **Archivos compartidos**: Tareas que afectan el mismo archivo deben ejecutarse secuencialmente
   - **Checkpoints de validación**: Verifica la completitud de cada fase antes de proceder

7. **Reglas de ejecución**:
   - **Setup primero**: Inicializa estructura del proyecto, dependencias, configuración
   - **Desarrollo core**: Implementa modelos, servicios, comandos CLI, endpoints
   - **Trabajo de integración**: Conexiones de BD, middleware, logging, servicios externos
   - **Polish y validación**: Optimización de performance, documentación

8. **Seguimiento de progreso y manejo de errores**:
   - Reporta progreso después de cada tarea completada
   - Para tareas completadas: marca la tarea como `[X]` en el archivo `tasks.md`
   - Detente si alguna tarea no paralela falla
   - Para tareas paralelas [P]: continúa con las exitosas, reporta las fallidas
   - Proporciona mensajes de error claros con contexto

9. **Validación de completitud**:
   - Verifica que todas las tareas requeridas estén completadas
   - Comprueba que las features implementadas coincidan con la spec original
   - Confirma que la implementación sigue el plan técnico
   - Reporta estado final con resumen del trabajo completado

**Nota**: Este comando asume que existe un desglose completo de tareas en `tasks.md`. Si las tareas están incompletas o faltan, sugiere ejecutar `/speckit-tasks` primero.

## Post-Execution: Hooks

Comprueba entradas bajo `hooks.after_implement` en `.specify/extensions.yml` y aplica la misma lógica de hooks.
