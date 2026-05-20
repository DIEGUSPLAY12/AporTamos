# Plan: Setup & Foundational Infrastructure

**Ref**: [spec.md](spec.md) | [tasks.md](tasks.md)  
**Stack**: FastAPI (Python), React Native + Expo, Supabase

---

## Decisiones técnicas

| Decisión | Elección | Razón |
|----------|----------|-------|
| Base de datos | Supabase PostgreSQL | Auth + DB + Storage + Real-time integrados |
| Auth | Supabase Auth (email + Google OAuth) | Elimina complejidad de token management manual |
| Storage | Supabase Storage (2 buckets privados) | Integrado con RLS, fácil de usar desde móvil |
| Real-time | Supabase subscriptions (WebSocket) | Nativo en Supabase, sin infraestructura extra |
| Streaks | pg_cron en Supabase | Cálculo diario en DB, sin cron externo |
| Backend | FastAPI + Python | Async, tipado, OpenAPI automático |
| Frontend | Expo Router (file-based routing) | Navegación nativa + web con mismo código |

## Arquitectura de navegación (Frontend)

```
app/
├── _layout.tsx          ← Root: decide auth vs app stack
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
└── (tabs)/
    ├── _layout.tsx      ← Bottom tabs: Home, Explore, Chat, Profile
    ├── index.tsx        ← Home
    ├── explore.tsx
    ├── chat/
    └── profile/
```

## Estructura de errores (Backend)

Jerarquía de excepciones custom en `app/config.py`:
- `AporTamosException` (base)
  - `DatabaseException`
  - `AuthenticationException`
  - `AuthorizationException`
  - `ResourceNotFoundException`
  - `ConflictException`
  - `ValidationException`
  - `RateLimitException`

Mapeadas a HTTP codes en `app/dependencies.py` (ErrorContext + RequestErrorHandler).

## Variables de entorno necesarias

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SECRET_KEY=                  # JWT signing
GOOGLE_CLIENT_ID=            # Para OAuth
```

## Schema Supabase

Ver [../contracts/database-schema.md](../contracts/database-schema.md) para DDL completo con RLS policies.

## Contratos de API

Ver [../contracts/api-endpoints.md](../contracts/api-endpoints.md) para todos los endpoints.
