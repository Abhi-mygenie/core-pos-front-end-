# Investigation Report — Employee Edit Password "1234" Fails

**Date:** 2026-07-17
**Agent Role:** INVESTIGATION
**Steps Used:** 10/10
**Confidence:** HIGH (curl-reproduced)

---

## 1. Summary

Root cause: **TWO issues — both BACKEND VALIDATION rules**
Classification: BACKEND_CONTRACT (not FE bug)
Confidence: HIGH — curl-reproduced with exact error messages

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | FE strips/blocks short passwords | Code trace: transform + UI | 2 | **ELIMINATED** — FE has zero password validation on edit. `if (fe.password) payload.password = fe.password` sends whatever user types |
| H2 | Backend rejects "1234" due to validation rules | Curl: PUT with password:"1234" | 1 | **CONFIRMED** — 4 validation errors returned | employee_update_1234.json |
| H3 | Backend requires email on update | Curl: PUT without email | 1 | **CONFIRMED** — "email field is required" | Step 8 |
| H4 | Valid password works | Curl: PUT with "Test@1234" + email | 1 | **CONFIRMED** — "Employee updated successfully!" | Step 7 |
| H5 | Edit without password works | Curl: PUT without password + with email | 1 | **CONFIRMED** — "Employee updated successfully!" | Step 9 |

---

## 3. Backend Password Rules (from error response)

Password "1234" fails **4 rules:**

| # | Rule | "1234" | "Test@1234" |
|---|------|--------|-------------|
| 1 | Must be at least **8 characters** | ❌ (4 chars) | ✅ (9 chars) |
| 2 | Must contain at least one **uppercase AND one lowercase** letter | ❌ (no letters) | ✅ (T + est) |
| 3 | Must contain at least one **letter** | ❌ (only digits) | ✅ (Test) |
| 4 | Must contain at least one **symbol** | ❌ (no symbol) | ✅ (@) |

**Valid password format:** 8+ chars, upper + lower + digit + symbol (e.g., `Test@1234`)

---

## 4. Backend Email Requirement (SECOND ISSUE)

Backend requires `email` field on every update PUT, even if user didn't change it.

**FE BUG-198 workaround:** `if (fe.email) payload.email = fe.email` — omits email if empty.
**Problem:** If employee has no email stored, FE sends no email → backend rejects with "email field is required."

| Scenario | FE sends email? | Backend result |
|----------|:---:|---|
| Employee has email + user doesn't change it | ✅ (from existing data) | ✅ Works |
| Employee has NO email + user doesn't add one | ❌ (omitted by BUG-198 guard) | ❌ "email is required" |
| Employee has NO email + user types password only | ❌ | ❌ Fails on BOTH email + password rules |

---

## 5. FE Restrictions (NONE on edit)

| Check | Result |
|-------|--------|
| Password min length validation | ❌ None — FE sends whatever user types |
| Password pattern validation | ❌ None |
| Password required on edit | ❌ No — `if (fe.password)` only sends when non-empty |
| Email required on edit | ❌ No — BUG-198 omits empty email |
| Any client-side validation on edit | ❌ None — only new employee rows validate (firstName, phone, password, role) |

---

## 6. Data Flow Trace

```
User types "1234" in password field on existing employee row
  → updateExisting(emp.id, 'password', '1234')  → editBuffer[id].password = '1234'
  → saveAll() → merged = { ...emp, ...editBuffer[id] }
  → employeeService.updateEmployee(id, merged)
  → toAPI.updateEmployee(merged) → {
      f_name, l_name, phone, role_id, bill_user_view,
      password: "1234"   ← sent as-is, no FE validation
      email: omitted     ← BUG-198 guard: fe.email is "" → not included
    }
  → PUT /employees-update/{id}
  → Backend: 422 "The given data was invalid"
      errors.password: 4 rules failed
      errors.email: "required"
  → FE: toast.error("The given data was invalid.")
BREAK POINT: Backend validation rejects — FE shows generic error, not the specific rules
```

---

## 7. Recommendations

| # | Type | Fix | Risk |
|---|------|-----|------|
| 1 | **FE — password hint** | Add placeholder text: "Min 8 chars, upper+lower+digit+symbol" on password input | LOW |
| 2 | **FE — password validation** | Add client-side validation matching backend rules before API call | LOW |
| 3 | **FE — email always sent** | Change `if (fe.email) payload.email = fe.email` to `payload.email = fe.email \|\| ''` — let backend decide | MEDIUM — may break if backend rejects empty string |
| 4 | **FE — surface backend errors** | Parse `err.response.data.errors` object and show per-field messages instead of generic toast | LOW |
| 5 | **BACKEND — email optional on update** | Make email not required on PUT (it's optional on the old POS) | Backend team decision |

**No FE code changes needed to "fix" the password rejection** — it's working as designed by the backend. The FE just needs better error messaging and a password hint.
