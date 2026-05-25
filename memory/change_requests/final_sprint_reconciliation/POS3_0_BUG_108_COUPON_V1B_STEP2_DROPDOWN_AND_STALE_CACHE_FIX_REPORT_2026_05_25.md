# POS 3.0 BUG-108 — Coupon V1B Step 2: Dropdown Close + Debounce Guard + Stale Cache Fix Report

**Date:** 2026-05-25
**Status:** `bug_108_coupon_v1b_step2_dropdown_stale_cache_fixes_implemented_build_passing`
**Persona:** Deployment / Implementation Continuation Agent
**Phase:** V1B Step 2 — post-V1B-Step-1 UX fixes (couponLive remains `true`)

---

## 1. Scope Delivered

Three fixes to `CollectPaymentPanel.jsx` addressing owner-reported UX issues during V1B Step 1 live testing.

| Fix | Problem | Root Cause | Change |
|-----|---------|-----------|--------|
| **A** | Dropdown stays open ~1.2s after clicking a coupon row | `handleApplyCoupon` calls async `runValidate` without closing dropdown first; `onBlur` 150ms delay insufficient for perceived UX | Added `setShowCouponDropdown(false)` before `await runValidate` in `handleApplyCoupon` (L903) |
| **B** | Wrong coupon auto-applied (debounce race) — cashier clicks SEED_V1_PCT15 but FLAT100TEST gets applied | 500ms debounce auto-apply fires concurrently with manual click's `runValidate`; second call overwrites first | Added `!couponLoading` guard in debounce auto-apply (L887) — skips if a manual validate is already in flight |
| **C** | Non-stackable coupons shown in dropdown when loyalty is ON | `fetchAvailableCoupons` filters by `useLoyalty` at fetch time, but result is cached; toggling loyalty ON after fetch leaves stale list | Split into `availableCoupons` (raw CRM cache) + `displayedCoupons` (reactive `useMemo` that re-filters on `useLoyalty` / cart changes) |

---

## 2. Approval Gate

| Field | Value |
|-------|-------|
| **Request Summary** | Fix 3 UX bugs in coupon dropdown: (A) close on click, (B) debounce race, (C) stale loyalty filter |
| **Change Type** | Bug fix (UX timing + stale state) |
| **Affected Module(s)** | Order Entry → Collect Payment Panel (coupon section only) |
| **Primary Files Changed** | `CollectPaymentPanel.jsx` (1 file) |
| **Related APIs** | None changed — same `/pos/coupons/available` + `/pos/coupons/validate` |
| **State Impact** | `availableCoupons` now stores unfiltered CRM response; new `displayedCoupons` useMemo derives filtered view. No new state variables added. |
| **UI Impact** | Dropdown closes immediately on click. Non-stackable coupons hidden when loyalty ON. Error text visible after failed validate. |
| **Regression Risks** | LOW — no payload changes, no financial math changes, no new API calls |
| **Open Decision Dependencies** | None |
| **Safe to Implement Without Owner Clarification?** | **Yes** |

---

## 3. File-Level Change Plan

### File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

| Edit | Location | Change | Risk |
|------|----------|--------|------|
| A-1 | `handleApplyCoupon` (~L902-903) | Added `setShowCouponDropdown(false)` before `await runValidate(code)` | LOW |
| B-1 | Debounce auto-apply useEffect (~L887) | Changed `if (best)` to `if (best && !couponLoading)` | LOW |
| C-1 | `fetchAvailableCoupons` (~L707-713) | Removed inline cart+loyalty filter; now stores full sorted CRM response via `setAvailableCoupons(sorted)` | MEDIUM |
| C-2 | New `displayedCoupons` useMemo (~L735-766) | Reactive filter: `useLoyalty` stacking, cart eligibility (food_ids, category_names, bogo/bxg, nth_item). Deps: `[availableCoupons, useLoyalty, billableItems, getCategoryById]` | MEDIUM |
| C-3 | New auto-apply useEffect (~L780-785) | Fires when `displayedCoupons` changes; applies best order-scope in-window coupon. Guards: `couponLive`, no `selectedCoupon`, no `couponCode` | LOW |
| C-4 | Debounce useEffect (~L877, L893) | Reads `displayedCoupons` instead of `availableCoupons` | LOW |
| C-5 | Main dropdown render (~L1301-1353) | Reads `displayedCoupons` instead of `availableCoupons` | LOW |
| C-6 | Inline-mirror dropdown render (~L1905-1945) | Reads `displayedCoupons` instead of `availableCoupons` | LOW |

**`availableCoupons` (raw CRM cache) retained for:**
- State declaration (L278)
- `displayedCoupons` useMemo source (L736-766)
- `runValidate` metadata lookup (L846) — needs full list for manual code entry of filtered-out coupons

**No other files changed.**

---

## 4. Code Evidence (Validated)

| Check | Result |
|-------|--------|
| `setShowCouponDropdown(false)` in `handleApplyCoupon` | ✅ L903 |
| `!couponLoading` guard in debounce | ✅ L887 |
| `displayedCoupons` useMemo with `[availableCoupons, useLoyalty, billableItems, getCategoryById]` deps | ✅ L735-766 |
| Auto-apply useEffect on `[displayedCoupons]` | ✅ L780-785 |
| Main dropdown reads `displayedCoupons` | ✅ L1301, L1302, L1353 |
| Inline-mirror reads `displayedCoupons` | ✅ L1905, L1906, L1945 |
| Debounce reads `displayedCoupons` | ✅ L877, L893 |
| `availableCoupons` only in state decl + useMemo source + runValidate metadata | ✅ L278, L736, L741, L766, L846 |
| `fetchAvailableCoupons` stores unfiltered sorted list | ✅ L711 |
| Build compiles | ✅ 0 errors, 1 pre-existing warning (OrderEntry.jsx:1297) |
| Hot-reload clean | ✅ `webpack compiled with 1 warning` |

