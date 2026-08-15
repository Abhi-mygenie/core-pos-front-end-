# CR-069: Employee Management + Roles & Permissions (Migration from Old POS — Phase 1)

**Registered:** 2026-02-15
**Registered by:** INTAKE agent (session `SESSION_HANDOVER_2026_02_15_MIGRATION_INTAKE.md`)
**Source:** OWNER-REPORTED — migration from Old POS
**Confidence:** REPORTED (feature does not exist in current codebase; owner has old POS as reference)
**Duplicate check:** RELATED — **SUBSUMES `OG-CR041-EMPLOYEE-MGMT`** (Open Gaps Register). RELATED to **CR-068** (Cancellation Role-Gating) which depends on the role system this CR builds. RELATED to **CR-041** (Settings module — Employee Mgmt is currently a "Coming Soon" tile under Settings).
**Risk:** **CRITICAL** — Touches auth, permissions, and app-wide role gating (Rule R6 sacred logic list explicitly names "auth, permissions"; Rule R5 hotspots include multiple files that will need permission checks). Downgrade requires owner-approved written rationale (v0.7 §Risk Classification).
**Severity:** **P1 — HIGH** (blocks role gating everywhere; unblocks CR-068 and any future permission-gated feature; not P0 because app currently runs without it)
**Blast radius:** **LARGE**
  - New files: ~8–12 (page, list view, form view, service, transform, `PermissionContext`, `hasPermission` hook, gate component, role config UI)
  - Modified for role gating: **30–50+ files** (owner confirmed "entire mapping will be needed" — Sidebar, every gated route, every gated action button in OrderCard/CartPanel/CollectPaymentPanel/Reports/Settings/etc.)
  - Rough total: **~60+ files**
**Fast Lane eligible:** **NO** (CRITICAL risk, multi-file, hotspot-adjacent, auth/permission scope — v0.7 §Fast Lane guardrails)

---

## Description

MyGenie POS currently has **no employee management module** and **no role-based permission gating**. The only auth primitive that exists is `ProtectedRoute` (route-level "is authenticated?" check via `AuthContext`) — there is zero role/permission model, no `hasPermission()` helper, no per-action gate.

The Old POS has an Employee Management module that must be migrated to the new POS as **Phase 1** (this CR):
- **(a)** Employee CRUD (create/edit/delete/list employees)
- **(b)** Roles & Permissions — define roles, assign permissions to roles, assign roles to employees, plus **full app-wide role-gating mapping** (owner: "entire mapping will be needed")

**Deferred to Phase 2** (separate future CR, not in scope here):
- (c) Attendance / Check-in
- (d) Shifts / Roster
- (e) Payroll
- (f) Leaves

**Backend contract:** Laravel endpoints on `preprod.mygenie.online` — **owner will share endpoint list before Planning Gate 2** (see Open Questions OQ-3).

---

## Current State (Code Reality Check per INTAKE Step 0a)

**Code reality: NONE** — greenfield module.

| Concern | Current state |
|---|---|
| Employee list/CRUD page | ❌ Does not exist. Nearest match: `SettingsPage.jsx` has no Employee tile rendered; `Sidebar.jsx:110` shows `{ id: "employee-management", label: "Employee Management", comingSoon: true }` — clicking triggers `showComingSoon()` toast only. |
| Role/Permission data model (FE) | ❌ Does not exist. No `PermissionContext`, no `hasPermission` hook, no role config UI. |
| Auth primitives that DO exist | `contexts/AuthContext.jsx` (auth status only — `isAuthenticated`, `user`), `components/guards/ProtectedRoute.jsx` (route-level auth guard, not role-based). |
| Role gating on any screen today | ❌ Zero. Grep for `hasPermission`, `canAccess`, `hasRole`, `RoleGate` returned **no application code** (only test fixtures + comments). |
| Related existing CR | **CR-068** (Cancellation Role-Gating, P1, INTAKE) — assumes a role system exists; blocked on this CR shipping first. |

---

## Scope

### In-scope (Phase 1)

**A. Employee CRUD**
1. `EmployeeManagementPage.jsx` — page shell + route registration (`/employees` or `/settings/employees`)
2. `EmployeeListView.jsx` — table (name, phone, email, role, status, actions)
3. `EmployeeFormDialog.jsx` — add/edit modal (name, phone, email, password, role select, status toggle)
4. `employeeService.js` — API calls (list/get/create/update/delete)
5. `employeeTransform.js` — API ↔ FE shape mapping (per Rule R11: curl-probe endpoints before wiring)
6. Sidebar entry — remove `comingSoon: true` flag on `employee-management` item, wire route
7. Bulk operations parity with CR-060 pattern (defer if not in old POS)

