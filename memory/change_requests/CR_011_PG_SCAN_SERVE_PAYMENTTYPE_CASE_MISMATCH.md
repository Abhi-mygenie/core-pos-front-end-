# CR-011 [CLOSED — NOT REPRODUCED 2026-05-03]

> **Status update (2026-05-03):** Owner ran a fresh DevTools trace on preprod
> against a current prepaid order. Backend `payment_type` returned **lowercase
> `"prepaid"`** — no case mismatch. Owner subsequently confirmed: *"now its
> working not stuck"*. The originally-reported "stuck on dashboard after served"
> behaviour could not be reproduced in this session. Closing as not reproduced.
> If it resurfaces, capture a trace where `f_order_status: 5` (served) and the
> order still appears on the dashboard — that will pinpoint the actual gap.

---

# CR-011 — PG-Paid Scan Order Stays on Dashboard After Mark-Served

**Status:** Parked for validation — no code changes yet.
**Author:** Implementation Agent · 2026-05-02 (raised mid-session during CR-007 bucket A2 work).
**Source:** User-reported: *"I have an order which is paid from PG and coming from scanner, after serving it still remains on screen."*
**Related:** BUG-011 (Scan & Order Confirm fails w/ HTTP 500) — same feature area (scan orders), different failure mode.
**Severity:** Medium — functional regression in scan-and-pay terminal flow (order never clears from active dashboard → operator confusion → risk of duplicate action / missed next-order).

---

## 1. Issue raised

| # | Symptom | Type |
|---|---|---|
| 1 | Customer scans QR → orders → pays via Razorpay/PG (prepaid). Kitchen prepares. Operator clicks **Serve**. Expected: card disappears (prepaid + served = paid terminal state). Actual: card **stays on dashboard** with status `served` (f_order_status=5), never auto-removed. | Frontend branching / data-contract bug |

---

## 2. Current behaviour — traced in code

### 2.1 Mark-Served handler (`pages/DashboardPage.jsx:1251-1271`)

```js
const handleMarkServed = useCallback(async (tableEntry) => {
  if (!tableEntry?.orderId) return;
  try {
    const order = getOrderById(tableEntry.orderId);
    if (order?.paymentType === 'prepaid') {
      console.log('[handleMarkServed] Prepaid order — calling paid-prepaid-order:', tableEntry.orderId);
      await completePrepaidOrder(tableEntry.orderId, order.serviceTax || 0, order.tipAmount || 0);
      handlePrepaidSettleSuccess(tableEntry.orderId);
    } else {
      await updateOrderStatus(tableEntry.orderId, permissions?.[0] || 'Manager', 'serve');
    }
  } catch (error) {
    console.error('[handleMarkServed] Error:', error);
  }
}, [permissions, getOrderById, handlePrepaidSettleSuccess]);
```

### 2.2 Endpoint map

| `order.paymentType` value (lowercase compare) | Handler | Endpoint | Method | Net effect on dashboard |
|---|---|---|---|---|
| `'prepaid'` (exact lowercase) | `completePrepaidOrder()` | `POST /api/v2/vendoremployee/order/paid-prepaid-order` | Posts `{order_id, payment_status:'paid', service_tax, tip_amount}` | Backend emits `update-order` / `update-order-paid` with `f_order_status=6` → socket handler removes card (`socketHandlers.js:271-277`). |
| Anything else (including `'Prepaid'`, `'PREPAID'`, `'postpaid'`, `''`) | `updateOrderStatus()` | `PUT /api/v2/vendoremployee/order/order-status-update` (payload `order_status: 'serve'`) | Marks `f_order_status=5` (served). **Non-terminal** → card stays. Waits for future Collect-Bill path to transition to 6 (paid). |

### 2.3 `paymentType` data-contract — ENTRY POINTS are inconsistent

| File | Line | Code | Casing |
|---|---|---|---|
| `api/transforms/orderTransform.js` | 191 | `paymentType: api.payment_type \|\| ''` | **passthrough (case-preserving)** |
| `api/transforms/reportTransform.js` | 180, 215, 267, 302 | `paymentType: api.payment_type \|\| '—'` | passthrough |
| `api/transforms/reportTransform.js` | 339 | `paymentType: orderDetails.payment_type \|\| 'Prepaid'` | **default value is CAPITALISED** — evidence backend may also send Capitalised |
| `api/transforms/orderTransform.js` (outbound builders) | 669, 745 | `payment_type: 'postpaid'` | lowercase (frontend-authored) |
| `api/transforms/orderTransform.js` (outbound builder) | 836 | `payment_type: 'prepaid'` | lowercase (frontend-authored) |

