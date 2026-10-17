# BUG-376 — Impact Analysis (Gate 2)

**ID:** BUG-376
**Title:** Role Add/Update: 5 API Contract Gaps (modules prefix · role_master_id null · role_type IDs vs strings)
**Date:** 2026-09-02
**Role:** PLANNING agent
**Stage:** Gate 2 — Impact Analysis ONLY (Gate 3 not started)
**Status:** IMPACT ANALYSIS COMPLETE — awaiting owner review → Gate 3

---

## Header

| Field | Value |
|---|---|
| Code Reality | **PARTIAL** — all 5 gaps confirmed present, no previous BUG-376 fix found |
| Conflict Pre-Check | **CLEAN** — no other open items touch `roleTransform.js` or `RoleFormView.jsx` |
| Risk | **HIGH** — API contract + permissions/role management logic; auth-adjacent |
| Fast Lane eligible | **NO** — touches API transforms, 2 files, HIGH risk |
| Sprint | pos_5_x |

---

## 1. Data Flow Trace (current broken state)

```
EDIT FLOW:
  GET /role-list
    └─ api.role_type → null (backend always returns null — live probe confirmed)
    └─ api.modules → ["Manager", "pos", "kitchen"]

  fromAPI.role (roleTransform.js:20)
    └─ roleTypes: api.role_type || [] = []          ← GAP D: never reads modules[0]
    └─ modules: api.modules || [] = ["Manager","pos","kitchen"]

  RoleFormView mount
    └─ checkedPerms = new Set(["Manager","pos","kitchen"])  ← GAP E: includes role type string
    └─ roleTypes = []

  BUG-235 useEffect fires (roleTypes.length === 0)
    └─ setRoleTypes(catalogRoleTypes.map(rt => rt.id))
    └─ roleTypes = [1, 2, 3, 4, 5, 6]              ← GAP C: IDs not strings

  User saves:
  handleSave (RoleFormView.jsx:120-126)
    └─ data.modules   = [...checkedPerms] = ["Manager","pos","kitchen"]
    └─ data.roleTypes = [1, 2, 3, 4, 5, 6]
    └─ data.roleMasterId = null                     ← GAP B: hardcoded

  toAPI.createRole (roleTransform.js:64-71)
    └─ modules: fe.modules = ["Manager","pos","kitchen"]  ← GAP A: no explicit role type prefix from roleTypes
    └─ role_type: [1, 2, 3, 4, 5, 6]               ← GAP C: sends IDs
    └─ role_master_id: null                         ← GAP B: passed through as null

WHAT BACKEND RECEIVES (wrong):
  { modules: ["Manager","pos","kitchen"], role_type: [1,2,3,4,5,6], role_master_id: null }

WHAT BACKEND EXPECTS (spec):
  { modules: ["Manager","pos","kitchen"], role_type: ["Manager"], role_master_id: 3 }

CLEAR ALL PATH (Sub-E):
  clearAll() → checkedPerms = new Set()
  modules = [] → toAPI sends modules: [] (no role type — backend cannot derive type)
  OD-1 requires: modules: ["Manager"] still valid (role type only, no perms)
  BREAK POINT: role type lost because it was in checkedPerms, not in roleTypes state
```

---

## 2. Sub-Item Analysis (code-verified vs intake)

### Sub-A — `modules` missing role type string as `modules[0]`

| Field | Detail |
|---|---|
| File | `src/api/transforms/roleTransform.js` |
| Lines | 67 (`toAPI.createRole`) and 77 (`toAPI.updateRole`) |
| Current | `modules: fe.modules` — passes permission strings only |
| Expected | `modules: [roleTypeString, ...permissionStrings]` per backend spec |
| Evidence | `roleTransform.js:67,77` confirmed. Live probe: all backend roles have `modules[0]` = role type string |
| Downstream risk | `RoleListView.jsx` (status toggle) also calls `toAPI.updateRole` with `modules: role.modules` which already contains the role type string as `modules[0]`. After the Sub-A fix, `toAPI` must normalize to avoid duplication — see §4 Resolution Strategy |

