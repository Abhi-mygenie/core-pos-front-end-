# CR-096 — Implementation Plan (Gate 3)

**ID:** CR-096
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO
**Date:** 2026-07-24
**Planning Agent:** E1
**Impact Analysis:** `/app/memory/impact/CR-096_IMPACT_ANALYSIS.md`

---

## Pre-Plan Verification (Line Reality Check)

| Plan Says | Actual File State | Status |
|---|---|---|
| `roleTransform.js` L50: `roleMasterList(response) {` | ✅ CONFIRMED | ACCURATE |
| `roleTransform.js` L55: `defaultModules: t.default_modules \|\| [],` | ✅ CONFIRMED | ACCURATE |
| `roleTransform.js` L56: `isProtected: !!t.is_protected,` (last field before closing brace) | ✅ CONFIRMED | ACCURATE |
| `RoleFormView.jsx` L83: `const applyTemplate = (templateId) => {` | ✅ CONFIRMED | ACCURATE |
| `RoleFormView.jsx` L87: `if (t) setCheckedPerms(new Set(t.defaultModules));` (last line of fn) | ✅ CONFIRMED | ACCURATE |
| `catalogRoleTypes` shape: `{ id, name, value }` where `value = rt.role_type_value` | ✅ CONFIRMED | ACCURATE |
| `clearAll()` (L77): only calls `setCheckedPerms(new Set())` — does NOT reset `roleTypes` | ✅ CONFIRMED | KEY INTERACTION |
| BUG-235 `useEffect` (L42-47): fires when `catalogRoleTypes.length > 0 && roleTypes.length === 0` | ✅ CONFIRMED | KEY INTERACTION |

Impact Analysis is **still accurate**. Proceeding to Gate 3.

---

## Scope Lock

- **Files WILL change:** `roleTransform.js`, `RoleFormView.jsx` (2 files)
- **Files will NOT touch:** `roleService.js`, `RoleListView.jsx`, `EmployeeListView.jsx`, `employeeService.js`, `employeeTransform.js`, any other file

---

## Key Interaction Analysis (BUG-235 ↔ CR-096)

```
BUG-235 useEffect guard: fires when (catalogRoleTypes.length > 0 AND roleTypes.length === 0)
                         → sets roleTypes to all catalog IDs
                         → ONLY fires once per catalog load

CR-096 E2 in applyTemplate: fires when user picks a template (user action)
                             → sets roleTypes to [matched.id] (or all if no match)
                             → fires on demand, any time after mount

RACE CONDITION RISK (LOW):
  If user selects template BEFORE catalog loads:
    → E2: catalogRoleTypes.length === 0 → SKIP setRoleTypes (guard below)
    → Catalog loads → BUG-235 useEffect fires (roleTypes is still []) → sets all-types
    → Role saves with all types (not the matched type) ← acceptable fallback
    → Probability: < 1% (catalog loads in <500ms, template requires deliberate user click)

SAFE DESIGN: E2 guard — only set roleTypes if catalogRoleTypes is already loaded.
             If catalog not yet loaded, skip and let BUG-235 handle initial fill.
```

---

## Execution Sequence

```
E1 first: roleTransform.js — expose mapRole field from API
E2 second: RoleFormView.jsx — consume mapRole in applyTemplate
(E1 enables E2 — both in different files, can be applied in parallel but E1 is logically prior)
```

---

## Exact Edits

### E1 — Add `mapRole` to `roleMasterList` transform

**File:** `roleTransform.js`
**Location:** Line 56, after `isProtected: !!t.is_protected,`

**Current (lines 50–58):**
```javascript
  roleMasterList(response) {
    const templates = response?.roles || [];
    return templates.map(t => ({
      id: t.id,
      name: t.name,
      defaultModules: t.default_modules || [],
      isProtected: !!t.is_protected,
    }));
  },
```

**After edit:**
```javascript
  roleMasterList(response) {
    const templates = response?.roles || [];
    return templates.map(t => ({
      id: t.id,
      name: t.name,
      defaultModules: t.default_modules || [],
      isProtected: !!t.is_protected,
      mapRole: t.map_role || null,  // CR-096: expose for role_type derivation in applyTemplate
    }));
  },
```

**Diff:**
```diff
      isProtected: !!t.is_protected,
+     mapRole: t.map_role || null,  // CR-096
    }));
  },
```

---

### E2 — Extend `applyTemplate` to derive `roleTypes` from `mapRole`

