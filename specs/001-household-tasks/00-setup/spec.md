# Spec: Setup & Foundational Infrastructure

**Tipo**: Infraestructura (no es una User Story)  
**Prioridad**: BLOQUEANTE — ninguna User Story puede empezar sin esta fase  
**Status**: ✅ Completo

---

## Qué cubre

Esta fase establece toda la infraestructura compartida que necesitan las 6 User Stories:

- Estructura de directorios del proyecto (Backend + Frontend)
- Entorno de desarrollo (Python venv, Node, linting)
- Base de datos Supabase: 9 tablas, RLS, Storage buckets, Auth, Real-time, pg_cron
- FastAPI: inicialización, CORS, middleware, manejo de errores
- Expo Router: navegación root, tabs, contextos base

## Outputs esperados

### Base de datos (Supabase)
9 tablas creadas y verificadas: `users`, `households`, `household_members`, `weekly_task_schedules`, `tasks`, `task_assignments`, `task_completions`, `chat_channels`, `chat_messages`

### Storage buckets
- `task-proofs` (privado) — fotos de completación de tareas
- `chat-media` (privado) — archivos multimedia de chat

### Auth
- Email/password habilitado
- Google OAuth configurado
- JWT configurado con secret key

### Real-time
Subscripciones habilitadas para: `chat_messages`, `task_assignments`, `task_completions`

### pg_cron
Job diario a las 12:05 AM UTC para cálculo de streaks

### Backend (FastAPI)
- `app/main.py` — app inicializada con CORS, middleware, health endpoint
- `app/config.py` — logging e infraestructura de errores
- `app/dependencies.py` — cliente Supabase, JWT, manejo de errores

### Frontend (Expo Router)
- `app/_layout.tsx` — root layout con navegación condicional (auth vs app)
- `app/(tabs)/_layout.tsx` — navegación por tabs (Home, Explore, Chat, Profile)
- `context/AuthContext.tsx` — contexto de autenticación
- `services/supabase.ts` — cliente Supabase con subscripciones
- `types/models.ts` — tipos TypeScript compartidos
