# Spec: US1 — User Registration and Authentication (P1)

**Prioridad**: P1 — MVP  
**Status**: ✅ Completo  
**Requiere**: [00-setup](../00-setup/) completado

---

## User Story

Users need to create accounts and log into the AporTamos platform using standard credentials or Google OAuth to access their household management dashboard.

**Why this priority**: Authentication is the critical foundation for all other features. Without this, no user can access the system.

**Independent Test**: Can be fully tested by attempting to register via email/password, register via Google, log in with valid credentials, and attempting log in with invalid credentials.

---

## Acceptance Scenarios

1. **Given** I am on the login page, **When** I enter valid credentials, **Then** I am authenticated and directed to the home dashboard
2. **Given** I am on the login page, **When** I click "Login with Google", **Then** I am redirected to Google OAuth flow and authenticated
3. **Given** I am on the registration page, **When** I enter a new email and password, **Then** my account is created and I can log in
4. **Given** I am on the login page, **When** I enter invalid credentials, **Then** I see an error message and remain on the login page
5. **Given** I am logged in, **When** I click logout, **Then** I am logged out and redirected to the login page

---

## Functional Requirements

- **FR-001**: System MUST support user registration with email/password and Google OAuth authentication

---

## Key Entity

**User**: Individual account holder with authentication credentials (email or Google OAuth), profile information, and household memberships.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| email | string, unique | — |
| password_hash | string, nullable | Null para OAuth users |
| google_id | string, nullable | — |
| name | string | — |
| created_at | timestamp | — |
| updated_at | timestamp | — |

---

## Success Criteria

- **SC-001**: Users can complete registration and first login within 2 minutes