### Sub-B — `role_master_id` always `null`

| Field | Detail |
|---|---|
| File | `src/components/panels/employee/RoleFormView.jsx` |
| Line | 125 — `roleMasterId: null` hardcoded in `handleSave` |
| Root cause | `applyTemplate()` (lines 83-97) calls `setCheckedPerms(new Set(t.defaultModules))` and `setRoleTypes(...)` but never stores `t.id` anywhere |
| Expected | `roleMasterId` should be the `id` of the template selected via the "Start from Template" dropdown |
| Edge case | "Build from scratch" (no template selected) → `roleMasterId: null` is correct |
| New state needed | `selectedMasterId` (initialized from `role?.roleMasterId || null`) |

### Sub-C — `role_type` sends numeric IDs; spec expects string values

| Field | Detail |
|---|---|
| Files | `RoleFormView.jsx:44-46` (BUG-235 useEffect) + `RoleFormView.jsx:95` (applyTemplate) |
| Current | `catalogRoleTypes.map(rt => rt.id)` → `[1, 2, 3, 4, 5, 6]` |
| Expected | `catalogRoleTypes.map(rt => rt.value)` → `["Manager"]` (single, or all for fallback) |
| Note | `rt.value` = `role_type_value` from `fromAPI.permissionCatalog` (e.g. `'Manager'`, `'STATION'`, `'Waiter'`) |
| applyTemplate line 95 | Same issue: `matched ? [matched.id] : catalogRoleTypes.map(rt => rt.id)` → must use `.value` |

### Sub-D — Edit/toggle always sends ALL role type IDs instead of correct single role type

| Field | Detail |
|---|---|
| File | `src/api/transforms/roleTransform.js` |
| Line | 20 |
| Current | `roleTypes: api.role_type || []` — always `[]` because backend returns null |
| Root cause | `fromAPI.role` never reads `modules[0]` to derive role type, so `roleTypes = []` on every edit/toggle → BUG-235 fires → all IDs filled |
| Expected | When `api.role_type` is null: derive from `api.modules[0]` (always the role type string per backend spec) |
| Downstream benefit | `RoleListView.jsx:89` (status toggle) already uses `roleTypes: role.roleTypes` — after this fix it will automatically send `["Manager"]` instead of `[]` — **no code change needed in RoleListView.jsx** |

### Sub-E — "Clear All" drops role type from `modules`

| Field | Detail |
|---|---|
| File | `src/components/panels/employee/RoleFormView.jsx` |
| Line | 17 — `checkedPerms` init from `role?.modules` |
| Current | `checkedPerms` includes `modules[0]` (role type string, e.g. `"Manager"`) because `fromAPI.role` passes full modules array. `clearAll()` wipes entire set |
| Resolution | Per OD-1: role type must live in `roleTypes` state only, NOT in `checkedPerms`. On init, filter `modules[0]` out of `checkedPerms`. Then `clearAll()` only clears permission checkboxes. `toAPI` always prepends from `roleTypes` state |
| Resolved by | Sub-A fix (toAPI always prepends) + Sub-D fix (fromAPI correctly populates roleTypes) + checkedPerms init fix (filter modules[0]) |

---

## 3. Downstream Consumer Audit

| Consumer | Relationship | Impact of Fix |
|---|---|---|
| `roleService.js` | Imports `fromAPI.role`, `toAPI.createRole`, `toAPI.updateRole`. Only caller layer. | Automatically correct after transforms fixed. **No changes needed.** |
| `RoleListView.jsx:89` | Status toggle passes `{ modules: role.modules, roleTypes: role.roleTypes, roleMasterId: role.roleMasterId }` to `toAPI.updateRole` | `role.roleTypes` will be correctly `["Manager"]` after Sub-D fix. `role.modules` still includes role type string as `modules[0]`. `toAPI.updateRole` must normalize to avoid duplication — see §4. **No changes to RoleListView.jsx.** |
| `EmployeeManagementPage.jsx:75` | Renders `<RoleFormView role={editingRole} />` — passes role from `getRoles()` list | After Sub-D fix, `role.roleTypes` correctly populated. No changes needed. |
| `EmployeeListView.jsx` | Does NOT call role transforms directly | **Unaffected.** |

