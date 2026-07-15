# CR-069 — Impact Analysis (Gate 2)

**Document:** `impact/CR-069_IMPACT_ANALYSIS.md`
**Created:** 2026-02-15
**Role:** PLANNING (Gate 2 only — Gate 3 blocked per owner: "do not move to planning till mocks are finalized for screens and approved by me")
**Intake ref:** `change_requests/CR-069_EMPLOYEE_MANAGEMENT_INTAKE.md`
**Status:** DRAFT — awaiting owner validation

---

## Header Block (v0.7 mandatory)

| Field | Value |
|---|---|
| **Code Reality** | **PARTIAL** ⚠️ *(reclassified from NONE at intake — see §1)* |
| **Conflict Pre-Check** | LOW–MEDIUM historically; **no in-flight items on the primary target files** as of 2026-02-15 (see §2) |
| **Risk (v0.7)** | **CRITICAL** (touches auth/permissions per R6). Downgrade to HIGH is defensible now that permission infrastructure is confirmed to already exist — see §3, requires owner rationale per v0.7 §Risk Classification. |
| **Fast Lane eligible** | NO (blast radius LARGE, hotspot files touched) |
| **Rules invoked** | R3, R5, R6, R7, R11, R14, R16, R17, R18, R21 |
| **Curl-probe status (R11)** | **BLOCKED** — owner has not yet shared backend endpoint list (Open Question OQ-1). §5 records the endpoints we know are needed; probes will happen post-share. |

---

## §1 — Code Reality Check (Correction from Intake)

**Intake claimed:** `NONE` (greenfield).
**Actual after code trace:** **PARTIAL** — the permission MODEL already exists end-to-end; only the management UI and consumer gates are missing.

### What already exists in the codebase ✅

| Layer | File | Evidence |
|---|---|---|
| Login → token | `api/services/authService.js:14–46` | `login()` reads `response.data`, calls `fromAPI.loginResponse()`, persists `token`, `crmToken`, and **`authData.permissions[]`** to `sessionStorage`. |
| Auth state | `contexts/AuthContext.jsx:1–120` | `permissions` state, `hasPermission(p)`, `hasAnyPermission([...])`, `hasAllPermissions([...])`, `usePermission(p)` hook, `setUserData(user, perms)` — all present and exported. sessionStorage rehydration on refresh (`useState(() => JSON.parse(sessionStorage.getItem('permissions')))`). |
| Profile hydration | `pages/LoadingPage.jsx:353–366` | `profileService.getProfile()` returns `{ user: { roleName }, permissions }` and calls `setUserData(user, permissions)`. Debug `console.table` of permissions already emits on every login. |
| Sidebar gating | `components/layout/Sidebar.jsx:39–48, 273–288` | `const SIDEBAR_PERMISSIONS = { dashboard: 'pos', 'day-closure': 'pos', expenses: 'pos', 'menu-management': 'menu', credit: 'pos', reports: 'report', settings: 'restaurant_settings', insights: 'report' }` + filter `SIDEBAR_PERMISSIONS[item.id]` gate on line 278. **The sidebar is already permission-aware.** |
| Route guard (auth-only) | `components/guards/ProtectedRoute.jsx` | Existing — auth-only gate; does not consume permissions but is a template for a role-gated variant. |

### What is genuinely missing ❌

| # | Missing | Notes |
|---|---|---|
| 1 | Employee Management CRUD UI | New page + list + form dialog. Sidebar entry `employee-management` currently shows Coming Soon toast (Sidebar.jsx:110). |
| 2 | Role Management CRUD UI | New page — create/edit roles + assign permissions per role. |
| 3 | Permission-catalog canonical list | No `permissionCatalog.js` exists. `SIDEBAR_PERMISSIONS` uses 5 distinct strings (`pos`, `menu`, `report`, `restaurant_settings`, `credit`) — this taxonomy is presumably backend-defined. Need canonical list from backend (OQ-1/OQ-2). |
| 4 | `PermissionGate` component | Trivial to add — wraps `useAuth().hasPermission()`. Not blocking; some consumers can use the hook directly. |
| 5 | App-wide consumer gates | ~30–50 files. Order actions (cancel/refund/discount/comp/split/settle), Menu bulk-edit, Report export, Settings tiles, Credit/Settlement/Expense CRUD. |
| 6 | Backend endpoints for Employee + Role management | Owner will share (OQ-1). |
| 7 | User migration story | How existing user accounts map to the new role catalog (OQ-5). |

