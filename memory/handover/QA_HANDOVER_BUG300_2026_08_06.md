# QA Handover — BUG-300 (2026-08-06)

**Item:** BUG-300 — Customer Name/Phone Search Stops Working After Long Session (CRM Token)
**Role:** BUG FIX AGENT
**Compile:** PASS (webpack compiled with 1 pre-existing warning, 0 new)
**Registry synced:** YES — Gate 5
**EXIT GATE:** 5/5 PASS

---

## 1. Inherited Verification Matrix

| Edit # | File | Change | Self-Test Result |
|--------|------|--------|:---:|
| 1 | `api/crmAxios.js:16-17` | `sessionStorage.getItem('crm_token')` → `localStorage.getItem('crm_token')` + comment updated | ✅ Confirmed — `grep localStorage crmAxios.js` shows L17 |
| 2 | `api/services/authService.js:23-27` | `sessionStorage.setItem('crm_token', ...)` → `localStorage.setItem(...)` on login | ✅ Confirmed — L27 |
| 3 | `api/services/authService.js:58-60` | Added `localStorage.removeItem('crm_token')` in logout() | ✅ Confirmed — L60 |
| 4 | `api/axios.js:47-48` | `sessionStorage.removeItem('crm_token')` → `localStorage.removeItem('crm_token')` on POS 401 | ✅ Confirmed — L48 |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Token survives tab close | Login → verify `localStorage.crm_token` is set → close tab → reopen → check `localStorage.crm_token` still present | Token present in localStorage, not null |
| T2 | Token survives hard refresh | Login → F5 hard refresh → go to Order Entry → type customer name | Customer results appear (no silent empty) |
| T3 | Token NOT in sessionStorage | Login → open DevTools → Application → Session Storage → check | `crm_token` absent from sessionStorage |
| T4 | Token in localStorage after login | Login → Application → Local Storage → check | `crm_token = dp_live_xxx` present |
| T5 | Token cleared on logout | Login → logout → Application → Local Storage | `crm_token` removed from localStorage |
| T6 | Token cleared on POS 401 | Simulate POS 401 (expired session) | `crm_token` removed from localStorage alongside `auth_token` |
| T7 | Regression: customer search works | Login → Order Entry → type 3+ chars in customer field | CRM results return normally |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | Login flow completes without error | authService.js edited — login path |
| R2 | Logout clears all storage correctly | authService.js logout edited |
| R3 | POS 401 redirect still works | axios.js edited — 401 handler |
| R4 | Customer search still returns results after fresh login | crmAxios.js read path |

---

## 4. Registry Sync Confirmation

- Registry synced: YES
- Item: BUG-300
- Sprint: pos_5_1
- Status: IMPLEMENTED — Gate 5a 2026-08-06
- EXIT GATE: ALL 5 PASSED
  - [x] registry.json updated
  - [x] BUG_TRACKER.md updated
  - [x] FILE_OWNERSHIP.md updated
  - [x] Code markers: `// BUG-300` in all 3 modified files
  - [x] Compile: 0 new warnings

---

## 5. Backend Brief (Tier 2)

Appended to `/app/memory/briefs/BACKEND_BLOCKERS_BRIEF_2026_07_22.html`:
- **BUG-300 Tier 2** — Add `crm_token` field to `GET /api/v1/vendoremployee/profile` response
- Enables fully silent CRM token recovery on 401 (no re-login ever needed)
- Priority: P1 | Count: 19 issues (was 18)

---

## 6. Environment

- Preview URL: https://core-pos-deploy-8.preview.emergentagent.com
- Test account: refer `/app/memory/control/test_credentials_platform.md`
