# CR-096 — Impact Analysis (Gate 2)

**ID:** CR-096
**Status:** GATE 2 COMPLETE — Awaiting Gate 3 (Implementation Plan)
**Date:** 2026-07-24
**Planning Agent:** E1
**Intake Doc:** `/app/memory/change_requests/CR-096_ROLETYPE_DERIVE_FROM_TEMPLATE_INTAKE.md`
**Related:** BUG-231, BUG-235, INV-ROLETYPE

---

## Header

- **Code Reality:** NONE — `mapRole` not in `roleMasterList` transform; `applyTemplate` never calls `setRoleTypes`. Fix not in code.
- **Conflict Pre-Check:** CLEAR — `roleTransform.js` and `RoleFormView.jsx` both last touched by BUG-235 (2026-07-24, IMPLEMENTED). No other open item targets either file.
- **Risk:** LOW — 2 files, additive only, no UI change, no API contract change.

---

## 1. Problem Statement

After BUG-235, new roles no longer 422. However, every new role — regardless of which template is chosen — sends `role_type: [1,2,3,4,5,6]` (all device types) to the backend.

**Root cause chain:**

1. `roleMasterList` transform (line 50–57) maps `id`, `name`, `defaultModules`, `isProtected` from the API. The `map_role` field (`"Manager"`, `"Waiter"`, `"STATION"`, `"Delivery"`) is **silently dropped** — never mapped to a frontend property.
2. `applyTemplate()` in `RoleFormView.jsx` (line 83–88) only calls `setCheckedPerms()`. It never calls `setRoleTypes()`. So template selection has **zero effect** on the `roleTypes` state.
3. The BUG-235 auto-populate `useEffect` fires once after catalog loads and `roleTypes` is empty → always sets all 6 IDs regardless of template.

---

## 2. Full Data Flow Trace

### Current (Broken) Flow — Template Selected

```
User picks "Waiter(S)" from Start from Template dropdown
  → onChange: applyTemplate("11")
  → t = templates.find(t => t.id === 11)
      → t = { id:11, name:"Waiter(S)", defaultModules:[...], isProtected:false }
      → t.mapRole: UNDEFINED  ← dropped by roleMasterList transform
  → setCheckedPerms(new Set(t.defaultModules))  ← permissions updated ✅
  → roleTypes state: UNCHANGED  ← still [] or [1,2,3,4,5,6] from BUG-235

User clicks Save:
  → data.roleTypes = [1,2,3,4,5,6]   ← ALL types — WRONG (should be [2] for Waiter)
  → POST /api/v1/vendoremployee/employee/role-add
  → { role_type: [1,2,3,4,5,6] }
  → Role created but tagged as STATION + Waiter + Manager + Billing + Buffet + Delivery
```

### Fixed Flow — Template Selected (after CR-096)

```
User picks "Waiter(S)" from Start from Template dropdown
  → onChange: applyTemplate("11")
  → t = templates.find(t => t.id === 11)
      → t = { id:11, name:"Waiter(S)", defaultModules:[...], isProtected:false, mapRole:"Waiter" }
      → t.mapRole: "Waiter"  ← now mapped ✅ (E1 fix)
  → setCheckedPerms(new Set(t.defaultModules))  ← unchanged ✅
  → matched = catalogRoleTypes.find(rt => rt.value.toLowerCase() === "waiter")
      → matched = { id:2, name:"Waiter", value:"Waiter" }
  → setRoleTypes([2])  ← correct ✅ (E2 fix)

User clicks Save:
  → data.roleTypes = [2]
  → POST → { role_type: [2] }  ← Waiter only — CORRECT ✅
```

### Fixed Flow — Build from Scratch (unchanged from BUG-235)

```
applyTemplate("")
  → !templateId → clearAll() → setRoleTypes(catalogRoleTypes.map(rt => rt.id))
  → roleTypes = [1,2,3,4,5,6]  ← all types (same as before)
  → POST → { role_type: [1,2,3,4,5,6] }  ← all types, accepted ✅
```

### Fixed Flow — No Template Set (new role first mount)

```
RoleFormView mounts (role=null)
  → roleTypes = []  ← from BUG-235 init
  → BUG-235 useEffect fires (catalog loaded, roleTypes.length === 0)
  → setRoleTypes([1,2,3,4,5,6])  ← all types (user hasn't selected template yet)
  → IF user then picks a template → applyTemplate fires → setRoleTypes([matched.id])  ✅
  → IF user saves without template → roleTypes = [1,2,3,4,5,6]  ✅
```

---

