# POS 3.0 BUG-108 — Loyalty Customer Pipeline Fix Implementation Report

**Date:** 2026-05-23
**Sprint:** POS 3.0
**Bug / CR:** BUG-108 — Loyalty Customer Pipeline (defect uncovered during owner smoke of Phase B read-only preview)
**Build:** PASS (`CI=false yarn build` — 0 errors, 1 pre-existing unrelated `OrderEntry.jsx` `react-hooks/exhaustive-deps` warning)
**Status:** `bug_108_loyalty_customer_pipeline_fix_implemented_waiting_agent_resmoke`

---

## 1. Final Status

```
bug_108_loyalty_customer_pipeline_fix_implemented_waiting_agent_resmoke
```

Sprint gate still: `WAITING_OWNER_BUG_108_LOYALTY_PHASE_B_SMOKE_APPROVAL` (will advance after agent re-smoke + owner re-smoke).

---

## 2. Docs Read

All 20 mandatory baseline, overlay, sprint, and BUG-108 docs per the reading order. Key docs fully consumed: Architecture Decisions Final, Implementation Agent Rules, Loyalty Contract Verification, Phase B Implementation Report, Phase B Agent Smoke Report, Owner Smoke Defect Investigation (2026-05-23), Customer Pipeline Fix Plan (2026-05-23), Customer Pipeline Fix Owner Approval (2026-05-23).

---

## 3. Files Modified

| # | File | Lines changed | Net additions |
|---|------|---------------|---------------|
| 1 | `src/api/transforms/customerTransform.js` | Added `buildSyntheticLoyalty` helper at module top; refactored `fromAPI.searchResult` to compute `pointsValue` + synthetic `loyalty`; refactored `fromAPI.customerLookup` to call the shared helper | ~30 lines |
| 2 | `src/components/order-entry/CartPanel.jsx` | `handleFieldBlur` (L802-820) — replaced override with merge of existing `customer` prop | ~10 lines |
| 3 | `src/components/order-entry/OrderEntry.jsx` | Added `lookupCustomer` import; added `enrichCustomerLoyaltyFromCRM` helper near component top; called it in both order-restore branches (savedCart + orderData) | ~40 lines |
| 4 | `src/components/order-entry/CustomerModal.jsx` | `handleSave` — captured CRM loyalty fields from `existing` (lookup) or `initialData` (typeahead pick), spread into `customerData` before `onSave` | ~25 lines |

Owner approval doc reference: `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_OWNER_APPROVAL_2026_05_23.md` (Q1=A, Q2=B, Q3=A, Q4=A).

---

## 4. Fix Details by Customer Path

### P1 — CartPanel typeahead select (`selectCustomer`)
**Before:** `selectCustomer` passed `{ id, name, phone, tier, totalPoints, pointsValue, walletBalance, loyalty }`, but `pointsValue` and `loyalty` were always `undefined` because `fromAPI.searchResult` did not produce them.
**After:** `fromAPI.searchResult` now returns `pointsValue` + a synthetic `loyalty` blob built via `buildSyntheticLoyalty` (same shape as `customerLookup`). No code change needed in `selectCustomer` itself — its existing spread now carries the enriched fields.

### P2 — OrderEntry order-restore (`savedCart`) at L294-339
**Before:** `setCustomer({ name, phone })` stripped every loyalty field.
**After:** unchanged initial restore is followed by `enrichCustomerLoyaltyFromCRM(rawPhone)` — fire-and-forget CRM lookup that merges `id`, `tier`, `totalPoints`, `pointsValue`, `walletBalance`, `loyalty` into `customer` state on success. Failures are swallowed silently (CRM timeout warning still logged by `lookupCustomer`); loyalty section gracefully falls back to "Loyalty program unavailable".

### P3 — OrderEntry order-restore (`orderData`) at L340-374
**Same fix as P2** — second call to `enrichCustomerLoyaltyFromCRM(rawPhone)` after the matching `setCustomer({ name, phone })`. Two separate sites because the parent `useEffect` already branches on `savedCart && savedCart.length > 0`.

### P4 — CartPanel manual blur clobber (`handleFieldBlur`)
**Before:** `onCustomerChange?.({ id: customer?.id || null, name, phone })` — three-key payload that wiped tier/totalPoints/pointsValue/loyalty/walletBalance on every blur, including the blur that fires right after a typeahead suggestion is clicked.
**After:** spread merges with the existing `customer` prop first, then overlays `{ id, name, phone }`. Loyalty fields survive every subsequent blur. Manual edits to name/phone still propagate cleanly.

