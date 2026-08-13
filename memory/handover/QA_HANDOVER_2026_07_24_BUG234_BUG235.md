# QA Handover — BUG-234 + BUG-235
**Date:** 2026-07-24
**Implementation Agent:** E1
**Items:** BUG-234, BUG-235
**Self-test:** 9/9 edits verified in code, 5/5 EXIT GATE checks passed

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit # | File | Change | Self-Test Result |
|---|---|---|:---:|
| BUG-234 E1+E2 | EmployeeListView.jsx:69-70 | addRow defaults to first editable+active role | ✅ Code verified — `roles.find(r => r.isEditable && r.active)` |
| BUG-234 E3 | EmployeeListView.jsx:287 | Add Employee: safe String() ID compare | ✅ Code verified — `String(ro.id) === String(e.target.value)` |
| BUG-234 E4 | EmployeeListView.jsx:292 | Add Employee: uses `roleOptions` not raw `roles` | ✅ Code verified — `roleOptions.map(...)` |
| BUG-234 E5 | EmployeeListView.jsx:354 | Edit Employee: safe String() ID compare | ✅ Code verified — `String(ro.id) === String(e.target.value)` |
| BUG-234 E6 | EmployeeListView.jsx:359 | Edit Employee: uses `roleOptions` not raw `roles` | ✅ Code verified — `roleOptions.map(...)` |
| BUG-235 E1 | roleTransform.js:20 | `fromAPI.role()` maps `roleTypes: api.role_type \|\| []` | ✅ Code verified — line 20 present |
| BUG-235 E2 | RoleFormView.jsx:42-47 | Auto-populate useEffect when catalog loads and roleTypes empty | ✅ Code verified — useEffect with guard present |
| BUG-235 E3 | RoleListView.jsx:89 | `roleTypes: []` → `roleTypes: role.roleTypes` in toggle | ✅ Code verified — `role.roleTypes` used |

---

## 2. QA Test Cases

### BUG-234: Employee Role Dropdown

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Add Employee — system roles absent | Login → Settings → Employee Mgmt → click "+ Add Employee" → open Role dropdown | Only custom/editable roles visible. "Super Admin", "Owner" (system roles) must NOT appear |
| T2 | Edit Employee — system roles absent | Same page → click edit on any employee → open Role dropdown | Same — only editable+active roles |
| T3 | New row default role | Click "+ Add Employee" → check pre-selected role | Pre-selected role must be a non-system role (not blank if any editable roles exist) |
| T4 | Role selection updates correctly | Select a different role in Add Employee row → observe row | roleName in the row updates to the selected role name (no silent NaN failure) |

### BUG-235: Role Permissions Save

| # | Test | Steps | Expected |
|---|---|---|---|
| T5 | Create new role — no 422 | Settings → Employee Mgmt → Roles → "+ Add Role" → enter name → select permissions → Save | **Success toast: "Role X created"**. No 422 error in network tab. Role appears in list. |
| T6 | Edit existing role — no 422 | Click edit on any existing role → change a permission → Save | **Success toast: "Role X updated"**. No 422. |
| T7 | Toggle role active — no 422 | Roles list → toggle active switch on any custom role | Switch updates immediately. No 422 error toast. Role status changes. |
| T8 | System role stays read-only | Click a system role (e.g. Owner) | Form shows "System Protected — Read Only" badge. Save button absent or disabled. |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Existing employees still show correct role in edit form | BUG-234 change to ID compare must not break pre-selected role display |
| R2 | BUG-229 email auto-gen still works | Same file touched — `updateNewRow` and `generateEmail` unchanged |
| R3 | BUG-230 name→email sync still works | Same file, `updateExisting` unchanged |
| R4 | Role template selection still applies permissions | RoleFormView `applyTemplate` unchanged |
| R5 | BUG-231 error toasts for invalid role saves still show | `handleSave` validation logic unchanged |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
BUG-234: status=IMPLEMENTED, sprint=pos_5_0, gate=0-5
BUG-235: status=IMPLEMENTED, sprint=pos_5_0, gate=0-5
EXIT GATE: 5/5 PASSED
  □1 Registry sync:    ✅ PASS
  □2 BUG_TRACKER.md:   ✅ PASS — rows updated IMPLEMENTED
  □3 FILE_OWNERSHIP.md: ✅ PASS — 4 files added for BUG-234+235
  □4 Code markers:     ✅ PASS — 6× BUG-234, 3× BUG-235 across all files
  □5 Compile check:    ✅ PASS — 1 pre-existing warning (unrelated), 0 new warnings
```

---

## 5. Credentials + Environment

```
Account alias: cafe103_no_rooms_postpaid_gst
Login email:   owner@cafe103.com
URL:           https://pos-front-deploy-8.preview.emergentagent.com
Path to test:  Settings → Employee Management
               Settings → Employee Management → Roles tab
```
