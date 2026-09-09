# BUG-376 — Role Add/Update: 5 API Contract Gaps (modules prefix · role_master_id null · role_type IDs vs strings)

**ID:** BUG-376
**Type:** BUG (post-delivery contract mismatch — CR-069 / BUG-235 / CR-096)
**Date:** 2026-09-02
**Registered by:** INTAKE agent
**Priority:** P1
**Severity:** P1 — HIGH
**Risk:** HIGH (permissions, role management — auth-adjacent)
**Status:** INTAKE COMPLETE — OD-1 LOCKED — READY FOR GATE 3
**Sprint:** pos_5_x
**Source:** AGENT-DISCOVERED — Investigation 2026-09-02 (dev team backend spec add-update.md)
**Investigation doc:** `handover/INVESTIGATION_EMPLOYEE_ROLE_ADDUPDATE_2026_09_02.md`
**Related:** CR-069 (original build) · BUG-235 (partial fix, root cause missed) · CR-096 (partial fix, root cause missed) · BUG-231 (hid role_type UI)

---

## 1. Description

Dev team provided backend spec for `POST /role-add` and `PUT /role-update/{id}`. Cross-referencing the spec against the current FE code and a live API probe (cafe103) revealed **5 contract gaps** — all in `roleTransform.js` and `RoleFormView.jsx`. Previous fixes (BUG-235, CR-096) addressed symptoms (422 errors) but did not resolve the root contract mismatches.

**Backend spec key requirements:**
1. `modules` — role type string MUST be `modules[0]`, followed by permission strings.
2. `role_type` — array of string values (e.g. `["Manager"]`), not numeric IDs.
3. `role_master_id` — integer ID from `GET /role-master-list → roles[].id`.

**Live probe confirmed:** All existing backend roles have `modules[0]` = role type string (`"Manager"`, `"STATION"`, etc.). `role_type` field is `null` in all API responses — role type is carried exclusively via `modules[0]`.

---

## 2. Evidence

| Field | Value |
|-------|-------|
| Backend spec | `add-update.md` (dev team, 2026-09-02) |
| Live probe | cafe103 role-list + all-role-list + role-master-list |
| Confidence | CONFIRMED — code trace + live data |
| Source | AGENT-DISCOVERED |

---

## 3. Sub-Items (Gaps)

### Sub-A — `modules` missing role type string as `modules[0]` (CRITICAL)
- **File:Line:** `roleTransform.js:67` (`toAPI.createRole`) and `roleTransform.js:77` (`toAPI.updateRole`)
- **Current:** `modules: fe.modules` = `["pos","food","order"]` (permissions only)
- **Expected:** `modules: ["Manager","pos","food","order"]` (role type string first)
- **Impact:** New/updated roles have no role type → KOT routing, station assignment, printer agent selection all break

### Sub-B — `role_master_id` always `null` (HIGH)
- **File:Line:** `RoleFormView.jsx:125` — `roleMasterId: null` hardcoded
- **Current:** Template selection in `applyTemplate()` never stores the template ID
- **Expected:** `role_master_id: <selected template id>` from `role-master-list`
- **Impact:** All roles created/updated without template linkage

### Sub-C — `role_type` sends numeric IDs; backend expects string values (HIGH)
- **File:Line:** `RoleFormView.jsx:44-46` (BUG-235 fix) + `roleTransform.js:68,78`
- **Current:** `setRoleTypes(catalogRoleTypes.map(rt => rt.id))` = `[1,2,3,4,5,6]`
- **Expected:** `role_type: ["Manager"]` (string values from `role_type_value`)
- **Impact:** Wrong type on every create/update; BUG-235 fix sent wrong data type

