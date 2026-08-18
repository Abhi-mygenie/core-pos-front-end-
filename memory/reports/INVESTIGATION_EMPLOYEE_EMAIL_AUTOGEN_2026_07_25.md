# Investigation Report — Employee Email Auto-Generation ("owner@" default)

**Date:** 2026-07-25
**Role:** INVESTIGATION
**Scope:** Trace why new/edited employees get "owner@restaurantname.com" instead of "firstname@restaurantname.com"
**Steps Used:** 5/10
**Confidence:** MEDIUM (code correct for ADD path — issue likely in EDIT path or backend default)
**Classification:** FE_BUG (edit sync logic) + possible BACKEND_BUG (default email assignment)

---

## 1. Summary

The `generateEmail` function (BUG-229/230) correctly generates `firstname@restaurantname.com` using the typed firstName. The ADD flow works as designed. However, there are **2 gaps** — one in the EDIT sync logic and one possible backend-side default.

---

## 2. Data Flow Trace

### ADD Flow (New Employee)

```
addRow() → { firstName: '', email: '', _emailManual: false }
  ↓ user types "John" in firstName
updateNewRow(tempId, 'firstName', 'John')
  → !_emailManual → email = generateEmail('John')
  → generateEmail:
      fname = 'john'
      rname = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      return 'john@<rname>.com'
  → email = 'john@<restaurantname>.com' ✅ CORRECT
```

**Finding:** ADD flow generates the correct email. There is no path where "owner@" would appear unless the user literally types "owner" as the firstName.

### EDIT Flow (Existing Employee)

```
updateExisting(id, 'firstName', 'NewName')
  → buf = { firstName: 'NewName' }
  → if 'firstName' && !buf._emailManual:
      emp = employees.find(...)
      currentEmail = buf.email ?? emp.email  (e.g. "owner@rest.com")
      expectedAutoEmail = generateEmail(emp.firstName)  (e.g. "oldname@rest.com")
      
      if currentEmail === expectedAutoEmail → update email ✅
      if currentEmail !== expectedAutoEmail → _emailManual = true ❌ STOPS SYNCING
```

**Finding:** If an existing employee's email is `owner@restaurantname.com` (set by backend or manually) and their firstName is NOT "owner", the sync logic at L107 computes `expectedAutoEmail` from the OLD firstName. Since `owner@rest.com !== oldfirstname@rest.com`, it marks `_emailManual = true` and **never auto-generates** the new email. The user sees "owner@" stuck even after changing firstName.

---

## 3. Gaps Found

### GAP-1: EDIT sync logic too conservative (FE_BUG — MEDIUM)

**Location:** `EmployeeListView.jsx:103-111`

**Root Cause:** The BUG-230 sync logic was designed to not overwrite manually-set emails. But it treats ANY email that doesn't match the auto-generated pattern as "manual." If the backend assigned a default email (like "owner@...") that differs from what `generateEmail(firstName)` would produce, the sync permanently locks.

**Impact:**
- Existing employees with backend-default emails (e.g., "owner@restaurantname.com") can never get auto-synced email on firstName change
- User must manually clear and retype the email field

**Fix direction (no code edit per owner directive):**
- Option A: Remove the `expectedAutoEmail` check — always sync on firstName change unless user explicitly typed in the email field
- Option B: Check if email matches `*@restaurantname.com` pattern (not the exact auto-email) — if yes, treat as auto-generated

### GAP-2: Backend may assign default "owner@" email (possible BACKEND_BUG)

**Hypothesis:** When a new employee is created via `POST /employees/add` with email like `john@restaurantname.com`, the backend might override/ignore it and assign `owner@restaurantname.com` as a default. After save + refresh, the user sees "owner@" even though FE sent the correct email.

**Confidence:** LOW — needs curl verification. The FE `toAPI.createEmployee` at L39 sends `email: fe.email || ''`, which should be the auto-generated email.

**Verification needed:**
```bash
curl -X POST <EMPLOYEE_ADD_URL> -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"f_name":"TestJohn","l_name":"Doe","phone":"9999999999","email":"testjohn@restaurantname.com","password":"Test@123","role_id":1,"status":1}'
```
→ Check: does the created employee have `email: "testjohn@restaurantname.com"` or `email: "owner@restaurantname.com"`?

---

## 4. Code Reality Check

| Component | Status | Notes |
|-----------|--------|-------|
| `generateEmail()` L28-33 | ✅ Correct | Uses firstName, not "owner" |
| ADD `updateNewRow` L84-96 | ✅ Correct | Auto-generates on firstName change |
| EDIT `updateExisting` L100-118 | ⚠️ GAP-1 | Over-conservative sync check prevents email update |
| `toAPI.createEmployee` L29-41 | ✅ Correct | Sends FE email to backend |
| `toAPI.updateEmployee` L43-54 | ✅ Correct | Sends FE email to backend on PUT |
| `restaurant.name` source | ✅ | Comes from `api.name` in profileTransform L109 — the actual restaurant name |

---

## 5. Recommendations

| # | Gap | Classification | Action | Blocking? |
|---|-----|---------------|--------|-----------|
| 1 | EDIT sync too conservative | FE_BUG | Simplify L103-111: if `firstName` changes and email ends with `@<restaurantname>.com`, treat as auto-generated and update. Otherwise respect manual. | YES — core of reported issue |
| 2 | Backend default email | BACKEND_BUG (suspected) | Curl-verify: POST a new employee with explicit email → check if backend preserves it or overwrites with "owner@..." | YES — determines if FE fix alone solves it |

---

## 6. Reproduction Steps (for future QA)

### Test A — ADD flow:
1. Navigate to Employee Management
2. Click "Add Employee"
3. Type "TestUser" in First Name
4. **Expected:** Email field auto-fills with `testuser@<restaurantname>.com`
5. **If actual = "owner@...":** → Backend is overriding on save (GAP-2)

### Test B — EDIT flow:
1. Find an employee with email = `owner@<restaurantname>.com`
2. Change their First Name to "NewPerson"
3. **Expected:** Email field auto-updates to `newperson@<restaurantname>.com`
4. **If actual = still "owner@...":** → GAP-1 confirmed (sync logic too conservative)

---

## 7. Next Steps

- **Owner decision:** Approve FE fix for GAP-1 (simplify edit sync logic)?
- **Backend verification:** Curl-probe employee create endpoint to confirm/eliminate GAP-2.
- If both confirmed → register as BUG, proceed through gates.
