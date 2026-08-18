# BUG-234 — Implementation Plan (Gate 3)

**ID:** BUG-234
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO
**Date:** 2026-07-24
**Planning Agent:** E1
**Impact Analysis:** `/app/memory/BUG-234_IMPACT_ANALYSIS.md`

---

## Pre-Plan Verification (Line Reality Check)

| Plan Says | Actual File State | Status |
|---|---|---|
| Line 69: `roleId: roles[0]?.id \|\| null,` | ✅ CONFIRMED — exact match | ACCURATE |
| Line 70: `roleName: roles[0]?.name \|\| '',` | ✅ CONFIRMED — exact match | ACCURATE |
| Line 287: `roles.find(ro => ro.id === Number(e.target.value))` | ✅ CONFIRMED — exact match | ACCURATE |
| Line 292: `{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}` | ✅ CONFIRMED — exact match | ACCURATE |
| Line 354: `roles.find(ro => ro.id === Number(e.target.value))` | ✅ CONFIRMED — exact match | ACCURATE |
| Line 359: `{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}` | ✅ CONFIRMED — exact match | ACCURATE |

Impact Analysis is **still accurate**. Proceeding to Gate 3.

---

## Scope Lock

- **Files WILL change:** `EmployeeListView.jsx` (1 file)
- **Files will NOT touch:** `employeeService.js`, `employeeTransform.js`, `roleService.js`, `roleTransform.js`, `RoleFormView.jsx`, `RoleListView.jsx`, `EmployeeManagementPage.jsx`, any other file

---

## Execution Sequence

All 6 edits are in the same file. Execute top-to-bottom (low line number first to avoid offset drift).

```
E1 → E2 (lines 69-70 — addRow default)
E3 → E4 (lines 287, 292 — Add Employee select)
E5 → E6 (lines 354, 359 — Edit Employee select)
```

---

## Exact Edits

### E1 — Fix default roleId in addRow()

**File:** `EmployeeListView.jsx`
**Line:** 69

```diff
- roleId: roles[0]?.id || null,
+ roleId: roles.find(r => r.isEditable && r.active)?.id || null,  // BUG-234
```

### E2 — Fix default roleName in addRow()

**File:** `EmployeeListView.jsx`
**Line:** 70

```diff
- roleName: roles[0]?.name || '',
+ roleName: roles.find(r => r.isEditable && r.active)?.name || '',  // BUG-234
```

### E3 — Fix ID comparison in Add Employee onChange

**File:** `EmployeeListView.jsx`
**Line:** 287

```diff
- const r = roles.find(ro => ro.id === Number(e.target.value));
+ const r = roles.find(ro => String(ro.id) === String(e.target.value));  // BUG-234: safe string compare
```

### E4 — Wire roleOptions to Add Employee <select>

**File:** `EmployeeListView.jsx`
**Line:** 292

```diff
- {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
+ {roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}  // BUG-234
```

### E5 — Fix ID comparison in Edit Employee onChange

**File:** `EmployeeListView.jsx`
**Line:** 354

```diff
- const r = roles.find(ro => ro.id === Number(e.target.value));
+ const r = roles.find(ro => String(ro.id) === String(e.target.value));  // BUG-234: safe string compare
```

### E6 — Wire roleOptions to Edit Employee <select>

**File:** `EmployeeListView.jsx`
**Line:** 359

```diff
- {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
+ {roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}  // BUG-234
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `roleOptions` is empty (no editable+active roles exist) | LOW | `<option value="">Select...</option>` already exists as first item — user gets empty dropdown with placeholder, which is correct |
| String compare breaks for numeric IDs | NONE | `String(1) === String(1)` → `"1" === "1"` ✅. Always safe. |
| `roles.find(...)` in addRow returns undefined | LOW | `?.id \|\| null` and `?.name \|\| ''` guards are already present |

---

## Verification Matrix (Step 4)

| Edit # | File | Change Description | How to Verify | Automated? |
|---|---|---|---|:---:|
| E1+E2 | EmployeeListView.jsx:69-70 | addRow defaults to first editable+active role | Click "+ Add Employee" → check the Role dropdown pre-selects a non-system role | NO — visual |
| E3+E4 | EmployeeListView.jsx:287,292 | Add Employee dropdown shows only editable+active roles | Open Add Employee row → open Role dropdown → confirm Super Admin / Owner absent | NO — visual |
| E5+E6 | EmployeeListView.jsx:354,359 | Edit Employee dropdown shows only editable+active roles | Click edit on existing employee → open Role dropdown → confirm same | NO — visual |
| E3+E5 | EmployeeListView.jsx:287,354 | String compare — role selection updates name | Select a role in both Add and Edit → confirm roleName updates in the row | NO — visual |

---

## Post-Code Registry Checklist (Step 5)

The Implementation agent MUST execute after coding:

```
- [ ] registry.json: BUG-234 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: BUG-234 row → IMPLEMENTED (date + iteration)
- [ ] FILE_OWNERSHIP.md: EmployeeListView.jsx — BUG-234 — 2026-07-24
- [ ] Code markers: // BUG-234 comment present in EmployeeListView.jsx (added inline in E3-E6)
```

---

## Gate Status

```
Gate 1 (Intake):   ✅ COMPLETE (2026-07-24)
Gate 2 (Impact):   ✅ COMPLETE (2026-07-24)
Gate 3 (Plan):     ✅ COMPLETE (2026-07-24) ← YOU ARE HERE
Gate 4 (GO):       ⬜ AWAITING OWNER APPROVAL
Gate 5 (Impl):     ⬜ PENDING
Gate 6 (QA):       ⬜ PENDING
```
