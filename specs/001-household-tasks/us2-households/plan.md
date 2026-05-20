# Plan: US2 — Households

**Ref**: [spec.md](spec.md) | [tasks.md](tasks.md)  
**Contratos**: [../contracts/api-endpoints.md](../contracts/api-endpoints.md)

---

## Flujo principal

```
Crear household:
  POST /households → create_household() → crea Household + HouseholdMember(owner) + ChatChannel

Ver detalle:
  GET /households/{id} → verifica membership → devuelve HouseholdDetail con members[]

Invitar miembro:
  POST /households/{id}/members → solo owner → placeholder email (futuro)

Aceptar invitación:
  PUT /households/{id}/members/{user_id} → {action: "accept"} → crea HouseholdMember(member)

Eliminar miembro:
  DELETE /households/{id}/members/{user_id} → solo owner → no puede eliminar owner
```

## Roles

| Rol | Puede invitar | Puede eliminar miembros | Puede editar schedule | Puede salir |
|-----|:---:|:---:|:---:|:---:|
| owner | ✅ | ✅ | ✅ | ❌ (debe transferir) |
| member | ❌ | ❌ | ❌ | ✅ |

## Archivos Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `app/models/household.py` | HouseholdCreate, HouseholdResponse, HouseholdDetail, HouseholdMember, HouseholdRoleEnum |
| `app/services/household_service.py` | create_household, get_household, invite_member, accept_invitation, remove_member, transfer_ownership |
| `app/routers/households.py` | POST /households, GET /households/{id}, POST/PUT/DELETE /households/{id}/members |

## Archivos Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `components/household/HouseholdCard.tsx` | Card con nombre, streak (🔥), member count |
| `components/household/CreateHouseholdModal.tsx` | Form: nombre + timezone picker |
| `components/household/InviteMembersModal.tsx` | Form: email con validación |
| `app/(tabs)/[householdId]/index.tsx` | Detalle: info + members list + acciones owner |
| `app/(tabs)/index.tsx` | Home: lista de households del usuario |
| `hooks/useHousehold.ts` | Fetch + cache 5min por household |
| `context/HouseholdContext.tsx` | Estado global: selectedHousehold, lista de households |
| `services/api.ts` | HTTP client tipado para FastAPI |

## Nota sobre invitaciones

La implementación actual es un placeholder: devuelve `{"message": "Invitation sent to {email}"}` sin enviar email real. El flujo real requeriría un sistema de emails (SendGrid, Resend, etc.) o invitaciones por link.

## Streak display en HouseholdCard

Color coding del streak:
- 🔴 0 días → rojo (#ef4444)
- 🟡 1-2 días → amarillo (#eab308)
- 🟢 3+ días → verde (#22c55e)
