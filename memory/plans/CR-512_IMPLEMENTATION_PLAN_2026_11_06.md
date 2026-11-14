# CR-512 — Implementation Plan (Gate 3)

**Gate:** 3 — Implementation Plan
**Role:** PLANNING (stage = implementation_plan)
**Date:** 2026-11-06
**IA verified:** Both target lines confirmed accurate at current HEAD.

---

## Scope Lock

**Files WILL change (2):**
1. `src/api/constants.js` — 1 additive line
2. `src/api/services/orderService.js` — ~12 lines added inside existing function

**Files will NOT touch:**
- OrderCard.jsx, OrderEntry.jsx, TableCard.jsx, DashboardPage.jsx — zero caller changes
- orderTransform.js, socketHandlers.js, any context, any transform
- No new files created

---

## Execution Sequence

```
E-1 (constants.js)      — add CONFIRM_PRINT_STATUS endpoint
E-2 (orderService.js)   — add confirmation call inside printOrder()
── webpack compile check ──
```

---

## E-1 — Add `CONFIRM_PRINT_STATUS` to API_ENDPOINTS

**File:** `src/api/constants.js`
**Line:** 108 (after `PRINT_ORDER`)
**Type:** Additive (1 new line)

**Current (L107-109):**
```javascript
  // Print Operations (KOT/Bill)
  PRINT_ORDER: '/api/v1/vendoremployee/order-temp-store',
```

**After (L107-110):**
```javascript
  // Print Operations (KOT/Bill)
  PRINT_ORDER: '/api/v1/vendoremployee/order-temp-store',
  CONFIRM_PRINT_STATUS: '/api/v2/vendoremployee/print/update-print-status', // CR-512
```

**Verification:** `grep CONFIRM_PRINT_STATUS src/api/constants.js` → 1 match.

---

## E-2 — Add print confirmation inside `printOrder()`

**File:** `src/api/services/orderService.js`
**Lines:** L185-188 (replace 4 lines with 18 lines)
**Type:** Modify — wrap existing return with confirmation call
**Risk:** MEDIUM — change is inside `printOrder()` function body; all 15 callers across 10 files are unaffected (return value unchanged).

**Current (L185-188):**
```javascript
  console.log('[PrintOrder] payload:', payload, 'printer_agent.length:', agents.length);
  const response = await api.post(API_ENDPOINTS.PRINT_ORDER, payload);
  console.log('[PrintOrder] response:', response.data);
  return response.data;
```

**After (L185-202):**
```javascript
  console.log('[PrintOrder] payload:', payload, 'printer_agent.length:', agents.length);
  const response = await api.post(API_ENDPOINTS.PRINT_ORDER, payload);
  console.log('[PrintOrder] response:', response.data);

  // CR-512: Confirm print success → sets bill_print/kot_print on order + emits update-order socket.
  // Handover rules: do NOT call on preview/failure. Do NOT auto-retry (additive, not idempotent).
  try {
    const confirmPayload = {
      order_id: Number(orderId),
      bill_print: printType === 'bill' ? 'Yes' : 'No',
      kot_print: printType === 'kot' ? 'Yes' : 'No',
    };
    const confirmResp = await api.post(API_ENDPOINTS.CONFIRM_PRINT_STATUS, confirmPayload);
    console.log('[PrintOrder] confirm:', confirmResp.data);
  } catch (confirmErr) {
    // Non-blocking: print was sent to queue; confirmation failure should not crash caller.
    console.warn('[PrintOrder] confirm-print-status failed (non-blocking):', confirmErr?.message);
  }

  return response.data;
```

**Design decisions:**
1. **try-catch** — the physical print (`order-temp-store`) already succeeded. If confirmation fails, the user must NOT see an error. The bill went to the printer.
2. **Non-blocking** — `return response.data` is always reached. Callers see no change.
3. **`bill_print`/`kot_print` from `printType`** — per OD-512-02, both types confirmed. Handover: "At least one must be Yes."
4. **No retry** — handover: "it is additive, not idempotent."
5. **`Number(orderId)`** — `orderId` parameter can be string or number; backend requires positive integer.

---

## What Happens After (already implemented — zero code needed)

```
E-2 fires POST /update-print-status { bill_print: "Yes" }
  → Backend sets orders.bill_print counter += 1, flag = "Yes"
  → Backend emits update-order socket event
  → socketHandlers.js handleOrderDataEvent() receives it
  → orderTransform.js L310: bill_print: "Yes" → billPrinted: true  [BUG-583 E-2]
  → OrderContext updateOrder() re-renders cards
  → OrderCard.jsx L458: green bg #E8F5E9 + green border #329937   [BUG-583 E-4]
  → TableCard.jsx L283: green bg + green border                    [BUG-583 E-5]
  → Card turns green ✅
```

---

## Verification Matrix

| # | Check | File | How to Verify | Auto? |
|---|-------|------|---------------|:---:|
| V-1 | `CONFIRM_PRINT_STATUS` constant exists | constants.js | `grep CONFIRM_PRINT_STATUS src/api/constants.js` — 1 match | YES |
| V-2 | Confirmation call present inside `printOrder()` | orderService.js | Code inspect: `api.post(API_ENDPOINTS.CONFIRM_PRINT_STATUS` | YES |
| V-3 | Bill print → `bill_print: "Yes"`, `kot_print: "No"` | orderService.js | Unit test: mock `printType='bill'` → verify payload | YES |
| V-4 | KOT print → `kot_print: "Yes"`, `bill_print: "No"` | orderService.js | Unit test: mock `printType='kot'` → verify payload | YES |
| V-5 | Confirmation failure → no throw, returns original response | orderService.js | Unit test: mock 422 → expect `response.data` returned + `console.warn` | YES |
| V-6 | `// CR-512` marker in constants.js | constants.js | `grep CR-512 src/api/constants.js` | YES |
| V-7 | `// CR-512` marker in orderService.js | orderService.js | `grep CR-512 src/api/services/orderService.js` | YES |
| V-8 | Webpack compiles with 0 new errors | — | `tail /var/log/supervisor/frontend.out.log` | YES |
| V-9 | Live: tap Bill → Network tab shows POST to `/print/update-print-status` | Browser | Inspect XHR after Bill press | NO |
| V-10 | Live: after Bill → card turns green (BUG-583 visual) | Browser | Observe card bg `#E8F5E9` + border `#329937` | NO |
| V-11 | Live: KOT print → confirmation POST with `kot_print: "Yes"` | Browser | Inspect XHR after KOT press | NO |
| V-12 | Live: confirmation network error → no user toast/error | Browser | Throttle network mid-confirm | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-512 → status: GATE_5A_IMPLEMENTED
- [ ] CR_REGISTRY.md: CR-512 row updated
- [ ] FILE_OWNERSHIP.md: add CR-512 entry (constants.js L109, orderService.js L188-201)
- [ ] Code markers: // CR-512 in both modified files
```

---

## Handover

```
Plan ready at /app/memory/plans/CR-512_IMPLEMENTATION_PLAN_2026_11_06.md
2 edits across 2 files.
Code reality: NONE.
Scope: constants.js (1 additive line) + orderService.js (~12 lines inside printOrder())
       / will NOT touch: any caller file, any transform, any context, any socket handler
Verification matrix: 12 checks (8 automated, 4 browser).
Owner decisions: ALL LOCKED.
Awaiting Gate 4 GO.
```
