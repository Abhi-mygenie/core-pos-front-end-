# POS3.0 CR Wave 1 — BUG-098 Implementation Report — 2026-05-18

## 1. Summary

| Field | Value |
|---|---|
| Sprint | POS3.0 |
| Wave | CR Wave 1 — Ready CRs |
| Bug | BUG-098 — Use Login Response `crm_token` Instead of Env Keys |
| Branch | `18-may-pos3.0` |
| Baseline commit | `3cff824` |
| Files changed | 4 |
| Build result | **PASS** (`yarn build` — zero errors, zero warnings) |
| Implementation date | 2026-05-18 |
| Commit allowed | No (per owner directive) |

---

## 2. What Changed

### File 1: `api/transforms/authTransform.js` (+1 line)
- Added `crmToken: api.crm_token || null` to `fromAPI.loginResponse()` transform
- Extracts `crm_token` from login API response; defaults to `null` if field missing

### File 2: `api/crmAxios.js` (full rewrite — 82 → 91 lines)
- **Deleted:** `CRM_API_KEYS` env parsing from `REACT_APP_CRM_API_KEYS` (L10-16 old)
- **Deleted:** Restaurant-key map lookup in `setCrmRestaurantId` and `getCrmApiKey`
- **Added:** `setCrmToken(token)` — stores login-provided CRM token at module level
- **Added:** `clearCrmToken()` — clears CRM token + restaurant ID on logout
- **Simplified:** `getCrmApiKey()` returns stored token directly (no map lookup)
- **Simplified:** `setCrmRestaurantId()` sets restaurant ID for logging only (no key lookup)
- **Preserved:** `CRM_BASE_URL` from env, axios instance, request/response interceptors, timeout

### File 3: `api/services/authService.js` (+1 import, +2 lines)
- Added import: `import { setCrmToken, clearCrmToken } from '../crmAxios'`
- Added in `login()`: `setCrmToken(authData.crmToken)` — sets CRM token immediately after login
- Added in `logout()`: `clearCrmToken()` — clears CRM token on logout

### File 4: `pages/LoadingPage.jsx` (comment-only)
- Updated comment at L378: documents that CRM token is set from login, `setCrmRestaurantId` is for logging

---

## 3. Files NOT Changed

| File | Why unchanged |
|---|---|
| `api/services/customerService.js` (9 CRM API calls) | Uses `crmApi` instance — interceptor handles key automatically |
| `api/transforms/customerTransform.js` | Data transforms only — no key logic |
| `contexts/AuthContext.jsx` | Not needed — token set at authService level |
| `contexts/RestaurantContext.jsx` | No CRM key logic |
| `pages/LoginPage.jsx` | Calls `login()` which handles token internally |
| All component files | Use `customerService` — no direct CRM key access |
| `/app/memory/final/` | **UNTOUCHED** per directive |

---

## 4. Build Result

```
yarn build → PASS
File sizes after gzip:
  444.69 kB  build/static/js/main.*.js
  16.68 kB   build/static/css/main.*.css
```

Zero compilation errors. Zero warnings.

---

## 5. Business Rules Protection

| Rule | Applicable | Preserved? |
|---|---|---|
| PAY-001 through PAY-008 | No (no payment code touched) | N/A |
| TAX/SC/TIP/ROUND/TOTALS | No (no financial code touched) | N/A |
| DASH-001/002/003 | No (no dashboard code touched) | N/A |
| Module 6 CRM rules | Yes | **YES** — CRM still required by default; same interceptor pattern |
| Rule EP-01 (env contract) | Yes | **YES** — `REACT_APP_CRM_BASE_URL` preserved; `REACT_APP_CRM_API_KEYS` no longer consumed per owner directive |

---

## 6. Validation Grep — No Remaining Env Key References

```
grep -rn "REACT_APP_CRM_API_KEYS\|CRM_API_KEYS" --include="*.js" --include="*.jsx" src/
→ Only comment in crmAxios.js L5 (documentation, not code)
```

---

## 7. Deferred Items (This Wave)

| Bug | Status | Reason |
|---|---|---|
| BUG-106 | Deferred | CRM team must provide note field names in API response |
| BUG-099 | Parked | Owner will invoke UX agent later |

---

## 8. Smoke QA Checklist

| # | Test | Expected | Priority |
|---|---|---|---|
| 1 | Login with valid credentials | Login succeeds; console shows `[CRM Config] Token set from login response` | P0 |
| 2 | After login, open Order Entry → search customer by phone | CRM search works (results appear in dropdown) | P0 |
| 3 | After login, look up customer by phone | CRM lookup works (customer details returned) | P0 |
| 4 | After login, CRM address lookup | Addresses returned correctly | P1 |
| 5 | Room check-in → search customer | CRM search works in room check-in flow | P1 |
| 6 | Logout → console shows token cleared | `clearCrmToken` called; no stale CRM state | P1 |
| 7 | Login with account where backend has NO `crm_token` | Console warns `[CRM Config] Token NOT FOUND in login response`; CRM calls warn but don't crash; customer search returns `[]` | P1 |
| 8 | Verify no `REACT_APP_CRM_API_KEYS` in source code | Only comment reference in crmAxios.js L5 | P2 |

---

## 9. Gate Compliance

| Gate | Status |
|---|---|
| Gate 0 — Owner inputs | PASS |
| Gate 1 — Setup confirmation | PASS |
| Gate 2 — Codebase setup | PASS (Mode A — fresh clone) |
| Gate 3 — Mandatory doc read | PASS |
| Gate 4 — Scope verification | PASS (3 bugs in wave; 1 approved, 2 deferred) |
| Gate 5 — Code inspection | PASS |
| Gate 6 — Owner approval plan | PASS |
| Gate 7 — Owner approach approval | PASS (BUG-098 approved; BUG-106 deferred; BUG-099 parked) |
| Gate 8 — Code diff preview | PASS |
| Gate 9 — Owner diff approval | PASS (Owner: "A") |
| Gate 10 — Apply changes | PASS (this report) |
| Gate 11 — Validation | PASS (`yarn build` zero errors) |

---

## 10. Confirmations

- No blocked bugs were implemented.
- Only the owner-approved BUG-098 was implemented.
- `/app/memory/final/` was not updated.
- No baseline docs were updated.
- `BUG_TEMPLATE.md` was not modified.
- `yarn build` passed with zero errors and zero warnings.
- All changes followed the exact code diff preview approved by owner.

---

*— End of POS3.0 CR Wave 1 BUG-098 Implementation Report — 2026-05-18 —*