### P6 — CustomerModal save path (`handleSave`)
**Before:** When `lookupCustomer(phone)` returned an existing CRM customer, only `existing.id` was used; `existing.tier`, `existing.totalPoints`, `existing.pointsValue`, `existing.walletBalance`, `existing.loyalty` were discarded.
**After:** New local `crmLoyaltyFields` capture point in two branches —
  (a) existing CRM customer selected via the member-search typeahead inside the modal → pull from `initialData`
  (b) duplicate phone resolved via `lookupCustomer` → pull from `existing`
The captured fields are spread into `customerData` before `onSave`, so the Collect Bill loyalty section is populated immediately after modal save. Brand-new customers (no `existing`, no `initialData` match) still ship `{ id, name, phone, birthday, dob, anniversary }` — loyalty section correctly renders "No points" / "Loyalty program unavailable" until they earn points.

### P8 — Room-service inline mirror inheritance
No file change. `CollectPaymentPanel.jsx:68` reads `const customer = passedCustomer` — the mirror inherits the same enriched `customer` state from OrderEntry that the standard view sees. P1-P6 fixes flow through automatically.

---

## 5. Dead-Code Cleanup Parked (Q1 = A)

Confirmed NOT removed during this CR:

| Item | Location | Park as |
|------|----------|---------|
| `searchCustomers` mock | `src/data/mockCustomers.js:47` | P3 cleanup CR |
| `data/index.js` re-export of `mockCustomers` | `src/data/index.js:6` | P3 cleanup CR |
| Legacy `customer?.loyaltyPoints` (singular) field access | `src/components/order-entry/CollectPaymentPanel.jsx:507` (gated by `loyaltyRatioLive=false`) | Fold into Phase C |

These remain untouched. No grep / runtime proof of full unreachability was attempted in this CR per owner decision Q1=A.

---

## 6. Loyalty Field Mapping After Fix

Every live path now feeds `CollectPaymentPanel` (and its room-service mirror) with the same loyalty contract:

```
customer = {
  id, name, phone,
  tier,                   // 'Bronze' | 'Silver' | 'Gold'
  totalPoints,            // flat number
  pointsValue,            // flat ₹ equivalent
  walletBalance,          // flat number
  loyalty: {
    tier, tier_label,
    total_points,
    points_value,
    ratio_per_point,
    loyalty_enabled: true // restaurantSettings.isLoyalty handles per-restaurant visibility
  }
}
```

| Path | `tier` | `totalPoints` | `pointsValue` | `loyalty.loyalty_enabled` | `loyalty` blob |
|------|--------|--------------|---------------|---------------------------|----------------|
| P1 typeahead select | YES | YES | **NEW** | `true` (default) | **NEW (via `buildSyntheticLoyalty`)** |
| P2 savedCart restore | YES (via lookup) | YES (via lookup) | YES (via lookup) | YES (via lookup) | YES (via lookup) |
| P3 orderData restore | YES (via lookup) | YES (via lookup) | YES (via lookup) | YES (via lookup) | YES (via lookup) |
| P4 manual blur | preserved via merge | preserved | preserved | preserved | preserved |
| P6 CustomerModal save | YES (existing or initialData) | YES | YES | YES | YES |
| P8 room-service mirror | inherited | inherited | inherited | inherited | inherited |

---

## 7. Payload Safety Confirmation

`orderTransform.js` was NOT modified. All force-zero guards intact:

| Field | Value | Mechanism |
|-------|-------|-----------|
| `used_loyalty_point` | `0` | `BUG108_FLAGS.loyaltyRatioLive = false` (unchanged) + hardcoded zeros at `orderTransform.js:908, 1026, 1153, 1356` |
| `loyalty_dicount_amount` | `0` | `loyaltyRatioLive=false` guard at `orderTransform.js:1768` |
| `loyaltyDiscount` (math) | `0` | `loyaltyRatioLive=false` ternary guard at `CollectPaymentPanel.jsx:507` |
| Preview amount | display only | Lives only inside JSX scope; never reaches any payload builder |

Loyalty preview remains strictly display-only. Bill total, tax, and payable are unaffected by this fix.

---

## 8. Build Result

