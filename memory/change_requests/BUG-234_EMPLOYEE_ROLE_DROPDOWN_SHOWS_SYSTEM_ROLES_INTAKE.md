# BUG-234 — Employee Role Dropdown Shows System Roles + Silent ID Mismatch

**ID:** BUG-234
**Type:** BUG
**Registered:** 2026-07-24
**Sprint:** pos_5_0
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## 1. Summary

The role assignment `<select>` in the Add Employee and Edit Employee forms renders **all roles** returned by the API — including non-editable system roles (e.g. Super Admin, Owner) that must not be assignable to staff. A correctly filtered list (`roleOptions`) is computed at line 194 of `EmployeeListView.jsx` but never used in the JSX. Additionally, the selection handler applies `Number(e.target.value)` coercion which silently returns `NaN` for any non-integer role ID, causing the role lookup to fail without any user-facing error.

---

## 2. Classification

- **Type:** Bug
- **Severity:** P1 — HIGH (feature broken: wrong roles shown; assignment can silently fail with no workaround)
- **Risk:** LOW (UI-only change, 1 file, no API contract change, no financial logic)
- **Process required:** Full intake/planning/implementation/QA
- **Fast Lane eligible:** NO (2 separate code paths to change in same file — over the 10-line threshold)

---

## 3. Duplicate Check

- **DISTINCT**
- BUG-229: Auto-populate email — different field/feature
- BUG-230: Name-change email sync — different field/feature
- BUG-231: Hide role_type field in Role Form — different component (RoleFormView, not EmployeeListView)
- BUG-198: CR-069 post-delivery fixes — covered employee service/transform, not role dropdown rendering

---

## 4. Evidence

- **Source:** OWNER-REPORTED (handoff summary) + AGENT-CONFIRMED (code trace 2026-07-24)
- **Confidence:** CONFIRMED (code clearly shows `roleOptions` defined but unused)
- **Screenshot:** not provided
- **Steps to reproduce:**
  1. Log in as owner (`owner@cafe103.com`)
  2. Navigate to Employee Management
  3. Click "Add Employee" or edit an existing employee
  4. Open the "Role" dropdown
  5. **Observe:** System roles (non-editable) appear alongside custom roles
- **Curl output:** not applicable (UI-only)

### Code Evidence

```
// EmployeeListView.jsx
Line 194: const roleOptions = roles.filter(r => r.isEditable && r.active); // COMPUTED but never used

// Add Employee form
Line 287: const r = roles.find(ro => ro.id === Number(e.target.value));  // BUG: Number() coercion
Line 292: {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}  // BUG: uses raw roles

// Edit Employee form
Line 354: const r = roles.find(ro => ro.id === Number(e.target.value));  // BUG: Number() coercion
Line 359: {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}  // BUG: uses raw roles
```

---

## 5. Blast Radius

- **Files affected:** 1 — `EmployeeListView.jsx`
- **Lines to change:** ~4 (lines 292, 354 — swap `roles.map` → `roleOptions.map`; lines 287, 354 — safe ID compare)
- **Hotspot files touched:** NO
- **Estimated scope:** SMALL
- **Downstream consumers:** None (EmployeeListView is only mounted via EmployeeManagementPage.jsx)

---

## 6. Owner Decisions Needed

None — the filter logic (`r.isEditable && r.active`) already exists at line 194. No business rule decision required.

---

## 7. Next Steps

→ PLANNING agent for Gate 2 (Impact Analysis) + Gate 3 (Implementation Plan)
