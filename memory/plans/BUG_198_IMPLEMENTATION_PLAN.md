# BUG-198 — Implementation Plan (Gate 3)

**ID:** BUG-198
**Date:** 2026-07-17
**Agent Role:** PLANNING
**Impact Analysis:** `impact/BUG-198_IMPACT_ANALYSIS.md` (Gate 2 — verified current, no drift)
**Risk:** HIGH
**Scope Lock:** 4 files change, 1 file deleted, 10 files untouched

---

## Owner Decisions (from Impact Analysis)

1. No dedicated reset-password endpoint → use PUT update with password inline in row
2. `password_confirmation` NOT required on create or update
3. Password field = normal editable column; Save All includes it in update payload

---

## Execution Sequence

**Order matters:** Edits 1-2 (service + transform) are API-layer fixes that must land before Edits 3-5 (UI layer) reference the changed functions. Edit 6 (delete) is last since it removes the file that Edit 3 un-imports.

```
Edit 1 → employeeService.js     (API method fixes + remove dead function)
Edit 2 → employeeTransform.js   (payload fixes)
Edit 3 → EmployeeListView.jsx   (remove dialog imports/state/usage)
Edit 4 → EmployeeListView.jsx   (add inline password + eye toggle)
Edit 5 → EmployeeListView.jsx   (new row eye toggle)
Edit 6 → ResetPasswordDialog.jsx (DELETE file)
── COMPILE CHECK ──
── SELF-TEST ──
```

---

## Edit 1 — employeeService.js: POST → PUT + Remove Dead Function

**Sub-Issues:** A + B

### Edit 1a — Line 19: POST → PUT for updateEmployee

**Current (L19):**
```js
  const response = await api.post(`${API_ENDPOINTS.EMPLOYEES_UPDATE}/${id}`, payload);
```

**New:**
```js
  const response = await api.put(`${API_ENDPOINTS.EMPLOYEES_UPDATE}/${id}`, payload);
```

### Edit 1b — Lines 30-35: Remove resetEmployeePassword (no longer needed — password goes through updateEmployee)

**Current (L30-35):**
```js
export async function resetEmployeePassword(id, password) {
  const response = await api.post(`${API_ENDPOINTS.EMPLOYEES_UPDATE}/${id}`, {
    password,
  });
  return response.data;
}
```

**New:** Delete these 6 lines entirely.

**Verification:** Grep codebase → zero references to `resetEmployeePassword` after Edit 3 removes the call site.

---

## Edit 2 — employeeTransform.js: Add status to create + Add optional password to update

**Sub-Issues:** D + B

### Edit 2a — Lines 28-37: Add `status: 1` to createEmployee

**Current (L28-37):**
```js
  createEmployee(fe) {
    return {
      f_name: fe.firstName,
      l_name: fe.lastName,
      phone: fe.phone,
      email: fe.email || '',
      role_id: fe.roleId,
      password: fe.password,
      bill_user_view: fe.billUserView ? 'Yes' : 'No',
    };
```

**New:**
```js
  createEmployee(fe) {
    return {
      f_name: fe.firstName,
      l_name: fe.lastName,
      phone: fe.phone,
      email: fe.email || '',
      role_id: fe.roleId,
      password: fe.password,
      bill_user_view: fe.billUserView ? 'Yes' : 'No',
      status: 1,
    };
```

### Edit 2b — Lines 40-49: Add optional password to updateEmployee

**Current (L40-49):**
```js
  updateEmployee(fe) {
    return {
      f_name: fe.firstName,
      l_name: fe.lastName,
      phone: fe.phone,
      email: fe.email || '',
      role_id: fe.roleId,
      bill_user_view: fe.billUserView ? 'Yes' : 'No',
    };
  },
```

**New:**
```js
  updateEmployee(fe) {
    const payload = {
      f_name: fe.firstName,
      l_name: fe.lastName,
      phone: fe.phone,
      email: fe.email || '',
      role_id: fe.roleId,
      bill_user_view: fe.billUserView ? 'Yes' : 'No',
    };
    if (fe.password) payload.password = fe.password;
    return payload;
  },
```

**Logic:** Only include `password` in the PUT payload when the user has typed a new password. Empty/undefined password → not sent → backend doesn't change it (upsert behavior per owner).

---

## Edit 3 — EmployeeListView.jsx: Remove ResetPasswordDialog (imports, state, function, usage)

**Sub-Issue:** B

### Edit 3a — Line 3: Replace KeyRound with Eye, EyeOff in lucide imports (also serves Edit 4/5)