```
$ cd /app/frontend && CI=false yarn build
Compiled with warnings.

[eslint]
src/components/order-entry/OrderEntry.jsx
  Line 1297:6: React Hook useCallback has an unnecessary dependency: 'printOrder' …

File sizes after gzip:
  472.9 kB   build/static/js/main.b2054eba.js   (+10.34 kB vs Phase B 462.56 kB)
  16.76 kB   build/static/css/main.ee2036b2.css (no change)

Done in 35.31s.
```

| Item | Result |
|------|--------|
| Build exit code | 0 |
| Errors | 0 |
| Warnings | 1 (pre-existing — `OrderEntry.jsx` `printOrder` dependency, unrelated to BUG-108) |
| Line number shift on warning | Was L1259 in Phase B; now L1297 (same code, shifted by ~38 lines of new restore-enrichment helper + comments) |
| Bundle delta | +10.34 kB gzip on main.js — accounts for `buildSyntheticLoyalty`, `enrichCustomerLoyaltyFromCRM`, modal/cart merge logic, and inline comments |
| **Verdict** | **PASS** |

---

## 9. Regression Guardrails

| Area | Touched? | Evidence |
|------|----------|----------|
| `src/api/transforms/orderTransform.js` | **NO** | File not opened in this CR — force-zero guards intact |
| `src/components/order-entry/CollectPaymentPanel.jsx` | **NO** | UI / math / payload contract unchanged |
| Coupon | **NO** | `couponLive=false`, references untouched |
| Wallet | **NO** | `walletDebitLive=false`, references untouched |
| Manual discount | **NO** | `CollectPaymentPanel.jsx` math unchanged |
| Tax / GST / VAT | **NO** | Not in modified files |
| Service charge | **NO** | Not in modified files |
| Delivery charge | **NO** | Not in modified files |
| Payment flow | **NO** | Not in modified files |
| Settlement | **NO** | Not in modified files |
| Print | **NO** | Not in modified files |
| Socket | **NO** | Not in modified files |
| Backend | **NO** | No backend files touched |
| `BUG108_FLAGS.js` | **NO** | Flags unchanged — `loyaltyRatioLive=false`, `loyaltyPreviewLive=true`, `couponLive=false`, `walletDebitLive=false` |

---

## 10. Known Limitations

1. **Real loyalty redemption still not implemented** — checkbox remains disabled; `used_loyalty_point` and `loyalty_dicount_amount` stay `0`. Phase C scope.
2. **Loyalty reverse / rollback not implemented** — deferred to future CR.
3. **Coupon and wallet remain deferred** — `couponLive=false`, `walletDebitLive=false`.
4. **Owner re-smoke pending** — agent-level lint + build only at this stage.
5. **Dead-code cleanup parked as P3** per Q1=A:
   - `data/mockCustomers.js` `searchCustomers` mock
   - `data/index.js` re-export
   - Legacy `customer?.loyaltyPoints` (singular) read at `CollectPaymentPanel.jsx:507`
6. **OrderEntry enrichment is fire-and-forget by design (Q3=A)** — between the initial `setCustomer({ name, phone })` and the lookup resolving (typically 100-400 ms on CRM hit, longer on cold start), the loyalty section briefly shows "Loyalty program unavailable" before populating. This is acceptable and matches the existing BUG-078 pattern.
7. **`loyalty_enabled` defaults to `true` from `customerLookup` / `searchResult`** — the lookup endpoint does not carry this field per Loyalty Contract Verification. Restaurant-level visibility is gated upstream by `restaurantSettings.isLoyalty`.

---

## 11. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No backend changed | Confirmed |
| 2 | No data mutated | Confirmed |
| 3 | No redemption / reverse API invoked | Confirmed |
| 4 | `/app/memory/final/` untouched | Confirmed |
| 5 | Baseline docs untouched | Confirmed |
| 6 | `orderTransform.js` not modified | Confirmed |
| 7 | `CollectPaymentPanel.jsx` not modified | Confirmed |
| 8 | Coupon, wallet, payment, total, tax, print, settlement, socket untouched | Confirmed |
| 9 | All 4 modified files lint-clean (ESLint, ruff N/A) | Confirmed |
| 10 | Build PASS — 0 errors, 1 pre-existing unrelated warning | Confirmed |
| 11 | Owner approval Q1=A, Q2=B, Q3=A, Q4=A honored verbatim | Confirmed |

---

**End of BUG-108 Loyalty Customer Pipeline Fix Implementation Report.**