**Impact of correction:** blast radius **drops from ~60 to ~40–50 files** (7 new + 30–40 consumer wiring). Risk **may downgrade from CRITICAL to HIGH** with owner rationale (we are wiring an existing model, not designing sacred logic from scratch). Owner decision — see §7 OQ-Δ.

---

## §2 — Conflict Pre-Check (R16)

**File Ownership audit — target files vs. currently in-flight items** (checked against 26 non-closed items in `registry.json`):

| Target file | Last modifier (from FILE_OWNERSHIP.md) | In-flight items touching it? | Conflict risk |
|---|---|---|---|
| `App.js` | CR-061 (2026-06-18) — routes | **None active** | LOW — sequential route addition |
| `contexts/AppProviders.jsx` | R7 protected; not touched by CR-069 (we reuse existing `AuthProvider`) | N/A | ZERO |
| `contexts/AuthContext.jsx` | Not on hotspot list; permission plumbing already present | **None active** | LOW — minor extension only (see §3.B) |
| `pages/LoadingPage.jsx` | CR-002 CRM 2.0 + BUG-098 | **None active** | LOW — no changes expected; already hydrates `permissions` |
| `components/layout/Sidebar.jsx` | 5 CRs historically (CR-040/042/044/BUG-131/BUG-136/CR-041/CR-011 FE-fixes) | **None active** | MEDIUM historically; currently clean |
| `components/order-entry/OrderEntry.jsx` (R5) | CR-037 (2026-06-13) | **CR-058** (order-level comp, INTAKE, HIGH) — could add complimentary button that would need gating | MEDIUM |
| `components/order-entry/CartPanel.jsx` (R5) | BUG-122 post (2026-06-10) + BUG-188/195 (2026-07-11) | **CR-064** (add unit price, LOW) — non-overlapping | LOW |
| `components/order-entry/CollectPaymentPanel.jsx` (R5) | CR-021 (2026-06-10) | **BUG-118** (nth-item coupon), **BUG-186** (settlement) — different code paths | LOW–MEDIUM |
| `components/cards/OrderCard.jsx` | BUG-144 (2026-07-11) + BUG-122 | **None active** | LOW |
| Menu Mgmt files | CR-014 CLOSED, BUG-120 GATE 2 | **CR-057** (No-Tax option, CRITICAL) — same file family | MEDIUM — coordinate sequencing |
| Expense files | CR-059/061 shipped | **CR-062, CR-065, BUG-162/172/173/174** — active | MEDIUM — freeze expense gating until they land |

**Conflict verdict:** No hard conflicts today. Recommend **CR-069 core (Employee CRUD + Role Mgmt + PermissionGate primitive + Sidebar gating) ships in Wave 1**; **app-wide consumer wiring stages in Wave 2** after CR-057, CR-058, and expense-family items close (or coordinate per-file merges with FILE_OWNERSHIP.md updates).

---

## §3 — Data Flow Trace

### A. Login → Permission hydration (already implemented)

```
User submits LoginPage form
  → authService.login(credentials, rememberMe)
    → POST {LOGIN_ENDPOINT}
    → fromAPI.loginResponse(response.data)
       returns { token, crmToken, permissions? }
    → localStorage.setItem(AUTH_TOKEN, token)
    → sessionStorage.setItem('permissions', JSON.stringify(perms))
  → AuthContext.setToken(token) + setPermissions(perms)
  → Navigate to /loading
    → LoadingPage: profileService.getProfile()
       returns { user: { roleName, ... }, permissions: [...], restaurant }
    → setUserData(user, permissions)   ← authoritative permissions load
    → console.table(permissions)       ← debug already in place
  → Navigate to /dashboard
```

**Break point today:** none — the flow works. But `authData.permissions` from login response may currently be empty for legacy users (verify with `preprod` curl once endpoint is shared — OQ-1).

