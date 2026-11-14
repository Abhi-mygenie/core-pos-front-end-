# BUG-593 — Impact Analysis Rev 2 (Gate 2)

**ID:** BUG-593
**Date:** 2026-10-22
**Supersedes:** `impact/BUG-593_IMPACT_ANALYSIS.md` (Rev 1 — create path hypothesis)
**Code Reality:** CONFIRMED — root cause reproduced with owner
**Risk:** HIGH (data corruption — existing customer names overwritten to "Noname")
**Conflict Pre-Check:** CLEAN

---

## 1. Root Cause — Confirmed & Reproduced

When a cashier re-opens an existing order for collect-bill, the customer name is lost because:

1. Backend `employee-orders-list` returns `user_name: ""` for the order (doesn't persist cust_name)
2. OrderEntry sets `customer.name = ""` from the empty `user_name`
3. `enrichCustomerLoyaltyFromCRM()` fires CRM lookup → gets `"abhishek jain"` back
4. **BUT the enrichment function only merges `id, tier, points, wallet, loyalty` — NOT `name`**
5. `customer.name` stays as `""`
6. Cashier clicks Collect Bill → `collectBillExisting` sends `cust_name: ""`
7. Backend settlement endpoint syncs `cust_name: ""` to CRM
8. CRM overwrites existing name → `"Noname"`

## 2. Live Probe Evidence (2026-10-22)

### API Probes on preprod (Cafe103, restaurant 667, customer 7505242126 "abhishek jain"):

| # | Test | CRM name after | Verdict |
|---|------|:---:|:---:|
| 1 | CRM `POST /pos/customers` with `name=""` + existing phone | `"abhishek jain"` ✅ | Safe — CRM rejects upsert |
| 2 | CRM `PUT /pos/customers/{id}` with `name=""` | `""` ❌ | CRM accepts empty name overwrite |
| 3 | CRM `PUT` with `name=" "` (whitespace) | `" "` ⚠️ | Whitespace passes JS `if(name)` guard |
| 4 | Place-order with `cust_name=""` | `"abhishek jain"` ✅ | Place-order does NOT sync to CRM |
| 5 | **Settlement with `cust_name=""`** | **`"Noname"` ❌** | **Settlement syncs empty name to CRM** |

### UI Reproduction (owner-confirmed):
- Login Cafe103 → place order with phone 7505242126 → re-open table for edit/collect-bill
- Screenshot shows: phone `7505242126` present, **"Customer name" field is EMPTY**
- CRM has `"abhishek jain"` but name not merged into customer state

## 3. The Gap — `enrichCustomerLoyaltyFromCRM` (OrderEntry.jsx L244-252)

```js
// CURRENT (L244-252):
setCustomer((prev) => ({
  ...(prev || {}),
  id:            enriched.id || prev?.id || null,
  tier:          enriched.tier ?? prev?.tier,
  totalPoints:   enriched.totalPoints ?? prev?.totalPoints,
  pointsValue:   enriched.pointsValue ?? prev?.pointsValue,
  walletBalance: enriched.walletBalance ?? prev?.walletBalance,
  loyalty:       enriched.loyalty ?? prev?.loyalty,
  // ❌ MISSING: name not merged — enriched.name is available but dropped
}));
```

`enriched.name` IS available — `customerLookup` transform (L89) returns `name: (api.name || '').trim()`. It's just never used in the merge.

## 4. Proposed Fix

### FE Fix (primary — 1 line):

Add `name` merge to enrichment function:

```js
setCustomer((prev) => ({
  ...(prev || {}),
  name:          enriched.name || prev?.name,  // BUG-593: merge CRM name
  id:            enriched.id || prev?.id || null,
  tier:          enriched.tier ?? prev?.tier,
  ...
}));
```

This ensures:
- If CRM returns a name → it's merged into customer state → collect-bill sends correct name
- If CRM returns empty name → falls back to whatever was in prev (from order data)
- If both are empty → stays empty (no regression)

### Backend Fix (defensive — separate task):

Settlement endpoint should not sync empty `cust_name` to CRM. Skip CRM name update when `cust_name` is blank/empty.

## 5. Files Affected

| # | File | Line | Change |
|---|------|:---:|--------|
| 1 | `OrderEntry.jsx` | L244-252 | Add `name: enriched.name \|\| prev?.name` to enrichment merge |

**Files WILL NOT touch:** `customerTransform.js`, `customerService.js`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`

## 6. Verification Matrix

| # | What to Verify | Method |
|---|---------------|--------|
| V-1 | Re-open existing order with known customer → name field shows CRM name | Browser |
| V-2 | Collect bill after re-open → CRM name NOT wiped | CRM lookup after settlement |
| V-3 | New order with customer → name still works normally | Browser |
| V-4 | Order without customer → no regression (name stays empty) | Browser |
| V-5 | webpack 0 new warnings | Dev server log |

## 7. Scope Lock

**Files WILL change:** `OrderEntry.jsx` (1 line addition)
**Files WILL NOT touch:** Everything else
**Blockers:** NONE — root cause confirmed, fix is clear, owner-reproduced