## 3. Template → role_type Mapping Reference (from INV-ROLETYPE evidence)

| Template Name | API map_role | Catalog match | role_type ID sent |
|---|---|---|---|
| Accountant | Manager | Manager (id=3) | [3] |
| Billing User | Manager | Manager (id=3) | [3] |
| Captain | Manager | Manager (id=3) | [3] |
| Cashier | Manager | Manager (id=3) | [3] |
| Delivery Boy | Delivery | Delivery (id=6) | [6] |
| Manager | Manager | Manager (id=3) | [3] |
| Owner | Manager | Manager (id=3) | [3] |
| Station (Chef) | STATION | STATION (id=1) | [1] |
| Waiter(S) | Waiter | Waiter (id=2) | [2] |
| Waiter(T) | Waiter | Waiter (id=2) | [2] |
| *(Build from scratch)* | — | — | [1,2,3,4,5,6] |

Match logic: `catalogRoleTypes.find(rt => rt.value?.toLowerCase() === t.mapRole?.toLowerCase())`
Edge case: if no match found (future template with unknown map_role) → falls back to all types (safe).

---

## 4. Employee Add / Edit Impact Assessment (Owner-requested)

| Component | Calls `getRoleMasterList()`? | Calls `applyTemplate()`? | Affected? |
|---|---|---|:---:|
| `EmployeeListView.jsx` | ❌ NO | ❌ NO | **NO** |
| `EmployeeManagementPage.jsx` | ❌ NO (just imports RoleFormView) | ❌ NO | **NO** |
| `RoleListView.jsx` | ❌ NO | ❌ NO | **NO** |
| `RoleFormView.jsx` | ✅ YES | ✅ YES | **YES — TARGET** |

**Conclusion:** Employee Add/Edit forms (`EmployeeListView.jsx`) are entirely separate from Role Create/Edit. They use the `roles` list (from `getRoles()`) and a role-assignment dropdown — not the template system. **Zero impact on employee add/edit.**

---

## 5. Affected Files

| File | Lines | Change Description |
|---|---|---|
| `api/transforms/roleTransform.js` | Line 56 (add 1 line after `isProtected`) | Add `mapRole: t.map_role \|\| null` |
| `components/panels/employee/RoleFormView.jsx` | Lines 83–88 (`applyTemplate` function) | Add `setRoleTypes(...)` call with `mapRole` matching |

**Total:** 2 files, ~6 lines

---

## 6. Risk Assessment

| Dimension | Assessment |
|---|---|
| **API contract change** | NO — no new API fields sent; only `role_type` payload changes value (was [1..6], now [matched.id]) |
| **Transform change** | YES — `roleMasterList()` additive (1 new field). Additive-only, zero breaking risk. |
| **State management change** | YES — `applyTemplate()` now calls `setRoleTypes()`. Bounded to `RoleFormView` scope. |
| **Financial/order logic** | NO |
| **Hotspot files touched** | NO — neither file is in R5 hotspot list |
| **Downstream consumers** | `RoleFormView.jsx` is only consumer of `roleMasterList`. No fan-out risk. |
| **Risk label** | **LOW** |
| **Fast Lane eligible** | NO — 2 files (above 1-file threshold) |

---

## 7. Proposed Edits (Gate 3 preview)

| Edit # | File | Location | Current | Proposed |
|---|---|---|---|---|
| E1 | `roleTransform.js` | Line 56, after `isProtected` | `isProtected: !!t.is_protected,` | Add: `mapRole: t.map_role \|\| null,  // CR-096` |
| E2 | `RoleFormView.jsx` | Lines 83–88, `applyTemplate` | `if (t) setCheckedPerms(new Set(t.defaultModules));` | Extend to also call `setRoleTypes(matched ? [matched.id] : catalogRoleTypes.map(rt => rt.id))` |

**Scope lock:**
- Files WILL change: `roleTransform.js`, `RoleFormView.jsx`
- Files will NOT touch: `roleService.js`, `RoleListView.jsx`, `EmployeeListView.jsx`, `employeeService.js`, any other file

---

## 8. Owner Decisions Needed

**None.** Option A confirmed by owner (2026-07-24). Fallback to all-types when no template match is acceptable per owner Q1 answer.

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-096 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: CR-096 row → IMPLEMENTED (date + iteration)
- [ ] FILE_OWNERSHIP.md: Add rows for:
       api/transforms/roleTransform.js — CR-096 — 2026-07-24
       components/panels/employee/RoleFormView.jsx — CR-096 — 2026-07-24
- [ ] Code markers: // CR-096 comment in both modified files
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
