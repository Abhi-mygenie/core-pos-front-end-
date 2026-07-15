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

## §5 — Backend Contract (VALIDATED via live curl-probe 2026-02-15)

Endpoints probed with fresh token from `owner@cafe103.com` login. All 4 GET endpoints returned **HTTP 200**. Full JSON responses saved under `/app/memory/evidence/CR-069/api_responses/`. Consolidated authoritative catalog at `/app/memory/evidence/CR-069/AUTHORITATIVE_CATALOG.json`.

### A. Endpoints (owner-provided, all live-verified)

| Method | Endpoint | Purpose | Response shape (top-level) | Sample size |
|---|---|---|---|---|
| POST | `/api/v1/auth/vendoremployee/login` | Auth + hydrate `role_name` + `role[]` (permissions) | `{ token, role_name, role[], firebase_token, crm_token, first_login, zone_wise_topic }` | 50 perms for Owner |
| GET | `/api/v2/vendoremployee/employee/employees-list` | List employees | `{ employees: [...] }` | 19 employees @ cafe103 |
| GET | `/api/v1/vendoremployee/employee/role-list` | List configured roles | `{ message, roles: [...] }` | 9 roles @ cafe103 |
| GET | `/api/v2/vendoremployee/employee/all-role-list` | **Canonical permission catalog** + role types | `{ role_types: [6], role_modules: { frontend:[27], backend:[13], report:[12] } }` | 6 role_types + 52 modules |
| GET | `/api/v1/vendoremployee/employee/role-master-list` | Predefined role templates | `{ message, count, roles: [...] }` | 10 templates |
| POST | `/api/v2/vendoremployee/employee/employees-add` | Create employee | body: `{ f_name, l_name, role_id, email, phone, bill_user_view, password }` | — |
| POST/PUT | `/api/v2/vendoremployee/employee/employees-update/{id}` | Update employee | body: same as add minus `password` | — |
| POST/PUT | `/api/v2/vendoremployee/employee/employee-status/{id}` | Toggle active/inactive | body: `{ status: 0\|1 }` | — |
| POST | `/api/v1/vendoremployee/employee/role-add` | Create role | body: `{ name, modules[], role_type[], role_master_id, printmodules }` | — |
| POST/PUT | `/api/v1/vendoremployee/employee/role-update/{id}` | Update role | body: same + `status` | — |

**Not yet shared by owner (may be needed):** DELETE role, single employee GET, single role GET (may be inferable from list responses if backend supports pagination or filtering).

### B. Entity Shapes (from live responses)

**Employee** (from `employees-list`):
```
id, f_name, l_name, phone, email, status (0/1), image (URL),
role: { id, name },
bill_user_view: "Yes" | "No",
mac_ip_kds, mac_ip_bill, mac_ip_bar   ← Station IP configuration per employee
                                        (NOT in owner's add-employee payload — surface in edit form? See OQ-15 below)
```

**Role** (from `role-list`):
```
id, name, status (0/1),
parent_role, role_master_id (nullable), role_master_name (nullable),
modules: [string], total_modules,
is_system_role (bool), is_editable (bool), protection_level ("System Protected" | ...),
created_at, updated_at
```

⚠️ **Critical UX gate:** `is_editable: false` means the UI must show the role as **read-only with a lock affordance**. Example: `"BAR"` role has `is_system_role: true, is_editable: false, protection_level: "System Protected"`.

**Role Master Template** (from `role-master-list`):
```
id, name (e.g., "Accountant"), map_role (role_type mapping),
default_modules: [string], is_protected (bool),
created_at, updated_at
```

Purpose: When creating a new role, user picks a template → form pre-fills with `default_modules[]`.

**Role Type** (from `all-role-list.role_types`):
```
6 values: STATION, Waiter, Manager, Billing, Server Waiter (Buffet), Delivery
```
These are the values for `role_type[]` on role add/update payloads.

**Permission Catalog** (from `all-role-list.role_modules`) — §6 below.

### C. Rule R9 — Backend Spelling Verbatim (CONFIRMED from live catalog)

The live catalog contains these authoritative typos. FE MUST use verbatim (do NOT correct in transforms, filters, or UI code):

