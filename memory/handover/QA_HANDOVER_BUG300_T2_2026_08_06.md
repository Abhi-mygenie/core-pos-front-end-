# QA Handover — BUG-300 Tier 2 (2026-08-06)

**Item:** BUG-300 Tier 2 — Silent CRM Token Refresh via `restaurant-crm-token` endpoint
**Role:** IMPLEMENTATION AGENT
**Compile:** PASS — webpack compiled with 1 pre-existing warning, 0 new
**Registry synced:** YES — Gate 5a
**EXIT GATE:** 5/5 PASS

---

## 1. Self-Test Results

| Edit | File | Change | Result |
|------|------|--------|:---:|
| E1 | `crmAxios.js:8` | `import api from './axios'` + `// BUG-300 T2` | ✅ Confirmed |
| E2 | `crmAxios.js:20` | `let _crmTokenRefreshing = false` + `// BUG-300 T2` | ✅ Confirmed |
| E3 | `crmAxios.js:84` | `async (error) =>` + 401 branch + retry logic | ✅ Confirmed |
| Compile | — | `webpack compiled with 1 warning` (pre-existing) | ✅ PASS |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Silent refresh on CRM 401 | Simulate CRM 401 (use invalidated dp_live_ key) → make customer search | First request fails 401 → FE calls `/restaurant-crm-token` → gets new token → retries → customer results appear. Cashier sees nothing. |
| T2 | New token stored in localStorage | After silent refresh | localStorage `crm_token` updated to the new `dp_live_` value |
| T3 | No infinite retry | Retry also gets 401 (extremely bad key) | `_crmRetry = true` prevents 3rd attempt — falls through to error handling |
| T4 | Concurrent 401s handled | 3 CRM calls fire simultaneously, all 401 | `_crmTokenRefreshing` ensures only 1 refresh call to backend |
| T5 | Normal CRM flow unaffected | Customer search with valid token | 401 branch never entered — zero overhead |
| T6 | POS session expiry fallback | POS token expired when refresh fires | `api.get()` → `axios.js` 401 → auto-logout. CRM refresh fails gracefully. |
| T7 | Regression: Tier 1 still working | Tab close → reopen → customer search | Token still in localStorage, search works (Tier 1 behavior unchanged) |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | Login flow unchanged | crmAxios.js import added but login sets token via authService — unaffected |
| R2 | Customer search returns results normally | crmAxios.js request interceptor unchanged |
| R3 | Logout clears crm_token | authService.js logout unchanged (already tested in Tier 1) |

---

## 4. Registry Sync Confirmation

- Registry synced: YES
- Item: BUG-300
- Sprint: pos_5_1
- Status: IMPLEMENTED Tier 2 — Gate 5a 2026-08-06
- EXIT GATE: ALL 5 PASSED
  - [x] registry.json updated — IMPLEMENTED Tier 2, gate: 5
  - [x] BUG_TRACKER.md updated — row updated
  - [x] FILE_OWNERSHIP.md updated — BUG-300 T2 entry added
  - [x] Code markers: `// BUG-300 T2` at L8, L20, L84 in `crmAxios.js`
  - [x] Compile: 0 new warnings

---

## 5. Environment

- Preview URL: https://core-pos-deploy-8.preview.emergentagent.com
- Test account: owner@18march.com / Qplazm@10
- Endpoint: `GET /api/v2/vendoremployee/restaurant-crm-token` → `{ success, restaurant_id, crm_token }`
