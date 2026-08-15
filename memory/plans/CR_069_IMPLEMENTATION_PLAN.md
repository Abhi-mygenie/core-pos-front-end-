# CR-069 — Implementation Plan (Gate 3)

**Document:** `plans/CR_069_IMPLEMENTATION_PLAN.md`
**Created:** 2026-07-15
**Role:** PLANNING (Gate 3)
**Impact Analysis ref:** `impact/CR-069_IMPACT_ANALYSIS.md`
**Intake ref:** `change_requests/CR-069_EMPLOYEE_MANAGEMENT_INTAKE.md`
**Mockup ref:** `/app/frontend/public/cr069-mockup.html` (FROZEN 2026-07-15)
**Status:** COMPLETE — awaiting Gate 4 GO

---

## Header Block (v0.7 mandatory)

| Field | Value |
|---|---|
| **Code Reality** | **PARTIAL** — AuthContext permissions plumbing exists. Employee/Role management UI is greenfield. |
| **Conflict Pre-Check** | Verified 2026-07-15: no in-flight items touching target files. Sidebar.jsx last modified by CR-060 (CLOSED). App.js last modified by CR-061 (CLOSED). constants.js last modified by CR-060 (CLOSED). |
| **Risk** | **CRITICAL** (owner decision OQ-9: keep strict — any financial/access logic touch requires explicit approval) |
| **Wave** | **Wave 1 only** (management pages). Wave 2 (consumer wiring ~30 files) = separate future plan. |
| **PR Strategy** | **Two PRs** per OQ-8: PR1 = Employee CRUD, PR2 = Role CRUD |
| **Fast Lane** | NO |

---

## Scope Lock (R14)

### Files WILL change (Wave 1):

**PR1 — Employee CRUD (5 new + 3 modified = 8 files)**

| # | File | Action | Est. Lines |
|---|---|---|---|
| 1 | `api/services/employeeService.js` | NEW | ~80 |
| 2 | `api/transforms/employeeTransform.js` | NEW | ~70 |
| 3 | `pages/EmployeeManagementPage.jsx` | NEW | ~60 |
| 4 | `components/panels/employee/EmployeeListView.jsx` | NEW | ~280 |
| 5 | `components/panels/employee/EmployeeFormDialog.jsx` | NEW | ~40 (Reset Password confirmation dialog) |
| 6 | `api/constants.js` | MODIFY | +15 lines (employee + role endpoints) |
| 7 | `components/layout/Sidebar.jsx` | MODIFY | ~3 lines (remove comingSoon, add path) |
| 8 | `App.js` | MODIFY | +3 lines (import + route) |

**PR2 — Role CRUD (5 new + 1 modified = 6 files)**

| # | File | Action | Est. Lines |
|---|---|---|---|
| 9 | `api/services/roleService.js` | NEW | ~100 |
| 10 | `api/transforms/roleTransform.js` | NEW | ~90 |
| 11 | `components/panels/employee/RoleListView.jsx` | NEW | ~200 |
| 12 | `components/panels/employee/RoleFormView.jsx` | NEW | ~300 |
| 13 | `constants/permissionCatalog.js` | NEW | ~180 |
| 14 | `components/guards/PermissionGate.jsx` | NEW | ~25 (ships in PR2, consumed in Wave 2) |

**Total Wave 1: 11 new files + 3 modified files = 14 files, ~1,500 lines**

### Files WILL NOT touch:

- `orderTransform.js` — R6 sacred
- `contexts/AppProviders.jsx` — R7 sacred (reuse existing AuthProvider)
- `contexts/AuthContext.jsx` — no changes needed (permissions plumbing already complete)
- `pages/LoadingPage.jsx` — already hydrates permissions, no changes
- `/app/memory/final/*` — R2 frozen
- Any R5 hotspot file (OrderEntry, CollectPaymentPanel, CartPanel, DashboardPage) — Wave 2 only

---

## PR1 — Employee CRUD

### Edit 1: `api/constants.js` — Add Employee + Role endpoints

**Target:** `/app/frontend/src/api/constants.js`
**Location:** After the last endpoint block (around line 130+), before `STATUS_MAPPINGS`
**Change:** Add new endpoint constants

