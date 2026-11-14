# CR-408 — Implementation Plan (Gate 3)
**Date:** 2026-10-11
**Stage:** GATE_3_PLAN_COMPLETE
**Author:** PLANNING agent
**Depends on:** CR-408 Impact Analysis (`impact/CR-408_IMPACT_ANALYSIS.md`)

---

## Entry Verification (Step 0 — pre-code gate)

Before writing a single line of code the Implementation agent MUST run:

```bash
sed -n '880,887p' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
```

Expected output (must match exactly):
```
  // Auto-apply best order-scope coupon when displayedCoupons changes
  // (after initial fetch or after useLoyalty toggle re-filters the list).
  useEffect(() => {
    if (selectedCoupon || couponCode || !displayedCoupons.length) return;
    const best = displayedCoupons.find(c => !c.requiresCartValidation && c.withinWindowNow !== false);
    if (best) runValidate(best.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedCoupons]);
```

If output differs → **STOP. Return to Planning.** Do not proceed.

---

## Scope Lock

| | |
|---|---|
| **Files WILL change** | `src/components/order-entry/CollectPaymentPanel.jsx` |
| **Files WILL NOT touch** | `orderTransform.js` · `couponTransform.js` · `couponService.js` · `CartPanel.jsx` · `OrderEntry.jsx` · `DashboardPage.jsx` · any test file · any socket handler · any other file |

If scope needs to expand beyond this single file for any reason → **STOP. Declare expansion. Get owner approval before continuing.**

---

## Edit

### E-1 — Delete auto-apply useEffect (CollectPaymentPanel.jsx)

**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Lines:** 880–887 (8 lines)
**Action:** Delete the comment + useEffect block entirely

**Current (lines 880–887):**
```javascript
  // Auto-apply best order-scope coupon when displayedCoupons changes
  // (after initial fetch or after useLoyalty toggle re-filters the list).
  useEffect(() => {
    if (selectedCoupon || couponCode || !displayedCoupons.length) return;
    const best = displayedCoupons.find(c => !c.requiresCartValidation && c.withinWindowNow !== false);
    if (best) runValidate(best.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedCoupons]);
```

**Replacement:** *(nothing — the block is removed entirely)*

**Result:** Line 879 (blank) and line 888 (blank) will collapse into a single blank line between the auto-fetch useEffect and the loyalty auto-remove useEffect. No surrounding code changes.

**Code marker to add:** Replace the deleted comment with a single // CR-408 marker on a new line just before the loyalty useEffect (L889), OR insert `// CR-408: auto-apply useEffect removed — cashier must choose coupon` as a one-line comment at the deletion site. Either placement is acceptable; the marker must be present in the file.

Recommended marker placement (after deletion the loyalty block starts at new L880):
```javascript
  // CR-408: auto-apply removed — cashier must choose coupon explicitly.
  // BUG-108 V1B (B-2): auto-remove a non-stackable coupon when cashier
```

---

## Verification Matrix

| Edit | File | Change Description | How to Verify | Automated? |
|------|------|--------------------|---------------|:----------:|
| E-1 | `CollectPaymentPanel.jsx` L880–887 | Auto-apply useEffect deleted; CR-408 marker present | `grep -n "CR-408" CollectPaymentPanel.jsx` → 1 hit; `grep -n "Auto-apply best order-scope coupon" CollectPaymentPanel.jsx` → 0 hits | YES (grep) |
| E-1 compile | `CollectPaymentPanel.jsx` | No new webpack warnings | `yarn start` (dev) or `yarn build` → 0 new warnings | YES (build) |
| E-1 browser | Collect Payment panel | Open panel with coupon-eligible customer → **no coupon auto-applied** on load | Navigate to POS → place order → open Collect Payment with a CRM customer → confirm coupon section shows "Enter code or pick…" with empty state, not a pre-filled coupon | NO (browser) |
| E-1 browser | Collect Payment panel | Focus coupon input → dropdown appears with available coupons | Click into coupon input → confirm CRM coupon list appears | NO (browser) |
| E-1 browser | Collect Payment panel | Type-ahead still works | Type first 2 chars of a known coupon code → confirm auto-complete fires and coupon applies | NO (browser) |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Stale line numbers (another agent touched CPP before implementation) | LOW | Entry Verification check catches this |
| `search_replace` matches wrong block | VERY LOW | old_str is unique (literal comment + useEffect content) |
| Webpack emits new warning for unused variable after deletion | VERY LOW | `displayedCoupons` is still used in 4+ other places in CPP — no orphan |

---

## Execution Sequence

1. Run Entry Verification (`sed -n '880,887p' ...`) — confirm exact match
2. Apply E-1 via `search_replace` tool
3. Run compile check: `yarn build` → 0 new warnings
4. Run V-1 grep check: `grep -c "Auto-apply best order-scope coupon" CollectPaymentPanel.jsx` → must return `0`
5. Run V-2 grep check: `grep -n "CR-408" CollectPaymentPanel.jsx` → must return ≥ 1 hit
6. Browser verification V-3, V-4, V-5 (self-test before QA handover)
7. Execute Post-Code Registry Checklist (Step 5)
8. Write QA Handover doc

---

## Post-Code Registry Checklist (Step 5)

The Implementation agent MUST execute all 5 checks before writing the QA handover:

```
□ 1. registry.json: CR-408 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
□ 2. CR_REGISTRY.md: CR-408 row updated to GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: add entry for CollectPaymentPanel.jsx / CR-408 / L880-887 deleted
□ 4. Code marker: // CR-408 comment present in CollectPaymentPanel.jsx
□ 5. Compile check: yarn build exit 0, 0 new warnings
```

---

## QA Handover Seed

For the QA agent, test cases derived from the Verification Matrix:

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V-1 | Auto-apply removed (code check) | `grep "Auto-apply best order-scope coupon" CollectPaymentPanel.jsx` | 0 results |
| V-2 | CR-408 marker present | `grep -n "CR-408" CollectPaymentPanel.jsx` | ≥ 1 result |
| V-3 | No coupon auto-applied on panel open | Open Collect Payment with CRM customer who has available coupons | Coupon section empty — "Enter code or pick…" placeholder, no coupon badge |
| V-4 | Dropdown still works | Focus coupon input | Dropdown shows available CRM coupons |
| V-5 | Type-ahead still works | Type 2+ chars of a valid coupon code | Auto-complete fires within 500ms; coupon applied |
| V-6 | Manual pick still works | Click a coupon in the dropdown | Coupon validates and applies; discount shows in bill summary |
| V-7 | Pay payload correct (no coupon) | Open panel, do NOT select coupon, press Pay | `coupon_code: ''`, `coupon_discount: 0` in network request |
| V-8 | Pay payload correct (cashier-chosen coupon) | Cashier picks coupon, press Pay | `coupon_code: 'MARRY'`, `coupon_discount: 197` (or correct value) in network request |

---

## Summary

| Field | Value |
|---|---|
| Edits | 1 (E-1) |
| Files changing | 1 (`CollectPaymentPanel.jsx`) |
| Lines deleted | 8 (L880–887) |
| Lines added | 1 (CR-408 marker comment) |
| Net change | −7 lines |
| Owner decisions needed | None |
| Gate 4 GO needed | YES (owner must approve before implementation starts) |
