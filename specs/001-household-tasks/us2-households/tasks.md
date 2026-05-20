# Tasks: US2 — Create and Join Households (P1)

**Status**: ✅ COMPLETO  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Backend

- [x] T036 [P] Create Household and HouseholdMember Pydantic models in AporTamos-Backend/app/models/household.py
- [x] T037 [P] Create household service in AporTamos-Backend/app/services/household_service.py (create, join, manage members)
- [x] T038 Implement POST /households endpoint in AporTamos-Backend/app/routers/households.py (create household, set owner)
- [x] T039 Implement GET /households/{id} endpoint in AporTamos-Backend/app/routers/households.py (fetch household with members)
- [x] T040 [P] Implement POST /households/{id}/members endpoint (send invitation)
- [x] T041 [P] Implement PUT /households/{id}/members/{user_id} endpoint (accept invitation)
- [x] T042 [P] Implement DELETE /households/{id}/members/{user_id} endpoint (remove member)

## Frontend

- [x] T043 [P] Create HouseholdCard component in AporTamos-Frontend/components/household/HouseholdCard.tsx
- [x] T044 [P] Create HouseholdDetail screen in AporTamos-Frontend/app/(tabs)/[householdId]/index.tsx
- [x] T045 Create CreateHouseholdModal in AporTamos-Frontend/components/household/CreateHouseholdModal.tsx
- [x] T046 Create InviteMembersModal in AporTamos-Frontend/components/household/InviteMembersModal.tsx
- [x] T047 [P] Create useHousehold hook in AporTamos-Frontend/hooks/useHousehold.ts
- [x] T048 [P] Add HouseholdContext in AporTamos-Frontend/context/HouseholdContext.tsx
- [x] T049 Update home screen in AporTamos-Frontend/app/(tabs)/index.tsx to display list of user's households

**Checkpoint**: ✅ US2 complete — users can create and join households

---

## Acceptance Scenarios Verification

- [ ] Can create household
- [ ] Can invite user by email
- [ ] Invited user can accept and join
- [ ] Household displays list of members
- [ ] Household displays correct daily streak