```js
// CR-069: Employee Management
EMPLOYEES_LIST: '/api/v2/vendoremployee/employee/employees-list',
EMPLOYEES_ADD: '/api/v2/vendoremployee/employee/employees-add',
EMPLOYEES_UPDATE: '/api/v2/vendoremployee/employee/employees-update', // /{id}
EMPLOYEE_STATUS: '/api/v2/vendoremployee/employee/employee-status',   // /{id}

// CR-069: Role Management
ROLE_LIST: '/api/v1/vendoremployee/employee/role-list',
ROLE_ADD: '/api/v1/vendoremployee/employee/role-add',
ROLE_UPDATE: '/api/v1/vendoremployee/employee/role-update',           // /{id}
ALL_ROLE_LIST: '/api/v2/vendoremployee/employee/all-role-list',       // Permission catalog + role types
ROLE_MASTER_LIST: '/api/v1/vendoremployee/employee/role-master-list', // Predefined templates
```

**Verification:** `grep -n "EMPLOYEES_LIST\|ROLE_LIST\|ALL_ROLE_LIST" /app/frontend/src/api/constants.js` → 3 hits

---

### Edit 2: `api/services/employeeService.js` — NEW

**Target:** `/app/frontend/src/api/services/employeeService.js`
**Purpose:** API calls for employee CRUD
**Pattern:** Follow `settlementService.js` structure (axios instance from `api/axios.js`, endpoint constants from `api/constants.js`)

**Functions:**
- `getEmployees()` — GET `EMPLOYEES_LIST`
- `addEmployee(data)` — POST `EMPLOYEES_ADD` with body `{ f_name, l_name, role_id, email, phone, password, bill_user_view }`
- `updateEmployee(id, data)` — POST/PUT `EMPLOYEES_UPDATE/{id}` with body (same minus password)
- `toggleEmployeeStatus(id, status)` — POST/PUT `EMPLOYEE_STATUS/{id}` with body `{ status: 0|1 }`

**Verification:** Import in EmployeeListView and curl-probe each endpoint side-by-side.

---

### Edit 3: `api/transforms/employeeTransform.js` — NEW

**Target:** `/app/frontend/src/api/transforms/employeeTransform.js`
**Purpose:** API ↔ FE shape mapping per R11

**fromAPI.employee(apiEmployee):**
```
API shape → FE shape:
  id         → id
  f_name     → firstName
  l_name     → lastName
  phone      → phone
  email      → email (nullable → '')
  status     → active (0→false, 1→true)
  image      → avatarUrl (nullable → null)
  role.id    → roleId
  role.name  → roleName
```

**toAPI.employee(feEmployee):**
```
FE shape → API payload:
  firstName  → f_name
  lastName   → l_name
  phone      → phone
  email      → email
  roleId     → role_id
  password   → password (only on create)
  billUserView → bill_user_view ('Yes'/'No')
```

**fromAPI.employeeList(response):**
```
  response.employees.map(fromAPI.employee)
```

**Verification:** Unit test: `fromAPI.employee({ f_name: 'Rajesh', status: 1, role: { id: 5, name: 'Owner' } })` → `{ firstName: 'Rajesh', active: true, roleId: 5, roleName: 'Owner' }`

---

### Edit 4: `pages/EmployeeManagementPage.jsx` — NEW

**Target:** `/app/frontend/src/pages/EmployeeManagementPage.jsx`
**Purpose:** Page shell with Employees | Roles tabs

**Structure:**
```jsx
// CR-069: Employee Management Page
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import EmployeeListView from '@/components/panels/employee/EmployeeListView';
// RoleListView imported in PR2

export default function EmployeeManagementPage() {
  return (
    <div className="..." data-testid="employee-management-page">
      <h1>Employee Management</h1>
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees" data-testid="tab-employees">Employees</TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <EmployeeListView />
        </TabsContent>
        <TabsContent value="roles">
          {/* PR2: <RoleListView /> */}
          <div>Coming in PR2</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Verification:** Navigate to `/employees` → page renders with tabs, "Employees" tab active.

---

### Edit 5: `components/panels/employee/EmployeeListView.jsx` — NEW

**Target:** `/app/frontend/src/components/panels/employee/EmployeeListView.jsx`
**Purpose:** Inline editable spreadsheet grid (matching frozen mockup)

**Key behaviors from frozen mockup + OQ decisions:**
- Inline editable grid — same pattern as BulkEditor in Menu Mgmt
- Columns: First Name*, Last Name, Phone*, Email, Password (new rows only), Role (dropdown), Status, Actions
- "+ Add Employee" inserts empty row at top, auto-focuses First Name
- Bulk add — click Add multiple times, fill rows, "Save All" at once
- Existing employee passwords show •••••• (non-editable)
- "Reset Password" button for existing employees (OQ-6)
- Search filter on name/phone/email
- Status toggle (Active/Off) per row
- Unsaved row count indicator

**Data flow:**
```
Mount → employeeService.getEmployees() → employeeTransform.fromAPI.employeeList()
  → state: employees[], newRows[], dirtyRows Set
  → roleService.getRoles() → populate role dropdown options
