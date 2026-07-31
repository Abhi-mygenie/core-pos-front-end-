# Implementation Plan — Batch A (BUG-282, BUG-283, BUG-284, BUG-285, CR-120)

**Stage:** Gate 3 — Implementation Plan
**Date:** 2026-07-31
**Impact Analysis:** `impact/BATCH_A_BUG-282_283_284_285_CR-120_IMPACT_ANALYSIS.md` (Gate 2 — VERIFIED current)
**Line Verification:** ALL target lines confirmed matching on 2026-07-31. No drift.

---

## Scope Lock

**Files WILL change:**
1. `api/transforms/aggregatorTransform.js` (BUG-283)
2. `components/dashboard/AggregatorOrderPopOut.jsx` (BUG-282, BUG-284)
3. `components/cards/OrderCard.jsx` (BUG-285, CR-120)
4. `components/cards/TableCard.jsx` (BUG-285, CR-120)

**Files WILL NOT touch:**
- `DashboardPage.jsx`, `aggregatorService.js`, `ScanOrderPopOut.jsx`
- Any transform, service, context, or provider
- Any report, financial, or auth file

---

## Execution Sequence (3 batches)

### Batch 1: Transform fix (BUG-283)

#### Edit E1 — `aggregatorTransform.js` L23

**Current (L23):**
```javascript
    const orderNote = foods[0]?.food_details?.order_note || od.order_note || null;
```

**New (L23):**
```javascript
    // BUG-283: Strip Zomato "Order Instructions :::" prefix from order notes
    const rawNote = foods[0]?.food_details?.order_note || od.order_note || '';
    const orderNote = rawNote.replace(/^Order Instructions\s*:::\s*/i, '').trim() || null;
```

**Rationale:** Zomato injects `"Order Instructions :::"` prefix. Swiggy does not. Regex strips it case-insensitively. Empty string after strip → `null` (consistent with existing null convention).

---

### Batch 2: Popup fixes (BUG-284, BUG-282)

#### Edit E2 — `AggregatorOrderPopOut.jsx` L27-31 (BUG-284: formatAddress dedup)

**Current (L27-31):**
```javascript
const formatAddress = (addr) => {
  if (!addr) return null;
  const parts = [addr.line_1, addr.line_2, addr.city, addr.pin].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};
```

**New (L27-31):**
```javascript
// BUG-284: Include sub_locality + landmark; deduplicate repeated segments (Swiggy sends "Bangalore" in line_1, sub_locality, and city)
const formatAddress = (addr) => {
  if (!addr) return null;
  const parts = [addr.line_1, addr.line_2, addr.sub_locality, addr.landmark, addr.city, addr.pin]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  return parts.length > 0 ? parts.join(', ') : null;
};
```

**Rationale:** Swiggy often sets `line_1`, `sub_locality`, and `city` to the same value. Dedup filter removes duplicates while preserving order. Also adds missing `sub_locality` and `landmark` fields.

#### Edit E3 — `AggregatorOrderPopOut.jsx` after L295 (BUG-282: addon/variation render)

**Current (L291-296):**
```jsx
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {item.categoryName && <span>{item.categoryName}</span>}
                      {item.notes && <span className="text-amber-500 italic">Note: {item.notes}</span>}
                    </div>
```

**New (L291-296 + insert after L295):**
```jsx
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {item.categoryName && <span>{item.categoryName}</span>}
                      {item.notes && <span className="text-amber-500 italic">Note: {item.notes}</span>}
                    </div>
                    {/* BUG-282: Render add-ons */}
                    {item.addOns?.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {item.addOns.map((addon, ai) => (
                          <div key={ai} className="flex items-center gap-1 text-xs text-slate-400 pl-3">
                            <span className="text-slate-300">+</span>
                            <span>{addon.name || addon.addon_name}</span>
                            {addon.price > 0 && <span className="text-slate-300">({formatCurrency(addon.price, currencySymbol)})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* BUG-282: Render variations */}
                    {item.variation?.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {item.variation.map((v, vi) => (
                          <div key={vi} className="text-xs text-slate-400 pl-3 italic">
                            {v.name || 'Variant'}: {v.value || v.label}
                            {v.price > 0 && <span className="text-slate-300 ml-1">({formatCurrency(v.price, currencySymbol)})</span>}
                          </div>
                        ))}
                      </div>
                    )}
```

**Rationale:** Additive render block after item notes. Matches ScanOrderPopOut styling convention (indented, smaller text, muted color). Uses `formatCurrency` already available in scope.