### Sub-D — Edit/toggle always sends ALL role type IDs (HIGH)
- **File:Line:** `roleTransform.js:20` (`fromAPI.role`) + `RoleFormView.jsx:44-46` (BUG-235)
- **Root cause:** `api.role_type` is `null` in response → `fromAPI.role` returns `[]` → BUG-235 fills with ALL 6 IDs → every edit/toggle sends `role_type: [1,2,3,4,5,6]`
- **Fix:** Derive role type from `modules[0]` in `fromAPI.role` since backend returns `null` for `role_type`
- **Impact:** Every role edit/toggle corrupts the role type on backend

### Sub-E — `modules` on edit: Clear All drops role type string (MEDIUM)
- **File:Line:** `RoleFormView.jsx:17` (`checkedPerms` init from `role.modules`)
- **Current:** `checkedPerms` includes `"Manager"` only if it comes from `role.modules`; clicking "Clear All" removes it
- **Impact:** After "Clear All + re-select" on edit, role type lost from `modules`
- **OD-1 LOCKED (2026-09-02):** Clear All ONLY wipes permission checkboxes. Role type always preserved via `roleTypes` state and prepended in `toAPI`. Even with zero permissions, `modules: ["Manager"]` is valid — backend accepts role type alone, legacy shape honoured, no template re-pick needed.
- **Note:** Resolved automatically when Sub-A fix always prepends role type from `roleTypes` state

---

## 4. Duplicate Check

| Check | Result |
|-------|--------|
| BUG-235 | RELATED — fixed empty `role_type` by sending all IDs (wrong fix, root cause missed) |
| CR-096 | RELATED — derived role type ID from template `mapRole` match (still stores IDs, not strings) |
| BUG-231 | RELATED — hid `role_type` UI field (unrelated to payload shape) |
| CR-069 | RELATED — original build; these are post-delivery contract gaps |
| **Overall** | **DISTINCT** — none of the above fixed modules prefix, role_master_id null, or ID vs string type |

---

## 5. Severity Rationale

**P1 — HIGH** (not P0 because existing roles still function — the issues affect newly created/edited roles, not runtime order flow for existing data).

**Risk: HIGH** — touches role/permission management which is auth-adjacent. Wrong role type on a new role means incorrect KOT routing and station access at runtime.

**Fast Lane:** NO — touches 2 files with existing BUG markers (roleTransform.js, RoleFormView.jsx), auth-adjacent logic. Full gate flow required.

---

## 6. Blast Radius

```
src/api/transforms/roleTransform.js     — fromAPI.role + toAPI.createRole + toAPI.updateRole
src/components/panels/employee/RoleFormView.jsx  — handleSave + BUG-235 useEffect + applyTemplate
```

- Blast radius: **SMALL** (2 files, ~25 lines)
- Hotspot files: NO
- Financial logic: NO
- Other consumers of `toAPI.createRole/updateRole`: only `roleService.addRole` + `roleService.updateRole` — both already correct HTTP verb/endpoint

---

## 7. Owner Decisions

| ID | Question | Answer |
|----|---------|--------|
| OD-1 | Sub-E: When user clicks "Clear All" then saves on edit, should the role type always be preserved? | **YES — always preserve (2026-09-02)** — role type is structural, not a permission. "Clear All" only clears permission checkboxes. Role type always prepended from `roleTypes` state. Even with zero permissions selected, `modules: ["Manager"]` (role type only) is a valid payload — backend accepts it, legacy shape (role type first) is honoured, no template re-pick forced. |

---

## 8. Scope Lock (proposed)

**Files WILL change:**
- `src/api/transforms/roleTransform.js`
- `src/components/panels/employee/RoleFormView.jsx`

**Files will NOT touch:**
- `employeeTransform.js`, `employeeService.js`, `roleService.js`, `EmployeeListView.jsx`, `RoleListView.jsx`

---

## 9. Next Steps

1. Owner answers OD-1 (single question, Gate 3 can proceed in parallel with answer)
2. PLANNING → Gate 2 Impact Analysis + Gate 3 Implementation Plan
3. Gate 4 GO (owner approval — HIGH risk)
4. IMPLEMENTATION
5. QA
