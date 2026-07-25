# BUG-235 — Implementation Plan (Gate 3)

**ID:** BUG-235
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO
**Date:** 2026-07-24
**Planning Agent:** E1
**Impact Analysis:** `/app/memory/BUG-235_IMPACT_ANALYSIS.md`
**Related:** BUG-231 (upstream cause)
**Owner Q1 Answer:** Option (b) — auto-send ALL available catalog role_types (confirmed 2026-07-24)

---

## Pre-Plan Verification (Line Reality Check)

| Plan Says | Actual File State | Status |
|---|---|---|
| `roleTransform.js` L19: `updatedAt: api.updated_at \|\| null,` (last line before `}`) | ✅ CONFIRMED — exact match | ACCURATE |
| `RoleFormView.jsx` L18: `const [roleTypes, setRoleTypes] = useState(role?.roleTypes \|\| []);` | ✅ CONFIRMED — exact match | ACCURATE |
| `RoleFormView.jsx` L26-40: catalog `useEffect` with `setCatalogRoleTypes(catalog.roleTypes)` | ✅ CONFIRMED — exact match | ACCURATE |
| `RoleListView.jsx` L89: `roleTypes: [],` inside `toggleStatus` | ✅ CONFIRMED — exact match | ACCURATE |

Impact Analysis is **still accurate**. Proceeding to Gate 3.

---

## Scope Lock

- **Files WILL change:** `roleTransform.js`, `RoleFormView.jsx`, `RoleListView.jsx` (3 files)
- **Files will NOT touch:** `roleService.js`, `employeeService.js`, `employeeTransform.js`, `EmployeeListView.jsx`, `RoleListView.jsx` (except line 89), any report or order file

---

## Execution Sequence

Execute in this order — E1 must come first because E2+E3 depend on `roleTypes` being populated from the API.

```
E1: roleTransform.js     — add roleTypes mapping in fromAPI.role()
E2: RoleFormView.jsx     — add auto-populate useEffect after catalog loads
E3: RoleListView.jsx     — use role.roleTypes instead of hardcoded []
```

---

## Exact Edits

### E1 — Add roleTypes mapping in fromAPI.role()

**File:** `roleTransform.js`
**Line:** 19 (insert after `updatedAt` line, before closing `};`)

**Current block (lines 5–21):**
```javascript
role(api) {
  return {
    id: api.id,
    name: api.name || '',
    active: api.status === 1,
    modules: api.modules || [],
    totalModules: api.total_modules || 0,
    isSystemRole: !!api.is_system_role,
    isEditable: api.is_editable !== false,
    protectionLevel: api.protection_level || null,
    roleMasterId: api.role_master_id || null,
    roleMasterName: api.role_master_name || null,
    parentRole: api.parent_role || null,
    createdAt: api.created_at || null,
    updatedAt: api.updated_at || null,
  };
},
```

**After edit (add 1 line before closing brace):**
```javascript
role(api) {
  return {
    id: api.id,
    name: api.name || '',
    active: api.status === 1,
    modules: api.modules || [],
    totalModules: api.total_modules || 0,
    isSystemRole: !!api.is_system_role,
    isEditable: api.is_editable !== false,
    protectionLevel: api.protection_level || null,
    roleMasterId: api.role_master_id || null,
    roleMasterName: api.role_master_name || null,
    parentRole: api.parent_role || null,
    createdAt: api.created_at || null,
    updatedAt: api.updated_at || null,
    roleTypes: api.role_type || [],  // BUG-235: map role_type so edit/toggle always has correct value
  };
},
```

**Diff:**
```diff
    updatedAt: api.updated_at || null,
+   roleTypes: api.role_type || [],  // BUG-235
  };
},
```

---

### E2 — Auto-populate roleTypes from catalog in RoleFormView

**File:** `RoleFormView.jsx`
**Location:** After the existing catalog `useEffect` (lines 25–40), insert a new `useEffect`

**Insert after line 40 (`  }, []);`):**
```javascript
  // BUG-235: auto-populate roleTypes with all catalog IDs when empty (new role or edit with no role_type)
  useEffect(() => {
    if (catalogRoleTypes.length > 0 && roleTypes.length === 0) {
      setRoleTypes(catalogRoleTypes.map(rt => rt.id));
    }
  }, [catalogRoleTypes]); // intentionally omit roleTypes — only trigger when catalog loads
```