**Dependency map note:** `roleTransform.js` is NOT in the hotspot `orderTransform.js` → not in the "If you touch X, verify Y" chain. No financial logic involved.

---

## 4. Resolution Strategy

All 5 subs resolved across 2 files. Key design decision: **`toAPI` normalizes the `fe.modules` input** to strip any leading role type string before prepending fresh from `fe.roleTypes`. This makes the transform idempotent regardless of whether the caller (RoleFormView or RoleListView) passes partial or full modules arrays.

### roleTransform.js — 3 targeted edits

**Edit R1 — `fromAPI.role` line 20 (Sub-D)**
```js
// Before
roleTypes: api.role_type || [],
// After — BUG-376-D
roleTypes: api.role_type?.length ? api.role_type : (api.modules?.[0] ? [api.modules[0]] : []),
```
*Derive role type from `modules[0]` when `role_type` is null. Backend confirmed: always returns `role_type: null`; role type always lives in `modules[0]`.*

**Edit R2 — `toAPI.createRole` lines 64-71 (Sub-A)**
```js
// Before
createRole(fe) {
  return {
    name: fe.name,
    modules: fe.modules,
    role_type: fe.roleTypes || [],
    role_master_id: fe.roleMasterId || null,
    printmodules: fe.printModules || [],
  };
},
// After — BUG-376-A + normalization guard for RoleListView legacy callers
createRole(fe) {
  const roleTypeStr = (fe.roleTypes || [])[0] || '';
  // Strip leading role type string if caller passed full modules array (idempotent)
  const perms = roleTypeStr && fe.modules?.[0] === roleTypeStr
    ? (fe.modules || []).slice(1)
    : (fe.modules || []);
  return {
    name: fe.name,
    modules: roleTypeStr ? [roleTypeStr, ...perms] : perms,
    role_type: fe.roleTypes || [],
    role_master_id: fe.roleMasterId || null,
    printmodules: fe.printModules || [],
  };
},
```

**Edit R3 — `toAPI.updateRole` lines 74-83 (Sub-A, same pattern)**
```js
// Before
updateRole(fe) {
  return {
    name: fe.name,
    modules: fe.modules,
    role_type: fe.roleTypes || [],
    role_master_id: fe.roleMasterId || null,
    printmodules: fe.printModules || [],
    status: fe.active ? 1 : 0,
  };
},
// After — BUG-376-A
updateRole(fe) {
  const roleTypeStr = (fe.roleTypes || [])[0] || '';
  const perms = roleTypeStr && fe.modules?.[0] === roleTypeStr
    ? (fe.modules || []).slice(1)
    : (fe.modules || []);
  return {
    name: fe.name,
    modules: roleTypeStr ? [roleTypeStr, ...perms] : perms,
    role_type: fe.roleTypes || [],
    role_master_id: fe.roleMasterId || null,
    printmodules: fe.printModules || [],
    status: fe.active ? 1 : 0,
  };
},
```

### RoleFormView.jsx — 5 targeted edits

**Edit F1 — `checkedPerms` init line 17 (Sub-E)**
```jsx
// Before
const [checkedPerms, setCheckedPerms] = useState(new Set(role?.modules || []));
// After — BUG-376-E: exclude modules[0] (role type string) from permission checkboxes
const [checkedPerms, setCheckedPerms] = useState(() => {
  const mods = role?.modules || [];
  // After Sub-D fix, role.roleTypes is populated when editing → modules[0] is role type
  const perms = role?.roleTypes?.length && mods.length > 0 ? mods.slice(1) : mods;
  return new Set(perms);
});
```

