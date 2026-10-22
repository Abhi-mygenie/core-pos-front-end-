# CR-409 — Impact Analysis (Gate 2)
**Date:** 2026-10-11
**Stage:** GATE_2_IMPACT_ANALYSIS
**Author:** PLANNING agent

---

## Code Reality

**NONE** — `fromAPI.order` return object (verified at HEAD, lines 196–449 of `orderTransform.js`) contains zero coupon fields. `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type` exist on the raw API response but are not mapped. Pure addition — no existing code needs changing, only new fields and a new CPP prop.

Verification command:
```bash
sed -n '196,450p' /app/frontend/src/api/transforms/orderTransform.js | grep -c "coupon"
# → 0 (confirmed)
```

---

## Conflict Pre-Check

| File | Last modifier | Lines affected by CR-409 | Conflict? |
|------|---------------|--------------------------|-----------|
| `orderTransform.js` | BUG-484 (2026-10-01) L1505-1509; BUG-487 (2026-10-05) L410-413 | Add ~4 lines inside `fromAPI.order` return at ~L449 | **NONE** |
| `CollectPaymentPanel.jsx` | CR-408 (2026-10-11) L880–887 deleted | Add 1 prop declaration + 1 mount useEffect (~8 lines) | **NONE** |
| `OrderEntry.jsx` | CR-376-FU-B (2026-09-26) E4–E6 | Pass `initialCoupon` prop to `<CollectPaymentPanel>` (~3 lines) | **NONE** |

Open items also touching these files: CR-410 (BACKEND-BLOCKED — will not be implemented before CR-409). **Conflict: NONE.**

---

## Data Flow Trace

### Current (broken) path
```
scan-new-order socket → rawPayload.orders[0]
  → handleScanNewOrder → fromAPI.order(rawPayload.orders[0])
      coupon_code: 'MARRY'  ──┐
      coupon_discount: 197  ──┤  DROPPED — not mapped
      coupon_title: '...'   ──┘
  → OrderContext: { couponCode: undefined, couponDiscount: undefined }
  → OrderEntry: orderData.couponCode = undefined
  → CollectPaymentPanel mounts: selectedCoupon = null, couponDiscount = 0
  → Pay total = ₹1,441  (WRONG — should be ₹1,242)
```

### Fixed path (after CR-409)
```
scan-new-order socket → rawPayload.orders[0]
  → handleScanNewOrder → fromAPI.order(rawPayload.orders[0])
      coupon_code: 'MARRY'    → couponCode: 'MARRY'      ✓  [E-1]
      coupon_discount: 197    → couponDiscount: 197       ✓  [E-1]
      coupon_title: '...'     → couponTitle: '...'        ✓  [E-1]
      coupon_type: 'order'    → couponType: 'order'       ✓  [E-1]
  → OrderContext: { couponCode: 'MARRY', couponDiscount: 197 }
  → OrderEntry: builds initialCoupon shape from orderData   [E-3]
      → passes initialCoupon prop to <CollectPaymentPanel>  [E-3]
  → CollectPaymentPanel mounts:                             [E-2]
      → mount useEffect: setSelectedCoupon(initialCoupon)
      → selectedCoupon.computedDiscount = 197
      → couponDiscount = 197
  → Pay total = ₹1,242  (CORRECT ✓)
```

---

## Affected File Analysis

### E-1 — `orderTransform.js` — `fromAPI.order` return object

**Where:** Inside the return object literal at `fromAPI.order`, after the existing financial fields (near L449 — end of the return block).

**What to add** (4 fields):
```javascript
// CR-409: pre-loaded coupon fields from scan & order / re-engaged orders
couponCode:     api.coupon_code     || '',
couponDiscount: parseFloat(api.coupon_discount) || 0,
couponTitle:    api.coupon_title    || '',
couponType:     api.coupon_type     || 'order',
```

**Downstream benefit (additive, no extra work):**
These fields are already read by:
- `AggregatorOrderPopOut.jsx` (`order.couponCode`, `order.couponDiscount`) — currently always empty for scan orders; now populated ✓
- `OrderDetailSheet.jsx` (`displayData.couponCode`) — same
- `orderLedgerService.js` (`o.couponCode`, `o.couponAmount`) — same

All three get correct data automatically once E-1 is done.

---

### E-2 — `CollectPaymentPanel.jsx` — new `initialCoupon` prop + mount effect

**New prop** (1 line at props declaration):
```javascript
initialCoupon = null, // CR-409: pre-loaded coupon from scan & order
```

**New mount-only `useEffect`** (~7 lines, after existing coupon state declarations ~L327):
```javascript
// CR-409: pre-seed selectedCoupon from existing scan & order coupon on mount.
useEffect(() => {
  if (initialCoupon?.code && !selectedCoupon) {
    setSelectedCoupon(initialCoupon);
    setCouponCode(initialCoupon.code || '');
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // mount-only — initialCoupon is frozen at panel open
```