**B. Role & Permission System**
1. `PermissionContext.jsx` — provider that loads current user's role + permissions on login/refresh
2. `useAuth` extension OR new `usePermissions` hook — `hasPermission(action)`, `hasRole(roleName)`, `canAccess(resource)`
3. `RoleManagementView.jsx` — CRUD for roles + permission-checkbox grid (permission ← → role matrix)
4. `roleService.js`, `roleTransform.js`, `permissionCatalog.js` (static list of every gate-able action in the app)
5. **`PermissionGate` component / HOC** — `<PermissionGate permission="orders.cancel">…</PermissionGate>` and equivalent hook usage for buttons
6. **App-wide role mapping (BIG)** — apply gates to every currently-ungated action. This includes but is not limited to:
   - Sidebar entries (which roles see which menu items)
   - Order actions: cancel, refund, discount, comp, split, settle, day-close
   - Menu Management: edit prices, delete items, bulk edit
   - Reports: view audit tab, export, filter by other users
   - Settings: which tiles are visible
   - Credit / Settlement / Expense: create/edit/void
   - This is the **P1 dependency chain** — CR-068 and future permission features plug into it.
7. Login flow update — fetch role & permissions post-auth, hydrate `PermissionContext`

### Out-of-scope (Phase 2 — separate future CRs)
- Attendance / Check-in
- Shifts / Roster / Scheduling
- Payroll
- Leaves / Time-off

### Explicitly not touched (Rule R14 scope-lock)
- Order transform, tax calc, settlement formula, print semantics (R6 sacred logic — permission gates wrap these, they do NOT change internal math)
- `AppProviders.jsx` provider order (R7) — new `PermissionProvider` insertion order must be planned carefully in Impact Analysis

---

## Affected Area

| Module | Files (partial) | Notes |
|---|---|---|
| Auth / Contexts | `AuthContext.jsx`, `AppProviders.jsx`, new `PermissionContext.jsx` | R7 — provider order matters |
| Guards | `ProtectedRoute.jsx`, new `PermissionGate.jsx` | Extends existing route guard |
| Sidebar | `Sidebar.jsx` (lines ~50, 110, 283-370) | Remove comingSoon flag; wire route; add role-visibility filter |
| Order actions (R5 hotspots) | `OrderCard.jsx`, `TableCard.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx` | Every action button becomes permission-gated |
| Reports | `AllOrdersReportPage.jsx`, `RoomOrdersReportPage.jsx`, `reports-module/*` | Audit tab already env-flagged (`REACT_APP_SHOW_AUDIT_TAB`) — add role gate on top |
| Menu Mgmt | `MenuManagementPage.jsx`, `BulkEditor.jsx`, `ProductForm.jsx` | Bulk edit / price edit gated |
| Credit / Settlement / Expense | `CreditManagementPage.jsx`, `SettlementPanel.jsx`, `ExpenseEntryPage.jsx` | Create/void/edit gated |
| New pages | `EmployeeManagementPage.jsx`, `RoleManagementView.jsx`, `PermissionMatrixView.jsx` | Greenfield |
| Services / transforms | `employeeService.js`, `employeeTransform.js`, `roleService.js`, `roleTransform.js`, `permissionCatalog.js` | New |
| Routing | `App.js` — add gated routes | R7 review not needed but read carefully |

