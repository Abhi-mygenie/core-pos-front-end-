# BUG-198 — Impact Analysis (Gate 2)

**ID:** BUG-198
**Date:** 2026-07-17
**Agent Role:** PLANNING
**Risk:** HIGH (API contract mismatches — all CRUD operations broken)
**Code Reality:** PARTIAL — CR-069 files exist; 4 bug fixes NOT implemented
**Conflict Pre-Check:** CLEAR — no other active item touches target files
**Duplicate Check:** DISTINCT (confirmed at intake)

---

## Owner Decisions (Recorded)

| # | Question | Owner Answer | Date | Impact on Plan |
|---|---|---|---|---|
| OQ-1 | Dedicated reset-password endpoint? | **NO.** Use the update employee endpoint. Password reset should be **inline in the same row** — remove the popup dialog. | 2026-07-17 | Sub-Issue B: delete `ResetPasswordDialog.jsx`, add inline password field, merge password into normal update flow |
| OQ-2 | `password_confirmation` required on create? | **NO.** Not required on create or update. Backend uses upsert query. | 2026-07-17 | Sub-Issue B+D: no `password_confirmation` field needed anywhere |
| OQ-3 | Inline reset — always visible or on-click? | **Save is fine** — just include password field in the row. Backend upsert handles it. | 2026-07-17 | Password field is a normal editable column. If user types a new password + hits Save All, it's sent with the update. If left empty, not sent. |

---

## Data Flow Trace

```
UI Layer:
  EmployeeListView.jsx
    ├─ addRow() → newRows state → saveAll() → employeeService.addEmployee(row)
    ├─ updateExisting() → editBuffer + dirtyIds → saveAll() → employeeService.updateEmployee(id, merged)
    ├─ toggleStatus() → employeeService.toggleEmployeeStatus(id, active)
    └─ handleResetPassword() → employeeService.resetEmployeePassword(id, password)

Service Layer:
  employeeService.js
    ├─ addEmployee(data)     → toAPI.createEmployee(data) → api.post(EMPLOYEES_ADD, payload)     ← Sub-Issue D
    ├─ updateEmployee(id, d) → toAPI.updateEmployee(d)    → api.post(EMPLOYEES_UPDATE/id, payload) ← Sub-Issue A
    ├─ resetEmployeePassword(id, pw) → api.post(EMPLOYEES_UPDATE/id, {password})                  ← Sub-Issue B
    └─ toggleEmployeeStatus(id, active) → api.post(EMPLOYEE_STATUS/id, {status})                  ← OUT OF SCOPE

Transform Layer:
  employeeTransform.js
    ├─ toAPI.createEmployee(fe) → {f_name, l_name, phone, email, role_id, password, bill_user_view} ← Missing: status
    └─ toAPI.updateEmployee(fe) → {f_name, l_name, phone, email, role_id, bill_user_view}          ← Missing: optional password

API Endpoints (constants.js L133-136):
  EMPLOYEES_LIST:   /api/v2/vendoremployee/employee/employees-list     (GET)
  EMPLOYEES_ADD:    /api/v2/vendoremployee/employee/employees-add      (POST — create is POST, correct)
  EMPLOYEES_UPDATE: /api/v2/vendoremployee/employee/employees-update   (PUT — backend expects PUT, code sends POST)
  EMPLOYEE_STATUS:  /api/v2/vendoremployee/employee/employee-status    (POST — separate endpoint, not part of BUG-198)
```

**BREAK POINTS:**
1. `employeeService.js:19` — `api.post()` for update → backend rejects or ignores (needs `api.put()`)
2. `employeeService.js:31` — `api.post()` for reset → same POST/PUT mismatch + incomplete payload
3. `employeeTransform.js:28-37` — create payload missing `status: 1`
4. `employeeTransform.js:40-49` — update payload has no `password` path for inline reset
5. `EmployeeListView.jsx:291-299` — existing row password cell is disabled placeholder + popup trigger (needs inline editable field)
6. `EmployeeListView.jsx:238` + new inline field — all password inputs hardcoded `type="password"`, no eye toggle

---

## Sub-Issue A: Employee Update — POST → PUT