### 2.4 Consumers that compare `paymentType` strictly (lowercase)

- `pages/DashboardPage.jsx:1257` — `order?.paymentType === 'prepaid'` (the handler in question)
- `components/cards/OrderCard.jsx:140, 322, 346, 363, 743` — multiple render and handler branches
- `components/cards/TableCard.jsx:164, 293, 383` — multiple card render branches
- *(broader grep confirmed 20+ sites use strict `=== 'prepaid'` comparison)*

### 2.5 The smoking-gun inconsistency

If **any** API endpoint (especially the socket-triggered refetch path used for scan orders) returns `payment_type` capitalised (`"Prepaid"` / `"PREPAID"`), the frontend:
1. **Renders OK** for most UI surfaces (they often just display the string).
2. **Fails silently** for every `=== 'prepaid'` gate — the order is treated as postpaid.

For the Mark-Served handler specifically, that failure routes the order through `order-status-update` → `f_order_status=5` (served) → **non-terminal** → card remains on dashboard indefinitely until the operator discovers it and handles it manually.

---

## 3. Hypothesis (primary)

**PG-paid scan orders arrive on the frontend with `payment_type: "Prepaid"` (capitalised), which fails the strict-lowercase gate in `handleMarkServed`, causing the wrong endpoint to fire and the card to linger.**

### Supporting evidence (without a live trace)
- `reportTransform.js:339` already reflects a capitalised default — someone previously saw capitalised values from some endpoint and chose to preserve them.
- Frontend-authored outbound builders explicitly use lowercase (`orderTransform.js:669, 745, 836`) — so the contract the frontend expects is lowercase.
- The codebase does NOT normalise `payment_type` case anywhere at the transform boundary.

### Alternative hypotheses (to be ruled out during validation)
| Alt | Description | How to rule out |
|---|---|---|
| A | `paid-prepaid-order` endpoint IS called but backend doesn't emit the terminal socket event for PG/scan orders | Inspect backend socket emissions after the POST call — expect `update-order-paid` or `update-order` with `f_order_status=6` |
| B | Backend socket emits but `order.status` lands as something other than `'paid'` / `'cancelled'` | Log the order payload in `socketHandlers.js:250-272` at the `shouldRemove` decision point |
| C | `completePrepaidOrder()` 500s silently (caught by outer try/catch) | Check Network tab + Console for the error log line at `DashboardPage.jsx:1269` |
| D | Scan order carries a **different** `paymentType` sentinel entirely, e.g. `"PG"`, `"online"`, `"online_prepaid"` | Inspect the orders list API response for scan orders — note the exact string |

---

## 4. Impact analysis

| Area | Impact | Severity |
|---|---|---|
| Operator workflow | Served card never clears; operator must remember to manually settle from bill — same risk as BUG-011 | Medium |
| Financial reporting | No direct impact — order is already marked paid server-side if it was PG-paid before kitchen; the f_order_status=5 vs 6 mismatch is purely frontend-side display | Low |
| Revenue | No direct impact | — |
| Regression risk of fix | **Option 1 (normalise at transform boundary)**: very low — single source-of-truth fix, all 20+ consumers benefit. Could unmask latent bugs elsewhere that silently depended on capitalised string. | Low |
| Regression risk of fix | **Option 2 (case-insensitive compare in handler)**: very low but local — doesn't help other consumers that use strict `=== 'prepaid'` and may have the same latent issue (prepaid badge render, Settle button branching, merge/shift gate, etc.) | Very low |
| Regression risk of fix | **Option 3 (backend fix)**: depends on backend availability & coordination | Medium (process) / Low (technical) |
| Engage-lock / socket timing | No impact — fix is in the sync decision code path before the endpoint call | None |

---

## 5. Hotspot / sequencing considerations

- `orderTransform.js` is in the hotspot list but Bucket B1 (Multi-select variations) is the only other bucket planning edits there. No direct conflict.
- `DashboardPage.jsx` has no other open bucket editing it this sprint.
- Not dependent on A3 (parked) or A4 (parked).