**File:** `RoleFormView.jsx`
**Location:** Lines 83–88 (`applyTemplate` function body)

**Current:**
```javascript
  const applyTemplate = (templateId) => {
    if (isReadOnly) return;
    if (!templateId) { clearAll(); return; }
    const t = templates.find(t => t.id === Number(templateId));
    if (t) setCheckedPerms(new Set(t.defaultModules));
  };
```

**After edit:**
```javascript
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
```

**Diff:**
```diff
  const applyTemplate = (templateId) => {
+   // CR-096: also derives roleTypes from template mapRole
    if (isReadOnly) return;
-   if (!templateId) { clearAll(); return; }
-   const t = templates.find(t => t.id === Number(templateId));
-   if (t) setCheckedPerms(new Set(t.defaultModules));
+   if (!templateId) {
+     clearAll();
+     if (catalogRoleTypes.length > 0) setRoleTypes(catalogRoleTypes.map(rt => rt.id));
+     return;
+   }
+   const t = templates.find(t => t.id === Number(templateId));
+   if (!t) return;
+   setCheckedPerms(new Set(t.defaultModules));
+   if (catalogRoleTypes.length > 0) {
+     const matched = catalogRoleTypes.find(rt => rt.value?.toLowerCase() === t.mapRole?.toLowerCase());
+     setRoleTypes(matched ? [matched.id] : catalogRoleTypes.map(rt => rt.id));
+   }
  };
```

**Design notes:**
- `if (catalogRoleTypes.length > 0)` guard: prevents overriding with empty array if catalog hasn't loaded yet. BUG-235 useEffect handles that case.
- `if (!t) return`: safer early exit — avoids calling `setCheckedPerms` on undefined.
- `t.mapRole?.toLowerCase()`: safe optional chain — handles `null` mapRole (future templates).
- Fallback `catalogRoleTypes.map(rt => rt.id)`: if no match found, all types (same as BUG-235 behavior).

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| User selects template before catalog loads | LOW (<1%) | Role saved with all types instead of matched type | BUG-235 useEffect handles initial fill; acceptable fallback |
| Template `mapRole` doesn't match any `catalogRoleTypes.value` (new future template) | LOW | Falls back to all types | `matched ? [matched.id] : catalogRoleTypes.map(rt => rt.id)` guard |
| `clearAll` button (line 198) clears permissions but leaves `roleTypes` populated | NO NEW RISK | No change — same as before. clearAll was already not resetting roleTypes in BUG-235 | The "Clear All" button on the form doesn't affect roleTypes; intentional |
| E2 changes `applyTemplate` signature | NONE | Function signature unchanged — same `(templateId)` param | Internal only |

---

## Verification Matrix (Step 4)

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|:---:|
| E1 | roleTransform.js | `mapRole` mapped in `roleMasterList` | Open Role Form → open browser DevTools → `React DevTools: templates[0].mapRole` should be "Manager" or "Waiter" etc. (not undefined) | NO — DevTools |
| E2 | RoleFormView.jsx | Template selection sets correct `roleTypes` | Select "Waiter(S)" template → save → check network tab: `role_type` should be `[2]` not `[1,2,3,4,5,6]` | NO — Network tab |
| E2 | RoleFormView.jsx | "Build from scratch" sets all types | Clear template selection → save → `role_type` should be `[1,2,3,4,5,6]` | NO — Network tab |
| E2 | RoleFormView.jsx | No 422 on any path | Create role with each template type → all should save successfully | NO — visual |
| E2 | RoleFormView.jsx | Unknown `mapRole` fallback | No immediate test (no such template exists) — covered by `matched ? ... : all` guard | N/A |

---

## Post-Code Registry Checklist (Step 5)

Implementation agent MUST execute after coding:

```
- [ ] registry.json: CR-096 → status: IMPLEMENTED, sprint_key: pos_5_0, gate: 0-5
- [ ] CR_REGISTRY.md: CR-096 row → IMPLEMENTED (date + iteration)
- [ ] FILE_OWNERSHIP.md: Add rows for:
       api/transforms/roleTransform.js — CR-096 — 2026-07-24
       components/panels/employee/RoleFormView.jsx — CR-096 — 2026-07-24
- [ ] Code markers: // CR-096 comment present in both files (added inline in E1 + E2 header)
- [ ] Delete premature doc: /app/memory/change_requests/CR-96_ROLETYPE_DERIVE_FROM_TEMPLATE.md
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