| `role_pass_value` (permission key) | Display `name` | English intent |
|---|---|---|
| `expence` | Expence | expense |
| `report_summery` | report summery | report summary |
| `sattle_report` | sattle report | settle_report |
| `complementary_food` | Complementary Food | complimentary (order-level comp) |
| `revenue_report_average` | revenue report_average | revenue_report_average |

### D. Backend Brief — not needed at this time

All response shapes are consistent within themselves. No BUG-182-style drift detected across employees-list vs. role-list. If a drift shows up during Gate 3 curl re-probes, we'll file `BACKEND_BRIEF_CR-069_<date>.md`.

---

## §6 — Permission Catalog (AUTHORITATIVE — from live `all-role-list` response)

**Source of truth:** `GET /api/v2/vendoremployee/employee/all-role-list` → `role_modules` dict, grouped into 3 categories by backend.

**52 total permissions**, grouped as the backend delivers them. The FE `permissionCatalog.js` should mirror this structure verbatim.

### Category: `frontend` (27 permissions — POS/Order actions)

| `role_pass_value` (permission key) | Display label |
|---|---|
| `food` | food |
| `pos` | Pos |
| `order` | Order |
| `bill` | Bills |
| `order_cancel` | Order Cancel |
| `serve` | Serve |
| `aggregator` | Aggregator |
| `show_online_order` | Show Online Order |
| `assign_online_order` | Assign Online Order |
| `order_unpaid` | Order Unpaid |
| `update_payment` | Update Payment |
| `order_edit` | Order Edit |
| `delivery_man` | Delivery Man |
| `clear_payment` | Clear Payment |
| `ready` | Ready |
| `customer_management` | customer management |
| `virtual_wallet` | virtual wallet |
| `discount` | Discount |
| `transfer_table` | Transfer Table |
| `merge_table` | Merge Table |
| `food_transfer` | Food Transfer |
| `whatsapp_icon` | WhatsApp Icon |
| `print_icon` | Print Icon |
| `table_view` | Table View |
| `token_display` | Token Display |
| `confirm_order` | Confirm Order |
| `complementary_food` | Complementary Food ⚠️ (R9 typo — "complimentary") |

### Category: `backend` (13 permissions — module-level access)

| `role_pass_value` | Display label |
|---|---|
| `employee` | Employee |
| `restaurant_setup` | Restaurant Setup |
| `inventory` | Inventory |
| `coupon` | Coupon |
| `printer` | Print Bill |
| `menu` | Menu |
| `expence` | Expence ⚠️ (R9 typo — "expense") |
| `loyalty` | Loyalty |
| `restaurant_settings` | restaurant settings |
| `printer_management` | Printer Management |
| `table_management` | Table Management |
| `delivery_management` | Delivery Management |
| `physicalqty_master` | PhysicalQty Master |

### Category: `report` (12 permissions — report access)

| `role_pass_value` | Display label |
|---|---|
| `report` | report |
| `report_summery` | report summery ⚠️ (R9 typo — "summary") |
| `waiter_revenue_report` | waiter revenue_report |
| `sattle_report` | sattle report ⚠️ (R9 typo — "settle") |
| `revenue_report` | revenue report |
| `room_report` | room report |
| `sales_report` | sales report |
| `revenue_report_average` | revenue report_average |
| `consumption_report` | consumption report |
| `cancellation_report` | cancellation report |
| `pl_report` | PL Report |
| `wastage_report` | Wastage Report |

### Role Types (6 — used in `role_type[]` field on role add/update)

`STATION`, `Waiter`, `Manager`, `Billing`, `Server Waiter` (value=`Buffet`), `Delivery`

### Live-configured roles at cafe103 (`role-list` — 9 roles)

`BAR` *(system, non-editable)*, `captain`, `KDS`, `Manager`, `Manger(C)`, `Owner`, `owner(c)`, `Report`, `Waiter`

### Predefined role templates (`role-master-list` — 10 templates)

`Accountant`, `Billing User`, `Captain`, `Cashier`, `Delivery Boy`, `Manager`, `Owner`, `Station (Chef)`, `Waiter(S)`, `Waiter(T)`

