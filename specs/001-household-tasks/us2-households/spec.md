# Spec: US2 — Create and Join Households (P1)

**Prioridad**: P1 — MVP  
**Status**: ✅ Completo  
**Requiere**: [US1 Auth](../us1-auth/) completado

---

## User Story

Users must be able to create new households and join existing ones via invitations, establishing the core unit of organization for task management.

**Why this priority**: Households are the central organizational unit. Users cannot manage tasks without first being part of a household.

**Independent Test**: Can be fully tested by creating a new household, inviting other users, having them join, and verifying household membership.

---

## Acceptance Scenarios

1. **Given** I am on the home page, **When** I click "Create Household", **Then** I am taken to a form to name the household
2. **Given** I am creating a household, **When** I enter a name and submit, **Then** the household is created and I am the owner
3. **Given** I am on my household page, **When** I invite another user by email, **Then** they receive an invitation and can join
4. **Given** I have received a household invitation, **When** I accept it, **Then** I am added to the household
5. **Given** I am on the home page, **When** I see a list of my households, **Then** all joined households are displayed with their daily streak count

---

## Functional Requirements

- **FR-002**: System MUST allow users to create households and become the initial owner
- **FR-003**: System MUST allow household owners to invite users via email and manage household membership
- **FR-016**: System MUST display household members list on the household management page

---

## Key Entities

**Household**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| owner_id | UUID | FK → users |
| name | string | — |
| daily_streak | integer | Default 0 |
| last_completion_date | date | Nullable |
| timezone_id | string | IANA timezone |
| created_at | timestamp | — |

**HouseholdMember** (junction table)

| Campo | Tipo | Notas |
|-------|------|-------|
| household_id | UUID | FK → households |
| user_id | UUID | FK → users |
| role | enum | `owner` \| `member` |
| joined_at | timestamp | — |

---

## Edge Cases

- Household owner eliminado: ownership transfiere al miembro más antiguo o requiere reasignación explícita
- Owner no puede ser eliminado sin transferir ownership primero
