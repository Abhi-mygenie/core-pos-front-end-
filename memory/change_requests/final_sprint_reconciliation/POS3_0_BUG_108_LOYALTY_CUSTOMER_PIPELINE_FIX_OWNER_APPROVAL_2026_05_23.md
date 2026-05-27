# POS 3.0 BUG-108 — Loyalty Customer Pipeline Fix — Owner Approval Capture

**Date:** 2026-05-23
**Status:** `bug_108_loyalty_customer_pipeline_fix_owner_approved_ready_for_implementation`
**Pairs with:** `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_PLAN_2026_05_23.md`

---

## 1. Status

```
bug_108_loyalty_customer_pipeline_fix_owner_approved_ready_for_implementation
```

Sprint gate: `WAITING_OWNER_BUG_108_LOYALTY_PHASE_B_SMOKE_APPROVAL` (defect path; will advance to re-smoke after implementation).

---

## 2. Owner Decisions (recorded verbatim)

| Q | Answer | Meaning |
|---|--------|---------|
| **Q1 — Dead / legacy branches** | **A** | Do NOT remove dead branches in this CR. Park as P3 cleanup. Keeps diff minimal. |
| **Q2 — Fix strategy** | **B** | Shared helper normalization. Apply Option A + B + C + light D — extract `buildSyntheticLoyalty` helper inside `customerTransform.js`. |
| **Q3 — OrderEntry order-restore enrichment** | **A** | Fire-and-forget `lookupCustomer(phone)` in both restore branches; re-`setCustomer` with merged loyalty on success; swallow errors silently (BUG-078 CRM-timeout pattern). |
| **Q4 — CustomerModal `existing` loyalty propagation** | **A** | When `handleSave` finds an existing CRM customer via `lookupCustomer`, copy `tier`, `totalPoints`, `pointsValue`, `walletBalance`, `loyalty` from `existing` into the `onSave` payload. |

Owner clarification on Q4 (recorded): customer details are captured on the order screen (CartPanel inline name + phone) AND in the full CustomerModal pop-up. Loyalty info must show on the Collect Bill screen regardless of which entry path was used. Q4=A ensures the modal path is consistent with the cart path.

---

## 3. Approved Implementation Scope (4 files, surgical edits)

| # | File | Function / Section | Change |
|---|------|--------------------|--------|
| 1 | `src/api/transforms/customerTransform.js` | Extract new `buildSyntheticLoyalty({ tier, totalPoints, pointsValue })` helper at module top. Update `fromAPI.searchResult` (L14-22) to additionally return `pointsValue` and `loyalty: buildSyntheticLoyalty(...)`. Refactor `fromAPI.customerLookup` (L57-64) to call the same helper. | Single source of truth for the synthetic blob shape. |
| 2 | `src/components/order-entry/CartPanel.jsx` | `handleFieldBlur` (L802-809) | Change OVERRIDE to MERGE: `onCustomerChange?.({ ...customer, id: customer?.id ?? null, name: customerName.trim(), phone: customerPhone.trim() })`. Preserves loyalty fields established by `selectCustomer`. |
| 3 | `src/components/order-entry/OrderEntry.jsx` | Order-restore branches (L303-311 and L344-350) | After `setCustomer({ name: resolvedName, phone: rawPhone })`, fire `lookupCustomer(rawPhone).then(enriched => enriched && setCustomer(prev => ({ ...prev, id: enriched.id, tier: enriched.tier, totalPoints: enriched.totalPoints, pointsValue: enriched.pointsValue, walletBalance: enriched.walletBalance, loyalty: enriched.loyalty })))`. Swallow errors silently — `lookupCustomer` already handles CRM timeout per BUG-078. |
| 4 | `src/components/order-entry/CustomerModal.jsx` | `handleSave` — the `if (existing)` branch (L93-117) and the final `customerData` build (L120-129) | When `existing` is truthy, propagate `tier`, `totalPoints`, `pointsValue`, `walletBalance`, `loyalty` from `existing` into `customerData` before `onSave(customerData)`. New-customer branch unchanged. |

---

## 4. Hard Boundary (Non-Scope)

- No `orderTransform.js` changes — force-zero guards intact.
- No `CollectPaymentPanel.jsx` changes.
- No coupon, wallet, payment, total, tax, service charge, delivery charge, settlement, print, socket, or backend changes.
- No new feature flag, no flag flips (`loyaltyRatioLive` stays `false`, `loyaltyPreviewLive` stays `true`).
- No dead-code removal (`mockCustomers`, legacy `loyaltyPoints` access at `CollectPaymentPanel.jsx:507`) — parked as P3.
- No `/app/memory/final/` updates.
- No baseline doc updates.

---

## 5. Loyalty Object Contract (the shape every `setCustomer` callsite must preserve post-fix)

```
{
  id, name, phone,
  tier,                  // 'Bronze' | 'Silver' | 'Gold'
  totalPoints,           // flat
  pointsValue,           // flat ₹ equivalent
  walletBalance,         // flat
  loyalty: {
    tier, tier_label,
    total_points, points_value, ratio_per_point,
    loyalty_enabled: true   // defaults true; restaurantSettings.isLoyalty handles visibility
  }
}
```

---

## 6. Post-Fix QA Plan

Use the 16-scenario QA matrix from §11 of the Plan doc. Key scenarios:

- Sapna (9004020412) re-engage from table → loyalty populated.
- Sapna fresh typeahead pick → loyalty populated AND survives subsequent blur.
- Sapna manual blur without picking suggestion → enrichment via OrderEntry path or graceful fallback.
- CustomerModal save on a phone that already exists in CRM → loyalty populated immediately.
- Anonymous / `loyalty_enabled=false` / 0-points customer → graceful fallback (no crash).
- Grand total, tax, payable unchanged.
- Coupon + wallet still disabled.
- Manual discount still works; `₹ available` recalculates to capped value.
- Place / settle / print payloads: `used_loyalty_point=0`, `loyalty_dicount_amount=0` (unchanged).
- No new loyalty redemption / reverse API calls.

---

## 7. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No frontend code changed by this approval capture | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No redemption / reverse API invoked | Confirmed |
| 5 | `/app/memory/final/` untouched | Confirmed |
| 6 | Baseline docs untouched | Confirmed |
| 7 | All 4 owner answers captured verbatim above | Confirmed |
| 8 | Plan doc unchanged; this file is the approval addendum | Confirmed |

---

**End of Owner Approval Capture. Ready for implementation agent.**
