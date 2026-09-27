# INVESTIGATION — Employee Management: Role Add / Update Gaps
**Date:** 2026-09-02
**Role:** INVESTIGATION
**Trigger:** Dev team backend spec (add-update.md) + owner-reported issue in employee management
**Status:** COMPLETE — 5 confirmed gaps, no code written

---

## 1. Backend Spec (from add-update.md)

### Role Add: `POST /role-add`
```json
{
  "name": "Floor Supervisor",
  "role_type": ["Manager"],
  "role_master_id": 3,
  "modules": ["Manager", "pos", "kitchen", "reports", "settings"]
}
```

### Role Update: `PUT /role-update/{id}`
Same as add, plus `status: 1`.

### Critical spec note:
> `modules` — Role type FIRST, then permissions — `modules[0]` must be the parent role string.
> `role_type` — Array; first item → parent role.
> `role_master_id` — From `role-master-list → roles[].id`.

---

## 2. Live API Probe (cafe103, 2026-09-02)

### `GET /role-list` — existing roles:
| id | name | role_type (API) | modules[0] | role_master_id |
|----|------|----------------|------------|----------------|
| 3272 | captain | **None** | `'Manager'` | None |
| 3273 | KDS | **None** | `'STATION'` | None |
| 3274 | BAR | **None** | `'STATION'` | None |
| 3275 | Manager | **None** | `'Manager'` | None |
| 3506 | Manger(C) | **None** | `'Manager'` | **20** |

**Key observation:** `role_type` field is `None`/null in ALL API responses. The role type is carried exclusively via `modules[0]` (the string value like `"Manager"`, `"STATION"`).

### `GET /all-role-list → role_types`:
| id | name | role_type_value |
|----|------|----------------|
| 1 | STATION | `'STATION'` |
| 2 | Waiter | `'Waiter'` |
| 3 | Manager | `'Manager'` |
| 4 | Billing | `'Billing'` |
| 5 | Server Waiter | `'Buffet'` |
| 6 | Delivery | `'Delivery'` |

### `GET /role-master-list`:
id=15 Accountant, id=17 Billing User, id=20 Captain (map_role='Manager'), etc.

---

## 3. Confirmed Gaps

---

### GAP-1 — `modules` never includes role type string as `modules[0]` on create (CRITICAL)

**Evidence:**
- All existing backend roles: `modules[0]` = role type string (`"Manager"`, `"STATION"`)
- Backend spec explicitly: `modules: ["Manager","pos","kitchen",...]` — role type FIRST
- Current `toAPI.createRole`:
  ```js
  modules: fe.modules,  // = [...checkedPerms] — ONLY permission strings, no role type
  ```
- `checkedPerms` is populated from `PERMISSION_GROUPS` permission keys (`"pos"`, `"food"`, etc.) — does NOT include role type strings

**Impact:** New roles created without `modules[0]` role type → KOT station routing breaks, printer agent station assignment fails, `role_type_value` derivation breaks at runtime.

**Fix:** In `toAPI.createRole` (and `updateRole`), prepend the role type string value to `modules`:
```js
// Derive role type string from fe.roleTypes IDs via catalogRoleTypes
// OR store string values directly in roleTypes state (recommended)
modules: [roleTypeStringValue, ...fe.modules.filter(m => m !== roleTypeStringValue)]
```

---

### GAP-2 — `role_master_id` is always `null` — template selection never stored (HIGH)

**Evidence:**
- `RoleFormView.jsx:125`: `roleMasterId: null,` — **hardcoded null**
- No state variable stores the selected template ID
- `applyTemplate(templateId)` only sets permissions + roleTypes — discards `templateId`
- `toAPI` receives `roleMasterId: null` for every save

**Impact:** All new roles created without `role_master_id`. Backend cannot link roles to their master template. Role inheritance and reporting by template type breaks.

**Fix:**
```js
// Add state:
const [selectedMasterId, setSelectedMasterId] = useState(role?.roleMasterId || null);

// In applyTemplate:
setSelectedMasterId(Number(templateId));

// In handleSave:
roleMasterId: selectedMasterId,  // instead of null
```

---

### GAP-3 — `role_type` sends numeric IDs; backend expects string values (HIGH)

**Evidence:**
- BUG-235 auto-populate: `setRoleTypes(catalogRoleTypes.map(rt => rt.id))` → stores `[1,2,3,4,5,6]`
- `applyTemplate`: `setRoleTypes(matched ? [matched.id] : ...)` → stores `[3]` for Manager
- `toAPI.createRole`: `role_type: fe.roleTypes` → sends `[3]` or `[1,2,3,4,5,6]`
- Backend spec: `role_type: ["Manager"]` (string values from `role_type_value`)
- `catalogRoleTypes[2].value = 'Manager'` — the string the backend expects

**Impact:** `role_type` field on backend receives numeric IDs instead of string values → backend cannot match role type → potential 422 or silent wrong assignment.

**Fix option A — store string values in state (cleanest):**
```js
// BUG-235 fix: store values, not IDs
setRoleTypes(catalogRoleTypes.map(rt => rt.value));
// applyTemplate:
setRoleTypes(matched ? [matched.value] : catalogRoleTypes.map(rt => rt.value));
// toAPI already sends fe.roleTypes as-is → now sends ["Manager"] ✅
```