**Why this approach:**
- Fires once when `catalogRoleTypes` changes from `[]` to populated (after API response)
- Guard `roleTypes.length === 0` ensures it does NOT override an existing selection for edit mode
  (since E1 now maps `api.role_type` correctly, edit mode will have `roleTypes` populated before this fires)
- For new roles: `roleTypes` stays `[]` until catalog loads → auto-set to all IDs
- No UI change — field remains hidden (BUG-231 intent preserved)

---

### E3 — Use role.roleTypes in active toggle (RoleListView)

**File:** `RoleListView.jsx`
**Line:** 89

**Current:**
```javascript
await roleService.updateRole(role.id, { ...role, name: role.name, modules: role.modules, active: !role.active, roleTypes: [], roleMasterId: role.roleMasterId });
```

**After edit:**
```javascript
await roleService.updateRole(role.id, { ...role, name: role.name, modules: role.modules, active: !role.active, roleTypes: role.roleTypes, roleMasterId: role.roleMasterId });  // BUG-235: use actual roleTypes, not []
```

**Diff:**
```diff
- roleTypes: [],
+ roleTypes: role.roleTypes,  // BUG-235
```

**Note:** `role.roleTypes` is now populated by E1 (`fromAPI.role()` maps it). If the backend returns `role_type: []` for an old role (edge case), this would still fail. The fallback guard in `toAPI.updateRole` (`fe.roleTypes || []`) would still send `[]`. To be safe, the Implementation agent should also ensure the transform's `toAPI.updateRole` sends a non-empty default:

**Defensive guard in roleTransform.js (E3-B) — optional but recommended:**

Check current line 76: `role_type: fe.roleTypes || [],`

If `role.roleTypes` comes back as `[]` from an old backend record, the auto-populate useEffect in `RoleFormView` handles it for the form flow. For `RoleListView` toggle (no catalog loaded), add a fallback. However, this requires knowing a valid role_type ID — which we don't have at toggle time without a catalog fetch.

**Decision:** E3-B is NOT included in this plan. The risk is LOW: if an old role returns `role_type: []` from the backend, the toggle will 422 on that specific role. This is an edge case that existed before this bug too. Owner can add a catalog fetch to `RoleListView` in a future CR if needed.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `catalogRoleTypes` loads AFTER user clicks Save immediately | LOW | Save 422 | User would need to click save in <100ms. In practice not possible. Guard in useEffect already handles this. |
| E1 breaks existing role edit (roleTypes not in API response) | LOW | Edit still sends `[]` (existing behavior, no regression) | `api.role_type \|\| []` guard handles missing field |
| E3 breaks toggle for roles with `role_type: []` from backend | LOW | 422 on toggle | Same behavior as today. Not a regression. Deferred to separate CR. |
| `setRoleTypes` in useEffect triggers an extra render | NEGLIGIBLE | 1 extra re-render on form mount | Normal React behavior, no performance impact |

---

## Verification Matrix (Step 4)

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|:---:|
| E1 | roleTransform.js | `fromAPI.role()` maps `roleTypes` | Open Role list in browser, open DevTools → check React state for a role → confirm `roleTypes` is an array not `undefined` | NO — DevTools |
| E2 | RoleFormView.jsx | New role auto-populates roleTypes from catalog | Click "Add Role" → fill name → select permissions → click Save → confirm **no 422**, success toast appears | NO — visual |
| E2 | RoleFormView.jsx | Edit role does not override existing roleTypes | Open existing role → save without changes → confirm **no 422**, success toast appears | NO — visual |
| E3 | RoleListView.jsx | Active toggle no longer sends `roleTypes: []` | Toggle a role's active switch → confirm **no 422**, switch reflects new state | NO — visual |

---

## Post-Code Registry Checklist (Step 5)

The Implementation agent MUST execute after coding:

```
- [ ] registry.json: BUG-235 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: BUG-235 row → IMPLEMENTED (date + iteration)
- [ ] FILE_OWNERSHIP.md: Add rows for:
       roleTransform.js — BUG-235 — 2026-07-24
       RoleFormView.jsx — BUG-235 — 2026-07-24
       RoleListView.jsx — BUG-235 — 2026-07-24
- [ ] Code markers: // BUG-235 comment present in all 3 modified files
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