Save All → for each newRow: employeeService.addEmployee(toAPI.employee(row))
         → for each dirtyRow: employeeService.updateEmployee(id, toAPI.employee(row))
         → refetch list
Toggle status → employeeService.toggleEmployeeStatus(id, newStatus) → refetch
```

**Verification:** 
1. Page loads → employee list visible with data from API
2. Click "Add Employee" → new row appears at top with green highlight
3. Fill row → click "Save All" → new employee created (verify via curl GET employees-list)
4. Edit existing employee name → "Save All" → verify update persisted
5. Toggle status → verify API call sent with correct status

---

### Edit 6: `components/panels/employee/EmployeeFormDialog.jsx` — NEW

**Target:** `/app/frontend/src/components/panels/employee/EmployeeFormDialog.jsx`
**Purpose:** Reset Password confirmation dialog (small component)

**Structure:** AlertDialog that takes employee ID, new password input, confirm password input. On confirm → API call to update employee with new password field.

**Verification:** Click "Reset Password" on existing employee → dialog opens → enter new password → confirm → password updated.

---

### Edit 7: `components/layout/Sidebar.jsx` — MODIFY

**Target:** `/app/frontend/src/components/layout/Sidebar.jsx`
**Location:** Line 110

**Current (line 110):**
```js
{ id: "employee-management", label: "Employee Management", comingSoon: true },
```

**New:**
```js
{ id: "employee-management", label: "Employee Management", path: "/employees" }, // CR-069
```

**Verification:** Sidebar → Settings → Employee Management → navigates to `/employees` (no toast).

---

### Edit 8: `App.js` — MODIFY

**Target:** `/app/frontend/src/App.js`
**Location:** After line 158 (ExpenseSetupPage route), before `</Routes>`

**Add:**
```jsx
import EmployeeManagementPage from "./pages/EmployeeManagementPage"; // CR-069
```
(at import block, around line 55)

```jsx
{/* CR-069: Employee Management */}
<Route path="/employees" element={<ProtectedRoute><EmployeeManagementPage /></ProtectedRoute>} />
```
(in Routes block)

**Verification:** Navigate to `/employees` → EmployeeManagementPage renders.

---

## PR2 — Role CRUD

### Edit 9: `api/services/roleService.js` — NEW

**Functions:**
- `getRoles()` — GET `ROLE_LIST`
- `addRole(data)` — POST `ROLE_ADD` with body `{ name, modules[], role_type[], role_master_id, printmodules }`
- `updateRole(id, data)` — POST/PUT `ROLE_UPDATE/{id}` with body (same + status)
- `getAllRoleList()` — GET `ALL_ROLE_LIST` (permission catalog + role types)
- `getRoleMasterList()` — GET `ROLE_MASTER_LIST` (templates)

---

### Edit 10: `api/transforms/roleTransform.js` — NEW

**fromAPI.role(apiRole):**
```
id → id, name → name, status → active (0→false, 1→true),
modules → modules (string array), total_modules → totalModules,
is_system_role → isSystemRole, is_editable → isEditable,
protection_level → protectionLevel, role_master_id → roleMasterId,
role_master_name → roleMasterName, created_at → createdAt, updated_at → updatedAt
```

**fromAPI.permissionCatalog(allRoleListResponse):**
```
role_modules → { frontend: [...], backend: [...], report: [...] }
role_types → roleTypes array
```

**toAPI.role(feRole):**
```
name → name, modules → modules (string array, verbatim backend keys per R9),
roleTypes → role_type[], roleMasterId → role_master_id (nullable),
active → status (true→1, false→0)
```

---

### Edit 11: `constants/permissionCatalog.js` — NEW

**Purpose:** Static mapping of 52 backend permission keys → 8 business-function groups (frozen mockup design)

**Structure:**
```js
export const PERMISSION_GROUPS = [
  { id: 'orders', title: 'Orders & Billing', color: '#329937', icon: 'ClipboardList',
    permissions: [
      { key: 'pos', label: 'Access POS', desc: 'Can open the POS screen' },
      { key: 'order', label: 'Place Orders', desc: 'Create new orders' },
      // ... 12 total
    ]},
  // ... 8 groups total, 52 permissions total
];