---

## 5. Testing Checklist

### Fix A — Dropdown close on click
| Test | Expected |
|------|----------|
| Click a coupon row in dropdown | Dropdown closes immediately (before validate response) |
| Error text renders below input after failed validate | Visible — no dropdown blocking it |
| Apply button click | Dropdown closes immediately |

### Fix B — Debounce race guard
| Test | Expected |
|------|----------|
| Type prefix + click a specific row before 500ms debounce fires | Clicked coupon is the one that gets validated (not debounce's auto-pick) |
| Type prefix + wait 500ms (no click) | Auto-apply fires as before (unchanged behavior) |
| Click row while couponLoading=true from previous action | Row click blocked (existing `!couponLoading` guard on `onMouseDown`) |

### Fix C — Reactive loyalty filter
| Test | Expected |
|------|----------|
| Panel opens with loyalty OFF → focus coupon input | All coupons shown (including non-stackable) |
| Toggle loyalty ON (without re-focusing input) | Non-stackable coupons instantly disappear from dropdown |
| Toggle loyalty OFF again | Non-stackable coupons instantly reappear |
| Panel opens with loyalty already ON → focus coupon input | Non-stackable coupons never shown |
| No extra `/available` network call on loyalty toggle | ✅ Only `useMemo` re-filters client-side |

### Regression
| Test | Expected |
|------|----------|
| Manual discount ↔ coupon mutex (Q10) | Unchanged |
| Outside-window coupons greyed | Unchanged |
| Applied coupon chip + Remove | Unchanged |
| Error code mapping (all 27 codes) | Unchanged |
| Print payload `coupon_discount` | Unchanged |
| Flow 3/4 commit payloads | Unchanged |
| Loyalty Phase C max-redeemable | Unchanged |
| QSR coupon-free (Owner Q4=A) | Unchanged |

---

## 6. Items NOT Changed

- `orderTransform.js` — no payload edits
- `couponService.js` — no API changes
- `couponTransform.js` — no transform changes
- `BUG108_FLAGS.js` — `couponLive` remains `true`
- `CartPanel.jsx` — QSR unchanged
- `OrderEntry.jsx` — B-1 cashier-cancel toast still deferred
- `/app/memory/final/*` — untouched
- All earlier V1B docs — untouched (forward-only)
- Backend / CRM — zero mutations

---

## 7. Deferred Items (Carried Forward from V1B Step 1)

| Item | Status |
|------|--------|
| B-1 cashier-cancel warning toast (OrderEntry.jsx) | **Closed — not applicable.** No UI path exists for post-commit cancel in current architecture. After payment success (`collectBillExisting` / `placeOrderWithPayment`), OrderEntry navigates away via `onClose()`. Cancel Order is only available on unpaid orders. CRM has no reversal endpoint (Phase 2 deliverable). Never implemented across 4 agent passes — spec-only item. Re-evaluate if CRM ships reversal API. |
| V1 closure (Step 4): remove `couponLive` constant + dead-code | **DONE (2026-05-25).** Removed `couponLive` from `BUG108_FLAGS.js`, removed `couponDisabledHelper` copy, removed all `couponLive` ternaries from `orderTransform.js` (Flows 3/4/Print — now unconditional), removed all `couponLive` guards from `CollectPaymentPanel.jsx` (math, fetchAvailable, debounce, handleApply, dropdown, discount mutex). Coupon module now gated only by `restaurantSettings.isCoupon`. |
| V2: `posCartItem` mapper + `categoryId` in orderItem + items[] | **Unblocked — POS BE + CRM confirmed items[] mapping working (owner confirmed 2026-05-25).** Ready for implementation. |
| V3-B+C: BOGO/BXG/Nth UI + error codes + benefit_items | Blocked on V2 |

---

## 8. Rollback

All 3 fixes are contained in `CollectPaymentPanel.jsx`. Revert via:
```bash
git checkout HEAD -- frontend/src/components/order-entry/CollectPaymentPanel.jsx
```
Or single-fix revert:
- **Fix A:** Remove `setShowCouponDropdown(false)` from `handleApplyCoupon`
- **Fix B:** Change `if (best && !couponLoading)` back to `if (best)`
- **Fix C:** Move the filter logic back into `fetchAvailableCoupons`, remove `displayedCoupons` useMemo, revert all `displayedCoupons` reads back to `availableCoupons`

`couponLive` flag flip to `false` remains the nuclear rollback for the entire coupon module.

---

## 9. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No backend code changed | ✅ |
| 2 | No CRM code changed | ✅ |
| 3 | No data mutated | ✅ |
| 4 | No mutating API called | ✅ |
| 5 | `/app/memory/final/` untouched | ✅ |
| 6 | Baseline docs untouched | ✅ |
| 7 | Earlier V1B docs untouched (forward-only) | ✅ |
| 8 | Build passes (0 errors, 1 pre-existing warning) | ✅ |
| 9 | All code evidence validated via grep before doc creation | ✅ |
| 10 | No payload / financial / API contract changes | ✅ |

---

**End of BUG-108 Coupon V1B Step 2 Fix Report.**