---

### Batch 3: OrderCard + TableCard (BUG-285, CR-120)

#### Edit E4 — `OrderCard.jsx` L1013 (CR-120: KOT only at fOS=1)

**Current (L1013):**
```javascript
              {canPrintBill && (isAggregator ? (fOrderStatus === 1 || fOrderStatus === 2) : !(isDelivery && (fOrderStatus === 2 || fOrderStatus === 5))) && (
```

**New (L1013):**
```javascript
              {/* CR-120: Aggregator KOT only at fOS=1 (preparing), Bill moves to fOS=2 */}
              {canPrintBill && (isAggregator ? (fOrderStatus === 1) : !(isDelivery && (fOrderStatus === 2 || fOrderStatus === 5))) && (
```

#### Edit E5 — `OrderCard.jsx` L1071-1079 (BUG-285: button → text label)

**Current (L1071-1079):**
```jsx
            {isAggregator && fOrderStatus === 2 && (
              <button
                data-testid={`agg-dispatch-btn-${orderId}`}
                className={`min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2`}
                style={{ backgroundColor: `${SOURCE_COLORS[source] || '#FC8019'}15`, color: SOURCE_COLORS[source] || '#FC8019', border: `1px solid ${SOURCE_COLORS[source] || '#FC8019'}` }}
                onClick={(e) => { e.stopPropagation(); onAggregatorDispatch?.(order); }}
              >
                Ready to Dispatch
              </button>
            )}
```

**New (L1071-1079):**
```jsx
            {/* BUG-285: "Ready to Dispatch" as status label, not interactive button */}
            {isAggregator && fOrderStatus === 2 && (
              <span
                data-testid={`agg-dispatch-label-${orderId}`}
                className="min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2"
                style={{ backgroundColor: `${SOURCE_COLORS[source] || '#FC8019'}10`, color: SOURCE_COLORS[source] || '#FC8019' }}
              >
                Ready to Dispatch
              </span>
            )}
```

#### Edit E6 — `OrderCard.jsx` L1082 (CR-120: Bill only at fOS=2)

**Current (L1082):**
```javascript
            {isAggregator && (fOrderStatus === 1 || fOrderStatus === 2) && canPrintBill && (
```

**New (L1082):**
```javascript
            {/* CR-120: Aggregator Bill only at fOS=2 (ready) */}
            {isAggregator && fOrderStatus === 2 && canPrintBill && (
```

#### Edit E7 — `TableCard.jsx` L490-517 (BUG-285 + CR-120: rewrite fOS=2 block)

**Current (L490-517):**
```jsx
                {isAggregator && table.fOrderStatus === 2 && (
                  <>
                    {/* CR-118: KOT reprint for aggregator at Ready */}
                    <IconButton
                      icon={Printer}
                      onClick={(e) => handleAggregatorPrint(e, 'aggr_kot')}
                      backgroundColor={COLORS.borderGray}
                      testId={`agg-kot-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print aggregator KOT`}
                      disabled={isActionInProgress}
                      isLoading={isPrintingKot}
                      LoadingIcon={Loader2}
                    />
                    <TextButton
                      onClick={(e) => { e?.stopPropagation?.(); onAggregatorDispatch?.(table.order || table); }}
                      backgroundColor="#FFF3E8"
                      textColor={COLORS.primaryOrange}
                      borderColor={COLORS.primaryOrange}
                      testId={`agg-dispatch-btn-${table.id}`}
                      ariaLabel={`Ready to dispatch aggregator order`}
                      fullWidth={false}
                      className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                    >
                      Ready to Dispatch
                    </TextButton>
                  </>
                )}
```

**New (L490-517):**
```jsx
                {/* BUG-285 + CR-120: fOS=2 — Bill button replaces KOT; "Ready to Dispatch" becomes status label */}
                {isAggregator && table.fOrderStatus === 2 && (
                  <>
                    {/* CR-120: Bill print at Ready (replaces KOT reprint) */}
                    <IconButton
                      icon={Printer}
                      onClick={(e) => handleAggregatorPrint(e, 'aggr_bill')}
                      backgroundColor="#E8F5E9"
                      textColor={COLORS.primaryGreen}
                      testId={`agg-bill-btn-${table.id}`}
                      title="Print Bill"
                      ariaLabel={`Print aggregator Bill`}
                      disabled={isActionInProgress}
                      isLoading={isPrintingBill}
                      LoadingIcon={Loader2}
                    />
                    {/* BUG-285: Status label, not button */}
                    <span
                      className="flex-1 text-xs py-2 flex items-center justify-center gap-1 font-bold rounded-lg"
                      style={{ backgroundColor: `${SOURCE_COLORS[table.order?.source] || COLORS.primaryOrange}10`, color: SOURCE_COLORS[table.order?.source] || COLORS.primaryOrange }}
                      data-testid={`agg-dispatch-label-${table.id}`}
                    >
                      Ready to Dispatch
                    </span>
                  </>
                )}
```