export const SECTION_COLORS = { orders: '#329937', discounts: '#F4A11A', ... };

// Flatten for quick lookup
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions);
export const PERMISSION_MAP = Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, p]));
```

**Data source:** Frozen mockup `PERMS_BY_FUNCTION` array (authoritative, matches live backend catalog §6).

**R9 compliance:** All keys use exact backend spelling (expence, sattle_report, complementary_food, etc.)

---

### Edit 12: `components/panels/employee/RoleListView.jsx` — NEW

**Purpose:** Rich role table (frozen mockup design — 6-column layout)

**Columns (from frozen design):**
1. Role info (name + template badge + protected badge)
2. Employee count (derived from employees list, cross-referenced by role)
3. Permission Coverage (count/52 + % badge + category dots + segmented bar)
4. Last Modified date
5. Status switch (disabled for system roles)
6. Edit/View action

**Data flow:**
```
Mount → roleService.getRoles() + employeeService.getEmployees()
  → compute employeeCountByRole from employees list
  → roleTransform.fromAPI.roleList() + enrich with employee counts
  → render rich table
Edit click → navigate to RoleFormView with role data
Toggle status → roleService.updateRole(id, { status }) → refetch
```

---

### Edit 13: `components/panels/employee/RoleFormView.jsx` — NEW

**Purpose:** Role create/edit with redesigned permission editor (8 business-function groups)

**Key behaviors from frozen mockup:**
- Role Name input (required), Role Type dropdown, "Start from Template" dropdown
- 8 collapsible permission groups with checkboxes
- Per-section "All" toggle + global "Select All" / "Clear All"
- Counter "22/52 selected" + per-section counter
- "Save Role" → roleService.addRole() or updateRole()
- System-protected roles: read-only view, no edit

**Data flow:**
```
Mount → roleService.getAllRoleList() → populate permission catalog from live API
      → roleService.getRoleMasterList() → populate template dropdown
      → if editing: pre-check permissions from role.modules[]
Template select → pre-fill checkboxes from template.default_modules[]
Save → collect checked permissions → toAPI.role() → roleService.addRole/updateRole()
```

---

### Edit 14: `components/guards/PermissionGate.jsx` — NEW

**Purpose:** Thin wrapper for Wave 2 consumer wiring (ships now, consumed later)

```jsx
// CR-069: Permission Gate — hides children when user lacks permission
import { useAuth } from '@/contexts/AuthContext';

export function PermissionGate({ permission, permissions, children, fallback = null }) {
  const { hasPermission, hasAnyPermission } = useAuth();
  
  const allowed = permission
    ? hasPermission(permission)
    : permissions
      ? hasAnyPermission(permissions)
      : true;

  return allowed ? children : fallback; // OQ-10: complete hide, no disabled state
}

