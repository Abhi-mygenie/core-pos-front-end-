# Impact Analysis + Implementation Plan — BUG-286, BUG-287

**Stage:** Gate 2 (Impact Analysis) + Gate 3 (Implementation Plan)
**Date:** 2026-07-31
**Code Reality:** NONE (both items)
**Conflict Pre-Check:** No other open items touch these lines. CLEAR.

---

## Scope Lock

**Files WILL change:**
1. `components/cards/OrderCard.jsx` (BUG-286)
2. `api/transforms/aggregatorTransform.js` (BUG-287)

**Files WILL NOT touch:**
- `TableCard.jsx`, `AggregatorOrderPopOut.jsx`, `DashboardPage.jsx`
- Any service, context, provider, or report file

---

## BUG-286 — Aggregator KOT/Bill Hidden on OrderCard

### Impact Analysis

**Risk:** LOW
**Data Flow:** `DashboardPage` → `canPrintBill={hasPermission('print_icon')}` → `OrderCard` prop → gates KOT (L1013) and Bill (L1082)

**Root Cause:** OrderCard gates aggregator KOT/Bill behind `canPrintBill` (POS print permission). TableCard does NOT have this gate → shows buttons correctly. Mismatch.

**Owner Decision:** Always show KOT/Bill for aggregator. Aggregator print uses UrbanPiper API, not POS thermal printer — `print_icon` permission is irrelevant.

**Downstream:** Zero. The `handleAggregatorPrint` handler and `manuallyPrintAggregator` service are already wired. Only the visibility condition changes.

### Implementation Plan

#### Edit E1 — OrderCard.jsx L1013 (KOT: bypass canPrintBill for aggregator)

**Current (L1012-1013):**
```javascript
              {/* CR-120: Aggregator KOT only at fOS=1 (preparing); Bill moves to fOS=2 */}
              {canPrintBill && (isAggregator ? (fOrderStatus === 1) : !(isDelivery && (fOrderStatus === 2 || fOrderStatus === 5))) && (
```

**New (L1012-1013):**
```javascript
              {/* CR-120: Aggregator KOT only at fOS=1 (preparing); Bill moves to fOS=2 */}
              {/* BUG-286: Aggregator print bypasses canPrintBill — uses UrbanPiper API, not POS printer */}
              {(isAggregator || canPrintBill) && (isAggregator ? (fOrderStatus === 1) : !(isDelivery && (fOrderStatus === 2 || fOrderStatus === 5))) && (
```

**Rationale:** `(isAggregator || canPrintBill)` — aggregator always true, POS still gated by permission.

#### Edit E2 — OrderCard.jsx L1081-1082 (Bill: remove canPrintBill for aggregator)

**Current (L1081-1082):**
```javascript
            {/* CR-120: Aggregator Bill only at fOS=2 (ready) */}
            {isAggregator && fOrderStatus === 2 && canPrintBill && (
```

**New (L1081-1082):**
```javascript
            {/* CR-120: Aggregator Bill only at fOS=2 (ready) — BUG-286: no canPrintBill gate for aggregator */}
            {isAggregator && fOrderStatus === 2 && (
```

**Rationale:** Aggregator Bill at fOS=2 should always show. `canPrintBill` removed entirely from this condition since it's already inside an `isAggregator` guard.

---

## BUG-287 — "This is order level instructions" Placeholder Not Stripped

### Impact Analysis

**Risk:** LOW
**Data Flow:** API `order_note` → `aggregatorTransform.js` L23-24 → `orderNote` field → consumed by:
  1. `OrderCard.jsx` L622: `{order.orderNote && (...)}` → auto-hides when null
  2. `AggregatorOrderPopOut.jsx` L270: `{order.orderNote && (...)}` → auto-hides when null

**Root Cause:** BUG-283 strips `"Order Instructions :::"` prefix but leaves the UrbanPiper default body `"This is order level instructions"` intact.

**Evidence (8 orders):**
- 4 Zomato: `"Order Instructions ::: This is order level instructions"` → after BUG-283 → `"This is order level instructions"` (placeholder, should be null)
- 2 Swiggy: `"This is order level instructions"` (same placeholder, no prefix)
- 2 real notes: `"this is mallu's order"`, `"mallu ka aunty"` (must be preserved)

**Downstream:** Fix is at transform layer ONLY. Both UI components already gate on `order.orderNote && (...)` — once transform returns `null`, both auto-hide. Zero UI edits needed.

### Implementation Plan

#### Edit E3 — aggregatorTransform.js L24 (add placeholder filter)

**Current (L23-24):**
```javascript
    // BUG-283: Strip Zomato "Order Instructions :::" prefix from order notes
    const rawNote = foods[0]?.food_details?.order_note || od.order_note || '';
    const orderNote = rawNote.replace(/^Order Instructions\s*:::\s*/i, '').trim() || null;
```

**New (L23-24):**
```javascript
    // BUG-283: Strip Zomato "Order Instructions :::" prefix from order notes
    // BUG-287: Filter UrbanPiper default placeholder "This is order level instructions"
    const rawNote = foods[0]?.food_details?.order_note || od.order_note || '';
    const stripped = rawNote.replace(/^Order Instructions\s*:::\s*/i, '').trim();
    const orderNote = (stripped && !/^this is order level instructions$/i.test(stripped)) ? stripped : null;
```

**Rationale:** After prefix strip, if remaining text matches the known UrbanPiper default (case-insensitive exact match), treat as null. Real notes pass through. Empty notes remain null.

---

## Verification Matrix

| Edit | File | Change | How to Verify | Automated? |
|:----:|------|--------|---------------|:---:|
| E1 | OrderCard.jsx:1013 | KOT: `(isAggregator \|\| canPrintBill)` | Browser: aggregator fOS=1 OrderCard shows KOT icon | NO |
| E2 | OrderCard.jsx:1082 | Bill: remove `canPrintBill` | Browser: aggregator fOS=2 OrderCard shows Bill button | NO |
| E3 | aggregatorTransform.js:24 | Placeholder filter | Browser: orders with default text → no note label. Orders with real text → note visible | NO |

### Regression Checks

| # | What | Why |
|---|------|-----|
| R1 | Non-aggregator orders: KOT/Bill still gated by `canPrintBill` | E1 uses `(isAggregator \|\| canPrintBill)` — POS path unchanged |
| R2 | Real order notes still display | E3 filters exact match only — "this is mallu's order" passes through |
| R3 | Empty notes still hidden | Existing `\|\| null` fallback preserved |
| R4 | Zomato prefix + placeholder combo stripped | "Order Instructions ::: This is order level instructions" → null |
| R5 | Webpack compiles clean | Standard |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-286, BUG-287 → status: IMPLEMENTED, gate: 5a
- [ ] BUG_TRACKER.md: 2 rows updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: 2 files listed
- [ ] Code markers: // BUG-286 and // BUG-287 in modified files
```

---

## Summary

| Metric | Value |
|--------|-------|
| Total edits | 3 (E1-E3) |
| Files changed | 2 |
| Lines added | ~4 |
| Lines removed | ~2 |
| Net delta | +2 |
| Risk | LOW (both items) |
| Owner decisions blocking | NONE |

**Next: Gate 4 GO → Implementation**
