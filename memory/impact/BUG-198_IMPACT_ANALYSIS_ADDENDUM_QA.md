# BUG-198 — Impact Analysis ADDENDUM (QA-Discovered Contract Mismatches)

**ID:** BUG-198
**Date:** 2026-07-17 (Addendum to Impact Analysis dated 2026-07-17)
**Agent Role:** PLANNING
**Trigger:** QA session confirmed endpoints work with correct headers. Revealed employee email validation + role transform issues.
**Risk:** HIGH (unchanged)

---

## QA Root Cause Summary

All employee/role endpoints work correctly when called with `Accept: application/json` + `X-localization: en` headers. The 302 redirects were a testing artifact, not a backend issue.

**Confirmed working:**
- Employee Add (POST) → 201 ✅ (already worked without X-localization)
- Employee Update (PUT) → 422 (validation error — email required) ✅ endpoint works
- Employee Status Toggle (POST) → 200 ✅
- Role Add (POST) → 422 (validation: modules required, role_type required) ✅ endpoint works
- Role Update (PUT) → 422 (validation: same) ✅ endpoint works

---

## Sub-Issue A REVISED: Employee Update — Confirmed PUT is Correct

**Original finding:** POST → PUT
**QA confirmation:** PUT returns 422 JSON (validation error). Endpoint accepts PUT. ✅
**Additional finding:** Backend requires `email` to be non-empty. FE transform sends `email: fe.email || ''` which sends empty string when email is blank.

**File:** `employeeTransform.js` → `toAPI.updateEmployee()`
**Fix:** Either:
- Option 1: Omit `email` field when empty → `...(fe.email ? { email: fe.email } : {})`
- Option 2: Send `null` instead of empty string → `email: fe.email || null`

Owner decision needed: which approach? (Or does backend want email to always be present?)

---

## Sub-Issue D REVISED: Employee Add — Confirmed Working

**QA confirmation:** Employee Add returned 201 with status:1 included. ✅
**The `status: 1` fix from original plan is validated** — backend accepted it.
**Same email issue applies:** if user leaves email blank, `email: ''` will trigger 422.

---

## NEW Sub-Issue E: Role CRUD — Contract Mismatches

**Not in original BUG-198 scope, but discovered during CR-069 QA.** Role management was built inside CR-069. These are CR-069 post-delivery issues.

### E1: Role Update uses POST, Backend Expects PUT

**File:** `roleService.js` L18
**Current:** `api.post(\`\${API_ENDPOINTS.ROLE_UPDATE}/\${id}\`, payload)`
**Fix:** `api.put(...)` — same pattern as employee update (BUG-198 Sub-Issue A)
**Evidence:** QA curl with PUT + correct headers → 422 JSON (endpoint works with PUT)

### E2: Role Add/Update — Validation Errors

**File:** `roleTransform.js` → `toAPI.createRole()` / `toAPI.updateRole()`
**QA finding:** Backend returns `{"errors":{"modules":["Please select at least one module"],"role_type":["The role type field is required."]}}`

| Field | FE Sends | Issue |
|---|---|---|
| `modules` | `fe.modules` (can be `[]`) | Backend requires at least 1 module. FE must validate before sending. |
| `role_type` | `fe.roleTypes \|\| []` | FE sends array. Backend says "required" — needs at least 1 role type. FE must validate. |

**Fix:** Add FE validation in `RoleFormView.jsx` — don't allow save with empty modules or empty role_type.

---

## Global Fix (Shared with BUG-197): `X-localization` Header

**File:** `api/axios.js`
**This fix is shared between BUG-197 and BUG-198.** Whichever is implemented first adds the header; the other inherits it.

---

## Updated Consolidated Edits for BUG-198

### Original 6 edits (unchanged):
1. `employeeService.js` L19 — POST → PUT ✅ (QA confirmed)
2. `employeeService.js` L30-35 — remove resetEmployeePassword() 
3. `employeeTransform.js` — add status:1 to create ✅ (QA confirmed)
4. `employeeTransform.js` — add optional password to update
5. `EmployeeListView.jsx` — remove dialog, add inline password + eye toggle
6. DELETE `ResetPasswordDialog.jsx`

### NEW edits from QA findings:
7. `employeeTransform.js` — handle empty email (don't send empty string)
8. `roleService.js` L18 — POST → PUT for role update
9. `RoleFormView.jsx` — add validation: require ≥1 module and ≥1 role_type before save
10. `api/axios.js` — add `X-localization: en` header (shared with BUG-197)

---

## Updated Scope Lock

### Files WILL change:
| File | Edits | Original? |
|---|---|---|
| `api/services/employeeService.js` | 1, 2 | Yes |
| `api/transforms/employeeTransform.js` | 3, 4, **7** | Yes + new |
| `components/panels/employee/EmployeeListView.jsx` | 5 | Yes |
| `api/services/roleService.js` | **8** | **NEW** |
| `components/panels/employee/RoleFormView.jsx` | **9** | **NEW** |
| `api/axios.js` | **10** | **NEW** (shared with BUG-197) |

### Files WILL DELETE:
| File | Edit |
|---|---|
| `components/panels/employee/ResetPasswordDialog.jsx` | 6 |

### Files WILL NOT touch (unchanged):
- `api/constants.js`, `pages/EmployeeManagementPage.jsx`, `RoleListView.jsx`, `roleTransform.js` (transform fields already correct: `role_type` matches), `permissionCatalog.js`, `PermissionGate.jsx`, `App.js`, `Sidebar.jsx`

---

## Open Questions (NEW from QA)

| # | Question | Context | Status |
|---|---|---|---|
| OQ-4 | Empty email: omit field or send null? | Backend requires email non-empty. Some employees may not have email. | **NEEDS OWNER ANSWER** |
| OQ-5 | Role add minimum modules: is this a real requirement or test data issue? | Backend says "select at least 1 module" — but an empty role might be valid? | **NEEDS OWNER ANSWER** |

---

## Verification Matrix (Updated)

| # | Edit | Verification | Method |
|---|---|---|---|
| V1-V13 | (original — unchanged) | See original Impact Analysis | — |
| V14 | Employee update with blank email | curl: PUT employees-update → not 422 on email | curl |
| V15 | Role update with PUT | curl: PUT role-update/{id} → proper JSON | curl |
| V16 | Role add with modules | curl: POST role-add with ≥1 module → 201/200 | curl |
| V17 | RoleFormView blocks save without modules | Browser: try save with 0 modules → error shown | browser |
| V18 | X-localization header in all requests | Network tab: verify header on any API call | browser |

---

## Next

Impact Analysis addendum complete for both BUG-197 and BUG-198. Needs:
1. **Owner answers on OQ-4 (empty email) and OQ-5 (minimum modules)**
2. Gate 3 (Implementation Plan updates) for both items
3. Gate 4 GO → Implementation