**Fix option B — convert at toAPI layer:**
```js
// In toAPI.createRole/updateRole, map IDs → values using catalogRoleTypes (needs passing through)
```

Option A is cleaner — change what's stored in state from IDs to string values.

---

### GAP-4 — Edit/toggle flow sends ALL role type IDs; should send existing role's type (HIGH)

**Evidence:**
- `fromAPI.role`: `roleTypes: api.role_type || []` → always `[]` (API returns null)
- BUG-235 useEffect: when `roleTypes.length === 0` → sets `[1,2,3,4,5,6]` (all IDs)
- Toggle status (RoleListView): `updateRole(role.id, { ...role, roleTypes: role.roleTypes })`
  - `role.roleTypes` = `[]` from `fromAPI` → BUG-235 populates to all IDs → sends all IDs
- Edit: same problem — role type never recovered from API, defaults to all

**Root cause:** `role_type` is null in the API response. The actual role type is carried in `modules[0]` (e.g., `"Manager"`). FE does not read `modules[0]` to derive `roleTypes`.

**Fix:** In `fromAPI.role`, derive `roleTypes` from `modules[0]` as fallback:
```js
// If api.role_type is null, derive from modules[0] which carries the role type string
const derivedRoleType = (!api.role_type || api.role_type.length === 0) && api.modules?.length > 0
  ? [api.modules[0]]  // e.g., ["Manager"]
  : (api.role_type || []);
roleTypes: derivedRoleType,
```

This feeds the correct role type string into `roleTypes` state, which then flows through GAP-3 fix.

---

### GAP-5 — Edit save strips `modules[0]` role type (MEDIUM)

**Evidence:**
- `checkedPerms` initialized from `role?.modules || []`
- `role.modules = ["Manager", "pos", "food", "order"]` (includes role type string at [0])
- `PERMISSION_GROUPS` permission keys: `"pos"`, `"food"`, `"order"`, `"bill"`, etc.
- `"Manager"` / `"STATION"` / `"Waiter"` are NOT in `PERMISSION_GROUPS` permission keys
- So `"Manager"` gets stored in `checkedPerms` on mount, but if the user unchecks anything and saves, `[...checkedPerms]` will include "Manager" — BUT if the user clicks "Clear All" first, "Manager" is removed
- `toAPI.updateRole: modules: fe.modules = [...checkedPerms]` — no guaranteed role type prefix

**Impact:** If user clicks "Clear All" then re-selects permissions on edit, `modules[0]` role type is lost on save. After GAP-1 fix, this will be handled by always prepending from `roleTypes` state.

---

### GAP-6 — `printmodules` extra field not in spec (LOW)

`toAPI.createRole/updateRole` sends `printmodules: fe.printModules || []` — not in backend spec. Likely harmless (backend may ignore unknown fields) but not spec-compliant.

---

## 4. Data Flow Trace (Current vs Correct)

```
CURRENT (broken):
handleSave → data = { modules: [...checkedPerms],          // ["pos","food","order"] — NO role type prefix
                      roleTypes: [1,2,3,4,5,6],             // ALL role type IDs — wrong type + wrong format
                      roleMasterId: null }                   // always null
→ toAPI.createRole → { modules: ["pos","food","order"],     // missing modules[0] role type
                       role_type: [1,2,3,4,5,6],            // IDs, not strings
                       role_master_id: null,                 // always null
                       printmodules: [] }

CORRECT (per spec + live data):
handleSave → data = { modules: [...checkedPerms],           // ["pos","food","order"]
                      roleTypes: ["Manager"],                // string value, correct single type
                      roleMasterId: 20 }                     // from selected template
→ toAPI.createRole → { modules: ["Manager","pos","food","order"],  // role type prepended ✅
                       role_type: ["Manager"],               // string value ✅
                       role_master_id: 20 }                  // real ID ✅
```

---

## 5. Files Requiring Changes (for PLANNING → Gate 3)

| File | Change | Scope |
|------|--------|-------|
| `api/transforms/roleTransform.js` | `fromAPI.role`: derive `roleTypes` from `modules[0]` when `role_type` is null | ~5 lines |
| `api/transforms/roleTransform.js` | `toAPI.createRole/updateRole`: prepend role type string to `modules` | ~5 lines |
| `components/panels/employee/RoleFormView.jsx` | Add `selectedMasterId` state; set in `applyTemplate`; pass to `handleSave` | ~8 lines |
| `components/panels/employee/RoleFormView.jsx` | BUG-235 fix: store string values not IDs in `roleTypes` state | ~3 lines |

**Total:** ~21 lines across 2 files. MEDIUM blast radius. No hotspot files.

---

## 6. Risk Classification

| Gap | Risk |
|-----|------|
| GAP-1 `modules` missing role type | CRITICAL — new roles functionally broken |
| GAP-2 `role_master_id` null | HIGH — template linkage always lost |
| GAP-3 `role_type` IDs vs strings | HIGH — wrong field type sent |
| GAP-4 edit/toggle sends all IDs | HIGH — every edit corrupts role type |
| GAP-5 edit Clear All strips type | MEDIUM — edge case on edit |
| GAP-6 `printmodules` extra field | LOW — harmless |

**Overall item risk: HIGH** (role management, auth-adjacent permissions)

---

*Investigation complete: 2026-09-02 | INVESTIGATION role | 5 confirmed gaps | No code written*
