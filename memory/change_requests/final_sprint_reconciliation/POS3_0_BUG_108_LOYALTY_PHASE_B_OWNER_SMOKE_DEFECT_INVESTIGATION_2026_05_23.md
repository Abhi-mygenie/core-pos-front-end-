# POS 3.0 BUG-108 — Loyalty Phase B Owner Smoke Defect Investigation

**Date:** 2026-05-23
**Reporter:** Owner (live smoke at restaurant `jehsnest`)
**Reported customer:** `Sapna` · phone `9004020412` · CRM shows **86 points** (Bronze)
**Observed UI:** Loyalty section renders `Loyalty (0 pts)` · `No points` · *"Loyalty program unavailable"*
**Expected UI:** Loyalty section renders `Loyalty (86 pts)` · `Bronze` badge · `₹X available` · helper *"Redemption will be enabled in a future update."*
**Action mode:** **Investigation only. No code changed. No backend changed. No data mutated.**

---

## 1. Summary (TL;DR)

The Loyalty Phase B implementation enriched only **one** of the three code paths that produce the `customer` object reaching `CollectPaymentPanel`. The other two paths still strip loyalty data, and the path that *was* enriched still omits `pointsValue` and the synthetic `loyalty` blob for typeahead search results.

For Sapna, the most likely path on the owner's screen is **path 2 (existing-order re-engage)**, which explains why even the `totalPoints` count came through as `0 pts` instead of `86 pts`.

This is a real gap in the implementation, NOT a CRM data issue. CRM correctly holds 86 points for Sapna (visible in the customers list screenshot).

---

## 2. The Three `customer` Object Paths into `CollectPaymentPanel`

`CollectPaymentPanel.jsx:1036-1041` reads:
```
loyaltyBlob   = customer?.loyalty
hasLoyaltyData = loyaltyPreviewLive && loyaltyBlob && loyaltyBlob.loyalty_enabled !== false
displayPoints = loyaltyBlob?.total_points || customer?.totalPoints || 0
displayValue  = loyaltyBlob?.points_value || customer?.pointsValue   || 0
displayTier   = loyaltyBlob?.tier         || customer?.tier          || ''
```

So the panel needs ONE of: `customer.loyalty` (blob) OR `customer.totalPoints` + `customer.pointsValue` + `customer.tier`. The `hasLoyaltyData` flag requires `customer.loyalty` to be non-null **and** `loyalty_enabled !== false`.

### Path 1 — CartPanel typeahead suggestion click (`selectCustomer`)
File: `src/components/order-entry/CartPanel.jsx:765-773`
```
onCustomerChange?.({ id, name, phone, tier, totalPoints, pointsValue, walletBalance, loyalty })
```
Data source: `searchCustomers()` → `GET /pos/customers?search=` → `fromAPI.searchResult` (customerTransform.js:14-22).

**`searchResult` returns:**
```
{ id, name, phone, tier, totalPoints, walletBalance, lastVisit }
```
**MISSING:** `pointsValue`, `loyalty` blob.

Net effect:
- `customer.loyalty` → **undefined** → `hasLoyaltyData=false`
- `customer.totalPoints` → `86` (would render "86 pts")
- `customer.pointsValue` → undefined → `displayValue=0`
- `customer.tier` → `'Bronze'`
- UI would show: `Loyalty (86 pts) — No points — Loyalty program unavailable` (opacity 0.7, helper = `loyaltyDisabledHelper`).

### Path 2 — Existing order re-engage from a table  ← **most likely cause of Sapna's screenshot**
File: `src/components/order-entry/OrderEntry.jsx:303-311` and `344-350`
```
setCustomer({
  name:  resolvedName,
  phone: rawPhone,
});
```
**MISSING:** `id`, `tier`, `totalPoints`, `pointsValue`, `loyalty` — everything except name and phone.

Net effect:
- `customer.loyalty` → undefined → `hasLoyaltyData=false`
- `customer.totalPoints` → undefined → `displayPoints=0`  ← **matches the "(0 pts)" in the owner screenshot**
- `customer.pointsValue` → undefined → `displayValue=0` → "No points"
- `customer.tier` → undefined → no tier badge
- UI shows: `Loyalty (0 pts) — No points — Loyalty program unavailable` ← **exact match to screenshot**

### Path 3 — Manual entry blur (`handleFieldBlur`)
File: `src/components/order-entry/CartPanel.jsx:802-809`
```
onCustomerChange?.({ id: customer?.id || null, name, phone })
```
Same outcome as Path 2 — loyalty fields absent.

### Path that *would* work but is never invoked from the cart flow
`fromAPI.customerLookup` (customerTransform.js:39-65) DOES build a synthetic `loyalty` blob (the Phase B fix). It is reached only via `lookupCustomer()` → `POST /pos/customer-lookup`. **CartPanel never calls `lookupCustomer`.** The only callers in `src/api/services/customerService.js` are not wired into the CartPanel selection flow.

---

## 3. Why Sapna Specifically Renders "0 pts"

The screenshot shows `Loyalty (0 pts) — No points — Loyalty program unavailable`. The `0 pts` (not `86 pts`) is decisive — it tells us `customer.totalPoints` is also missing, not just `customer.loyalty`.

| Path | `displayPoints` | Matches screenshot? |
|------|---------------|---------------------|
| 1 — typeahead select | 86 | NO (would show "86 pts") |
| 2 — existing-order re-engage | 0 | **YES** |
| 3 — manual blur | 0 | YES (but unlikely since name + phone were already populated from order) |

