# BUG-235 — Role Permissions Save Fails with 422 (role_type Empty on Create/Toggle)

**ID:** BUG-235
**Type:** BUG
**Registered:** 2026-07-24
**Sprint:** pos_5_0
**Related:** BUG-231 (direct downstream consequence)
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## 1. Summary

Creating a new role or toggling a role's active status fails with HTTP 422 ("role_type is required") because the API payload always sends `role_type: []`. Root cause: BUG-231 correctly hid the `role_type` UI field to simplify the form, but initialized the state as `role?.roleTypes || []` — for a **new** role (`role` is null), this is always an empty array. The `roleTransform.js` serialiser then sends `role_type: []` to the backend, which rejects it. A second affected path exists in `RoleListView.jsx` line 89 (active status toggle), which also hardcodes `roleTypes: []`.

---

## 2. Classification

- **Type:** Bug
- **Severity:** P1 — HIGH (cannot create new roles; toggling active status may also fail; no workaround)
- **Risk:** MEDIUM (permissions logic; controls user access; not financial)
- **Process required:** Full intake/planning/implementation/QA
- **Fast Lane eligible:** NO (touches 2 files)

---

## 3. Duplicate Check

- **RELATED to BUG-231** ("Role Form: Hide role_type Field + Add Save Error Toasts" — QA PASS 2026-07-22)
- BUG-231 hid the UI field but did not provide a default value for new roles, directly causing this 422.
- This is NOT a duplicate — BUG-231 is CLOSED/QA PASS; the regression is a gap in BUG-231's implementation.
- BUG-198: role_type wired as part of CR-069 post-delivery — CLOSED. The regression appeared after BUG-231 was applied.

---

## 4. Evidence

- **Source:** OWNER-REPORTED (handoff: "422 Error — role_type required") + AGENT-CONFIRMED (code trace 2026-07-24)
- **Confidence:** CONFIRMED (code trace proves empty array path for new roles)
- **Screenshot:** not provided
- **Steps to reproduce:**
  1. Log in as owner (`owner@cafe103.com`)
  2. Navigate to Employee Management → Roles tab
  3. Click "Add Role"
  4. Enter a role name, select permissions, click Save
  5. **Observe:** 422 error — role_type is required. Role not created.
  6. **Also:** Go to Roles list → toggle any role's active status → same 422
- **Curl output:** not applicable (would require auth token; error is backend 422)

### Code Evidence

```
// RoleFormView.jsx — Line 18
const [roleTypes, setRoleTypes] = useState(role?.roleTypes || []);
//  When role=null (new role): roleTypes = [] → payload role_type: []  ← 422

// RoleFormView.jsx — Line 108 (handleSave)
const data = {
  name: name.trim(),
  modules: [...checkedPerms],
  roleTypes,          // [] for new roles → 422
  roleMasterId: null,
};

// roleTransform.js — Line 66 (createRole serialiser)
role_type: fe.roleTypes || [],   // sends empty array → backend rejects

// RoleListView.jsx — Line 89 (active status toggle — SECOND BUG PATH)
await roleService.updateRole(role.id, {
  ...role, modules: role.modules, active: !role.active,
  roleTypes: [],      // HARDCODED empty → also causes 422
  roleMasterId: role.roleMasterId
});
```

### Fix Direction

Auto-select a default `role_type` when none is pre-populated. The catalog of available role types is already fetched into `catalogRoleTypes` state in `RoleFormView.jsx`. A safe default is `catalogRoleTypes[0]?.id` or all available IDs. For `RoleListView.jsx`, pass the existing role's `roleTypes` from the fetched role object rather than hardcoding `[]`.

---

## 5. Blast Radius

- **Files affected:** 2 — `RoleFormView.jsx`, `RoleListView.jsx`
- **Lines to change:** ~5-8
- **Hotspot files touched:** NO
- **Estimated scope:** SMALL
- **Downstream consumers:** `roleService.js` → `roleTransform.js` (read-only — no change needed there)

---

## 6. Owner Decisions Needed

**Q1:** When auto-selecting a default `role_type` for a new role, should we:
  - a) Select the first available role_type from the catalog (simplest)
  - b) Select all available role_types
  - c) Add a visible (but optional) role_type selector back to the form

Agent recommendation: **(a)** — select first available. Keeps the form simple (BUG-231's intent) and satisfies the backend requirement with zero UI change.

---

## 7. Next Steps

→ PLANNING agent for Gate 2 (Impact Analysis) + Gate 3 (Implementation Plan)
→ Owner to answer Q1 above at Planning gate (or agent can default to option a)
