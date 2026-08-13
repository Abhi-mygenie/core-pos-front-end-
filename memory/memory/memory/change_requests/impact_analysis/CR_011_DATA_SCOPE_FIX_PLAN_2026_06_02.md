# CR-011 — Data-Scope Fix: Per-Tab Discount / Tax / Avg-Price Split

**Date:** 2026-06-02
**Owner CR:** CR-011 — Complete Reports Module
**Related decision artifact:** `CR_011_DATA_SCOPE_FIX_PLAN_2026_06_02.md`
**Detailed implementation plan:** `CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md` (16-section step-by-step, awaiting §14 owner approvals A1–A5)
**Trigger:** Owner spotted Tax > Revenue on the Cancelled Lines tab of S5 Item Sales Hybrid (verbatim: *"not sure how cancelled data is working, can u tell me tax is showing more than revenue, explain pls no edit"*) → after explanation, owner picked **Option 1** (service-layer split). Verbatim: *"option 1 first update this in document"*.
**Status:** DECISION RECORDED + DETAILED PLAN DRAFTED — implementation pending §14 approvals A1–A5 in the implementation-plan artifact.

---

## 1. Problem statement

On the **Cancelled Lines** tab of Item Sales (both frozen S2 at `/reports-module/items` AND S5 at `/reports-module/items-hybrid`), the `Tax`, `Discount`, and `Avg Price` columns reflect the food item's **total activity across the date range** (sold + cancelled + comp combined), while the `Qty` and `Revenue` columns are correctly subset to **cancelled lines only**. This creates rows like:

| Item | Qty | Revenue | Discount | Tax | Avg Price |
|---|---|---|---|---|---|
| Americano | 1 | ₹140.00 | ₹0.00 | **₹551.00** | ₹140.00 |
| Kombucha (flavours) | 2 | ₹260.00 | ₹0.00 | **₹1,068.00** | ₹130.00 |
| Lentil & Vegetable Stew (V) | 1 | ₹320.00 | ₹0.00 | **₹638.00** | ₹320.00 |
| Carrot Cake | 2 | ₹440.00 | ₹0.00 | **₹714.00** | ₹220.00 |

A reader reasonably expects all 4 numeric columns to share the same population. They don't.

Same issue applies to the **Complimentary** tab (lens rewrites only `revenue` + `qty`).

The "All Items", "Top Sellers", and "Slow Movers" tabs are **not** affected — they show `revenueSold` and the global `tax`/`discount` reads identically because for those rows the sold portion dominates.

---

## 2. Root cause

File: `/app/frontend/src/api/services/insightsService.js`
Function: `getItemSalesAggregated(...)`, aggregation block at lines 173–209.

Per-item accumulator splits revenue and qty by line type but not the other numeric columns:

```js
existing.qtySold              += (isCancelled || isComplementary) ? 0 : qty;
existing.qtyCancelled         += isCancelled ? qty : 0;
existing.qtyComplementary     += isComplementary ? qty : 0;
existing.revenueSold          += (isCancelled || isComplementary) ? 0 : price;
existing.revenueCancelled     += isCancelled ? price : 0;
existing.revenueComplementary += isComplementary ? (menuPrice * qty) : 0;
existing.discount             += discount;     // ← total, not split
existing.tax                  += tax;          // ← total, not split
existing.unitPriceSum         += unitPrice;    // ← total, drives avgSalePrice
existing.lineCount            += 1;            // ← total, drives avgSalePrice
```

The UI lens-filter in `ItemSalesHybridMockup.jsx` (and identically in `ItemSalesMockup.jsx`) only rewrites two fields:

```js
if (activeTab === 'cancelled')
  return filtered.map(d => ({ ...d, revenue: d.revenueCancelled, qty: d.qtyCancelled }));
if (activeTab === 'comp')
  return filtered.map(d => ({ ...d, revenue: d.revenueComplementary, qty: d.qtyComplementary }));
```

→ `discount`, `tax`, `avgPrice` stay at their unsplit totals. Mismatch visible.

---

## 3. Option 1 — chosen fix (service-layer split)

Split `discount`, `tax`, and `avgSalePrice` into per-bucket fields at the service layer so the UI lens can re-point all numeric columns symmetrically.

### 3.1 New service output schema (per `food_id` row)

```js
{
  foodId, name, category, station, veg,

  // Quantities (already split — unchanged)
  qtySold, qtyCancelled, qtyComplementary,

  // Revenues (already split — unchanged)
  revenueSold, revenueCancelled, revenueComplementary,

  // NEW — split per bucket
  discountSold,    discountCancelled,    discountComplementary,
  taxSold,         taxCancelled,         taxComplementary,
  avgSalePriceSold, avgSalePriceCancelled, avgSalePriceComplementary,

  // Backward-compatibility totals (kept; used by All Items / Top / Slow tabs)
  discount,        // = discountSold + discountCancelled + discountComplementary
  tax,             // = taxSold      + taxCancelled      + taxComplementary
  avgSalePrice,    // = unitPriceSum / lineCount (existing total)

  drill: { ... },
}
```

Internal accumulators (replace lines 181–183 + 204–207 in the service):