**Rationale:**
- KOT icon removed from fOS=2 (CR-120: KOT only at fOS=1)
- Bill icon added with green styling matching OrderCard's Bill button pattern
- "Ready to Dispatch" changed from `<TextButton>` to `<span>` (BUG-285: non-interactive label)
- `SOURCE_COLORS` import already available in TableCard (L9)

---

## Verification Matrix

| Edit | File | Change | How to Verify | Automated? |
|:----:|------|--------|---------------|:---:|
| E1 | aggregatorTransform.js:23 | Strip "Order Instructions :::" prefix | Unit: check Zomato note stripped, Swiggy note unchanged, empty after strip → null | NO (manual trace) |
| E2 | AggregatorOrderPopOut.jsx:27-31 | formatAddress dedup + sub_locality + landmark | Browser: Swiggy order shows single "Bangalore" not duplicated | NO |
| E3 | AggregatorOrderPopOut.jsx:~296 | Addon/variation render | Browser: popup shows add-on names/prices under items | NO |
| E4 | OrderCard.jsx:1013 | KOT condition → fOS=1 only | Browser: aggregator fOS=2 order — KOT button NOT shown | NO |
| E5 | OrderCard.jsx:1071-1079 | button → span (status label) | Browser: "Ready to Dispatch" is non-clickable text, no border/hover | NO |
| E6 | OrderCard.jsx:1082 | Bill condition → fOS=2 only | Browser: aggregator fOS=1 order — Bill button NOT shown | NO |
| E7 | TableCard.jsx:490-517 | KOT→Bill, button→label | Browser: fOS=2 card has Bill icon (green) + "Ready to Dispatch" label | NO |

### Regression Checks

| # | What | Why |
|---|------|-----|
| R1 | Non-aggregator orders: KOT, Cancel, Ready, Serve, Bill all still work | Ensure `!isAggregator` paths untouched |
| R2 | Aggregator fOS=1: KOT visible, Mark Ready visible, Bill NOT visible | CR-120 split |
| R3 | Aggregator fOS=2: Bill visible, KOT NOT visible, "Ready to Dispatch" is label | CR-120 + BUG-285 |
| R4 | Popup shows addons/variations for items that have them, nothing extra for items that don't | BUG-282 safety |
| R5 | Zomato order note prefix stripped; Swiggy note unchanged | BUG-283 safety |
| R6 | Address dedup works; Zomato addresses (with distinct fields) unaffected | BUG-284 safety |
| R7 | Webpack compiles with 0 new warnings | Standard |

---

## Post-Code Registry Checklist

The Implementation agent MUST execute after coding:

```
- [ ] registry.json: BUG-282, BUG-283, BUG-284, BUG-285, CR-120 → status: IMPLEMENTED, gate: 5a
- [ ] BUG_TRACKER.md: 4 bug rows updated to IMPLEMENTED
- [ ] CR_REGISTRY.md: CR-120 row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add 4 files with date + IDs
- [ ] Code markers: every modified file has // BUG-XXX or // CR-120 comment
```

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|:----------:|:------:|-----------|
| 1 | Addon render crashes on null/undefined addon fields | LOW | LOW | Null-safe access: `addon.name || addon.addon_name`, `v.price > 0` guard |
| 2 | `SOURCE_COLORS[table.order?.source]` undefined in TableCard | LOW | LOW | Fallback: `|| COLORS.primaryOrange` |
| 3 | KOT button missing at fOS=2 breaks reprint workflow | LOW | MEDIUM | Owner confirmed: KOT at preparing only. If needed later, condition is 1-line revert. |

---

## Summary

| Metric | Value |
|--------|-------|
| Total edits | 7 (E1-E7) |
| Files changed | 4 |
| Lines added | ~55 |
| Lines removed | ~25 |
| Net delta | ~+30 |
| Risk | LOW (all items) |
| Owner decisions blocking | NONE |
| Fast Lane eligible | NO (4 files, >10 lines total) |

**Next: Gate 4 GO → Implementation**
