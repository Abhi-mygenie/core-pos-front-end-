# Investigation Report — Employee Module UX Issues (Extended)

**Date:** 2026-07-17
**Agent Role:** INVESTIGATION
**Steps Used:** 10/10 (continued from password investigation)
**Confidence:** HIGH

---

## ISSUE 1: Backend Errors Not Showing in Frontend

### Root Cause
**FE line 118:** `toast.error(err?.response?.data?.message || 'Failed to save')`

Backend returns structured errors:
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."],
    "password": [
      "The password must be at least 8 characters.",
      "The password must contain at least one uppercase and one lowercase letter.",
      "The password must contain at least one letter.",
      "The password must contain at least one symbol."
    ]
  }
}
```

FE only reads `data.message` → shows **"The given data was invalid."** — the 5 specific field errors in `data.errors` are **completely ignored**.

### Fix Needed
Parse `err.response.data.errors` and show each field's errors:
```
"Password: must be at least 8 characters, must contain uppercase and lowercase, must contain a symbol"
"Email: required"
```

---

## ISSUE 2: Password Hint Missing

### Current State
- Password input has `placeholder="New password"` (L293) — no hint about rules
- Zero FE validation on password edit — any string goes straight to backend
- Backend rejects silently (user sees generic "data was invalid")

### Backend Password Rules (verified via curl):
1. Min **8 characters**
2. At least one **uppercase** letter
3. At least one **lowercase** letter
4. At least one **symbol** (@, #, !, etc.)

### Fix Needed
- Change placeholder to: `"Min 8: Aa + symbol (e.g. Test@123)"`
- Optionally: add FE validation before API call

---

## ISSUE 3: Role Dropdown Shows Different Roles for New vs Existing Employees

### Root Cause — CODE BUG in EmployeeListView.jsx

**Two different data sources for the same dropdown:**

| Context | Line | Data Source | Filter | Result (cafe103) |
|---------|------|-------------|--------|-------------------|
| **NEW** employee | L247 | `roleOptions` | `roles.filter(r => r.isEditable && r.active)` | **3 roles** (Manger(C), owner(c), Report) |
| **EXISTING** employee | L314 | `roles` | **NO filter** — all roles | **9 roles** (BAR, captain, KDS, Manager, Owner, Waiter + 3 custom) |

### Evidence (cafe103 role-list API):

```
ID    | Name        | System? | Editable? | In NEW? | In EXISTING?
------|-------------|---------|-----------|---------|-------------
3274  | BAR         | YES     | NO        | ❌      | ✅
3272  | captain     | YES     | NO        | ❌      | ✅
3273  | KDS         | YES     | NO        | ❌      | ✅
3275  | Manager     | YES     | NO        | ❌      | ✅
3506  | Manger(C)   | NO      | YES       | ✅      | ✅
3276  | Owner       | YES     | NO        | ❌      | ✅
4110  | owner(c)    | NO      | YES       | ✅      | ✅
3337  | Report      | NO      | YES       | ✅      | ✅
3271  | Waiter      | YES     | NO        | ❌      | ✅
```

### Additional Bug in EXISTING dropdown
Line 309: `roleOptions.find(...)` — uses filtered `roleOptions` to find the role
Line 314: `roles.map(...)` — uses ALL `roles` to render options

**If user selects a system role (e.g., "Manager") from the EXISTING dropdown, the `roleOptions.find()` on L309 returns `undefined`** because Manager is NOT in `roleOptions` (it's not editable). This means `roleId` gets set to `null` and `roleName` gets set to `''` — **the selection silently fails**.

### Fix Needed
Both dropdowns should use the **same** data source. Either:
- **Option A:** Both use `roles` (all roles) — allows assigning any role
- **Option B:** Both use `roleOptions` (editable only) — restricts to custom roles
- **Option C:** Use `roles` for options display, `roles` for `.find()` — consistent

**Owner decision needed:** Should new employees be assignable to system roles (Manager, Owner, Waiter, etc.) or only custom roles?

---

## Summary of All Issues

| # | Issue | Severity | Classification | FE Fix? |
|---|-------|----------|---------------|---------|
| 1 | Backend errors not surfaced | **MAJOR** | CODE_GAP | YES — parse err.response.data.errors |
| 2 | Password hint missing | **MINOR** | UX_GAP | YES — update placeholder text |
| 3a | New employee dropdown filtered, existing not | **MAJOR** | CODE_BUG | YES — use same data source |
| 3b | Existing dropdown onChange uses wrong find source | **MAJOR** | CODE_BUG | YES — use `roles.find()` not `roleOptions.find()` |
| 4 | Email required by backend but FE omits when empty | **MAJOR** | CONTRACT_MISMATCH | YES — always send email field |

---

## Exact Fixes (file, line, current → new)

### FIX 1: Surface backend validation errors
**File:** `components/panels/employee/EmployeeListView.jsx` **Line 117-118**

**Current:**
```js
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
```

**New:**
```js
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) {
        // Show each field's validation errors
        Object.entries(data.errors).forEach(([field, messages]) => {
          const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
          toast.error(`${fieldLabel}: ${messages.join(', ')}`);
        });
      } else {
        toast.error(data?.message || 'Failed to save');
      }
