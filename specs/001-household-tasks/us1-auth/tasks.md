# Tasks: US1 — User Registration and Authentication (P1)

**Status**: ✅ COMPLETO  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Backend

- [x] T023 [P] Create User Pydantic model in AporTamos-Backend/app/models/user.py
- [x] T024 [P] Create authentication service with password hashing in AporTamos-Backend/app/services/auth_service.py
- [x] T025 Implement POST /auth/register endpoint in AporTamos-Backend/app/routers/auth.py
- [x] T026 Implement POST /auth/login endpoint in AporTamos-Backend/app/routers/auth.py
- [x] T027 [P] Implement POST /auth/google-login endpoint in AporTamos-Backend/app/routers/auth.py
- [x] T028 Implement POST /auth/logout endpoint in AporTamos-Backend/app/routers/auth.py
- [x] T033 [P] Add JWT token handling and refresh logic in AporTamos-Backend/app/dependencies.py
- [x] T034 [P] Add bearer token validation middleware in AporTamos-Backend/app/dependencies.py
- [x] T035 Add error handling for auth failures (invalid credentials, user exists) with appropriate HTTP codes

## Frontend

- [x] T029 [P] Create auth hooks in AporTamos-Frontend/hooks/useAuth.ts
- [x] T030 [P] Create LoginScreen component in AporTamos-Frontend/components/auth/LoginScreen.tsx
- [x] T031 [P] Create RegisterScreen component in AporTamos-Frontend/components/auth/RegisterScreen.tsx
- [x] T032 Create auth flow navigation in AporTamos-Frontend/app/_layout.tsx (conditional render based on auth state)

**Checkpoint**: ✅ US1 complete — users can register and log in with comprehensive error handling

---

## Acceptance Scenarios Verification

- [ ] Can register with email and password
- [ ] Can login with email and password
- [ ] Can login with Google OAuth
- [ ] Invalid credentials show error message
- [ ] Logout successfully clears session
