# BUG-170 — Gate 3 Implementation Plan

**ID:** BUG-170
**Date:** 2026-08-20
**Gate 4 GO:** Owner approved (this session)
**Risk:** MEDIUM (print payload — display/tax accuracy, not live transaction)
**Impact Analysis:** `/app/memory/impact/BATCH-04_IMPACT_ANALYSIS.md` §BUG-170
**Investigation:** `/app/memory/investigation/BUG-170_REINVESTIGATION_REPORT_2026_08_20.md`

---

## What & Why

`buildBillPrintPayload` MANUAL PATH (OrderCard / TableCard / RePrintButton print) computes:
```js
lineTotal = (price × qty) + (addonPerUnit × qty)   // ← variation missing
```
`price = unit_price` from backend = base price only. Variation upcharge in `item.variation[].values[].optionPrice` is never read. Tax (GST/VAT) is computed on this understated `lineTotal` → wrong CGST/SGST on manual reprints (proven live: SS1 receipt, Hogwarts order #000199).

COLLECT BILL PATH is **not touched** — its GST is already correct via `overrides.gstTax` from CollectPaymentPanel (confirmed in reinvestigation).

---

## Exact Fix — 1 file, 3 lines added

**File:** `src/api/transforms/orderTransform.js`
**Location:** MANUAL PRINT PATH loop — after `addonPerUnit` computation, before `lineTotal`

**Must use Option A** (recompute from `item.variation[].values[].optionPrice`):
- `item.variation_amount` is `null` on orders placed before BUG-VQTY fix (July 2026)
- Option B (use `variation_amount`) silently returns 0 for old orders → wrong
- Option A reads the variation array echoed on the detail row → works for all orders

### Before (L1955-1959):
```js
        const addonPerUnit = (item.add_ons || []).reduce(
          (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
          0
        );
        const lineTotal = (price * qty) + (addonPerUnit * qty);
```

### After:
```js
        const addonPerUnit = (item.add_ons || []).reduce(
          (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
          0
        );
        // BUG-170: variation upcharge missing from tax base on manual reprint.
        // Use item.variation[].values[].optionPrice (Option A) — variation_amount
        // is null on pre-BUG-VQTY orders and cannot be used as fallback.
        const variationPerUnit = (item.variation || []).reduce(
          (sum, v) => sum + (Array.isArray(v.values) ? v.values.reduce(
            (s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0) : 0), 0
        );
        const lineTotal = (price * qty) + (addonPerUnit * qty) + (variationPerUnit * qty);
```

**Net change:** +4 lines in `buildBillPrintPayload` MANUAL PATH only.

---

## Files WILL change
- `src/api/transforms/orderTransform.js` (MANUAL PATH ~L1959, +4 lines)

## Files WILL NOT touch
All other files — CollectPaymentPanel, OrderCard, TableCard, CartPanel, reportTransform, etc.

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| 1 | Order with variation (e.g. masala dosa large +50) — manual reprint | CGST/SGST computed on full line (base+variation), not base only |
| 2 | Order without variation — manual reprint | Totals unchanged (variationPerUnit = 0) |
| 3 | Order with addons only — manual reprint | Addon computation still correct, variation adds 0 |
| 4 | CollectPaymentPanel print | Unchanged — COLLECT PATH not touched |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-170 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: orderTransform.js BUG-170 entry added
- [ ] Code marker: // BUG-170 in modified lines
- [ ] Compile: webpack 0 new warnings
```