**Current (L3):**
```js
import { Search, Plus, Check, Trash2, KeyRound, UserCheck, UserX } from 'lucide-react';
```

**New:**
```js
import { Search, Plus, Check, Trash2, Eye, EyeOff, UserCheck, UserX } from 'lucide-react';
```

`KeyRound` removed (no longer used — reset button gone). `Eye` + `EyeOff` added for Sub-Issue C.

### Edit 3b — Line 10: Remove ResetPasswordDialog import

**Current (L10):**
```js
import ResetPasswordDialog from './ResetPasswordDialog';
```

**New:** Delete this line.

### Edit 3c — Line 21: Remove resetTarget state

**Current (L21):**
```js
  const [resetTarget, setResetTarget] = useState(null);
```

**New:** Replace with showPassword state:
```js
  const [showPassword, setShowPassword] = useState(false);
```

### Edit 3d — Lines 136-145: Remove handleResetPassword function

**Current (L136-145):**
```js
  const handleResetPassword = async (password) => {
    if (!resetTarget) return;
    try {
      await employeeService.resetEmployeePassword(resetTarget.id, password);
      toast.success(`Password reset for ${resetTarget.firstName}`);
      setResetTarget(null);
    } catch (err) {
      toast.error('Failed to reset password');
    }
  };
```

**New:** Delete these 10 lines entirely.

### Edit 3e — Lines 344-350: Remove ResetPasswordDialog component usage

**Current (L344-350):**
```jsx
      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={!!resetTarget}
        onOpenChange={(open) => { if (!open) setResetTarget(null); }}
        employeeName={resetTarget ? `${resetTarget.firstName} ${resetTarget.lastName}`.trim() : ''}
        onConfirm={handleResetPassword}
      />
```

**New:** Delete these 7 lines entirely.

---

## Edit 4 — EmployeeListView.jsx: Replace existing row password cell with inline editable + eye toggle

**Sub-Issues:** B + C

### Edit 4a — Lines 290-299: Replace disabled password placeholder + KeyRound with editable Input + Eye toggle

**Current (L290-299):**
```jsx
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <Input type="password" value="--------" disabled
                        className="h-9 text-sm border-slate-200 rounded-md bg-slate-50 text-slate-400 flex-1" />
                      <button onClick={() => setResetTarget(emp)}
                        className="p-1.5 rounded-md hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition-colors flex-shrink-0"
                        title="Reset Password" data-testid={`emp-reset-pwd-${emp.id}`}>
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
```

**New:**
```jsx
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <Input type={showPassword ? 'text' : 'password'}
                        value={getVal(emp, 'password') || ''}
                        onChange={e => updateExisting(emp.id, 'password', e.target.value)}
                        placeholder="New password"
                        className={inputCls + ' flex-1'}
                        data-testid={`emp-password-${emp.id}`} />
                      <button onClick={() => setShowPassword(p => !p)}
                        className="p-1.5 rounded-md hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition-colors flex-shrink-0"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        type="button"
                        data-testid={`emp-toggle-pwd-${emp.id}`}>
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
```

**Behavior:**
- Empty field = no password change on save (transform skips empty password)
- User types new password → row marked dirty → Save All sends it via `updateEmployee(id, {...merged, password})`
- Eye toggle shows/hides all password fields simultaneously

---

## Edit 5 — EmployeeListView.jsx: Add eye toggle to new row password field

**Sub-Issue:** C

### Edit 5a — Lines 237-240: Wrap new row password input with toggle

**Current (L237-240):**
```jsx
                  <td className="py-2 px-3">
                    <Input type="password" value={row.password} onChange={e => updateNewRow(row._tempId, 'password', e.target.value)}
                      placeholder="Password *" className={inputCls} data-testid={`emp-new-password-${row._tempId}`} />
                  </td>
```

**New:**
```jsx
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <Input type={showPassword ? 'text' : 'password'} value={row.password}
                        onChange={e => updateNewRow(row._tempId, 'password', e.target.value)}
                        placeholder="Password *" className={inputCls + ' flex-1'} data-testid={`emp-new-password-${row._tempId}`} />
                      <button onClick={() => setShowPassword(p => !p)}
                        className="p-1.5 rounded-md hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition-colors flex-shrink-0"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        type="button"
                        data-testid={`emp-new-toggle-pwd-${row._tempId}`}>
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
```

---

## Edit 6 — DELETE ResetPasswordDialog.jsx

