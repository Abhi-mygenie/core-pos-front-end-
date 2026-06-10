# POS 3.0 BUG-108 — CustomerModal Customer-Search Parity Implementation Report

**Date:** 2026-05-23
**Sprint:** POS 3.0
**CR:** BUG-108 CustomerModal Customer-Search Parity (sub-CR of BUG-108 Loyalty Phase B)
**Status:** `bug_108_customer_modal_search_parity_implemented_waiting_agent_smoke`
**Build:** PASS (`CI=false yarn build` → exit 0, 0 errors, 1 pre-existing unrelated warning)

---

## 1. Final Status

```
bug_108_customer_modal_search_parity_implemented_waiting_agent_smoke
```

Sprint parent gate: BUG-108 Loyalty Phase B re-smoke still in progress. This sub-CR closes the last customer-entry path inconsistency.

---

## 2. Docs Read

1. `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_PLAN_2026_05_23.md`
2. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_PLAN_2026_05_23.md`
3. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_OWNER_APPROVAL_2026_05_23.md`
4. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_IMPLEMENTATION_REPORT_2026_05_23.md`
5. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_QA_HANDOFF_2026_05_23.md`
6. `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_AGENT_RESMOKE_REPORT_2026_05_23.md`

Owner approval recorded for this CR: **Q1=A (leave Member ID as-is), Q2=A (match CartPanel behavior exactly).**

---

## 3. Files Modified

| File | Net change |
|------|-----------|
| `src/components/order-entry/CustomerModal.jsx` | +120 lines / -30 lines — added Name/Phone typeahead state + effects + helpers + dropdown JSX; extended outside-click handler; widened `handleSave` to prefer `selectedCRMCustomer` for loyalty source |

No other file touched. `searchCustomers` service and `searchResult` transform reused as-is (already enriched with the synthetic loyalty blob from the Phase B Pipeline Fix).

---

## 4. Name Search Behavior

- Trigger: `useEffect` on `name` (after L52 in new code).
- Threshold: **≥2 characters** (matches CartPanel).
- Gating: `!isCustomerSelected` — dropdown does not re-open after a successful pick.
- API: existing `searchCustomers(name)` from `src/api/services/customerService.js`. No new endpoint.
- Render: floating `<div>` anchored below the Name input via `position: absolute` + parent `relative`. Each row is a `<button data-suggestion-modal="true" onMouseDown={(e) => { e.preventDefault(); selectModalCustomer(c); }}>` that shows `name` (bold) and `phone` (muted) — same visual as CartPanel.
- onFocus re-opens the dropdown if cached suggestions exist and the user has not yet picked.
- Outside-click closes the dropdown (skips when click lands on `data-suggestion-modal="true"`).

## 5. Phone Search Behavior

- Trigger: `useEffect` on `phone`.
- Threshold: **≥3 digits** (matches CartPanel).
- Gating: same `!isCustomerSelected` rule.
- API: same `searchCustomers(phone)`.
- Render: identical dropdown component as Name field, but anchored below the Phone input.
- Phone input retains its existing 10-digit numeric mask (`replace(/\D/g, '').slice(0, 10)`) via new `handlePhoneChange`.
- onFocus and outside-click handling identical to Name field.

## 6. Suggestion Select Behavior (`selectModalCustomer`)

New unified picker used by both Name and Phone dropdowns. Populates:

| Field | Source |
|-------|--------|
| `name` | `c.name` |
| `phone` | `c.phone` |
| `memberId` | `c.id` (keeps Member-ID state in sync; existing branch in `handleSave` still works) |
| `memberSearch` | `c.id` (matches existing Member-ID pick behavior) |
| `isCustomerSelected` | `true` (suppresses re-triggering of either typeahead until cleared) |
| `selectedCRMCustomer` | full `c` object (used by `handleSave`) |
| `showNameSuggestions` / `showPhoneSuggestions` / `showMemberSuggestions` | all closed |

`birthday` and `anniversary` are intentionally **not** auto-filled — the `searchResult` transform does not return these; cashier can edit if needed.

`handleNameChange` and `handlePhoneChange` reset `isCustomerSelected=false` and clear `selectedCRMCustomer` if the user starts editing after a pick — mirrors CartPanel.

## 7. Member ID Handling (per owner Q1=A)

**Left intact.** The Member ID input, its dedicated `searchCustomers` effect, its dropdown, and its `selectMember` helper all remain. The only additive change to `selectMember` is **one extra block**:

```js
setIsCustomerSelected(true);
setSelectedCRMCustomer(member);
```

