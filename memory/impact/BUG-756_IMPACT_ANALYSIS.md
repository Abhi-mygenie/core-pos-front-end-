# BUG-756 — Gate 2 Impact Analysis
## Print Bill 403 for PayLater Orders from Order Report Beta

**ID:** BUG-756
**Date:** 2026-11-27
**Role:** PLANNING — Gate 2 (Impact Analysis only)
**Code Reality:** NONE — no existing fix
**Conflict pre-check:** Need to verify CollectBillPanelDrawer.jsx recent modifiers

---

## 1. Root Cause (from Investigation)

**`CollectBillPanelDrawer.jsx` line 276 — BREAK POINT:**
```javascript
// Current — passes onPrintBill through to CPP without injecting order.id
onPrintBill={onPrintBill ?? null} // CR-503: accept external print handler
```

**Call chain:**
```
OrderReportBetaPage.jsx L940:
  <CollectBillPanelDrawer
    order={collectBillTarget}        ← collectBillTarget.id = row.order_id  ✅ known here
    onPrintBill={handlePrintBillFromBeta}
  />

CollectBillPanelDrawer.jsx L276:
  <CollectPaymentPanel
    onPrintBill={onPrintBill ?? null}  ← passes through WITHOUT injecting order.id

CollectPaymentPanel.jsx L1420-1471:
  handlePrintBill() {
    const overrides = {
      orderItemTotal, paymentAmount, grantAmount, discountAmount,
      gstTax, tip, ...  ← financial values only, NO order_id, NO id
    }
    await onPrintBill(overrides)   ← calls handlePrintBillFromBeta(overrides)
  }

OrderReportBetaPage.jsx handlePrintBillFromBeta L432:
  { order_id: row?.order_id || row?.id }
             ↑ undefined       ↑ undefined   ← BOTH missing from overrides
  api.post(SINGLE_ORDER_NEW, { order_id: undefined })
  → JSON: {}  → Backend: "order_id missing" → 403
```

**Why only PayLater is reported:** Reprint button (L384) has a guard `if (!row?.order_id) return` and uses `row.order_id` directly from the report table row (which DOES have `order_id`). The Collect Bill path (this bug) goes through CPP which doesn't have the order ID.

---

## 2. Affected Files

| File | Change needed | Risk |
|------|--------------|------|
| `src/components/reports/CollectBillPanelDrawer.jsx` | **WILL CHANGE** — L276: wrap `onPrintBill` to inject `order.id` before forwarding to CPP | LOW |
| `src/components/order-entry/CollectPaymentPanel.jsx` | **WILL NOT TOUCH** (CPP correctly builds financial overrides; not responsible for order ID) | |
| `src/pages/reports-module/OrderReportBetaPage.jsx` | **WILL NOT TOUCH** (`handlePrintBillFromBeta` is correct; it expects the caller to supply order ID) | |

---

## 3. Fix Direction

**File:** `CollectBillPanelDrawer.jsx` — **not an R5 hotspot**.

**Edit at L276:** Wrap `onPrintBill` to close over `order.id`:

```javascript
// Current (L276):
onPrintBill={onPrintBill ?? null} // CR-503: accept external print handler

// Fix: inject order.id into the overrides before forwarding to external handler
onPrintBill={
  onPrintBill
    ? (overrides) => onPrintBill({ ...overrides, id: order.id, order_id: order.id })
    : null
} // BUG-756: inject order.id so handlePrintBillFromBeta can call get-single-order-new
```

`order.id` is `collectBillTarget.id = row.order_id` (the numeric order ID), set by `openCollectBillDrawer` at OrderReportBetaPage L416. It is already known by the drawer at mount time.

**Scope:** 1 file (`CollectBillPanelDrawer.jsx`), ~3 lines (expand the prop to a 3-line wrapper), no API change, no transform change.

---

## 4. Owner Decisions

None — fix direction is unambiguous.

---

## 5. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Other callers of `CollectBillPanelDrawer` don't pass `onPrintBill` | NONE | Wrapper is guarded by `onPrintBill ? ... : null` — when null, no change |
| `order.id` is undefined at mount | LOW | If `order.id` is undefined, `order_id: undefined` → same 403 as before — no regression, still need a valid ID upstream |
| Dashboard Collect Bill flow affected | NONE | Dashboard doesn't use `CollectBillPanelDrawer`; it uses `CollectPaymentPanel` directly |

---

## 6. Downstream Consumers of CollectBillPanelDrawer

```
grep -rn "CollectBillPanelDrawer" src/ → 2 results:
  AllOrdersReportPage.jsx   — also passes onPrintBill (fix helps here too)
  OrderReportBetaPage.jsx   — primary bug reporter
```

**Note:** `AllOrdersReportPage.jsx` likely has the same bug. The IA scope covers only the drawer fix; the same wrapper applies to both callers automatically.

---

## 7. Verification Matrix

| # | Verification | Method |
|---|-------------|--------|
| V1 | PayLater order Print Bill no longer shows 403 | Browser: open Collect Bill on PayLater row, click Print Bill |
| V2 | Print is sent to printer / success toast shown | Browser: network tab shows 200 on get-single-order-new |
| V3 | Paid orders Reprint still works (no regression) | Browser: click Reprint on a Paid row |
| V4 | Collect Bill payment flow unaffected | Browser: complete a PayLater collect payment end-to-end |

**Gate 2 IA complete. Awaiting Gate 3 GO.**
