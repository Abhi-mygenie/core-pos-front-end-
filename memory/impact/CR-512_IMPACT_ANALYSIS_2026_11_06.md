# CR-512 — Impact Analysis (Gate 2)

**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-06
**Code Reality:** NONE — `update-print-status` endpoint not wired anywhere in frontend

---

## Conflict Pre-Check

| File | Last modifier | Open items on same file | Conflict? |
|------|--------------|------------------------|-----------|
| `constants.js` | BUG-599 Rev2 (2026-10-21, L458 aggregator block) | None open | **CLEAN** — our addition at L108 area is 350+ lines away |
| `orderService.js` | BUG-538 (2026-10-18, L196 applyOrderDiscount) | None open | **CLEAN** — our change is inside `printOrder()` L186-188, different function |

**No conflicts. Parallel-safe.**

---

## Data Flow Trace

### Current (incomplete)

```
User taps "Bill"
  → OrderCard.handlePrintBill() / OrderEntry auto-print / RePrintButton / etc.
    → printOrder(orderId, 'bill', ...) [orderService.js L134]
      → api.post(PRINT_ORDER, payload) [L186]
        → POST /api/v1/vendoremployee/order-temp-store
        → Response: { status: true, message: "Order stored in temp table" }
      → return response.data [L188]
  → DONE (fire-and-forget — no confirmation, bill_print stays "No")
```

### Required (from handover §2 + §"Suggested frontend flow")

```
User taps "Bill"
  → printOrder(orderId, 'bill', ...)
    → api.post(PRINT_ORDER, payload)                    ← Step 1: existing
    → api.post(CONFIRM_PRINT_STATUS, {                  ← Step 2: NEW
        order_id: orderId,
        bill_print: "Yes",     // for bill prints
        kot_print: "No"        // unchanged
      })
      → Backend sets orders.bill_print counter += 1
      → Backend emits update-order socket event
      → Response: { success: true, data: { bill_print: "Yes", bill_print_count: 1, socket_publish_attempted: true } }
    → return original response.data
  → Socket arrives at all connected clients
    → fromAPI.order() maps bill_print: "Yes" → billPrinted: true
    → BUG-583 green card renders ✅
```

---

## Affected Files + Lines

### E-1: `constants.js` — Add endpoint constant

**Line:** L108 (after `PRINT_ORDER`)
**Type:** Additive (1 line)
**Risk:** LOW — additive constant, no existing code affected

```javascript
// Current L108:
  PRINT_ORDER: '/api/v1/vendoremployee/order-temp-store',

// After L108 (add L109):
  PRINT_ORDER: '/api/v1/vendoremployee/order-temp-store',
  CONFIRM_PRINT_STATUS: '/api/v2/vendoremployee/print/update-print-status', // CR-512
```

### E-2: `orderService.js` — Add confirmation after print success

**Lines:** L186-188 (inside `printOrder()`, after `api.post(PRINT_ORDER)`)
**Type:** Modify — wrap existing return with confirmation call
**Risk:** MEDIUM — `printOrder()` is called by 15 sites across 10 files. Change is internal to the function; callers are unaffected.

**Current (L185-188):**
```javascript
  console.log('[PrintOrder] payload:', payload, 'printer_agent.length:', agents.length);
  const response = await api.post(API_ENDPOINTS.PRINT_ORDER, payload);
  console.log('[PrintOrder] response:', response.data);
  return response.data;
```

**After (L185-199):**
```javascript
  console.log('[PrintOrder] payload:', payload, 'printer_agent.length:', agents.length);
  const response = await api.post(API_ENDPOINTS.PRINT_ORDER, payload);
  console.log('[PrintOrder] response:', response.data);

  // CR-512: Confirm print success → sets bill_print/kot_print on order + emits update-order socket
  // Per handover: "Do not call confirmation on preview, queueing or failure."
  // Per handover: "Do not automatically retry a timed-out confirmation without checking the saved state: it is additive, not idempotent."
  try {
    const confirmPayload = {
      order_id: Number(orderId),
      bill_print: printType === 'bill' ? 'Yes' : 'No',
      kot_print: printType === 'kot' ? 'Yes' : 'No',
    };
    const confirmResp = await api.post(API_ENDPOINTS.CONFIRM_PRINT_STATUS, confirmPayload);
    console.log('[PrintOrder] confirm:', confirmResp.data);
  } catch (confirmErr) {
    // Non-blocking: print was sent to queue successfully; confirmation failure
    // should not crash the caller or show error to user. Log for debugging.
    console.warn('[PrintOrder] confirm-print-status failed (non-blocking):', confirmErr?.message);
  }

  return response.data;
```

