# PROD-HOTFIX-005 — Prepaid Screen Clear Delay (Non-Blocking API + Print)

**Date:** 2026-05-27
**Severity:** P1 (UX — cashier waits 4-5s before screen clears on prepaid flow)
**Affected flows:** QSR Place & Pay (fresh), Full Mode Place & Pay (fresh, Scenario 2)
**Files changed:** `OrderEntry.jsx` (~30 lines restructured)

---

## 1. Symptom

When cashier uses Place & Pay (prepaid) flow, the order screen stays visible for 4-5 seconds after payment before clearing. In contrast, normal "Place Order" clears in ~500ms.

## 2. Root Cause

The prepaid flows sequentially awaited 3 operations before clearing the screen:
1. Socket engage / 500ms delay (correct — confirms order)
2. `await placePromise` — full API response (unnecessary — socket already confirms)
3. `await autoPrint` — up to 3s socket wait + print API call (unnecessary — background operation)

Normal "Place Order" correctly fire-and-forgets the API and clears on socket only.

## 3. Fix

**Two changes:**

### 3a. Non-blocking API + auto-print
Moved `navigateAfterOrderAction()` (screen clear) to fire immediately after socket/delay. API response and auto-print now run as fire-and-forget background `.then()` chains.

### 3b. Walk-in delay reduced 500ms → 200ms
For walk-in/takeaway/delivery (no physical table), the UX delay was reduced from 500ms to 200ms for faster cashier turnaround.

## 4. Before / After

| Metric | Before | After |
|---|---|---|
| Screen clear (walk-in prepaid) | ~4-5s (500ms + API ~1s + print 3s+) | **~200ms** |
| Screen clear (table prepaid) | ~socket + API + print | **~socket latency** |
| API response handling | Blocking (await) | Background (.then) |
| Auto-print | Blocking (await 3s + print) | Background (.then) |
| Auto-print still works? | Yes | Yes (background) |
| API error toast | Yes | Yes (unchanged — .catch fires toast) |

## 5. Flows Changed

| Flow | Location | Change |
|---|---|---|
| QSR Place & Pay (fresh) | OrderEntry.jsx L1191-1242 | Non-blocking + 200ms |
| Full Mode Place & Pay (Scenario 2) | OrderEntry.jsx L1807-1833 | Non-blocking + 200ms |

## 6. Flows NOT Changed (no regression)

| Flow | Why |
|---|---|
| Normal Place Order (L940-968) | Already correct pattern |
| Full Mode Collect Bill (Scenario 1, L1828+) | Different flow — existing order |
| QSR Collect Bill (existing, L1239+) | Different flow — existing order |
| Transfer to Room (L1692+) | Different flow |

## 7. Risk Assessment

| Risk | Mitigation |
|---|---|
| API fails after screen cleared | Toast still fires via .catch(). Order visible on dashboard for retry. |
| Auto-print runs after component unmount | Print is a standalone API call — no component state dependency. Console logs for debugging. |
| `newOrderId` not captured yet | Auto-print runs inside `placePromise.then()` — `newOrderId` is populated by then |

## 8. Build Verification

- `CI=false yarn build` → exit 0
- No new ESLint warnings
- Only pre-existing warning: `OrderEntry.jsx:1308` (printOrder dependency)