**Edit F2 — Add `selectedMasterId` state after line 22 (Sub-B)**
```jsx
// After catalogRoleTypes state (line 22), add:
const [selectedMasterId, setSelectedMasterId] = useState(role?.roleMasterId || null); // BUG-376-B
```

**Edit F3 — BUG-235 useEffect line 45 (Sub-C)**
```jsx
// Before
setRoleTypes(catalogRoleTypes.map(rt => rt.id));
// After — BUG-376-C: string values not numeric IDs
setRoleTypes(catalogRoleTypes.map(rt => rt.value));
```

**Edit F4 — `applyTemplate` lines 87 and 95 (Sub-B + Sub-C)**
```jsx
// applyTemplate — current:
const applyTemplate = (templateId) => {
  if (isReadOnly) return;
  if (!templateId) {
    clearAll();
    if (catalogRoleTypes.length > 0) setRoleTypes(catalogRoleTypes.map(rt => rt.id));
    return;
  }
  const t = templates.find(t => t.id === Number(templateId));
  if (!t) return;
  setCheckedPerms(new Set(t.defaultModules));
  if (catalogRoleTypes.length > 0) {
    const matched = catalogRoleTypes.find(rt => rt.value?.toLowerCase() === t.mapRole?.toLowerCase());
    setRoleTypes(matched ? [matched.id] : catalogRoleTypes.map(rt => rt.id));
  }
};

// After — BUG-376-B + BUG-376-C:
const applyTemplate = (templateId) => {
  if (isReadOnly) return;
  if (!templateId) {
    setSelectedMasterId(null);                                                     // BUG-376-B
    clearAll();
    if (catalogRoleTypes.length > 0) setRoleTypes(catalogRoleTypes.map(rt => rt.value)); // BUG-376-C
    return;
  }
  const t = templates.find(t => t.id === Number(templateId));
  if (!t) return;
  setSelectedMasterId(t.id);                                                       // BUG-376-B
  // defaultModules from backend already strips role type string (permission keys only)
  setCheckedPerms(new Set(t.defaultModules));
  if (catalogRoleTypes.length > 0) {
    const matched = catalogRoleTypes.find(rt => rt.value?.toLowerCase() === t.mapRole?.toLowerCase());
    setRoleTypes(matched ? [matched.value] : catalogRoleTypes.map(rt => rt.value)); // BUG-376-C
  }
};
```
*Note: `t.defaultModules` from `roleMasterList` comes from `default_modules` which are permission keys only (no role type prefix) — confirmed by live probe.*

**Edit F5 — `handleSave` line 125 (Sub-B)**
```jsx
// Before
roleMasterId: null,
// After — BUG-376-B
roleMasterId: selectedMasterId,
```

---

## 5. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `t.defaultModules` includes role type string for some templates | LOW | Investigation probe confirmed `default_modules` = permission keys only. toAPI normalization also handles it if present |
| `modules[0]` is NOT a role type for some legacy roles | LOW | Investigation probe: all 15+ roles on cafe103 have `modules[0]` = role type string. Guard: `api.modules?.[0]` is nil-safe |
| `RoleListView` status toggle double-encodes role type | LOW | toAPI strip-before-prepend normalization handles this — verified in §3 |
| `role.roleTypes` init: `role?.roleTypes?.length` check on line F1 | NONE | `roleTypes` is populated by `fromAPI.role` (Edit R1) before `RoleFormView` mounts |
| New `selectedMasterId` state not reset between Add/Edit modes | LOW | Init: `role?.roleMasterId || null` correctly handles both modes |
| BUG-235 useEffect trigger: after Sub-C change to `rt.value`, trigger condition `roleTypes.length === 0` | VERIFY | After Sub-D fix, `roleTypes` = `["Manager"]` on edit → useEffect won't fire. New role: `roleTypes` = `[]` → fires once → sets to all string values. Correct. |