**Key design decisions:**
1. **try-catch around confirmation** — the physical print (order-temp-store) already succeeded. If confirmation fails (network blip, 422, etc.), the user should NOT see an error. The print went to the printer. Log the failure for debugging.
2. **Non-blocking** — callers still get `response.data` from the original print call. The confirmation is a fire-and-forget best-effort.
3. **`bill_print`/`kot_print` derived from `printType`** — per OD-512-02, both bill and KOT are confirmed. The handover says "At least one must be Yes."
4. **No retry** — handover explicitly warns against it: "it is additive, not idempotent."

---

## Downstream Consumers (what happens after confirmation succeeds)

| Step | Component | What happens |
|------|-----------|-------------|
| 1 | Backend | Sets `orders.bill_print` counter, flag becomes `"Yes"` |
| 2 | Backend | Emits `update-order` socket event with full order data |
| 3 | `socketHandlers.js` → `handleOrderDataEvent()` | Receives socket, calls `orderFromAPI.order(apiOrder)` |
| 4 | `orderTransform.js` L310 | Maps `bill_print: "Yes"` → `billPrinted: true` (BUG-583 E-2, already implemented) |
| 5 | `OrderContext.jsx` → `updateOrder()` | Updates order in context |
| 6 | `DashboardPage.jsx` adapters | Thread `billPrinted` to table objects (BUG-583, already implemented) |
| 7 | `OrderCard.jsx` / `TableCard.jsx` | Conditional green bg `#E8F5E9` + green border `#329937` (BUG-583 E-4/E-5, already implemented) |

**Steps 3-7 are already implemented by BUG-583.** CR-512 only adds steps 1-2 (the trigger).

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Confirmation API 422/500 | LOW | Print succeeds, card stays white until next refresh | try-catch non-blocking; user can reprint |
| Confirmation fires before order-temp-store is processed | NONE | Confirmation is sequential (await); order-temp-store always runs first | Code structure |
| Reprint double-increments counter | BY DESIGN | Counter goes 1→2; flag stays "Yes" | Handover says "Reprints are separate attempts" (OD-512-04 locked) |
| Network timeout on confirmation | LOW | Same as 422 — print works, card stays white | Non-blocking; next socket event or refresh will sync |
| Caller behavior changes | NONE | `printOrder()` return value unchanged; confirmation is internal | try-catch ensures original return always happens |

---

## Scope Lock

**Files WILL change (2):**
1. `src/api/constants.js` — 1 additive line (endpoint constant)
2. `src/api/services/orderService.js` — ~12 lines added inside `printOrder()` function

**Files will NOT touch:**
- OrderCard.jsx, OrderEntry.jsx, TableCard.jsx, DashboardPage.jsx (zero caller changes)
- orderTransform.js, socketHandlers.js, any context file
- No new files created
- No import changes in callers

---

## Verification Matrix (seeds QA handover)

| # | Check | File | How to Verify | Auto? |
|---|-------|------|---------------|:---:|
| V-1 | `CONFIRM_PRINT_STATUS` constant exists | constants.js | `grep CONFIRM_PRINT_STATUS constants.js` | YES |
| V-2 | Confirmation call inside `printOrder()` | orderService.js | Code inspect L186-199 | YES |
| V-3 | Bill print → sends `bill_print: "Yes"` | orderService.js | Unit test: mock printType='bill' | YES |
| V-4 | KOT print → sends `kot_print: "Yes"` | orderService.js | Unit test: mock printType='kot' | YES |
| V-5 | Confirmation failure doesn't crash caller | orderService.js | Unit test: mock 422 → returns original response | YES |
| V-6 | `console.warn` on confirmation failure | orderService.js | Unit test: verify console.warn called | YES |
| V-7 | Webpack compiles clean | — | `webpack` | YES |
| V-8 | Live: tap Bill → confirmation POST fires | Browser Network tab | Look for POST to `/print/update-print-status` | NO |
| V-9 | Live: after Bill → socket delivers `bill_print: "Yes"` | Browser console | Socket event log | NO |
| V-10 | Live: card turns green after Bill print | Browser | BUG-583 visual: green bg + border | NO |
| V-11 | Live: KOT print → confirmation with `kot_print: "Yes"` | Browser Network tab | Look for POST | NO |
| V-12 | Live: confirmation 422/500 → no user-visible error | Browser | Kill network mid-confirm | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-512 → status: GATE_5A_IMPLEMENTED
- [ ] CR_REGISTRY.md: CR-512 row updated
- [ ] FILE_OWNERSHIP.md: add CR-512 entry (constants.js, orderService.js)
- [ ] Code markers: // CR-512 comment in both modified files
```