**`initialCoupon` shape needed by CPP** (minimum compatible with `selectedCoupon` usage):

| Field | Used by | Value source |
|---|---|---|
| `code` | coupon badge display, `setCouponCode` | `orderData.couponCode` |
| `computedDiscount` | `couponDiscount` useMemo (L621) | `orderData.couponDiscount` |
| `title` | badge display | `orderData.couponTitle \|\| orderData.couponCode` |
| `couponType` | `distributeItemDiscounts` (orderTransform) | `orderData.couponType \|\| 'order'` |
| `stackableWithLoyalty` | B-2 auto-remove guard (L891-905) | `true` (conservative default — stacking already resolved at scan & order time) |
| `valid` | guard at L962 | `true` |
| `fromExistingOrder` | distinguishes pre-loaded from CRM-validated | `true` |

**OD-409-01 (B) applied:** Cashier CAN remove this coupon — the Remove button already works once `selectedCoupon` is set; no extra locking logic needed.

**Interaction with CR-408 (auto-apply removal):** The mount useEffect for `initialCoupon` (E-2) fires on mount, setting `selectedCoupon`. The CR-408 auto-apply useEffect was deleted — so there is no race or double-apply. The `selectedCoupon` guard in the old auto-apply (`if (selectedCoupon ... return)`) no longer exists, but the mount effect fires once and sets the state. Clean.

**Interaction with B-2 loyalty auto-remove (L891-905):** `stackableWithLoyalty: true` in the initial shape means the B-2 removal will NOT fire even if cashier ticks loyalty. Cashier has full control — they can tick loyalty and keep the coupon. If they want to remove the coupon they can do so explicitly.

---

### E-3 — `OrderEntry.jsx` — pass `initialCoupon` prop to CPP

**Where:** The `<CollectPaymentPanel>` JSX block at ~L1866.

**What to add** (~4 lines — build shape + pass prop):
```javascript
// CR-409: pre-load coupon from existing scan & order
initialCoupon={
  orderData?.couponCode
    ? {
        valid:               true,
        code:                orderData.couponCode,
        title:               orderData.couponTitle || orderData.couponCode,
        computedDiscount:    orderData.couponDiscount || 0,
        couponType:          orderData.couponType || 'order',
        stackableWithLoyalty: true,
        fromExistingOrder:   true,
      }
    : null
}
```

**Guard:** `orderData?.couponCode` — only passes a non-null `initialCoupon` when the order actually had a coupon. Regular POS orders (where `couponCode = ''`) pass `null` → CPP behaves exactly as before for non-scan orders.

---

## Files That WILL Change

| File | Edit | Lines (approx) |
|---|---|---|
| `src/api/transforms/orderTransform.js` | E-1: add 4 coupon fields to `fromAPI.order` return | ~5 lines added near L449 |
| `src/components/order-entry/CollectPaymentPanel.jsx` | E-2: add 1 prop + 1 mount useEffect | ~9 lines added |
| `src/components/order-entry/OrderEntry.jsx` | E-3: build initialCoupon shape + pass prop to CPP | ~9 lines added |

## Files That WILL NOT Touch

`couponTransform.js` · `couponService.js` · `socketHandlers.js` · `orderService.js` · `CartPanel.jsx` · `DashboardPage.jsx` · `AggregatorOrderPopOut.jsx` · `OrderDetailSheet.jsx` · `orderLedgerService.js` (benefit automatically; no change needed) · any test file

---

## Risk Classification

**CRITICAL** — 3 R5 hotspot files + financial/coupon logic.
Change complexity: LOW-MEDIUM (3 additive edits, ~23 lines total, no deletions, no formula changes).

---

## Tests

No existing test covers coupon pre-loading from `fromAPI.order`. New tests needed:
- Unit test: `fromAPI.order` with `coupon_code` field → `couponCode` populated
- Unit test: `fromAPI.order` without `coupon_code` → `couponCode = ''`

---

## Owner Decisions

**NONE** — All ODs locked. No open questions.

---

## Summary

| Field | Value |
|---|---|
| Code Reality | NONE (pure addition) |
| Conflict Pre-Check | NONE |
| Risk | CRITICAL (3 R5 hotspots) |
| Change complexity | LOW-MEDIUM (~23 lines, 3 additive edits) |
| Files WILL change | `orderTransform.js` · `CollectPaymentPanel.jsx` · `OrderEntry.jsx` |
| Files WILL NOT touch | All others |
| New tests needed | 2 unit tests (orderTransform) |
| Owner decisions | NONE |
| Fast Lane eligible | NO (R5 + financial) |
| Planning skip eligible | NO |
