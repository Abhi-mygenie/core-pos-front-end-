# BUG-234 — Impact Analysis (Gate 2)

**ID:** BUG-234
**Status:** GATE 2 COMPLETE — Awaiting Gate 3 (Implementation Plan)
**Date:** 2026-07-24
**Planning Agent:** E1
**Intake Doc:** `/app/memory/change_requests/BUG-234_EMPLOYEE_ROLE_DROPDOWN_SHOWS_SYSTEM_ROLES_INTAKE.md`

---

## Header

- **Code Reality:** PARTIAL — `roleOptions` filter is correctly defined at line 194 but never used in JSX. Both `<select>` elements still use raw `roles`. No partial fix exists.
- **Conflict Pre-Check:** CLEAR — `EmployeeListView.jsx` was last modified by BUG-229+BUG-230 (2026-07-22). Both are CLOSED. No other open item targets this file.
- **Risk:** LOW — UI-only, 1 file, no API/transform/state/financial change.

---

## 1. Problem Statement

The employee role assignment `<select>` in both **Add Employee** and **Edit Employee** inline forms
renders the full unfiltered `roles` list from the API, which includes:
- System roles (`isEditable = false`, e.g. Super Admin, Owner)
- Inactive roles (`active = false`)

A filter variable `roleOptions` is correctly computed at line 194 (`roles.filter(r => r.isEditable && r.active)`)
but is **never referenced** in the JSX. Both dropdown instances use `roles.map(...)` instead.

Secondary issue: the change handler uses `Number(e.target.value)` to look up the selected role.
`Number()` coerces any non-integer string to `NaN`, which causes `roles.find(...)` to return `undefined`
silently — resulting in the employee's role being cleared without any error.

Third issue: the default role for a new row (line 69) uses `roles[0]`, which may be a system role.

---

## 2. Full Data Flow Trace

```
GET /api/v1/vendoremployee/employee/role-list
  → roleService.getRoles()
  → roleTransform.fromAPI.roleList(response)
      → each role mapped with: id, name, active (status===1), isEditable (is_editable!==false), isSystemRole
  → setRoles(roleList)       [line 44 — ALL roles, including system/inactive]

  → roleOptions = roles.filter(r => r.isEditable && r.active)   [line 194 — COMPUTED, UNUSED]

  → JSX: {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
    [lines 292, 359 — uses raw `roles`, NOT `roleOptions`]  ← BUG

  → onChange: roles.find(ro => ro.id === Number(e.target.value))
    [lines 287, 354 — Number() coercion, silent NaN on non-integer IDs]  ← BUG

  → addRow() default: roles[0]?.id
    [line 69 — may default to a system role if it is first in API response]  ← BUG
```

---

## 3. Affected Files

| File | Lines | Change Description |
|---|---|---|
| `EmployeeListView.jsx` | 69, 70 | Default new-row roleId/roleName: `roles[0]` → `roles.find(r => r.isEditable && r.active)` |
| `EmployeeListView.jsx` | 287, 354 | Selection handler: `roles.find(ro => ro.id === Number(e.target.value))` → safe string compare |
| `EmployeeListView.jsx` | 292, 359 | Dropdown options: `roles.map(...)` → `roleOptions.map(...)` |

**Total:** 1 file, ~6 lines

---

## 4. Risk Assessment

| Dimension | Assessment |
|---|---|
| **API contract change** | NO — read-only, no payload change |
| **Transform change** | NO |
| **State management change** | NO — `roleOptions` is a derived constant, no new state |
| **Financial/order logic** | NO |
| **Hotspot files touched** | NO (`EmployeeListView.jsx` not in R5 hotspot list) |
| **Downstream consumers** | `EmployeeManagementPage.jsx` — mounts the component. No other consumers. |
| **Risk label** | **LOW** |
| **Fast Lane eligible** | NO — 6 changed lines, just over 10-line threshold; however, PLANNING agent recommends proceeding to standard Gate 3 |

---

## 5. Downstream Consumer Map

```
EmployeeManagementPage.jsx
  └── EmployeeListView.jsx   ← TARGET (1 file)
```

No other consumers. No downstream effect outside this file.

---

## 6. Owner Decisions Needed

**None.** The filter logic already exists and is owner-approved (it was written by the BUG-229+BUG-230 agent
in the same session as the last working version). This is a clear wire-up omission, no business rule decision needed.

---

## 7. Proposed Edits (Gate 3 preview)

| Edit # | File | Line | Current | Proposed |
|---|---|---|---|---|
| E1 | EmployeeListView.jsx | 69 | `roleId: roles[0]?.id \|\| null,` | `roleId: roles.find(r => r.isEditable && r.active)?.id \|\| null,` |
| E2 | EmployeeListView.jsx | 70 | `roleName: roles[0]?.name \|\| '',` | `roleName: roles.find(r => r.isEditable && r.active)?.name \|\| '',` |
| E3 | EmployeeListView.jsx | 287 | `roles.find(ro => ro.id === Number(e.target.value))` | `roles.find(ro => String(ro.id) === String(e.target.value))` |
| E4 | EmployeeListView.jsx | 292 | `{roles.map(r => ...)}` | `{roleOptions.map(r => ...)}` |
| E5 | EmployeeListView.jsx | 354 | `roles.find(ro => ro.id === Number(e.target.value))` | `roles.find(ro => String(ro.id) === String(e.target.value))` |
| E6 | EmployeeListView.jsx | 359 | `{roles.map(r => ...)}` | `{roleOptions.map(r => ...)}` |

**Scope lock:**
- Files WILL change: `EmployeeListView.jsx`
- Files will NOT touch: `employeeService.js`, `employeeTransform.js`, `roleService.js`, `roleTransform.js`, any other file

---

## 8. Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|---|---|---|---|:---:|
| E1+E2 | EmployeeListView.jsx | Default role is first editable+active role | Add new row → check pre-selected role is not a system role | NO — visual |
| E3+E5 | EmployeeListView.jsx | String ID comparison — no silent NaN | Select a role in Add and Edit form — confirm `roleName` updates | NO — visual |
| E4+E6 | EmployeeListView.jsx | Only editable+active roles in dropdown | Open dropdown — confirm Super Admin, Owner etc. absent | NO — visual |

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-234 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: BUG-234 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: Add EmployeeListView.jsx — BUG-234 — 2026-07-24
- [ ] Code markers: // BUG-234 comment in EmployeeListView.jsx
```

---

## 10. Gate Status

```
Gate 1 (Intake):   ✅ COMPLETE (2026-07-24)
Gate 2 (Impact):   ✅ COMPLETE (2026-07-24) ← YOU ARE HERE
Gate 3 (Plan):     ⬜ PENDING owner direction
Gate 4 (GO):       ⬜ PENDING
Gate 5 (Impl):     ⬜ PENDING
Gate 6 (QA):       ⬜ PENDING
```
