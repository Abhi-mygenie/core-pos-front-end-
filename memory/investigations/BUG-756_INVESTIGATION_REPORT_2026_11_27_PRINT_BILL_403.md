# BUG-756 — Investigation Report: Print Bill 403 for PayLater from Order Report Beta

**ID:** BUG-756
**Date:** 2026-11-27
**Role:** INVESTIGATION (Role 6)
**Steps used:** 9/10
**Confidence:** HIGH

---

## 1. Summary

| Field | Value |
|-------|-------|
| **Root cause** | CPP's `handlePrintBill` calls `onPrintBill(overrides)` where `overrides` has NO `order_id` or `id` field. `handlePrintBillFromBeta` then sends `{ order_id: undefined }` → API returns 403 "order_id is missing". |
| **Classification** | FE_BUG / CODE_ERROR |
| **Confidence** | HIGH |
| **Files** | `OrderReportBetaPage.jsx` (L432) · `CollectBillPanelDrawer.jsx` (L276) · `CollectPaymentPanel.jsx` (L1420-1471) |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result |
|---|-----------|------|--------|
| H1 | CPP calls `onPrintBill()` with no argument | Code trace CPP line 1471 | ELIMINATED — calls with `overrides` |
| H2 | `overrides` object has no `order_id` or `id` field | Read CPP lines 1427-1470 | **CONFIRMED** |
| H3 | Backend rejects because auth token is missing | Screenshot shows 403, not 401 | ELIMINATED — 403 means validation, not auth |

---

## 3. Data Flow Trace

```
User clicks "Collect" on PayLater row (#000105)
→ OrderReportBetaPage.openCollectBillDrawer(row)                       [L415]
  → setCollectBillTarget({ ...row, id: row.order_id, ... })            [L416]

→ CollectBillPanelDrawer renders with order={collectBillTarget}        [L117]
  → Fetches order detail: GET /get-single-order-new { order_id: order.id }  [L130]
  → Sets detail = transformed order (detail.id = numeric order ID)
  → Renders CollectPaymentPanel with onPrintBill={handlePrintBillFromBeta}  [L276]
    → CPP does NOT receive orderId/id as a prop

User clicks "Print Bill" in CPP bill summary header
→ CPP handlePrintBill()                                                [L1420]
  → Builds overrides = {
      orderItemTotal, orderSubtotal, paymentAmount, grantAmount,
      discountAmount, discountPercent, roundoff, couponCode, couponDiscount,
      loyaltyAmount, walletAmount, serviceChargeAmount, gstTax, vatTax, tip,
      runtimeComplimentaryFoodIds, custGST, custGSTName, restaurantPhone
      ← NO order_id, NO id field anywhere in overrides              ← BREAK POINT
    }
  → await onPrintBill(overrides)                                       [L1471]

→ handlePrintBillFromBeta(row = overrides)                             [L432]
  → { order_id: row?.order_id || row?.id }
                   ↑ undefined       ↑ undefined
  → api.post(SINGLE_ORDER_NEW, { order_id: undefined })
  → JSON.stringify strips undefined → sends {}
  → Backend: "The order id for the request is missing." → 403

→ catch(err): toast "Print failed — Request failed with status code 403"
```

**BREAK POINT:** `CollectPaymentPanel.jsx` L1427 — the `overrides` object built by `handlePrintBill()` contains financial values but **no order identifier** (`order_id`, `id`, or `orderId`). `handlePrintBillFromBeta` expects `row.order_id` or `row.id` but neither is present.

---

## 4. Evidence Artifacts

| Artifact | Location |
|----------|----------|
| Screenshot (403 error + network tab) | User-uploaded (session 2026-11-27) |
| CPP overrides object | `CollectPaymentPanel.jsx` lines 1427-1470 |
| handlePrintBillFromBeta | `OrderReportBetaPage.jsx` lines 432-444 |
| CollectBillPanelDrawer onPrintBill pass-through | `CollectBillPanelDrawer.jsx` line 276 |

---

## 5. Recommendations

**Classification:** FE_FIX

**Fix scope:** `CollectBillPanelDrawer.jsx` — 1 line, NOT an R5 hotspot

The drawer already knows `order.id` (the numeric order ID passed as prop at mount). It should inject that into the `onPrintBill` call rather than passing the raw CPP `overrides`:

```javascript
// CollectBillPanelDrawer.jsx line 276 — wrap to inject order.id
onPrintBill={onPrintBill ? (overrides) => onPrintBill({ ...overrides, id: order.id, order_id: order.id }) : null}
```

Alternatively fix in `handlePrintBillFromBeta` by passing `collectBillTarget` as a closure — but that requires the handler to know the target's ID at call time.

**Risk:** LOW (1-line wrapper, no logic change, no API contract change)
**Planning skip eligible:** YES — ≤10 lines, 1 file (CollectBillPanelDrawer.jsx), not hotspot, not financial logic
**Owner approval required for planning skip:** YES

---

## 6. Retroactive Candidates

BUG-711 is RELATED (Reprint gate for `print_icon` in Order Beta). This is DISTINCT — different flow (Collect Bill path vs Reprint button).
