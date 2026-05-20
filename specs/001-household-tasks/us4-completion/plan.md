# Plan: US4 — Task Completion with Photo Proof

**Ref**: [spec.md](spec.md) | [tasks.md](tasks.md)  
**Contratos**: [../contracts/api-endpoints.md](../contracts/api-endpoints.md)

---

## Flujo principal

```
Ver mis tareas:
  GET /users/{id}/tasks?date=today
    → TaskAssignment records donde assigned_to_user_id = me AND assignment_date = today
    → Incluye is_completed y task info (nombre, effort_weight)

Ver tareas del household:
  GET /households/{id}/tasks?date=today
    → Todos los TaskAssignment del household para hoy
    → Agrupados por usuario (para vista de progress)

Completar tarea:
  POST /tasks/{assignment_id}/complete
    → multipart/form-data: photo (binary)
    → Backend:
        1. Valida foto (max 5MB, es imagen)
        2. Comprime a JPEG 80%
        3. Sube a Supabase Storage: task-proofs/{household_id}/{task_id}/{assignment_id}.jpg
        4. Crea TaskCompletion record con photo_url
        5. Actualiza TaskAssignment.is_completed = true
        6. Devuelve TaskCompletion (201)
```

## Arquitectura de subida de fotos (Frontend)

```
Usuario selecciona foto (cámara o galería)
    ↓ expo-image-picker
Preview en pantalla
    ↓ compresión JPEG 80% (services/storage.ts)
Upload a backend via multipart
    ↓ POST /tasks/{id}/complete
Backend → Supabase Storage
    ↓ photo_url devuelta
Task marcada como completa en UI
```

## Offline queue

Si el upload falla por red:
1. La tarea NO se marca completa
2. La foto se encola en `services/offlineQueue.ts` (AsyncStorage)
3. Al reconectar (NetInfo), el queue se procesa automáticamente

## Archivos Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `app/models/task.py` | Añadir TaskAssignmentResponse, TaskCompletionCreate, TaskCompletionResponse |
| `app/services/completion_service.py` | validate_photo, upload_to_storage, create_completion_record |
| `app/routers/tasks.py` | GET /users/{id}/tasks, GET /households/{id}/tasks |
| `app/routers/completions.py` | POST /tasks/{assignment_id}/complete (multipart) |

## Archivos Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `components/task/TaskListItem.tsx` | Item: nombre, effort_weight, estado (pending/complete), foto thumbnail |
| `components/task/TaskDetail.tsx` | Detalle completo: descripción, asignado a, botón "Mark Complete" |
| `components/task/PhotoUpload.tsx` | Picker (cámara/galería) + preview + botón upload |
| `components/task/CompletionStatus.tsx` | Badge: pending (⏳) / completed (✅) + thumbnail de foto |
| `services/storage.ts` | compressImage(uri, quality=0.8, maxSizeMB=5), uploadTaskPhoto() |
| `services/offlineQueue.ts` | enqueue(), processQueue(), escucha NetInfo changes |
| `app/(tabs)/[householdId]/tasks.tsx` | Pantalla: "My Tasks" (pending) + "Completed" (tabs o secciones) |

## Dependencias de librerías

| Librería | Uso |
|----------|-----|
| `expo-image-picker` | Seleccionar foto de cámara o galería |
| `expo-image-manipulator` | Comprimir imagen a JPEG 80% |
| `@react-native-community/netinfo` | Detectar cambios de conectividad para offline queue |

## Notas de implementación

- Backend usa FastAPI `UploadFile` para recibir la foto como multipart
- Supabase Storage devuelve una URL pública o firmada según RLS del bucket
- `task-proofs` es bucket privado → usar signed URLs con expiración para mostrar fotos en UI
- La validación de 5MB se hace tanto en frontend (antes de comprimir) como en backend (defensa en profundidad)