export function usePermission(permission) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
```

**Verification:** Unit test: wrap a button in `<PermissionGate permission="foo">`, set permissions to `['bar']` → button not rendered. Set to `['foo']` → button rendered.

---

## Verification Matrix (v0.7 Step 4)

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | constants.js | Add 9 endpoint constants | grep: 9 new EMPLOYEE/ROLE constants found | YES |
| 2 | employeeService.js | 4 API functions | curl each endpoint + verify service calls match | NO |
| 3 | employeeTransform.js | fromAPI/toAPI transforms | Unit test: round-trip transform | YES |
| 4 | EmployeeManagementPage.jsx | Page shell with tabs | Browser: navigate /employees → tabs render | NO |
| 5 | EmployeeListView.jsx | Inline editable grid | Browser: load list, add row, save, edit, toggle status | NO |
| 6 | EmployeeFormDialog.jsx | Reset password dialog | Browser: click Reset Password → dialog → confirm | NO |
| 7 | Sidebar.jsx:110 | Remove comingSoon, add path | Browser: sidebar → Settings → Employee Management → navigates (no toast) | NO |
| 8 | App.js | Add /employees route | Browser: direct nav to /employees → page renders | NO |
| 9 | roleService.js | 5 API functions | curl each endpoint + verify service calls match | NO |
| 10 | roleTransform.js | fromAPI/toAPI transforms | Unit test: round-trip transform | YES |
| 11 | permissionCatalog.js | 52 permissions in 8 groups | Unit test: count = 52, all R9 typos present | YES |
| 12 | RoleListView.jsx | Rich 6-column role table | Browser: Roles tab → rich table with coverage bars, employee counts | NO |
| 13 | RoleFormView.jsx | Permission editor with 8 groups | Browser: edit role → 8 groups, checkboxes, template, counters | NO |
| 14 | PermissionGate.jsx | Gate component + usePermission hook | Unit test: renders/hides based on permissions | YES |

**Self-test checklist:** 5 automated (unit tests) + 9 manual (browser verification)

---

## Execution Sequence

### PR1 (Employee CRUD) — order matters:
1. Edit 1: `constants.js` — add endpoints (no dependencies)
2. Edit 3: `employeeTransform.js` — no deps beyond constants
3. Edit 2: `employeeService.js` — depends on constants + transform
4. Edit 6: `EmployeeFormDialog.jsx` — standalone component
5. Edit 5: `EmployeeListView.jsx` — depends on service + transform
6. Edit 4: `EmployeeManagementPage.jsx` — depends on EmployeeListView
7. Edit 7: `Sidebar.jsx` — remove comingSoon, add path
8. Edit 8: `App.js` — add route + import

### PR2 (Role CRUD) — order matters:
1. Edit 11: `permissionCatalog.js` — static data, no deps
2. Edit 10: `roleTransform.js` — depends on catalog structure
3. Edit 9: `roleService.js` — depends on constants + transform
4. Edit 14: `PermissionGate.jsx` — depends on AuthContext (already exists)
5. Edit 12: `RoleListView.jsx` — depends on roleService + employeeService (cross-ref counts)
6. Edit 13: `RoleFormView.jsx` — depends on roleService + permissionCatalog
7. Update `EmployeeManagementPage.jsx` — add RoleListView + RoleFormView to Roles tab

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Backend returns different shape than probed (BUG-182 precedent) | MEDIUM | Breaks transforms | Curl-probe each endpoint during implementation, compare with §5 catalog. If drift: PAUSE + backend brief per OQ-12. |
| 2 | Sidebar.jsx conflict with concurrent changes | LOW | Merge conflict | FILE_OWNERSHIP verified clean. No in-flight items on Sidebar. |
| 3 | R9 typo keys change on backend | LOW | Permission mismatch | Use verbatim keys from live catalog. Add warning comment in permissionCatalog.js. |
| 4 | Employee count cross-reference performance | LOW | Slow load | Both endpoints (employees-list + role-list) are small payloads (<20 items each). No optimization needed. |
| 5 | System-protected role edit bypass | MEDIUM | Security | RoleFormView checks `isEditable` flag before rendering form. RoleListView shows View icon (not Edit) for protected roles. |

---

## Post-Code Registry Checklist (v0.7 Step 5)

```
- [ ] registry.json: CR-069 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated with IMPLEMENTED status + artifact refs
- [ ] FILE_OWNERSHIP.md: append all 14 files with CR-069 tag + date
- [ ] Code markers: // CR-069 comment in every new and modified file per R18
- [ ] BUG_TRACKER.md: no changes (this is a CR)
- [ ] OPEN_GAPS_REGISTER.md: OG-CR041-EMPLOYEE-MGMT → SUBSUMED (already done at intake)
```

---

## PLANNING Final Response (v0.7 format)

```
Planning complete: CR-069 (Gate 3)
Stage: Implementation Plan
Code reality: PARTIAL (permission model exists, management UI is greenfield)
Risk: CRITICAL (owner-mandated, no downgrade)
Files WILL change: 11 new + 3 modified = 14 files (~1,500 lines)
Files WILL NOT touch: orderTransform.js, AppProviders.jsx (R7), AuthContext.jsx, LoadingPage.jsx, all R5 hotspots, /app/memory/final/*
PR strategy: PR1 (Employee CRUD, 8 files) → PR2 (Role CRUD, 6 files)
Verification matrix: 14 checks (5 automated, 9 manual)
Owner decisions: ALL 18 OQs resolved — zero open
Docs: /app/memory/plans/CR_069_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