### B. Sidebar navigation gate (already implemented, partial)

```
Sidebar render
  → for each menuItem:
    const perm = SIDEBAR_PERMISSIONS[item.id]
    if (perm && !hasPermission(perm)) → hide
  → for each child under item (Reports, Settings, Insights):
    if (child.comingSoon) → showComingSoon toast
    else → navigate
```

**Gap:** Only top-level menu items are gated. Children (individual reports, individual settings tiles) have no permission map. Employee Mgmt tile itself has `comingSoon: true` (Sidebar.jsx:110) — needs to flip to a real route once the page ships, and needs its own permission (`employee_management` or similar — TBD).

### C. Action-level gate (does not exist yet — NEW)

```
Component renders action button
  → <PermissionGate permission="orders.cancel">
      <Button onClick={handleCancel}>Cancel</Button>
    </PermissionGate>
  OR
  → const canCancel = usePermission('orders.cancel');
    { canCancel && <Button ...>Cancel</Button> }
```

**Design decision needed (OQ-3):** we recommend `<PermissionGate>` for JSX blocks and `usePermission()` for boolean logic; both consume the same underlying hook. Owner to confirm at Impact Analysis review.

### D. Employee/Role management (does not exist yet — NEW)

```
Sidebar: Settings → Employee Management (once un-Coming-Soon'd)
  → /settings/employees route (or /employees)
  → EmployeeManagementPage
    → EmployeeListView
       → employeeService.list()  ← NEW
       → renders table
    → "+ Add Employee" → EmployeeFormDialog
       → RoleSelect (loads from roleService.list())
       → save → employeeService.create()/update()

Sidebar: Settings → Role Management (NEW tile)
  → /settings/roles
  → RoleManagementPage
    → RoleListView + PermissionMatrixView (checkbox grid)
```

---

## §4 — Affected Files (predicted)

### A. NEW files (~7)

| # | File | Purpose | Lines (est.) |
|---|---|---|---|
| 1 | `pages/EmployeeManagementPage.jsx` | Page shell + route wrapper | ~120 |
| 2 | `components/panels/employee/EmployeeListView.jsx` | Table + search + filter + row actions | ~250 |
| 3 | `components/panels/employee/EmployeeFormDialog.jsx` | Add/Edit modal (name, phone, email, password, role, status) | ~200 |
| 4 | `pages/RoleManagementPage.jsx` | Role CRUD + permission-matrix grid | ~300 |
| 5 | `components/guards/PermissionGate.jsx` | `<PermissionGate permission="..."><children/></PermissionGate>` — thin wrapper on `useAuth().hasPermission()` | ~30 |
| 6 | `api/services/employeeService.js` | list / get / create / update / delete | ~120 |
| 7 | `api/services/roleService.js` | list / get / create / update / delete + `permissions()` for catalog | ~120 |
| 8 | `api/transforms/employeeTransform.js` | API ↔ FE shape (Rule R11) | ~80 |
| 9 | `api/transforms/roleTransform.js` | API ↔ FE shape | ~60 |
| 10 | `constants/permissionCatalog.js` | Static canonical list of every gate-able action (~40–60 keys) | ~120 |

**Total new: ~10 files, ~1,400 lines.** (Slightly higher than intake estimate because PermissionMatrixView is meaningful.)

### B. MODIFIED — infrastructure (small, ~5 files)

| # | File | Change |
|---|---|---|
| 1 | `contexts/AuthContext.jsx` | *Optional* — add `roleName`/`roleId` to context if login/profile response carries it (currently `user.roleName` is fetched by LoadingPage but not surfaced through context). ~5 lines. |
| 2 | `api/constants.js` | Add `EMPLOYEE_*` + `ROLE_*` endpoints (once owner shares OQ-1). |
| 3 | `api/transforms/authTransform.js` | `fromAPI.loginResponse` — ensure `permissions[]` flow is captured; may already be complete. |
| 4 | `components/layout/Sidebar.jsx` | (a) Remove `comingSoon: true` on line 110 for `employee-management`. (b) Add new sidebar entry for `role-management` under Settings. (c) Add child-level permission map for Settings subtree if OQ-3 requires. (d) Bump `SIDEBAR_PERMISSIONS` catalog if new keys arrive. |
| 5 | `App.js` | Add 2 routes: `/settings/employees` (or `/employees`), `/settings/roles` (or `/roles`). |