---

## 6. Fix options (ranked)

| # | Option | Change | File(s) | LOC | Risk | Follow-up unlocked |
|---|---|---|---|---|---|---|
| **1** ⭐ | Normalise `payment_type` to lowercase at the transform boundary (single source of truth). | `paymentType: (api.payment_type \|\| '').toLowerCase()` + brief comment. Apply to all transformers that expose `paymentType`. | `orderTransform.js:191`, `reportTransform.js:180, 215, 267, 302, 339, 406, 545` | ~10 | Very low | Fixes ALL 20+ strict-compare sites simultaneously |
| 2 | Case-insensitive compare in the one handler | `order?.paymentType?.toLowerCase() === 'prepaid'` | `DashboardPage.jsx:1257` | 1 | Very low | Fixes ONLY mark-served. Other 19 sites still latent. |
| 3 | Backend-side contract lowercase everywhere | Backend team | n/a | — | Process cost high | Cleanest long-term but requires BE coordination |
| 4 | Option 1 + Option 3 in parallel | Both | both | ~10 | Very low | Belt-and-braces |

**Recommended:** **Option 1** — one-line normalisation at each transform boundary + comment referencing this CR, applied in a single PR. Plus BE note to lowercase going forward (non-blocking).

---

## 7. Open questions — awaiting owner/backend answers

| ID | Question | Who answers | Default | Decision needed? |
|---|---|---|---|---|
| Q-11.1 | What exact value does backend send in `payment_type` for scan orders paid via PG? (`"Prepaid"` vs `"prepaid"` vs `"PG"` vs `"online"` vs other) | Owner to run DevTools probe; Backend to confirm contract | Assume `"Prepaid"` capital-P based on `reportTransform.js:339` evidence | Yes |
| Q-11.2 | Once `paid-prepaid-order` is called correctly, does backend emit `update-order-paid` OR generic `update-order` with `f_order_status=6`? | Backend | Either is handled by `socketHandlers.js:271-277` | No (frontend resilient) |
| Q-11.3 | Are there other scan-order sentinels (e.g. `"online_prepaid"`, `"ccavenue_prepaid"`) that also need to map to the prepaid path? | Backend + Owner | Assume only `"prepaid"` (lowercase after normalisation) | Yes |
| Q-11.4 | Should the fix also update `OrderCard.jsx`, `TableCard.jsx`, `OrderEntry.jsx`'s 20+ strict compares to `.toLowerCase()`-based compare as defence in depth, OR rely solely on normalisation-at-transform? | Owner | Normalisation-at-transform only (Option 1) — simpler, single point of change | Yes |

---

## 8. Validation protocol (run this first, before coding)

Estimated time: **5 minutes**. No code change.

1. Log in to POS.
2. Open DevTools → Console → filter `[handleMarkServed]`.
3. Open Network tab → filter `order`.
4. Trigger a fresh scan-and-pay order (QR → pay via PG → operator confirms + waits for served).
5. When the card shows `Served` button, click it.
6. Observe:
   - Console log: does `[handleMarkServed] Prepaid order — calling paid-prepaid-order:` fire? If YES → hypothesis wrong, investigate socket path. If NO → hypothesis CONFIRMED, paymentType didn't match.
   - Network: does `order-status-update` fire (wrong path) or `paid-prepaid-order` fire (correct path)?
   - Inspect the orders list API response for that order — note exact `payment_type` string value.
7. Capture the value and decision branch taken. Reply to CR ticket.

---

## 9. Proposed backlog placement

- **Owner:** _Parked for validation_ per owner instruction 2026-05-02.
- **Do not start coding** until Q-11.1 is answered via the §8 validation protocol.
- Once validated, this CR is a 5-minute implementation + lint + manual test (if Option 1 chosen). No backend dependency.

---

## 10. Related items / backend backlog

- Existing backend-pending items: BE-T (CR-008 #2 — dedicated action-time timestamps), BE-U (CR-005 Phase A — `is_auto_confirmed` / `order_from` verification).
- This CR-011 does NOT add a new backend-blocking item — backend can fix contract (Option 3) in parallel, but frontend Option 1 is sufficient standalone.

---

## 11. Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-02 | Implementation Agent | Initial draft, parked for owner validation. |

---

*End of CR-011.*