```

---

### FIX 2: Password hint on new + existing employee inputs
**File:** `components/panels/employee/EmployeeListView.jsx`

**Line 229 (new employee password):**
```
Current:  placeholder="Password *"
New:      placeholder="Min 8: Aa + symbol (e.g. Test@123)"
```

**Line 293 (existing employee password):**
```
Current:  placeholder="New password"
New:      placeholder="Min 8: Aa + symbol (e.g. Test@123)"
```

---

### FIX 3a: Make both dropdowns use same data source
**File:** `components/panels/employee/EmployeeListView.jsx` **Line 314**

**Current (existing employee dropdown renders ALL roles):**
```js
{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
```

**New (use same filtered roleOptions as new employee):**
```js
{roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
```

**OR if owner decides all roles should be available:**

**Line 247 (new employee dropdown) change to:**
```js
{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
```
**AND Line 242 change `roleOptions.find` to `roles.find`**

**Owner decision required before implementing.**

---

### FIX 3b: Existing dropdown onChange uses wrong find source
**File:** `components/panels/employee/EmployeeListView.jsx` **Line 309**

**Current:**
```js
const r = roleOptions.find(ro => ro.id === Number(e.target.value));
```

**New (match the data source used for rendering):**
```js
const r = roles.find(ro => ro.id === Number(e.target.value));
```

**Note:** If FIX 3a changes L314 to `roleOptions`, then L309 stays as `roleOptions` — they just need to match.

---

### FIX 4: Always send email field (even empty)
**File:** `api/transforms/employeeTransform.js` **Line 51**

**Current:**
```js
if (fe.email) payload.email = fe.email; // BUG-198: omit empty email
```

**New:**
```js
payload.email = fe.email || ''; // Always send email — backend requires it on PUT
```

**Risk:** If backend rejects empty string `""`, this will fail for employees without email. In that case, backend needs to make email optional on update.

---

## Verification Matrix

| Fix # | File | Verification | Method |
|-------|------|-------------|--------|
| 1 | EmployeeListView.jsx L117 | Type wrong password → see specific error messages | Browser |
| 2 | EmployeeListView.jsx L229, L293 | Password placeholder shows rules | Visual |
| 3a | EmployeeListView.jsx L314 | New + existing dropdowns show same role list | Visual |
| 3b | EmployeeListView.jsx L309 | Select system role on existing → roleId saved correctly | Browser + Network |
| 4 | employeeTransform.js L51 | Edit employee without email → no "email required" error | curl |

---

## Files WILL Change (2)

| File | Fixes | Lines Changed |
|------|-------|:---:|
| `components/panels/employee/EmployeeListView.jsx` | Fix 1, 2, 3a, 3b | ~15 |
| `api/transforms/employeeTransform.js` | Fix 4 | 1 |

## Files WILL NOT Touch
- employeeService.js (no changes needed)
- roleService.js, roleTransform.js (no changes)
- Any other module

---

## Owner Decisions Required

| # | Question | Options |
|---|----------|---------|
| OQ-1 | Should new employees be assignable to system roles (Manager, Owner, Waiter)? | **A:** Yes — both dropdowns show ALL roles / **B:** No — both dropdowns show only custom/editable roles |
| OQ-2 | Backend email required on update — should we always send empty string, or ask backend to make it optional? | **A:** FE sends `""` / **B:** Backend brief to make email optional |

---

## Report
`/app/memory/evidence/EMPLOYEE_EDIT_FULL_INVESTIGATION_2026_07_17.md`