**File:** `employeeService.js` L19
**Current:** `const response = await api.post(\`\${API_ENDPOINTS.EMPLOYEES_UPDATE}/\${id}\`, payload);`
**Required:** `api.put()` — Laravel backend uses PUT for all update endpoints (confirmed pattern: BUG-197 recipes, sub-recipes, addon-recipes all required PUT)
**Risk:** LOW — 1-word change, established pattern
**Downstream:** Affects `saveAll()` in `EmployeeListView.jsx` L108-113 (update dirty existing employees). After fix, inline edits (name, phone, email, role) will persist correctly.

---

## Sub-Issue B: Reset Password — Remove Popup, Make Inline

**Current flow:**
1. User clicks KeyRound icon (`EmployeeListView.jsx` L294) → sets `resetTarget` state (L21)
2. `ResetPasswordDialog.jsx` opens as AlertDialog popup
3. User types password + confirm password → `handleConfirm()` validates match → calls `onConfirm(password)` (single arg)
4. `EmployeeListView.jsx` L136 → `employeeService.resetEmployeePassword(id, password)` 
5. Service L31 → `api.post(EMPLOYEES_UPDATE/${id}, { password })` — **3 bugs: wrong method, incomplete payload, missing confirmation**

**New flow (per owner decision):**
1. Existing employee row gets an **editable password input** (same column as new rows) — replaces the disabled "--------" + KeyRound icon
2. User types new password directly in the row → marks row as dirty (same as editing name/phone/email)
3. On "Save All" → `updateEmployee(id, merged)` sends full employee data INCLUDING password if non-empty
4. `toAPI.updateEmployee()` conditionally includes `password` field when present
5. No `password_confirmation` required (owner confirmed)

**Files affected:**
- `EmployeeListView.jsx` L10 — remove `ResetPasswordDialog` import
- `EmployeeListView.jsx` L21 — remove `resetTarget` state
- `EmployeeListView.jsx` L136-145 — remove `handleResetPassword` function
- `EmployeeListView.jsx` L290-299 — replace disabled input + KeyRound button with editable Input
- `EmployeeListView.jsx` L344-350 — remove `ResetPasswordDialog` component usage
- `employeeService.js` L19 — POST → PUT (fixes update)
- `employeeService.js` L30-35 — remove `resetEmployeePassword()` function (no longer needed)
- `employeeTransform.js` L40-49 — add optional `password` field to `updateEmployee()`
- `ResetPasswordDialog.jsx` — **DELETE entire file**

**Risk:** MEDIUM — UI flow change (popup → inline), but simpler overall. No financial logic. No hotspot files.

---

## Sub-Issue C: Eye Icon (Show/Hide Password)

**Current:** All password inputs use hardcoded `type="password"`:
- New row: `EmployeeListView.jsx` L238 — `<Input type="password" ...>`
- Existing row: L292 — disabled placeholder (will become editable in Sub-Issue B fix)

**Required:** Toggle between `type="password"` and `type="text"` with Eye/EyeOff icon button.

**Implementation approach:**
- Add `showPassword` state to `EmployeeListView`
- Import `Eye`, `EyeOff` from `lucide-react` (already available in project — used in `RoleListView.jsx` L3)
- Wrap each password Input in a `relative` div with absolute-positioned toggle button
- Single toggle controls all password fields (simpler UX — user wants to verify what they typed)

**Files affected:**
- `EmployeeListView.jsx` L3 — add `Eye, EyeOff` to lucide imports
- `EmployeeListView.jsx` — add `showPassword` state
- `EmployeeListView.jsx` L238 area — wrap new row password with toggle
- `EmployeeListView.jsx` L290 area — wrap existing row password with toggle (after Sub-Issue B makes it editable)

**Risk:** LOW — UI-only, no API/state/financial logic

---

## Sub-Issue D: Add Employee — Missing `status` Field

**File:** `employeeTransform.js` L28-37 — `toAPI.createEmployee()`
**Current payload:** `{ f_name, l_name, phone, email, role_id, password, bill_user_view }`
**Missing:** `status: 1` (new employees should be active by default)
**`password_confirmation`:** NOT required (owner confirmed)

**Risk:** LOW — 1-line addition to transform

---

## Scope Summary

