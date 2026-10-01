# SESSION HANDOVER — BUG-376 Intake Complete
**Date:** 2026-09-02
**Written by:** INTAKE agent
**For:** Next agent (PLANNING role — Gate 2 Impact Analysis)
**Status:** INTAKE COMPLETE — OD-1 LOCKED — GATE 3 READY

---

## 1. First Action for Next Agent

**Do NOT start coding. Read this handover + the investigation doc + the intake doc, then present BUG-376 to the owner and ask:**

> "BUG-376 is registered — 5 contract gaps in Role Add/Update. OD-1 is answered (Yes — preserve role type on Clear All). Gate 3 is unblocked. Shall I proceed with the Implementation Plan (Gate 3)?"

All owner decisions are locked. No blockers remain before Gate 3.

---

## 2. What Happened This Session

1. Owner reported issue in employee management module
2. Dev team provided backend spec (`add-update.md`) for `POST /role-add` and `PUT /role-update/{id}`
3. INVESTIGATION role traced 5 gaps vs spec + confirmed via live API probe (cafe103)
4. INTAKE role registered **BUG-376** with all 5 sub-items

---

## 3. BUG-376 Summary — The 5 Gaps

**Root issue:** `roleTransform.toAPI` and `RoleFormView.handleSave` send wrong data shape vs backend spec. Previous fixes (BUG-235, CR-096) addressed 422 errors by filling in `role_type`, but stored/sent the wrong type (numeric IDs) and never fixed `modules` prefix or `role_master_id`.

| Sub | Gap | File | Severity |
|-----|-----|------|---------|
| **A** | `modules` never has role type string as `modules[0]` | `roleTransform.js:67,77` | CRITICAL |
| **B** | `role_master_id` hardcoded `null` in `handleSave` — template ID never stored | `RoleFormView.jsx:125` | HIGH |
| **C** | `role_type` sends numeric IDs `[1,2,3,4,5,6]`; spec expects strings `["Manager"]` | `roleTransform.js:68,78` + `RoleFormView.jsx:44-46` | HIGH |
| **D** | `fromAPI.role` never reads `modules[0]` to derive role type → BUG-235 fills all IDs | `roleTransform.js:20` | HIGH |
| **E** | "Clear All" on edit drops role type from `modules` | `RoleFormView.jsx:17` | MEDIUM |

**Fix path:**
- `fromAPI.role`: derive `roleTypes` from `modules[0]` when `role_type` is null (Sub-D)
- `RoleFormView` BUG-235 useEffect: store string VALUES not IDs (Sub-C)
- `applyTemplate`: save `selectedMasterId` to state (Sub-B)
- `handleSave`: pass `roleMasterId: selectedMasterId` (Sub-B)
- `toAPI.createRole/updateRole`: prepend role type string to `modules` (Sub-A, resolves Sub-E)

**Blast radius: SMALL — 2 files, ~25 lines:**
- `src/api/transforms/roleTransform.js`
- `src/components/panels/employee/RoleFormView.jsx`

---

## 4. Backend Spec (Exact — from dev team)

### `POST /role-add`
```json
{
  "name": "Floor Supervisor",
  "role_type": ["Manager"],
  "role_master_id": 3,
  "modules": ["Manager", "pos", "kitchen", "reports", "settings"]
}
```
### `PUT /role-update/{id}`
Same + `"status": 1`

**Key rule:** `modules[0]` = role type string first, then permission strings.

---

## 5. Live Probe Evidence (cafe103, 2026-09-02)

| role_type from GET /role-list | `None` on every role — always null |
| modules[0] on existing roles | `"Manager"` / `"STATION"` / `"Waiter"` — confirms spec |
| role_type_value strings | `'Manager'`, `'STATION'`, `'Waiter'`, `'Billing'`, `'Buffet'`, `'Delivery'` |
| role-master-list IDs | id=15..20 (Accountant, Billing User, Captain, Cashier, Delivery Boy, Manager, Owner, Station Chef, Waiter variants) |

---

## 6. Docs Written This Session

| Doc | Path |
|-----|------|
| Investigation report | `handover/INVESTIGATION_EMPLOYEE_ROLE_ADDUPDATE_2026_09_02.md` |
| Intake doc | `change_requests/BUG-376_ROLE_ADD_UPDATE_CONTRACT_GAPS_INTAKE.md` |
| Registry | `control/registry.json` — BUG-376 added |
| BUG Tracker | `control/BUG_TRACKER.md` — BUG-376 row appended |

---

## 7. OD-1 ✅ LOCKED (2026-09-02)

> Sub-E: When user clicks "Clear All" then re-saves on edit role, should the role type always be automatically preserved?
>
> **OWNER DECISION: YES — always preserve. Exact owner wording:**
> *"Clear All should only wipe permission checkboxes. Role type (e.g. Manager) is structural (role_type / modules[0] for legacy FE), not a permission. On save you'd still send:*
> ```json
> { "name": "...", "role_type": ["Manager"], "role_master_id": 3, "modules": ["Manager"], "status": 1 }
> ```
> *That matches the legacy shape (role type first) and avoids forcing a template re-pick just to clear perms."*

**Implementation rule (locked):**
- `checkedPerms` (permission checkboxes) and role type (`roleTypes` state) are **independent state**.
- "Clear All" calls `clearAll()` which only clears `checkedPerms` — never touches `roleTypes`.
- `toAPI.createRole/updateRole` always prepends the role type string to `modules`, even if `checkedPerms` is empty: `modules: [roleTypeString]` is valid.

**Gate 3 is unblocked.** No outstanding owner decisions.

---

## 8. What NOT To Do

- Do NOT start coding before Gate 4 GO
- Do NOT modify BUG-235 or CR-096 code markers — new markers will be `// BUG-376`
- Do NOT touch `employeeService.js`, `roleService.js`, `EmployeeListView.jsx`, `RoleListView.jsx`

---

*Handover written: 2026-09-02 | INTAKE agent | BUG-376 registered | OD-1 LOCKED (Yes) | Gate 3 ready — no blockers*
