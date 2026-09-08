# BUG-376 — Implementation Plan (Gate 3)

**ID:** BUG-376
**Title:** Role Add/Update: 5 API Contract Gaps
**Date:** 2026-09-02
**Role:** PLANNING agent
**Stage:** Gate 3 — Implementation Plan
**Depends on:** Gate 2 Impact Analysis at `/app/memory/impact/BUG-376_IMPACT_ANALYSIS.md`
**Status:** IMPLEMENTATION PLAN COMPLETE — awaiting Gate 4 GO

---

## 0. Entry Verification

| Check | Result |
|---|---|
| Gate 2 Impact Analysis exists | YES — `/app/memory/impact/BUG-376_IMPACT_ANALYSIS.md` |
| `roleTransform.js` lines unchanged since Gate 2 | CONFIRMED (same session) |
| `RoleFormView.jsx` lines unchanged since Gate 2 | CONFIRMED (same session) |
| BUG-376 in registry.json | YES — status: GATE 2 COMPLETE |
| Open owner decisions | NONE — OD-1 locked 2026-09-02 |
| R25 check (Laravel PUT rule) | `roleService.js:19` already uses `api.put()` for updateRole (BUG-198 fix) — NO ISSUE |

---

## 1. Scope Lock

**Files WILL change (2 files, 8 edits):**
```
src/api/transforms/roleTransform.js
src/components/panels/employee/RoleFormView.jsx
```

**Files will NOT touch:**
```
src/api/services/roleService.js
src/components/panels/employee/RoleListView.jsx
src/components/panels/employee/EmployeeListView.jsx
src/api/transforms/employeeTransform.js
src/api/services/employeeService.js
```

**Hotspot files:** NONE of the 2 target files appear in the R5 high-risk hotspot list.
**Financial logic:** NONE.
**Provider order / localStorage:** NONE.

---

## 2. Execution Sequence

```
Step 1: Edit roleTransform.js (R1 → R2 → R3) — pure functions, no component deps
Step 2: Compile check after roleTransform.js
Step 3: Edit RoleFormView.jsx (F1 → F2 → F3 → F4 → F5)
Step 4: Compile check after RoleFormView.jsx
Step 5: Self-test (Verification Matrix)
Step 6: EXIT GATE (5 checkboxes)
Step 7: Write QA Handover + Session Handover
```

---

## 3. Exact Edits — roleTransform.js

### Edit R1 — `fromAPI.role` line 20 — Sub-D

**File:** `src/api/transforms/roleTransform.js`
**Line:** 20
**Purpose:** Derive `roleTypes` from `modules[0]` when `role_type` is null (backend always returns null — live probe confirmed on cafe103).

```js
// CURRENT (line 20):
roleTypes: api.role_type || [],  // BUG-235: map role_type so edit/toggle always has correct value

// NEW:
// BUG-376-D: backend always returns role_type: null; role type lives in modules[0] per spec
roleTypes: api.role_type?.length ? api.role_type : (api.modules?.[0] ? [api.modules[0]] : []),
```

**Verification:** `fromAPI.role({ role_type: null, modules: ['Manager','pos'] })` → `roleTypes === ['Manager']`

---

### Edit R2 — `toAPI.createRole` lines 64-71 — Sub-A

**File:** `src/api/transforms/roleTransform.js`
**Lines:** 64-71
**Purpose:** Prepend role type string as `modules[0]` per backend spec. Normalize idempotently so `RoleListView` legacy callers (who pass full modules including role type) don't cause duplication.

```js
// CURRENT (lines 64-71):
createRole(fe) {
  return {
    name: fe.name,
    modules: fe.modules, // string array — verbatim backend keys per R9
    role_type: fe.roleTypes || [],
    role_master_id: fe.roleMasterId || null,
    printmodules: fe.printModules || [],
  };
},

// NEW:
createRole(fe) { // BUG-376-A: prepend role type string to modules; strip-before-prepend guards against duplication
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
  };
},
```

---

### Edit R3 — `toAPI.updateRole` lines 74-83 — Sub-A