### C. MODIFIED — consumer gates (LARGE, ~30–40 files)

**These are the "entire mapping" files owner referenced.** Each requires (i) reading the action's target permission key, (ii) wrapping with `PermissionGate` or checking `usePermission()`, (iii) code comment `// CR-069` per R18.

Grouped by risk band:

| Band | Files | Est. |
|---|---|---|
| **R5/R6 hotspots** (need per-file owner ratification per §Business safety rule) | `OrderCard.jsx` (~34 handlers), `CartPanel.jsx` (~23), `OrderEntry.jsx` (~24), `CollectPaymentPanel.jsx` (~26), `TableCard.jsx` (~23), `orderTransform.js` (**READ-ONLY** — do NOT modify; gates live in components) | 5 files, ~10–15 gated actions each |
| **Reports** | `AllOrdersReportPage.jsx`, `RoomOrdersReportPage.jsx`, `reports-module/OrderLedgerMockup.jsx`, `.../PaymentsMockup.jsx`, `.../SettlementReportMockup.jsx`, `.../ItemSalesHybridMockup.jsx`, `.../CancellationsMockup.jsx`, `.../DailySalesMockup.jsx` — audit tab, export, filter by user | ~8–10 files |
| **Menu Mgmt** | `MenuManagementPage.jsx`, `BulkEditor.jsx`, `ProductForm.jsx`, `ProductList.jsx`, `CategoryList.jsx` — bulk edit, delete, price edit | 5 files |
| **Credit / Settlement / Expense / Day Closure** | `CreditManagementPage.jsx`, `SettlementPanel.jsx`, `ExpenseEntryPage.jsx`, `ExpenseSetupPage.jsx`, `DayClosurePage.jsx` — create/edit/void gates | 5 files |
| **Settings** | `SettingsPage.jsx`, `RestaurantSettingsPage.jsx`, `StatusConfigPage.jsx`, `ViewEditViews.jsx`, `TableManagementView.jsx` — tile visibility, edit gates | 5 files |
| **Room** | `RoomCheckInModal.jsx`, `RoomOrdersMockup.jsx` — check-in/check-out gates | 2 files |
| **Login / Auth** | `LoginPage.jsx` — no changes expected; already fine | 0 |

**Rough consumer surface:** ~30 files, ~80–120 gate insertions. Not every click handler needs a gate; only the ones flagged in the Permission Catalog (§6).

### D. Files explicitly NOT touched (scope-lock per R14)

- `api/transforms/orderTransform.js` — **R6 sacred**. Gates live in UI components, not in payload transforms.
- `api/transforms/paymentTransform.js`, `couponService.js`, `loyaltyTransform.js` — same reasoning.
- `contexts/AppProviders.jsx` — **R7 sacred**. No new provider; we reuse existing `AuthProvider`.
- All `__tests__/**` — will be updated during IMPLEMENTATION, not touched now.
- All `/app/memory/final/**` — frozen (R2).

---

## §5 — Backend Contract Requirements (BLOCKED on OQ-1)

Endpoints we predict are needed. Marked ⏳ = pending owner share; will curl-probe per R11 when available and update this doc.

### A. Existing endpoints we depend on (verify shape)

| Endpoint | Purpose | Verification |
|---|---|---|
| `POST /login` | Must return `permissions[]` in response | ⏳ Curl-probe once endpoint shared |
| `GET /profile` (via `profileService.getProfile`) | Must return `user.roleName`, `user.roleId`, `permissions[]` | ⏳ Curl-probe |

### B. NEW endpoints owner needs to expose (predicted)