### Files WILL change:

| # | File | Lines | Sub-Issue | Change Type |
|---|---|---|---|---|
| 1 | `api/services/employeeService.js` | L19, L30-35 | A, B | POST→PUT, remove resetEmployeePassword() |
| 2 | `api/transforms/employeeTransform.js` | L28-37, L40-49 | B, D | Add status to create, add optional password to update |
| 3 | `components/panels/employee/EmployeeListView.jsx` | L3, L10, L21, L136-145, L238, L290-299, L344-350 | B, C | Remove dialog, add inline password, add eye toggle |
| 4 | `components/panels/employee/ResetPasswordDialog.jsx` | ALL | B | **DELETE** |

### Files will NOT touch:

| File | Reason |
|---|---|
| `api/constants.js` | Endpoints are correct |
| `pages/EmployeeManagementPage.jsx` | Shell/tabs — no changes needed |
| `components/panels/employee/RoleListView.jsx` | Role module unaffected |
| `components/panels/employee/RoleFormView.jsx` | Role module unaffected |
| `api/services/roleService.js` | Role module unaffected |
| `api/transforms/roleTransform.js` | Role module unaffected |
| `constants/permissionCatalog.js` | Permission module unaffected |
| `components/guards/PermissionGate.jsx` | Permission module unaffected |
| `App.js` | Routes unchanged |
| `Sidebar.jsx` | Navigation unchanged |

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | PUT method still rejected by backend | LOW (pattern confirmed across BUG-197) | HIGH — update broken | Curl-verify PUT endpoint with test credentials before coding |
| 2 | Backend requires fields not in our payload | LOW (owner confirmed upsert) | MEDIUM — save fails | Include all known fields in update payload |
| 3 | `toggleEmployeeStatus` also broken (POST) | UNKNOWN — out of scope | LOW — separate endpoint | Test during QA; if broken, file new bug |
| 4 | Password sent in cleartext over wire | ZERO — HTTPS enforced | — | No mitigation needed |

---

## Downstream Consumers

- `EmployeeManagementPage.jsx` — imports `EmployeeListView`. No interface change (no props change).
- No other module imports or depends on `employeeService.js`, `employeeTransform.js`, or `ResetPasswordDialog.jsx`.
- `PermissionGate.jsx` and role service are independent — zero coupling to employee CRUD.

---

## Verification Matrix (Seeds QA Handover)

| # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| V1 | employeeService.js:19 | POST → PUT | Curl: PUT EMPLOYEES_UPDATE/{id} with valid payload → 200 | YES (curl) |
| V2 | employeeService.js:30-35 | Remove resetEmployeePassword() | Grep: no references to resetEmployeePassword in codebase | YES (grep) |
| V3 | employeeTransform.js:28-37 | Add `status: 1` to create | Unit test or grep: createEmployee output includes status | YES |
| V4 | employeeTransform.js:40-49 | Add optional password to update | Unit test: updateEmployee({...emp, password:'x'}) includes password; updateEmployee({...emp}) does NOT | YES |
| V5 | EmployeeListView.jsx | Inline password field for existing employees | Browser: existing emp row has editable password input | NO (browser) |
| V6 | EmployeeListView.jsx | Eye/EyeOff toggle on all password fields | Browser: click eye icon → password visible/hidden | NO (browser) |
| V7 | EmployeeListView.jsx | ResetPasswordDialog removed | Grep: no ResetPasswordDialog references | YES (grep) |
| V8 | ResetPasswordDialog.jsx | File deleted | `ls` → file not found | YES |
| V9 | Full flow: Add Employee | Browser: fill new row → Save All → employee appears in list after refresh | NO (browser + API) |
| V10 | Full flow: Update Employee | Browser: edit name → Save All → name persists after refresh | NO (browser + API) |
| V11 | Full flow: Reset Password | Browser: type new password in existing row → Save All → can login with new password | NO (browser + API) |
| V12 | Regression: Toggle Status | Browser: toggle switch → employee activated/deactivated | NO (browser) |
| V13 | Compile check | `webpack compiled` with 0 new warnings | YES |

---

## Next

Impact Analysis complete. Awaiting owner review → Gate 3 (Implementation Plan).