```js
// In existing branch
existing.discountSold          += (isCancelled || isComplementary) ? 0 : discount;
existing.discountCancelled     += isCancelled        ? discount : 0;
existing.discountComplementary += isComplementary    ? discount : 0;
existing.taxSold               += (isCancelled || isComplementary) ? 0 : tax;
existing.taxCancelled          += isCancelled        ? tax : 0;
existing.taxComplementary      += isComplementary    ? tax : 0;
existing.unitPriceSumSold          += (isCancelled || isComplementary) ? 0 : unitPrice;
existing.lineCountSold             += (isCancelled || isComplementary) ? 0 : 1;
existing.unitPriceSumCancelled     += isCancelled    ? unitPrice : 0;
existing.lineCountCancelled        += isCancelled    ? 1         : 0;
existing.unitPriceSumComplementary += isComplementary? unitPrice : 0;
existing.lineCountComplementary    += isComplementary? 1         : 0;
existing.discount += discount;      // total kept for backward compat
existing.tax      += tax;
existing.unitPriceSum += unitPrice;
existing.lineCount    += 1;
```

In the row-finalisation pass (around line 213):

```js
avgSalePriceSold:          r.lineCountSold          > 0 ? r.unitPriceSumSold          / r.lineCountSold          : 0,
avgSalePriceCancelled:     r.lineCountCancelled     > 0 ? r.unitPriceSumCancelled     / r.lineCountCancelled     : 0,
avgSalePriceComplementary: r.lineCountComplementary > 0 ? r.unitPriceSumComplementary / r.lineCountComplementary : 0,
```

### 3.2 UI lens update (in S5 + S2 + any future Phase-3 sub-tab)

```js
if (activeTab === 'cancelled')
  return filtered.map(d => ({
    ...d,
    revenue:  d.revenueCancelled,
    qty:      d.qtyCancelled,
    discount: d.discountCancelled,
    tax:      d.taxCancelled,
    avgPrice: d.avgSalePriceCancelled,
  }));
if (activeTab === 'comp')
  return filtered.map(d => ({
    ...d,
    revenue:  d.revenueComplementary,
    qty:      d.qtyComplementary,
    discount: d.discountComplementary,
    tax:      d.taxComplementary,
    avgPrice: d.avgSalePriceComplementary,
  }));
```

### 3.3 Drill sheet (`ItemDrillSheet.jsx`)

No payload change — the drill already groups its own per-line data and doesn't read aggregated tax/discount.

### 3.4 Export payload (`reportExporter.js` consumer in S5)

The Cancelled / Comp sheets in the `.xls` export and the per-section table in the PDF currently inherit the same total tax/discount. After the fix, `buildExportPayload()` in `ItemSalesHybridMockup.jsx` will use the lens-corrected values, so exports become consistent in one shot — no exporter change needed.

---

## 4. Files touched (final list)

| File | Change |
|---|---|
| `/app/frontend/src/api/services/insightsService.js` | Accumulator + row-finalisation in `getItemSalesAggregated`. Backward-compat totals preserved. |
| `/app/frontend/src/pages/reports-module/ItemSalesMockup.jsx` (**FROZEN S2**) | `lensFilteredData` for Cancelled + Comp tabs. **Requires §7 re-open of S2 from ✅ → 🔧 → re-validate → ✅.** |
| `/app/frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx` (**S5, 🟠**) | Same `lensFilteredData` change. Patched in place. |
| Tests (if any cover the service) | Update fixtures + assertions to include the new fields. |

---

## 5. Protocol implications

### 5.1 S2 re-open (FROZEN screen)

Per `CR_011_SCREEN_FREEZE_PROTOCOL.md §7`, fixing this on frozen S2 requires:

1. Stop downstream work on S5.
2. Re-open S2: status ✅ FROZEN → 🔧 Revision requested.
3. Surface the issue to owner with explicit ask. (This document is that surfacing.)
4. Wait for explicit owner direction. **Direction received 2026-06-02: "option 1 first update this in document"** — direction is to proceed; document-first is captured by this artifact.
5. Patch, re-render, owner validates again, S2 → ✅ FROZEN.
6. S5 patch lands in the same change set (so both screens get the new lens together).

### 5.2 S5 status

S5 stays 🟠 API wired + Export shipped → after the data-scope patch lands and owner validates, S5 → ✅ FROZEN.

### 5.3 Phase 3 sub-tabs (S15–S18)

Inherit the new schema automatically once they're built. No retroactive concern.

### 5.4 No risk to other reports

`getItemSalesAggregated` is only consumed by Item Sales (S2 + S5). The Dashboard tile (`getDashboardAggregated`) uses a separate path inside `insightsService.js` — unaffected.

### 5.5 Backend (preprod)

**No backend change required.** The line-level data already carries `gst`, `vat`, `discount_amount`, `unit_price`, `food_status`, and `cancel_at` per order detail. The fix is entirely in how the frontend service buckets the existing line-level numbers.

---

## 6. Pending owner approvals before code

- [ ] Approval to implement Option 1 per §3 + §4 (code change).
- [ ] Approval to re-open frozen S2 per §5.1 (this is the formal §7 ask: *"Do you want to revise S2?"*).
- [ ] Confirm validation date range for re-freeze (default suggestion: Palm House April-2026 window — `?from=2026-04-01&to=2026-04-30` — where Cancelled Lines previously matched 145 = 43 order + 102 item).

---

## 7. Links

- Service file: `/app/frontend/src/api/services/insightsService.js` (lines 173–249)
- Frozen S2 screen: `/app/frontend/src/pages/reports-module/ItemSalesMockup.jsx`
- S5 Hybrid screen: `/app/frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx`
- Screen freeze log entry: `/app/memory/control/CR_011_SCREEN_FREEZE_LOG.md` (S2 + S5 rows)
- Loading & interaction spec: `/app/memory/memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md`
- S5 scope addendum: `/app/memory/memory/change_requests/impact_analysis/CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md`
- Screen freeze protocol §7: `/app/memory/control/CR_011_SCREEN_FREEZE_PROTOCOL.md`

---

*This document records the decision; no code has been modified. Implementation is gated on the two explicit approvals in §6.*