**Sub-Issue:** B

**Action:** `rm /app/frontend/src/components/panels/employee/ResetPasswordDialog.jsx`

**Rationale:** All references removed in Edits 3b/3d/3e. File is dead code. Owner directed inline password — no popup needed.

---

## Verification Matrix (Inherited from Impact Analysis + Enhanced)

| # | Edit | File | Verification | Method | Automated? |
|---|---|---|---|---|---|
| V1 | 1a | employeeService.js:19 | `api.put` present, `api.post` absent for update | grep | YES |
| V2 | 1b | employeeService.js | `resetEmployeePassword` function absent | grep | YES |
| V3 | 2a | employeeTransform.js | `createEmployee()` output includes `status: 1` | grep / unit test | YES |
| V4 | 2b | employeeTransform.js | `updateEmployee({password:'x'})` includes password; `updateEmployee({})` does NOT | grep / unit test | YES |
| V5 | 3a | EmployeeListView.jsx | `Eye, EyeOff` imported; `KeyRound` absent | grep | YES |
| V6 | 3b | EmployeeListView.jsx | No `ResetPasswordDialog` import | grep | YES |
| V7 | 3c | EmployeeListView.jsx | `showPassword` state present; `resetTarget` absent | grep | YES |
| V8 | 3d | EmployeeListView.jsx | `handleResetPassword` function absent | grep | YES |
| V9 | 3e | EmployeeListView.jsx | No `<ResetPasswordDialog` JSX | grep | YES |
| V10 | 4a | EmployeeListView.jsx | Existing row has editable password Input with `emp-password-{id}` testid | browser | NO |
| V11 | 4a | EmployeeListView.jsx | Eye/EyeOff toggle on existing row password | browser | NO |
| V12 | 5a | EmployeeListView.jsx | Eye/EyeOff toggle on new row password | browser | NO |
| V13 | 6 | ResetPasswordDialog.jsx | File does not exist | ls | YES |
| V14 | ALL | webpack | Compiled with 0 new warnings | compile check | YES |
| V15 | FLOW | Add Employee | New row → fill all fields → Save All → employee appears after refresh | browser + API | NO |
| V16 | FLOW | Update Employee | Edit name in existing row → Save All → name persists after refresh | browser + API | NO |
| V17 | FLOW | Reset Password (inline) | Type new password in existing row → Save All → login works with new password | browser + API | NO |
| V18 | REGRESSION | Toggle Status | Toggle switch → employee activated/deactivated | browser | NO |
| V19 | REGRESSION | Search | Search filter still works | browser | NO |

---

## Post-Code Registry Checklist (Implementation Agent MUST Execute)

```
- [ ] registry.json: BUG-198 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add employeeService.js, employeeTransform.js, EmployeeListView.jsx with BUG-198 + date
- [ ] Code markers: // BUG-198 comment in every modified file
- [ ] ResetPasswordDialog.jsx: confirmed deleted
- [ ] Compile check: webpack 0 new warnings
```

---

## Scope Lock Declaration

### Files WILL change:
1. `api/services/employeeService.js` — Edits 1a, 1b
2. `api/transforms/employeeTransform.js` — Edits 2a, 2b
3. `components/panels/employee/EmployeeListView.jsx` — Edits 3a-3e, 4a, 5a

### Files WILL delete:
4. `components/panels/employee/ResetPasswordDialog.jsx` — Edit 6

### Files WILL NOT touch:
- `api/constants.js` — endpoints correct
- `pages/EmployeeManagementPage.jsx` — shell unchanged
- `components/panels/employee/RoleListView.jsx` — unaffected
- `components/panels/employee/RoleFormView.jsx` — unaffected
- `api/services/roleService.js` — unaffected
- `api/transforms/roleTransform.js` — unaffected
- `constants/permissionCatalog.js` — unaffected
- `components/guards/PermissionGate.jsx` — unaffected
- `App.js` — routes unchanged
- `components/layout/Sidebar.jsx` — nav unchanged

---

## Risk Register

| # | Risk | Mitigation |
|---|---|---|
| 1 | PUT rejected by backend | Pattern confirmed via BUG-197. Curl-verify during QA. |
| 2 | Empty password string sent on update (user didn't type anything) | Transform checks `if (fe.password)` — empty/falsy = omitted |
| 3 | toggleEmployeeStatus also uses POST | Out of scope — separate endpoint, separate BUG if broken |

---

## Next

Implementation Plan complete. **Awaiting Gate 4 GO.**