This unifies all three pick paths (Name typeahead, Phone typeahead, Member ID typeahead) so any of them feeds the same loyalty forward path. UI of the Member ID field is unchanged.

## 8. Loyalty Preservation

`handleSave` now uses a three-tier priority chain when deriving `crmLoyaltyFields`:

| Priority | Source | Triggered by |
|----------|--------|-------------|
| 1 (highest) | `selectedCRMCustomer` | In-modal Name/Phone/Member-ID typeahead pick |
| 2 | `initialData` (when modal opened with a pre-resolved customer and `selectedCRMCustomer` hasn't been set in-modal) | Modal opened from CartPanel typeahead-pick → "Edit details" |
| 3 | `existing` (from `lookupCustomer(phone)`) | Manual phone entry that happens to match a CRM record |

If none of the three resolves, the brand-new-customer create path runs and `crmLoyaltyFields` stays `null` — `customerData` ships with `{ id, name, phone, birthday, dob, anniversary }` only, and CollectPaymentPanel correctly shows "Loyalty program unavailable" for a brand-new record.

Synthetic loyalty blob shape (from `buildSyntheticLoyalty` in `customerTransform.js`) is unchanged:

```
loyalty: {
  tier, tier_label,
  total_points, points_value, ratio_per_point,
  loyalty_enabled: true
}
```

## 9. Build Result

```
$ cd /app/frontend && CI=false yarn build
Compiled with warnings.

[eslint]
src/components/order-entry/OrderEntry.jsx
  Line 1297:6: React Hook useCallback has an unnecessary dependency: 'printOrder' …

File sizes after gzip:
  473.38 kB (+483 B)  build/static/js/main.17ac4eea.js
  16.76 kB            build/static/css/main.ee2036b2.css

Done in 20.58s.
```

| Item | Result |
|------|--------|
| Build exit code | 0 |
| Errors | 0 |
| Warnings | 1 (pre-existing `OrderEntry.jsx:1297` — `printOrder` dependency; unrelated to this CR) |
| Bundle delta | **+483 B gzip** on main.js (state + effects + dropdown JSX + comments) |
| ESLint on `CustomerModal.jsx` | Clean (no new issues) |
| **Verdict** | **PASS** |

## 10. Regression Guardrails

| Area | Touched? | Evidence |
|------|----------|----------|
| `src/api/transforms/orderTransform.js` | **NO** | Force-zero guards (`used_loyalty_point=0`, `loyalty_dicount_amount=0`) at L908/1026/1153/1356/1768 untouched |
| `src/components/order-entry/CollectPaymentPanel.jsx` | **NO** | Loyalty section UI / math / payload contract unchanged |
| `src/api/transforms/customerTransform.js` | **NO** | `searchResult` synthetic loyalty blob already in place from Phase B Pipeline Fix |
| `src/components/order-entry/CartPanel.jsx` | **NO** | Cart typeahead untouched |
| `src/utils/BUG108_FLAGS.js` | **NO** | `loyaltyPreviewLive=true`, `loyaltyRatioLive=false`, `couponLive=false`, `walletDebitLive=false` |
| Coupon / wallet | **NO** | Both still disabled; references untouched |
| Manual discount math | **NO** | `CollectPaymentPanel.jsx:503-505` untouched |
| Tax / GST / VAT / service charge / delivery charge | **NO** | Not in modified file |
| Payment / settlement / print / socket | **NO** | Not in modified file |
| Backend | **NO** | No backend files touched |
| Member ID flow | **PRESERVED** | Existing UI/state/effect intact; only additive `selectedCRMCustomer` capture in `selectMember` |

## 11. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No backend changed | Confirmed |
| 2 | No data mutated | Confirmed |
| 3 | No redemption / reverse API invoked | Confirmed |
| 4 | `/app/memory/final/` untouched | Confirmed |
| 5 | Baseline docs untouched | Confirmed |
| 6 | Only `CustomerModal.jsx` modified | Confirmed |
| 7 | `searchCustomers` and `searchResult` transform reused as-is | Confirmed |
| 8 | Member ID flow preserved per Q1=A | Confirmed |
| 9 | Name/Phone typeahead matches CartPanel behavior (≥2 / ≥3 thresholds, isCustomerSelected gating, onMouseDown+preventDefault pattern, outside-click closer) per Q2=A | Confirmed |
| 10 | Build PASS — 0 errors | Confirmed |

---

**End of BUG-108 CustomerModal Customer-Search Parity Implementation Report.**