**File:** `src/api/transforms/roleTransform.js`
**Lines:** 74-83
**Purpose:** Identical normalization as R2 applied to update path.

```js
// CURRENT (lines 74-83):
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

// NEW:
updateRole(fe) { // BUG-376-A: same strip-before-prepend normalization as createRole
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

---

## 4. Exact Edits — RoleFormView.jsx

### Edit F1 — `checkedPerms` init line 17 — Sub-E

**File:** `src/components/panels/employee/RoleFormView.jsx`
**Line:** 17
**Purpose:** Exclude `modules[0]` (role type string) from permission checkboxes. Role type must live in `roleTypes` state exclusively; `clearAll()` must never be able to remove it (OD-1).

```jsx
// CURRENT (line 17):
const [checkedPerms, setCheckedPerms] = useState(new Set(role?.modules || []));

// NEW:
// BUG-376-E: role type string (modules[0]) lives in roleTypes state — exclude from checkedPerms
// clearAll() will only wipe permission checkboxes, never role type (OD-1)
const [checkedPerms, setCheckedPerms] = useState(() => {
  const mods = role?.modules || [];
  const perms = role?.roleTypes?.length && mods.length > 0 ? mods.slice(1) : mods;
  return new Set(perms);
});
```

**Why safe for new roles:** `role` is null/undefined on new role → `mods = []` → `perms = []` → `new Set()`. Correct.
**Why safe for edit:** after R1 fix, `role.roleTypes = ['Manager']` (length > 0) → `mods.slice(1)` → strips `modules[0]`. Correct.

---

### Edit F2 — Add `selectedMasterId` state after line 23 — Sub-B

**File:** `src/components/panels/employee/RoleFormView.jsx`
**Insert after:** line 23 (`const [errors, setErrors] = useState({});`)
**Purpose:** Track the template ID selected by the user so it can be sent as `role_master_id`.

```jsx
// INSERT after line 23:
const [selectedMasterId, setSelectedMasterId] = useState(role?.roleMasterId || null); // BUG-376-B: track template ID for role_master_id
```

**Init value:** `role?.roleMasterId || null` — correctly handles both new role (null) and edit (pre-populated from `fromAPI.role:15`).

---

### Edit F3 — BUG-235 useEffect line 45 — Sub-C

**File:** `src/components/panels/employee/RoleFormView.jsx`
**Line:** 45
**Purpose:** Store string values not numeric IDs. Backend spec: `role_type: ["Manager"]` not `[1]`.

```jsx
// CURRENT (line 45):
setRoleTypes(catalogRoleTypes.map(rt => rt.id));

