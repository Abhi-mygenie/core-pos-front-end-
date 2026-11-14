# CR-408 — Impact Analysis (Gate 2)
**Date:** 2026-10-11
**Stage:** GATE_2_IMPACT_ANALYSIS
**Author:** PLANNING agent

---

## Code Reality

**FULL** — The auto-apply `useEffect` block at `CollectPaymentPanel.jsx` lines 880–887 (including its preceding comment at L880–881) exists and is active at HEAD.

The fix is a **pure deletion** — no new logic is added.

**Verified at HEAD:** Content matches investigation finding exactly.

```javascript
// L880-887 (exact at HEAD):
  // Auto-apply best order-scope coupon when displayedCoupons changes
  // (after initial fetch or after useLoyalty toggle re-filters the list).
  useEffect(() => {
    if (selectedCoupon || couponCode || !displayedCoupons.length) return;
    const best = displayedCoupons.find(c => !c.requiresCartValidation && c.withinWindowNow !== false);
    if (best) runValidate(best.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedCoupons]);
```

---

## Conflict Pre-Check

**Last modifier of `CollectPaymentPanel.jsx`:** BUG-527 E1–E4 (2026-10-10) + BUG-530 (2026-10-10)

| BUG | Change location | Conflict with L880-887? |
|-----|-----------------|------------------------|
| BUG-527 E1 | L200 (roomBalance useMemo) | None |
| BUG-527 E2 | L1844 (check-in discount JSX) | None |
| BUG-527 E3 | L3318 (split threshold) | None |
| BUG-530 | ~L2885 (split cap) | None |

**Conflict: NONE.** The target lines (880–887) are in an isolated useEffect block that no other recent change has touched.

---

## Data Flow Trace

```
Panel mounts (customer.id present, restaurantSettings.isCoupon=true)
  │
  ├─ [STAYS] useEffect [customer?.id] (L873-878)
  │    → fetchAvailableCoupons() → GET /pos/coupons/available → setAvailableCoupons()
  │    → displayedCoupons useMemo recomputes → list populated in state
  │
  ├─ [DELETE] useEffect [displayedCoupons] (L880-887)        ← REMOVED BY CR-408
  │    → auto-picks best coupon → runValidate(best.code)
  │    → setSelectedCoupon(result) → discount applied silently
  │
  └─ [STAYS] Cashier-initiated paths (all unaffected):
       • Input focus → fetchAvailableCoupons() (L1477, L2128)
       • Cashier types prefix → debounced auto-complete (L986-1005)
       • Cashier clicks coupon from dropdown → onApplyCoupon() (L1015)
       • Cashier clicks "Apply" button → runValidate() (L939-984)
```

**After deletion:** `displayedCoupons` is still populated. Dropdown still shows coupons when cashier focuses the input. Type-ahead auto-complete still works. `selectedCoupon` stays `null` until cashier explicitly acts.

---

## Affected File Analysis

### `CollectPaymentPanel.jsx` (R5 HOTSPOT)

| Consumers of `displayedCoupons` after deletion | Impact |
|---|---|
| L989 debounced type-ahead guard (`displayedCoupons.length === 0`) | None — still valid, still works |
| L1450 dropdown visibility (`displayedCoupons.length > 0`) | None — dropdown still shows when input focused |
| L1502 dropdown `.map()` render | None — list still populated |
| L2108, L2148 inline coupon UI | None — identical pattern, unaffected |

| Consumers of `selectedCoupon` downstream | Impact |
|---|---|
| L621 `couponDiscount` useMemo | Starts at `0` — correct; cashier-applied coupon still sets it |
| L629 `totalDiscount` | `couponDiscount = 0` until cashier chooses — correct |
| L883 guard `if (selectedCoupon … return)` | Deleted with the block — no orphan reference |
| `orderTransform.collectBillNew` Flow 3 | Reads `discounts.couponDiscount` = `0` when no coupon — sends `coupon_code: '', coupon_discount: 0` — **correct** |
| `orderTransform.collectBillExisting` Flow 4 | Same — no regression |

---

## Files That WILL Change

| File | Lines | Change type |
|---|---|---|
| `src/components/order-entry/CollectPaymentPanel.jsx` | 880–887 (8 lines) | DELETE — remove comment + useEffect block |

## Files That WILL NOT Touch

All other files — including but not limited to:
`orderTransform.js` · `couponTransform.js` · `couponService.js` · `CartPanel.jsx` · `OrderEntry.jsx` · `DashboardPage.jsx` · any test file · any socket handler

---

## Risk Classification

**CRITICAL** — `CollectPaymentPanel.jsx` is R5 hotspot + coupon/discount is financial logic.

The change itself is LOW risk (pure deletion of 8 lines in an isolated useEffect). Risk label is CRITICAL because of the file classification, not because of change complexity. Full gate flow required.

---

## Tests

No existing test covers the auto-apply useEffect behavior (confirmed by grep of `__tests__/`). No test needs to be added for a deletion. No existing test is broken.

---

## Owner Decisions

**None.** Scope is fully determined by the investigation + owner direction ("cashier should choose"). No open questions.

---

## Downstream Risk Assessment

**NONE.** After deletion:
1. Cashier opens Collect Payment → no coupon applied → Pay total = pre-coupon amount ✓
2. Cashier focuses coupon input → dropdown shows available coupons ✓
3. Cashier types a prefix → type-ahead auto-complete fires ✓
4. Cashier selects from dropdown → coupon validated and applied ✓
5. Cashier pays → payload carries coupon fields normally ✓

---

## Summary

| Field | Value |
|---|---|
| Code Reality | FULL (block exists, will be deleted) |
| Conflict Pre-Check | NONE |
| Risk | CRITICAL (R5 hotspot) |
| Change complexity | LOW (delete 8 lines, 1 file) |
| Files WILL change | `CollectPaymentPanel.jsx` (L880–887) |
| Files WILL NOT touch | All other files |
| Tests broken | None |
| Tests to add | None |
| Owner decisions needed | None |
| Fast Lane eligible | NO (R5 hotspot) |
| Planning skip eligible | NO (R5 hotspot) |
