# Plan: US1 — Authentication

**Ref**: [spec.md](spec.md) | [tasks.md](tasks.md)  
**Contratos**: [../contracts/api-endpoints.md](../contracts/api-endpoints.md)

---

## Flujo de autenticación

```
Email/Password:
  POST /auth/register → create_user() → hash_password(bcrypt) → JWT token
  POST /auth/login    → authenticate_user() → verify_password() → JWT token

Google OAuth:
  POST /auth/google-login → verify Google ID token → create_or_get_user_google() → JWT token

Logout:
  POST /auth/logout → frontend clears token (Supabase maneja sesión)
```

## JWT Token

```json
{
  "sub": "<user_uuid>",
  "email": "user@example.com",
  "type": "access",
  "exp": 1682000000,
  "iat": 1681996400
}
```

Expiración: 30 min (configurable). Refresh: automático vía Supabase.

## Archivos Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `app/models/user.py` | Pydantic models: UserCreate, UserLogin, UserResponse, UserInDB |
| `app/services/auth_service.py` | hash_password, verify_password, create_user, authenticate_user, create_or_get_user_google |
| `app/routers/auth.py` | POST /auth/register, /login, /google-login, /logout |
| `app/dependencies.py` | verify_jwt_token, create_access_token, get_current_user, require_bearer_token |

## Archivos Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `hooks/useAuth.ts` | useLogin, useRegister, useLogout, useGoogleAuth, useAuthState |
| `context/AuthContext.tsx` | AuthProvider, estado global de sesión |
| `components/auth/LoginScreen.tsx` | Formulario email/password + botón Google OAuth |
| `components/auth/RegisterScreen.tsx` | Formulario registro con validación de contraseña |
| `app/_layout.tsx` | Condicional: stack auth vs stack app según sesión |

## Seguridad

- Passwords: bcrypt via passlib
- User-not-found devuelve 401 (no 404) para evitar email enumeration
- Bearer scheme con WWW-Authenticate header en 401s
- Secret key configurable por env var (MUST cambiar en producción)

## Errores HTTP

| Escenario | Código |
|-----------|--------|
| Email ya registrado | 409 Conflict |
| Credenciales inválidas | 401 Unauthorized |
| Token expirado/inválido | 401 Unauthorized |
| Datos de registro inválidos | 422 Unprocessable Entity |
| Cuenta bloqueada (brute force) | 429 Too Many Requests |
