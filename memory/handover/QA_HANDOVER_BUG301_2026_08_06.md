# QA Handover — BUG-301 (2026-08-06)

**Item:** BUG-301 — Aggregator Menu Status Toggle Sends Wrong Payload (Silent Failure)
**Role:** BUG FIX AGENT
**Compile:** PASS — webpack compiled with 1 pre-existing warning, 0 new
**Registry synced:** YES — Gate 5a
**EXIT GATE:** 5/5 PASS

---

## 1. Self-Test Results

| Edit | File | Change | Result |
|------|------|--------|:---:|
| E1 | `menuManagementService.js:52-56` | `toggleFoodStatus(foodId, status, foodFor='Normal')` — sends `{food_for:'Aggregator'}` when aggregator, `{status}` otherwise + `// BUG-301` | ✅ Confirmed |
| E2 | `ProductList.jsx:109,116` | passes `menuType` to call + added to `useCallback` dep array + `// BUG-301` | ✅ Confirmed |
| E3 | `BulkEditor.jsx:510` | passes `menuType` + `// BUG-301` | ✅ Confirmed |
| OQ-1 | Normal path unaffected | curl: Normal food `{status:1}` → `"food status updated successfully"` | ✅ Confirmed |
| Compile | — | `webpack compiled with 1 warning` (pre-existing) | ✅ PASS |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Aggregator toggle now works | Menu Management → Aggregator tab → toggle any item status → observe toast | Success toast fires AND status actually changes (visible on refresh) |
| T2 | Network payload correct | DevTools → Network → filter `status-food` → inspect request body | Body is `{"food_for":"Aggregator"}` (NOT `{"status":1}`) |
| T3 | No error in response | Same Network request | Response is `{"message":"food status updated successfully","action":"enable"\|"disable"}` — no `errors` array |
| T4 | Normal menu toggle unaffected | Menu Management → Normal tab → toggle any item status | Still works: payload is `{"status":0\|1}`, success as before |
| T5 | BulkEditor aggregator save | Menu Management → Aggregator → Bulk Edit → change status → Save | Status change persists correctly after save |
| T6 | Silent failure gone | After toggling in aggregator → refresh page | Item shows the toggled status (was unchanged before fix) |

---

## 3. Registry Sync Confirmation

- Registry synced: YES
- Item: BUG-301
- Sprint: pos_5_1
- Status: IMPLEMENTED — Gate 5a 2026-08-06
- EXIT GATE: ALL 5 PASSED
  - [x] registry.json updated — IMPLEMENTED, gate: 5
  - [x] BUG_TRACKER.md updated — row updated to IMPLEMENTED
  - [x] FILE_OWNERSHIP.md updated — BUG-301 section added
  - [x] Code markers: `// BUG-301` in all 3 files
  - [x] Compile: 0 new warnings

---

## 4. Environment

- Preview URL: https://core-pos-deploy-8.preview.emergentagent.com
- Navigate: Menu Management → switch to Aggregator tab → toggle a food item status
- Credentials: owner@18march.com / Qplazm@10