**Rules invoked:** R3 (owner decisions listed below — don't invent policy), R5 (multiple hotspot files), R6 (auth/permissions is sacred), R7 (provider order in AppProviders), R11 (curl-probe backend before wiring), R14 (scope-lock), R16 (multi-agent conflict — coordinate with CR-068 owner if in-flight).

---

## Evidence

- **Screenshot:** not provided (feature does not exist in current app — nothing to screenshot). Old POS reference screenshots to be attached by owner in Planning Gate 2.
- **Steps to reproduce:** N/A (feature absent). Reproduction of the *gap*: log in as any user → click `Sidebar → Settings → Employee Management` → "Coming Soon" toast fires (from `Sidebar.jsx:283-370`).
- **Curl output:** not applicable at intake — Rule R11 curl-probe of Laravel backend deferred to Planning Gate 2 once owner shares endpoint list.
- **Source:** OWNER-REPORTED (2026-02-15 chat session)
- **Confidence:** REPORTED

Evidence storage path: `/app/memory/evidence/CR-069/` (endpoint captures, old-POS screenshots, permission catalog draft will land here during Planning).

---

## Open Questions (owner input required BEFORE Planning Gate 2)

| # | Question | Blocks |
|---|---|---|
| OQ-1 | **Backend endpoint list** for employees + roles + permissions on `preprod.mygenie.online` (list/create/update/delete + login-response shape carrying role/perms). Owner to share. | Planning Gate 2 (Impact Analysis cannot start without endpoint contract per Rule R11). |
| OQ-2 | **Default roles to seed** (e.g., Owner / Manager / Waiter / Kitchen / Cashier?) and the **permission catalog** — canonical list of every gate-able action in the app. | Planning Gate 3 (Implementation Plan). |
| OQ-3 | **Permission granularity** — resource-level (`orders.cancel`) vs. role-level (`role.manager`) vs. hybrid? Recommend resource-level; owner confirms. | Impact Analysis. |
| OQ-4 | **Multi-restaurant scope** — are roles/permissions per-restaurant (multi-tenant) or global to the user account? | Data model design. |
| OQ-5 | **Existing user records** — how are current logged-in users migrated to the new role model? (Assign default "Owner" role? Force owner to re-assign?) | Migration plan. |
| OQ-6 | **Password policy** on Employee Create — set-by-admin? invite-email? phone-OTP? Owner to pick. | Employee form design. |
| OQ-7 | **CR-068 sequencing** — CR-068 (Cancellation Role-Gating) is already at INTAKE and depends on this CR. Confirm CR-069 ships first; CR-068 re-plans on top of CR-069's `PermissionGate`. | Sprint sequencing. |
| OQ-8 | **Phase 1 slice** — should we ship Employee CRUD *first* (small independent PR) and then Roles/Permissions as a second PR within the same CR, or one big PR? Recommend two-slice; owner confirms. | Implementation batching. |

---

## Related Items

| Item | Relationship |
|---|---|
| **CR-068** (Cancellation Role-Gating, INTAKE, P1, HIGH) | **DEPENDS ON CR-069.** Cannot plan until permission system exists. |
| **OG-CR041-EMPLOYEE-MGMT** (Open Gaps Register line 302) | **SUBSUMED BY CR-069.** Remove/mark subsumed post-registration. |
| **OG-CR041-SETTINGS-DEEPLINK** (Open Gaps Register line 300) | Adjacent — Employee Mgmt is one of the "Coming Soon" tiles it references. Not subsumed. |
| **CR-041** (Settings module) | Employee Mgmt currently placeholders under CR-041's Settings tile grid. Wiring the new page requires touching Sidebar/Settings tile config CR-041 owns. |
| **CR-060** (Table/Room Mgmt — wire CRUD APIs) | **Pattern reference** — CR-060 uses same shape (list view + bulk editor + service + transform) and can be a template for Employee CRUD. |

---

## Business Safety Rule Check (v0.7 §Business safety rule)

Change touches: **auth, permissions** → **Full gate flow mandatory. No Fast Lane. No planning skip.** Owner Approval Matrix triggers:
- Gate 4 GO required before implementation
- Any scope expansion during implementation → OWNER APPROVAL REQUIRED prompt
- Provider order change (AppProviders.jsx) → owner review
- Any modification to R6 sacred financial files during role gating → separate owner approval per file

---

## Next

1. Owner shares **backend endpoint list** (OQ-1) → agent curl-probes each per Rule R11 and captures responses under `/app/memory/evidence/CR-069/`.
2. Owner answers **OQ-2 through OQ-8** (can be done incrementally; OQ-1, OQ-2, OQ-7, OQ-8 are Gate-2 blockers).
3. **PLANNING agent (Gate 2 — Impact Analysis)** produces `/app/memory/impact/CR-069_IMPACT_ANALYSIS.md`:
   - Full file list (predicted 60+)
   - Provider order plan (R7)
   - Permission catalog draft
   - Two-slice vs one-shot recommendation
   - Downstream consumer trace (which CRs unblock: CR-068 confirmed, others TBD)
4. **PLANNING agent (Gate 3 — Implementation Plan)** produces `/app/memory/plans/CR-069_IMPLEMENTATION_PLAN.md` with Verification Matrix and Registry Checklist per v0.7.
5. Owner Gate 4 GO → IMPLEMENTATION.

---

## Registry Entry (auto-generated, mirrored in `registry.json`)

```json
{
  "id": "CR-069",
  "title": "Employee Management + Roles & Permissions (Migration Phase 1)",
  "type": "CR",
  "priority": "P1",
  "risk": "CRITICAL",
  "status": "INTAKE",
  "gate": "0-1",
  "sprint_key": "pos_5_0",
  "registered": "2026-02-15",
  "intake_doc": "change_requests/CR-069_EMPLOYEE_MANAGEMENT_INTAKE.md",
  "subsumes": ["OG-CR041-EMPLOYEE-MGMT"],
  "blocks": ["CR-068"],
  "related": ["CR-041", "CR-060"],
  "phase": 1,
  "future_phases": {
    "phase_2": "Attendance/Check-in, Shifts/Roster, Payroll, Leaves — not yet registered"
  },
  "blockers": ["Backend endpoint list from owner (OQ-1)"]
}
```

---

**INTAKE agent handover to Planning:**
> Item CR-069 registered. Intake doc at `/app/memory/change_requests/CR-069_EMPLOYEE_MANAGEMENT_INTAKE.md`.
> Code reality: NONE. Duplicate check: SUBSUMES OG-CR041-EMPLOYEE-MGMT; DEPENDS-ON-BY CR-068.
> Severity: P1 (agent-classified; owner confirmed migration priority). Risk: CRITICAL (auth/permissions per R6).
> Blast radius: LARGE (~60+ files once app-wide role mapping is done).
> Evidence: gap-reproducible in current app (Coming Soon toast). Backend endpoints pending from owner (OQ-1).
> Owner decisions needed: OQ-1 through OQ-8 (8 questions, 4 are Gate-2 blockers).
> Next: Planning Gate 2 — blocked on OQ-1 (endpoints), OQ-2 (permission catalog), OQ-7 (CR-068 sequencing), OQ-8 (slicing).