**Design implication:** The Permission Matrix UI in the Role Management screen must render the 52 permissions **grouped by these 3 backend categories** (frontend / backend / report) — not by our earlier speculative grouping. This drops OQ-13 (naming convention) — backend is authoritative.

---

## §7 — Owner Decision Queue

**Update 2026-02-15 post-probe:** OQ-1 partially resolved (endpoints shared + probed live). OQ-2 fully resolved (backend catalog is authoritative — see §6). OQ-13 dropped (backend keys used verbatim per R9).

| # | Question | Status | Priority | Blocks |
|---|---|---|---|---|
| ~~OQ-1~~ (intake) | Full backend endpoint list for employees + roles + permissions | ✅ **RESOLVED** — 9 endpoints provided + 4 GETs live-probed | — | — |
| ~~OQ-2~~ (intake) | Default seeded roles + canonical permission catalog | ✅ **RESOLVED** — 52 permissions in 3 categories + 10 role templates confirmed live (§6) | — | — |
| ~~OQ-13~~ (analysis) | Permission-key naming convention | ✅ **RESOLVED** — use backend keys verbatim per R9 | — | — |
| OQ-7 (intake) | Confirm CR-069 ships before CR-068 (Cancellation Role-Gating) | ⏳ Open | 🟡 P1 | Sprint sequencing |
| OQ-8 (intake) | One PR vs. two-slice (Employee CRUD → Roles/Perms → Consumer wiring) | ⏳ Open | 🟡 P1 | Implementation batching |
| OQ-3 (intake) | Permission granularity — `<PermissionGate>` for JSX + `usePermission()` for logic (proposal) | ⏳ Open | 🟢 P2 | Consumer wiring style |
| OQ-4 (intake) | Multi-restaurant scope — per-tenant or global? | ⏳ Open | 🟡 P1 | Data model (probably per-tenant given login flow — needs owner confirm) |
| OQ-5 (intake) | Migration of existing user accounts to role model | ⏳ Open — likely N/A since roles already exist per `role-list` | 🟡 P1 | Release plan |
| OQ-6 (intake) | Password policy on Employee Create — admin-set / invite-email / phone-OTP | ⏳ Open — current `add-employee` payload accepts `password` directly (admin-set) | 🟡 P1 | Form design |
| OQ-9 (analysis) | Risk downgrade CRITICAL → HIGH | ⏳ Open | 🟡 P1 | Process rigor |
| OQ-10 (analysis) | Gate primitive — `<PermissionGate>` + `usePermission()` combo | ⏳ Open | 🟡 P1 | Consumer wiring |
| OQ-11 (analysis) | Wave strategy — Wave 1 (Employee + Role Mgmt + Sidebar) then Wave 2 (R5 consumer wiring after CR-057/058 close) | ⏳ Open | 🟡 P1 | Sprint sequencing |
| OQ-12 (analysis) | Backend drift contingency (BUG-182-style) — brief + delay, or FE workaround? | ⏳ Open | 🟢 P2 | Contingency |
| OQ-14 (analysis) | Mockup workflow — `design_agent_full_stack` vs. owner-supplied | ⏳ Open — proceeding with **design_agent proposal** unless owner overrides | 🔴 P0 | Gate 3 |
| **OQ-15** ⭐ NEW | **`mac_ip_kds` / `mac_ip_bill` / `mac_ip_bar` fields** are on every employee record but NOT in the add-employee payload owner shared. Are these Phase 1 (surface in edit form for station routing config) or Phase 2 (hide)? | ⏳ Open | 🟡 P1 | Employee Form design |
| **OQ-16** ⭐ NEW | **System-protected roles** (e.g., `BAR` with `is_editable: false, protection_level: "System Protected"`) — should the UI show them at all, show read-only, or hide entirely? Recommend show read-only with a lock badge. | ⏳ Open | 🟡 P1 | Role List UX |
| **OQ-17** ⭐ NEW | **`role_master_id` on role create** — should it be required (user must pick a template) or optional (allow fully-custom roles with `null`)? Live data shows both patterns. | ⏳ Open | 🟡 P1 | Role Form UX |

**Currently blocking Gate 3:** OQ-14 (mockup workflow — but proceeding by default), OQ-11 (wave strategy — impacts plan slicing), OQ-15/16/17 (Form UX details for the mockups themselves).

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
