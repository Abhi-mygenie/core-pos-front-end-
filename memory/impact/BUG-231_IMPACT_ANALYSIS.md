# BUG-231 — Impact Analysis: Role Form Hide role_type + Error Toasts

**ID:** BUG-231
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-22
**Risk:** LOW
**Code Reality:** PARTIAL
  - Sub-A: role_type UI EXISTS at L143-153 (needs removal)
  - Sub-B: error toast ALREADY EXISTS at L111 (`toast.error(err?.readableMessage || 'Failed to save role')`)
**Conflict Pre-Check:** RoleFormView.jsx last touched by BUG-198 (IMPLEMENTED, wired role_type). No active conflicts.

---

## 1. Data Flow Trace — Sub-A (Hide role_type)

```
State:
  const [roleTypes, setRoleTypes] = useState(role?.roleTypes || []);  // L18
  const [catalogRoleTypes, setCatalogRoleTypes] = useState([]);       // L22

Load:
  useEffect → roleService.getAllRoleList() → catalog.roleTypes        // L28-32
  setCatalogRoleTypes(catalog.roleTypes);                              // L32

UI (REMOVE):
  L143: <div> wrapper
  L144:   <Label>Role Type</Label>
  L145-152: <select> dropdown with catalogRoleTypes.map(...)

Save payload (KEEP):
  L96-101: data = { name, modules, roleTypes, roleMasterId }          // L99: roleTypes
  → Backend receives roleTypes in payload
  → Backend maps role type based on template (owner directive)
  → UI field is unnecessary — backend handles it
```

## 2. Changes Required — Sub-A

### Change 1: Remove role_type UI block
```
File: RoleFormView.jsx
Remove: Lines 143-153 (the <div> containing Label "Role Type" + select dropdown)
Keep: L18 (roleTypes state), L22 (catalogRoleTypes state), L32 (load catalog), L99 (payload)
Reason: Backend still needs roleTypes in the save payload. Only the UI is removed.
```

**Grid layout adjustment:** Currently `grid-cols-3` at L137. After removing Role Type:
- 2 remaining fields: Role Name + Start from Template
- Change to `grid-cols-2` OR keep 3-col with the gap — evaluate in Gate 3

## 3. Data Flow Trace — Sub-B (Error Toasts)

```
Save error handling:
  L110-111: catch (err) { toast.error(err?.readableMessage || 'Failed to save role'); }

Axios interceptor (axios.js L36-98):
  → 6-branch chain extracts error message from API response
  → error.readableMessage = errorMessage (L94)
  → Covers: Laravel 422 validation, string error, timeout, network

Catalog load error:
  L34-35: catch (err) { toast.error('Failed to load permission catalog'); }
```

### ⚠ CODE REALITY DISCREPANCY

The intake doc (BUG-231) states: *"When role save fails, no error toast is shown."*

**However, the code at L111 ALREADY has `toast.error(err?.readableMessage || 'Failed to save role')`.**

The axios interceptor at `axios.js:94` enriches ALL errors with `readableMessage`, including:
- Laravel 422 validation errors (duplicate name, missing permissions)
- Generic error messages
- Timeout/network errors

**Conclusion: Sub-B appears already implemented.** The toast exists and the interceptor provides the message.

### Possible explanations for intake discrepancy:
1. Intake was written before BUG-198 added the toast (BUG-198 wired role_type + may have added the error handling)
2. The error toast fires but the error message is unhelpful (e.g. "Something went wrong" instead of specific field error)

### Recommendation:
- **Verify on preprod:** Intentionally trigger a save error (e.g. blank name) and check if toast appears
- If toast works → Sub-B is ALREADY DONE, mark as NO-OP
- If toast doesn't work → investigate why (may be a catch path issue)

## 4. Files Affected

| File | Change | Risk |
|---|---|---|
| `components/panels/employee/RoleFormView.jsx` | Sub-A: remove L143-153 (role_type UI), adjust grid | LOW |
| `components/panels/employee/RoleFormView.jsx` | Sub-B: **likely NO-OP** — verify on preprod first | ZERO |

**Files WILL NOT touch:** roleService.js, axios.js, permissionCatalog.js

## 5. Downstream Consumers

- Save payload: roleTypes still sent to backend — no API contract change
- Edit form: role.roleTypes still loaded into state on edit — no data loss
- Backend: Continues to receive roleTypes; maps based on template as before

## 6. Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | Removing UI but keeping state+payload — future dev might not know roleTypes exists | Add code comment: `// BUG-231: role_type UI hidden, backend maps via template. State+payload kept for API compatibility.` |
| R2 | Grid layout awkward with 2 fields in 3-col grid | Adjust to grid-cols-2 or md:grid-cols-2 |

## 7. Open Questions — NONE

Owner directive clear: "no role type needed, hide it, backend maps it based on template."

---

## Next

Gate 3 (Implementation Plan) → Gate 4 GO → Implementation.
Sub-B: Verify on preprod before Gate 3 — if toast already works, mark as NO-OP.