| Method | Endpoint pattern | Purpose |
|---|---|---|
| GET | `/employees` (list) | Employee list with `role`, `status` |
| GET | `/employees/{id}` | Employee detail |
| POST | `/employees` | Create employee |
| PUT/PATCH | `/employees/{id}` | Update employee (name, phone, role, status) |
| DELETE | `/employees/{id}` | Deactivate (soft-delete recommended) |
| POST | `/employees/{id}/password` | Reset password (if OQ-6 = admin-set) |
| GET | `/roles` | Role list |
| GET | `/roles/{id}` | Role detail incl. permission grants |
| POST | `/roles` | Create role |
| PUT/PATCH | `/roles/{id}` | Update role name + permissions |
| DELETE | `/roles/{id}` | Delete role (only if no employees assigned) |
| GET | `/permissions` | Canonical permission catalog (source of truth for §6) |

### C. Backend Brief needed (R11 / v0.7 §Backend Handoff Template)

If any of the above return unexpected shape (e.g., different `roleName` casing between endpoints — see BUG-182 precedent), a `BACKEND_BRIEF_CR-069_2026_02_15.md` must be filed under `/app/memory/backend_briefs/`. This is a common trap — BUG-182 documents `employee_name` inconsistency across expense endpoints on this exact backend.

---

## §6 — Permission Catalog — Draft

Canonical keys the FE will use. Grouped by module. Owner + backend confirm names during OQ-2.

**Naming convention (proposed):** `{module}.{action}` — e.g., `orders.cancel`, `menu.edit`, `reports.export`. Lowercase, dot-separated.

```
# Existing (already used in SIDEBAR_PERMISSIONS)
pos                     # Dashboard, Day Closure, Credit, Expenses
menu                    # Menu Management page
report                  # Reports + Insights top-level access
restaurant_settings     # Settings top-level access
credit                  # Currently unused (sidebar reuses 'pos')

# Orders (gated at button level)
orders.view
orders.create
orders.edit
orders.cancel                    # ← CR-068's target permission
orders.item_cancel               # ← CR-068 sub-question
orders.refund
orders.discount_apply
orders.complimentary_mark        # ← CR-058's target permission
orders.split
orders.settle
orders.print_bill
orders.print_kot
orders.reopen
orders.transfer_table

# Menu
menu.view
menu.create_item
menu.edit_item
menu.delete_item
menu.bulk_edit
menu.category_manage
menu.price_edit                  # separate — commonly restricted
menu.no_tax_toggle               # ← CR-057's target permission

# Reports & Insights
report.view
report.audit_tab                 # already env-flagged; layer permission on top
report.export
report.filter_all_users          # see own reports vs. all users

# Settings
settings.view
settings.restaurant_edit
settings.printers
settings.table_management        # ← CR-060 wired area
settings.employee_management     # ← THIS CR
settings.role_management         # ← THIS CR
settings.operating_hours
settings.cancellation_reasons
settings.status_config
settings.channel_visibility

# Credit / Settlement / Expense / Day Closure
credit.view
credit.create
credit.edit
credit.void
settlement.view
settlement.perform               # actually settle a day
day_closure.perform
expense.view
expense.create
expense.edit
expense.void

# Room
room.check_in
room.check_out
room.transfer

# Admin
admin.employees.manage           # convenience alias
admin.roles.manage
admin.impersonate                # future
```

**Count:** ~55 permission keys. Owner may prune/merge/rename during OQ-2. Backend authoritative list wins (OQ-1 disclosure).

---

## §7 — Owner Decision Queue

Combines Intake OQs with new ones surfaced during analysis:

| # | Question | Priority | Blocks |
|---|---|---|---|
| OQ-1 (intake) | **Full backend endpoint list** for employees + roles + permissions on `preprod.mygenie.online` | 🔴 P0 | Curl-probe / R11 / all planning |
| OQ-2 (intake) | Default seeded roles + canonical permission catalog from backend | 🔴 P0 | §6 finalization / mockups |
| OQ-7 (intake) | Confirm CR-069 ships before CR-068 (Cancellation Role-Gating) | 🟡 P1 | Sprint sequencing |
| OQ-8 (intake) | One PR vs. two-slice (Employee CRUD → Roles/Perms → Consumer wiring) | 🟡 P1 | Implementation batching |
| OQ-3 (intake) | Permission granularity — resource-level (`orders.cancel`) confirmed as proposal? | 🟢 P2 | §6 taxonomy |
| OQ-4 (intake) | Multi-restaurant scope — per-tenant or global? | 🟡 P1 | Data model |
| OQ-5 (intake) | Migration of existing user accounts to role model | 🟡 P1 | Backend + release plan |
| OQ-6 (intake) | Password policy on Employee Create — admin-set / invite-email / phone-OTP | 🟡 P1 | Form design |
| **OQ-9** ⭐ (new — §1 correction) | **Risk downgrade** — Permission model already exists; may we downgrade risk from CRITICAL → HIGH? (v0.7 §Risk Classification requires owner rationale for downgrade) | 🟡 P1 | Process rigor level for the sprint |
| **OQ-10** ⭐ (new — §3.C) | Confirm gate primitive: **`<PermissionGate>` for JSX blocks + `usePermission()` for logic**? Or JSX-only? Or Hook-only? | 🟡 P1 | Consumer wiring style |
| **OQ-11** ⭐ (new — §4.C) | Wave strategy — Wave 1 = Employee CRUD + Role Mgmt + Sidebar polish; Wave 2 = R5 hotspot consumer wiring (delayed until CR-057/058 close). Owner confirms? | 🟡 P1 | Sprint sequencing |
| **OQ-12** ⭐ (new — §5.C) | If backend returns inconsistent shapes (BUG-182 precedent), do we open a `BACKEND_BRIEF` and delay the affected wave, or ship an FE workaround? | 🟢 P2 | Contingency planning |
| **OQ-13** ⭐ (new — §6) | Permission-key naming convention — `orders.cancel` (dot) vs. `cancel_order` (underscore) vs. backend-defined verbatim? | 🟡 P1 | Catalog finalization |
| **OQ-14** ⭐ (new — mockups) | **Mockup workflow** — should I invoke `design_agent_full_stack` to produce mockups for the 4 primary screens (see §8), or will owner supply mocks from the Old POS? | 🔴 P0 | Gate-3 blocked until mocks approved |

---

## §8 — Mockup Requirements (Gate-3 gate per owner directive)

Owner explicit instruction: *"do not move to planning [Gate 3] till mockups are finalized for screens and approved by me."*

**Screens that need mockups before Gate 3:**

| # | Screen | Purpose | Complexity |
|---|---|---|---|
| 1 | **Employee List** (`EmployeeListView.jsx`) | Table: Name / Phone / Email / Role / Status / Actions. Search + role filter + status filter. Row-level Edit/Deactivate. | Medium |
| 2 | **Employee Form Dialog** (`EmployeeFormDialog.jsx`) | Add/Edit modal: Name, Phone (with country code), Email, Password (or invite-flow per OQ-6), Role dropdown, Status toggle. | Medium |
| 3 | **Role List + Permission Matrix** (`RoleManagementPage.jsx`) | Left pane: role list. Right pane: matrix of permission-catalog rows × role columns with checkboxes. Save-per-role. | High |
| 4 | **Role Create/Edit Dialog** | Role name + description + inherit-from-existing shortcut. | Low |
| 5 | *(optional)* Sidebar tile placement | Confirms whether Employee Mgmt + Role Mgmt live under Settings tile grid or top-level sidebar. | Low |

**Recommended mockup workflow:**
1. Owner answers OQ-14 (produce via `design_agent_full_stack` OR owner supplies Old POS references).
2. If agent-produced: I invoke `design_agent_full_stack` with the 4 screens + shadcn/Tailwind constraints + existing sidebar aesthetic (green accent per `mygenie` brand seen in login screenshot).
3. Owner reviews, requests iterations, approves.
4. Mockups saved to `/app/memory/evidence/CR-069/mockups/` per v0.7 artifact standard.
5. Owner posts approval → I unlock and proceed to **Gate 3 Implementation Plan**.

---

## §9 — Downstream Consumer Trace

CRs / bugs that unblock or plug in once CR-069 ships:

| Item | Relationship | Plug-in point |
|---|---|---|
| **CR-068** (Cancellation Role-Gating, INTAKE, P1) | **Depends on CR-069** (formally: `CR-068.depends_on: ["CR-069"]` in registry). | Consumes `orders.cancel`, `orders.item_cancel` from §6 catalog. Re-plans on top of `PermissionGate`. |
| **CR-058** (Order-level Complimentary, INTAKE, HIGH) | Adjacent — would benefit from `orders.complimentary_mark` permission. | Consumer wiring in Wave 2. |
| **CR-057** (Menu No-Tax option, INTAKE, CRITICAL) | Adjacent — `menu.no_tax_toggle` permission would gate the new toggle. | Consumer wiring in Wave 2. |
| **CR-041** (Settings module) | Employee Mgmt tile lived under CR-041's Settings grid as Coming Soon. This CR removes that flag. | Sidebar.jsx line 110. |
| **CR-060** (Table/Room Mgmt CRUD) | Similar shape (list + form + service + transform). **Pattern reference** for Employee CRUD. | Copy pattern. |
| **BUG-182** (Expense employee name inconsistency, BACKEND-BLOCKED) | Precedent — backend has employee-name shape drift. Warns us to curl-probe every response carefully. | Test data validation. |
| **Future employee Phase 2** (attendance/shifts/payroll/leaves) | Will plug into Employee module. Not scoped here. | — |

---

## §10 — Verification Approach (preview only — full Matrix belongs in Gate 3)

Because Gate 3 is blocked, I list high-level verification themes here. The **Verification Matrix** (per v0.7 §PLANNING Step 4) belongs in the future Implementation Plan and will be seeded from these themes:

1. **Login → permissions hydration** — curl probe `/login` + `/profile`; assert `permissions[]` populated; DevTools console shows `console.table`.
2. **Sidebar visibility** — set `permissions=['pos']` in sessionStorage manually → refresh → verify only Dashboard/Day Closure/Credit/Expenses visible.
3. **Employee CRUD** — create/edit/deactivate; verify list refresh; check API contract with curl side-by-side.
4. **Role CRUD** — create role with subset of permissions; assign to test employee; verify that employee's UI reflects new gates on next login.
5. **Consumer gate spot-checks** — 3–5 randomly selected gated buttons across R5 hotspots: verify hidden/disabled with permission absent, visible/enabled with permission present.
6. **Regression** — full critical path (login → order → settle → report → logout) with default "Owner" role — expect ZERO functional change.
7. **BUG-182-style drift** — curl `/profile` vs. `/employees/{me}` — flag any employee-name inconsistency.

---

## §11 — Post-Code Registry Checklist (preview — belongs in Gate 3)

For visibility only; full checklist belongs in the future Implementation Plan (per v0.7 §PLANNING Step 5).

```
- [ ] registry.json: CR-069 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row status update
- [ ] FILE_OWNERSHIP.md: append all ~40 files modified with CR-069 tag + date
- [ ] Code markers: // CR-069 in every modified file per R18
- [ ] BUG_TRACKER.md: no changes (this is a CR, not a bug)
- [ ] OPEN_GAPS_REGISTER.md: OG-CR041-EMPLOYEE-MGMT already marked SUBSUMED at intake
- [ ] CR-068 depends_on already includes CR-069 (done at intake)
```

---

## PLANNING Final Response (v0.7 format)

```
Planning complete: CR-069
Stage: Impact Analysis (Gate 2) — Gate 3 (Implementation Plan) intentionally deferred per owner directive
Code reality: PARTIAL (corrected from NONE at intake — permission model already exists)
Risk: CRITICAL (may downgrade to HIGH — see OQ-9)
Files WILL change: ~10 new + ~5 infra + ~30 consumer wiring = ~45 files (revised down from ~60)
Files WILL NOT touch: orderTransform.js, AppProviders.jsx (R7), /app/memory/final/*
Owner decisions: 14 open questions — 4 blockers (OQ-1, OQ-2, OQ-14, ↓ Wave strategy)
Docs: /app/memory/impact/CR-069_IMPACT_ANALYSIS.md
Next: Owner validation of this Impact Analysis → mockup production → mockup approval → Gate 3 Implementation Plan
```