---

## 6. Scope Lock

**Files WILL change:**
```
src/api/transforms/roleTransform.js          (3 edits: R1, R2, R3)
src/components/panels/employee/RoleFormView.jsx  (5 edits: F1, F2, F3, F4, F5)
```

**Files will NOT touch:**
```
src/api/services/roleService.js
src/components/panels/employee/RoleListView.jsx
src/components/panels/employee/EmployeeListView.jsx
src/api/transforms/employeeTransform.js
src/api/services/employeeService.js
```

**Total:** 8 edits across 2 files. ~30 lines changed.

---

## 7. Verification Matrix (seeds QA handover)

| Edit | File | Change | How to Verify | Automated? |
|------|------|--------|---------------|:---:|
| R1 | `roleTransform.js:20` | `roleTypes` derived from `modules[0]` when `role_type` null | Unit test: pass `{role_type:null, modules:["Manager","pos"]}` → `roleTypes=["Manager"]` | YES |
| R2 | `roleTransform.js:64` | `createRole` prepends role type string | Unit test: `toAPI.createRole({roleTypes:["Manager"], modules:["pos"]})` → `modules[0]==="Manager"` | YES |
| R3 | `roleTransform.js:74` | `updateRole` prepends role type string | Same pattern; also `RoleListView` path: `modules:["Manager","pos"] → modules:["Manager","pos"]` (no dup) | YES |
| F1 | `RoleFormView.jsx:17` | `checkedPerms` init excludes `modules[0]` | Browser: open edit role → verify "Manager" not in permission checkboxes | NO |
| F2 | `RoleFormView.jsx` new state | `selectedMasterId` state added | Code trace: state exists after template select | NO |
| F3 | `RoleFormView.jsx:45` | BUG-235 useEffect uses `rt.value` | Unit test: `catalogRoleTypes.map(rt => rt.value)` → `["Manager","STATION",...]` | YES |
| F4 | `RoleFormView.jsx:83` | `applyTemplate` stores template id, uses `.value` | Browser: select Manager template → network tab → `role_master_id=<id>` + `role_type:["Manager"]` | NO |
| F5 | `RoleFormView.jsx:125` | `roleMasterId` from state not null | Browser + network: save new role from template → `role_master_id` ≠ null | NO |

**Additional regression tests:**
| # | Scenario | What to Verify |
|---|---|---|
| RG-1 | Active/inactive toggle in RoleListView | Network: `role_type: ["Manager"]` (single string, not all IDs) — Sub-D downstream benefit |
| RG-2 | Clear All then Save on edit role | Network: `modules: ["Manager"]` (role type only), `role_type: ["Manager"]` — OD-1 compliance |
| RG-3 | New role "Build from scratch" then Save | Network: `modules: ["<firstRoleTypeValue>", ...perms]`, `role_type: [<value>]` |
| RG-4 | Select template, Save | Network: `role_master_id: <templateId>`, `role_type: ["Manager"]`, `modules: ["Manager", ...defaultModules]` |

---

## 8. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-376 → status: IMPLEMENTED, sprint_key: pos_5_x
- [ ] BUG_TRACKER.md: BUG-376 row updated
- [ ] FILE_OWNERSHIP.md: roleTransform.js + RoleFormView.jsx entries added with BUG-376 + date
- [ ] Code markers: // BUG-376 comment in every modified hunk
- [ ] Compile check: webpack 0 new warnings
```

---

## 9. Open Questions for Gate 3

**None.** OD-1 is locked. All sub-item behaviors are unambiguously defined by the backend spec and the investigation report. Implementation Plan can be written immediately once owner approves Gate 3.

---

*Impact Analysis written: 2026-09-02 | PLANNING agent | Gate 2 COMPLETE | Awaiting owner review → Gate 3*