So the owner most likely opened Sapna's pending/active order from a table, which triggered the `setCustomer({ name, phone })` branch in `OrderEntry.jsx`. That branch was not updated as part of BUG-108 Phase B.

---

## 4. Why the Agent Smoke Did Not Catch This

`POS3_0_BUG_108_LOYALTY_PHASE_B_AGENT_SMOKE_REPORT_2026_05_23.md` §11 limitation 6 explicitly states:
> "Browser smoke limited — test restaurant (`owner@jehsnest.com`) had 'No active orders' and the Order Entry interaction required restaurant-specific menu/table data. Browser smoke DEFERRED to owner smoke (owner has live data). Code-level verification covers all logic paths."

The code-level verification inspected only **CartPanel.selectCustomer** (Path 1) and assumed `customer.loyalty` would be present. It did NOT trace the `setCustomer({ name, phone })` calls in `OrderEntry.jsx` (Path 2) or `handleFieldBlur` (Path 3), nor did it identify that `searchResult` lacks a synthetic loyalty blob.

§13 of the smoke report explicitly recommended the owner **"use their restaurant account with real customer data"** — which is exactly the scenario that surfaced this gap.

---

## 5. Gaps vs. Implementation Report Claims

| Implementation Report Claim | Reality |
|------------------------------|---------|
| §9 Data Pipeline Fix — "GAP-L2 — CRM data is dropped before reaching CollectPaymentPanel" | Fixed **only** for `CartPanel.selectCustomer`. The OrderEntry order-restore branches and `handleFieldBlur` still drop CRM data. |
| §6 Field Mapping — `customer?.loyalty?.tier or customer?.tier` | Works only if at least one of those reached the panel. Path 2 reaches the panel with neither. |
| §11 Limitation 7 — "`loyalty_enabled` from CRM lookup defaults to true" | True for `customerLookup`. But `searchResult` (Path 1) has no `loyalty` blob at all, so `hasLoyaltyData` short-circuits to `false` regardless of `loyalty_enabled`. |
| §10 / Smoke §8 — Payload safety unaffected | Confirmed unaffected — payload-safety guards in `orderTransform.js` are still intact. This defect is **display-only**. |

---

## 6. Scope of the Defect

| Aspect | Impact |
|--------|--------|
| Payload safety (`used_loyalty_point`, `loyalty_dicount_amount`) | **Not impacted** — still zero. Force-zero guards untouched. |
| Bill total / tax / payable | **Not impacted** — preview math is gated by `loyaltyRatioLive=false` regardless. |
| Coupon / wallet / manual discount | **Not impacted** — separate code paths. |
| Loyalty redemption API | **Not impacted** — still not wired. |
| Loyalty preview visibility | **Impacted** — owners selecting a customer via the existing-order path or via typeahead see "Loyalty program unavailable" or "0 pts" instead of the real tier/points/₹ available. |
| Cross-view consistency | The room-service inline mirror reads from the same `customer` object, so the same gap manifests there too. |

**Severity:** P1 cosmetic/feature-visibility defect — the Phase B promise ("show real CRM loyalty data") is not honored for the most common owner scenario (opening an existing order). It does NOT compromise payload safety, totals, or tax. It does NOT block coupon/wallet/manual-discount regression.

---

## 7. Where a Fix Would Live (informational — NOT applied)

Three independent enrichment points. Any subset would partially close the gap; all three together would fully close it.

1. **`src/api/transforms/customerTransform.js` — `searchResult`** (lines 14-22)
   Add `pointsValue` + build the same synthetic `loyalty` blob already used in `customerLookup`, so typeahead suggestions carry loyalty data.

2. **`src/components/order-entry/OrderEntry.jsx`** (lines 303-311 and 344-350)
   When restoring an existing order, fetch enrichment from CRM (`lookupCustomer(phone)` or `getCustomerDetail(id)`) and merge `tier`, `totalPoints`, `pointsValue`, `loyalty` into the `setCustomer({...})` payload. This is the path that produced Sapna's screenshot.

3. **`src/components/order-entry/CartPanel.jsx` — `handleFieldBlur`** (lines 802-809)
   Optional: enrich on blur via `lookupCustomer(phone)` for the manual-entry path.

The implementation report §9 already mentioned `handleFieldBlur` and `handleNameChange` as "unchanged" — they need to either be updated, or a centralized enrichment step needs to be added in `OrderEntry.setCustomer`.

---

## 8. Recommended Owner Verdict

`NEEDS FIX` — per the QA Handoff fail criteria *"Customer with loyalty data shows nothing (blank tier/points/₹ section despite having data)"* — but the fix is scoped to the **customer enrichment pipeline**, not to the loyalty section UI or payload safety.

The remainder of Phase B (payload zero, checkbox disabled, manual-discount/coupon/wallet regression, opacity, helper copy, cap math) is functioning as designed.

---

## 9. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No frontend code changed by this investigation | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No redemption / reverse API invoked | Confirmed |
| 5 | `/app/memory/final/` untouched | Confirmed |
| 6 | Baseline docs untouched | Confirmed |
| 7 | Sprint status NOT advanced — still `WAITING_OWNER_BUG_108_LOYALTY_PHASE_B_SMOKE_APPROVAL` | Confirmed |

---

**End of BUG-108 Loyalty Phase B Owner Smoke Defect Investigation.**