// NEW:
setRoleTypes(catalogRoleTypes.map(rt => rt.value)); // BUG-376-C: string values (e.g. "Manager") not numeric IDs
```

**Trigger condition unchanged:** still only fires when `catalogRoleTypes.length > 0 && roleTypes.length === 0`.
**After R1 fix:** on edit, `roleTypes = ['Manager']` (length 1) → this useEffect will NOT fire. Correct — no all-values fallback needed.
**New role:** `roleTypes = []` (length 0) → fires once → sets to `['Manager','STATION','Waiter','Billing','Buffet','Delivery']` as string values. Acceptable fallback pending user selecting a template.

---

### Edit F4 — `applyTemplate` lines 83-97 — Sub-B + Sub-C

**File:** `src/components/panels/employee/RoleFormView.jsx`
**Lines:** 83-97
**Purpose:** (B) Store `t.id` in `selectedMasterId` state. (C) Use `rt.value` not `rt.id` in all `setRoleTypes` calls.

```jsx
// CURRENT (lines 83-97):
const applyTemplate = (templateId) => {  // CR-096: also derives roleTypes from template mapRole
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

// NEW:
const applyTemplate = (templateId) => {  // CR-096 + BUG-376-B + BUG-376-C
  if (isReadOnly) return;
  if (!templateId) {
    setSelectedMasterId(null);                                                              // BUG-376-B: reset master ID when "Build from scratch"
    clearAll();
    if (catalogRoleTypes.length > 0) setRoleTypes(catalogRoleTypes.map(rt => rt.value));   // BUG-376-C
    return;
  }
  const t = templates.find(t => t.id === Number(templateId));
  if (!t) return;
  setSelectedMasterId(t.id);                                                                // BUG-376-B: store template ID
  setCheckedPerms(new Set(t.defaultModules));
  if (catalogRoleTypes.length > 0) {
    const matched = catalogRoleTypes.find(rt => rt.value?.toLowerCase() === t.mapRole?.toLowerCase());
    setRoleTypes(matched ? [matched.value] : catalogRoleTypes.map(rt => rt.value));        // BUG-376-C: string values
  }
};
```

**Note on `t.defaultModules`:** Live probe confirmed `default_modules` from backend = permission keys only (no role type string prefix). `toAPI` normalization in R2/R3 will prepend role type string regardless. Safe.

---

### Edit F5 — `handleSave` line 125 — Sub-B

**File:** `src/components/panels/employee/RoleFormView.jsx`
**Line:** 125
**Purpose:** Pass the stored `selectedMasterId` instead of hardcoded `null`.

```jsx
// CURRENT (line 125):
roleMasterId: null,

// NEW:
roleMasterId: selectedMasterId,  // BUG-376-B: send template ID (null when "Build from scratch")
```

---

## 5. Verification Matrix

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | R1 | `roleTransform.js:20` | `fromAPI.role({role_type:null, modules:['Manager','pos']}).roleTypes` === `['Manager']` | Unit test |
| V2 | R1 | `roleTransform.js:20` | `fromAPI.role({role_type:null, modules:[]}).roleTypes` === `[]` (no crash on empty modules) | Unit test |
| V3 | R2 | `roleTransform.js:64` | `toAPI.createRole({roleTypes:['Manager'], modules:['pos','kitchen']}).modules` === `['Manager','pos','kitchen']` | Unit test |
| V4 | R2 | `roleTransform.js:64` | `toAPI.createRole({roleTypes:['Manager'], modules:['Manager','pos']}).modules` === `['Manager','pos']` (no duplication — idempotent) | Unit test |
| V5 | R3 | `roleTransform.js:74` | `toAPI.updateRole({roleTypes:['Manager'], modules:['Manager','pos'], active:true}).modules` === `['Manager','pos']` | Unit test |
| V6 | F1 | `RoleFormView.jsx:17` | Open edit role → "Manager" is NOT a ticked checkbox in any permission section | Browser |
| V7 | F2+F5 | `RoleFormView.jsx` | Select Manager template → Save → network tab: `role_master_id` is the template's integer ID (≠ null) | Browser + Network |
| V8 | F3 | `RoleFormView.jsx:45` | New role (no template) → Save → network tab: `role_type` contains string values e.g. `["Manager","STATION",...]` not `[1,2,3,4,5,6]` | Browser + Network |
| V9 | F4 | `RoleFormView.jsx:83` | Select Manager template → network: `role_type: ["Manager"]` (single matched value, not all) | Browser + Network |
| V10 | All | Both files | Edit existing role → Clear All → Save → network: `modules: ["Manager"]`, `role_type: ["Manager"]` (role type preserved — OD-1) | Browser + Network |

**R25 check:**
| R25 | `roleService.js:19` | `api.put()` for `updateRole` | Grep: `api.put(\`${API_ENDPOINTS.ROLE_UPDATE}/${id}\`)` | Code read |

**Regression tests:**
| RG-1 | Active/inactive toggle (RoleListView) | Network: `role_type: ["Manager"]` not `[]` — Sub-D downstream benefit | Browser + Network |
| RG-2 | New role "Build from scratch" → Save | Network: `modules[0]` = role type string, `role_type` = string array | Browser + Network |
| RG-3 | Edit role → Select All → Save | Network: `modules` = `["Manager", <all perms>]`, no duplication | Browser + Network |

---

## 6. Risk Register

| Risk | Likelihood | Mitigation in Plan |
|---|---|---|
| `rt.value` null for a catalog entry | LOW | `catalogRoleTypes.map(rt => rt.value)` — if any value is null, `toAPI` gets `['Manager', null, ...]`. Guard: implementation agent may add `.filter(Boolean)` to `catalogRoleTypes.map(rt => rt.value)` calls at F3/F4. Live probe: all 6 role type values confirmed non-null. |
| `RoleListView` status toggle sends duplicate role type | NONE | R2/R3 strip-before-prepend normalization handles this — confirmed in Gate 2 §3 |
| `mods.slice(1)` removes first permission if `role.roleTypes` is populated but `modules[0]` is NOT a role type (legacy data edge) | VERY LOW | Investigation: all 15+ roles on cafe103 have `modules[0]` = role type string. No counter-examples found. If this occurs, a wrong permission is silently dropped — acceptable for a LOW-frequency edge vs the confirmed HIGH-impact active bug. |
| `selectedMasterId` not reset between Add/Edit views | NONE | Init `role?.roleMasterId \|\| null` handles both. Parent component `EmployeeManagementPage` re-mounts `RoleFormView` with fresh `role` prop each time. |
| BUG-376 code markers conflict with BUG-235/CR-096 markers | NONE | Add `// BUG-376` as NEW comments on modified lines. Do NOT remove existing BUG-235/CR-096 markers. |

---

## 7. Post-Code Registry Checklist (for Implementation agent — EXIT GATE prerequisite)

```
□ 1. registry.json: BUG-376 → status: "IMPLEMENTED", sprint_key: "pos_5_x"
□ 2. BUG_TRACKER.md: BUG-376 row → status IMPLEMENTED, date 2026-09-02
□ 3. FILE_OWNERSHIP.md: add rows for roleTransform.js + RoleFormView.jsx with BUG-376 + date
□ 4. Code markers: every modified hunk has at least one // BUG-376 comment
     roleTransform.js: R1 (line ~20), R2 (line ~64), R3 (line ~74)
     RoleFormView.jsx: F1 (line ~17), F2 (new state line), F3 (line ~45), F4 (line ~83), F5 (line ~125)
□ 5. Compile check: yarn start logs "Compiled successfully" — 0 new warnings
```

---

## 8. QA Handover Seed (for Implementation agent to complete)

```markdown
## QA Handover — BUG-376

### §1 Verification Matrix (from plan — fill self-test results)
| V# | Edit | Verification | Self-Test Result |
| V1 | R1 roleTransform | fromAPI derives roleTypes from modules[0] | [ ] |
| V2 | R1 roleTransform | fromAPI: empty modules → roleTypes=[] no crash | [ ] |
| V3 | R2 createRole | modules[0] = role type string prepended | [ ] |
| V4 | R2 createRole | idempotent — no duplication when modules already has role type | [ ] |
| V5 | R3 updateRole | same as V4 for update path | [ ] |
| V6 | F1 checkedPerms | "Manager" not a visible ticked checkbox on edit | [ ] |
| V7 | F2+F5 | role_master_id = template ID on save | [ ] |
| V8 | F3 | role_type contains string values not numeric IDs | [ ] |
| V9 | F4 | applyTemplate: role_type: ["Manager"] single value | [ ] |
| V10 | OD-1 | Clear All + Save → modules: ["Manager"], role type preserved | [ ] |
| R25 | roleService | api.put() confirmed for updateRole | [ ] |

### §2 Regression tests
| RG-1 | Status toggle (RoleListView) | role_type: ["Manager"] not [] |
| RG-2 | New role from scratch | modules[0] = role type string |
| RG-3 | Edit + Select All + Save | modules: ["Manager", <all perms>], no duplication |

### §3 Registry Sync
Registry synced: [ YES / NO ]
EXIT GATE: [ ] / 5 PASSED

### §4 Credentials
Alias: cafe103_no_rooms_postpaid_gst (RID 644)
URL: https://preprod.mygenie.online
Login: POST /api/v1/auth/vendoremployee/login
Navigate: Settings → Employee Management → Roles tab

### §5 Environment
Frontend compiles: check `tail -5 /var/log/supervisor/frontend.out.log`
```

---

*Implementation Plan written: 2026-09-02 | PLANNING agent | Gate 3 COMPLETE | BUG-376 | Awaiting Gate 4 GO*
