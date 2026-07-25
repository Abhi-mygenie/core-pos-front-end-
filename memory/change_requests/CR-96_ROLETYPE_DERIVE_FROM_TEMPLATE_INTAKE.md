# CR-96 — Role Type Derivation from Template map_role (Intake)

**ID:** CR-96
**Type:** CR
**Registered:** 2026-07-24
**Status:** INTAKE COMPLETE — Gate 1 ✅ | Awaiting Gate 2 (Impact Analysis)
**Sprint:** pos_5_0
**Related:** BUG-231 (upstream cause), BUG-235 (partial fix this improves)

---

## 1. Summary

BUG-235 fixed the HTTP 422 "role_type required" error by auto-filling all 6 catalog `role_type` IDs
for every new role. This works but is semantically wrong: a role created from the "Cashier" template
receives device-type access for STATION + Waiter + Manager + Billing + Buffet + Delivery — all types.

This CR implements **Option A** (owner approved 2026-07-24): when a template is selected, derive the
correct `role_type` from the template's `map_role` field and send only that ID. For "Build from scratch"
(no template), keep the all-types fallback.

Root cause identified by INV-ROLETYPE investigation (2026-07-24):
- `roleTransform.fromAPI.roleMasterList()` drops `map_role` from the API response — field never mapped
- `applyTemplate()` in `RoleFormView.jsx` only updates `checkedPerms`, never updates `roleTypes`

---

## 2. Classification

- **Type:** CR
- **Severity:** P1 — incorrect device-type access assignment for all template-based custom roles
- **Risk:** LOW — 2 files, ~6 lines, additive, no UI change, no API contract change
- **Fast Lane eligible:** NO — 2 files (above 1-file threshold)
- **Process required:** Full Gates 1–6

---

## 3. Duplicate Check

- **RELATED to BUG-231** — BUG-231 hid the role_type UI; this is a downstream consequence
- **RELATED to BUG-235** — BUG-235 fixed the 422 but introduced semantic incorrectness; this improves it
- **DISTINCT registration** — neither BUG-231 nor BUG-235 covers template-driven role_type derivation

---

## 4. Evidence

- **Source:** AGENT-DISCOVERED via INV-ROLETYPE investigation (2026-07-24)
- **Confidence:** SUSPECTED (POST endpoint CSRF-blocked; behavior inferred from GET API structure + existing role data)
- **Screenshot:** not applicable
- **Steps to reproduce:**
  1. Go to Employee Management → Roles → Add Role
  2. Select "Waiter(S)" template
  3. Enter role name → Save
  4. Inspect network request: `role_type: [1,2,3,4,5,6]` is sent instead of `[2]`
  5. Role is created but tagged as all device types instead of Waiter only
- **Evidence files:** `/app/memory/evidence/INV-ROLETYPE/`

### Code Evidence

```javascript
// roleTransform.js — roleMasterList (line 50-58) — CURRENT
roleMasterList(response) {
  return templates.map(t => ({
    id: t.id,
    name: t.name,
    defaultModules: t.default_modules || [],
    isProtected: !!t.is_protected,
    // ❌ map_role: t.map_role  ← MISSING — field dropped silently
  }));
},

// RoleFormView.jsx — applyTemplate (line 83-88) — CURRENT
const applyTemplate = (templateId) => {
  if (isReadOnly) return;
  if (!templateId) { clearAll(); return; }
  const t = templates.find(t => t.id === Number(templateId));
  if (t) setCheckedPerms(new Set(t.defaultModules));
  // ❌ setRoleTypes(...)  ← NEVER CALLED — roleTypes unaffected by template selection
};
```

### Template map_role Values (from API, 2026-07-24)

| Template | map_role | Expected role_type ID |
|---|---|---|
| Accountant | Manager | 3 |
| Billing User | Manager | 3 |
| Captain | Manager | 3 |
| Cashier | Manager | 3 |
| Delivery Boy | Delivery | 6 |
| Manager | Manager | 3 |
| Owner | Manager | 3 |
| Station (Chef) | STATION | 1 |
| Waiter(S) | Waiter | 2 |
| Waiter(T) | Waiter | 2 |

---

## 5. Blast Radius

- **Files affected:** 2
  - `api/transforms/roleTransform.js` — `roleMasterList()` (1 line addition)
  - `components/panels/employee/RoleFormView.jsx` — `applyTemplate()` (~5 lines)
- **Hotspot files touched:** NO (both last touched by BUG-235 today — our own work)
- **Estimated scope:** SMALL
- **Downstream consumers of `roleMasterList`:**
  - ONLY `RoleFormView.jsx` — zero other consumers
- **Employee Add/Edit impact:** NOT AFFECTED
  - `EmployeeListView.jsx` does NOT call `getRoleMasterList()` or `applyTemplate()`
  - `EmployeeManagementPage.jsx` imports `RoleFormView` — but fix is internal to `RoleFormView`, no prop/API changes

---

## 6. Owner Decisions Needed

None. Option A was confirmed by owner (2026-07-24). Match logic confirmed: case-insensitive `value === mapRole` comparison is sufficient for all 10 existing templates.

---

## 7. Gate Status

```
Gate 1 (Intake):   ✅ COMPLETE (2026-07-24)
Gate 2 (Impact):   ⬜ PENDING
Gate 3 (Plan):     ⬜ PENDING
Gate 4 (GO):       ⬜ PENDING
Gate 5 (Impl):     ⬜ PENDING
Gate 6 (QA):       ⬜ PENDING
```
