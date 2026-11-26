# BUG-683 — Impact Analysis (Gate 2)

**Date:** 2026-11-18
**Agent:** PLANNING (Gate 2 — Impact Analysis only)
**Code Reality:** PARTIAL — BUG-647 added the `applyTaxFlags` plumbing + `calcOrderTotals` zeroing. But the VAT path was never properly connected because the source field (`vat_info.status`) was never read from the profile API. Additionally, two cart-builder functions overwrite the tax-zeroing work.
**Conflict Pre-Check:** BUG-647 (same files, same sprint — RELATED, not conflicting. BUG-683 completes what BUG-647 started). BUG-678 (same OrderEntry.jsx — no overlap on specific lines). BUG-684 (same OrderEntry.jsx L1192 area — no overlap).
**Risk:** CRITICAL (tax, billing, settlement — R5 + R6)

---

## Plain English Summary

### What's the problem?

Every restaurant in MyGenie has two tax switches: **GST** and **VAT**. When the owner turns a switch OFF, that tax should be zero everywhere — on screen, in the numbers sent to the server, and in reports.

A previous fix (BUG-647) made GST work correctly when turned OFF. But it **forgot to connect the VAT switch**. The app literally never reads the VAT switch from the server, so it doesn't know whether VAT is on or off. It just assumes VAT is always on.

This causes three confusing things to happen at the same time:

1. **The Collect Payment screen always shows VAT** (even when VAT is off) — the cashier sees a tax line that shouldn't be there.
2. **The Cart screen never shows VAT** (even when VAT is on) — the opposite problem, caused by the same missing data being interpreted differently.
3. **The numbers sent to the server include VAT** (even when VAT is off) — so the backend records more money than the customer actually owes.

On top of that, when a prepaid order is placed (the "pay first, eat later" flow), there's a second bug: the code rewrites each item's tax amount from scratch and throws away the "make it zero" work, so even GST leaks through in the per-item data on that path.

### Who is affected?

Every restaurant that has VAT-type food items. The two bar items in the owner's test (₹350 each, VAT 22%) added ₹154 of phantom tax to a ₹1,144 order that should have been ₹990.

### What needs to change?

Five files need edits. In plain terms:

1. **Read the VAT switch** — one line in the file that reads the restaurant's profile from the server. This is the root fix.
2. **Point to the right place** — ten spots in the ordering code that look for the VAT switch in the wrong location. Change the address they look at.
3. **Add a VAT skip** — one spot in the payment screen that skips GST when GST is off, but forgot to do the same for VAT.
4. **Stop the tax rewrite** — two spots where the code rewrites each item's tax from scratch and throws away the "make it zero" work. Add a "is this tax actually on?" check before writing.
5. **Gate the display** — one spot where Service Charge GST is shown on screen even when GST is off (the number sent to the server IS correctly zero — this is a screen-only mismatch).

---

## Data Flow Trace

```
SERVER (profile API)
  └─ vat_info.status: true/false         ← EXISTS in API, confirmed on Mantri
       │
       ▼
profileTransform.js  L177-188
  └─ tax: { gstStatus: api.gst_status }  ← GST extracted ✅
     (NO vatStatus)                       ← VAT MISSING ❌  ── ROOT CAUSE
       │
       ▼
RestaurantContext
  └─ restaurant.tax.gstStatus = true/false     ← works
     restaurant.settings.vatEnabled = undefined ← always undefined
       │
       ├──────────────────────────────┐
       ▼                              ▼
  OrderEntry.jsx                 CartPanel.jsx
  (10 sites)                     (2 sites)
  vatEnabled: undefined!==false   !undefined = true
  = TRUE                         → SKIP VAT
  → "VAT is ON"                  → "VAT is OFF"
       │                              │
       ▼                              ▼
  PAYLOAD: vat always sent       DISPLAY: vat always hidden
       │                         (even when VAT SHOULD be on)
       ▼
  orderTransform.js
  calcOrderTotals: vatEnabled=true → vat NOT zeroed
  applyTaxFlags:   vatEnabled=true → item vat NOT zeroed
       │
       ▼
  BUT: placeOrderWithPayment L1351 + collectBillExisting L1683
       OVERWRITE item tax without checking flags
       → even GST leaks at per-item level on these paths
       │
       ▼
  CollectPaymentPanel.jsx L337
  NO vatStatus check at all
  → VAT always displayed + passed to payment payload
```

---

## Affected Files, Lines, and Edits

### Edit 1 — profileTransform.js (ROOT FIX) — 2 sub-edits
**What:** Add `vatStatus` to the `tax` block.
**PROBE RESULT (OD-683-01 RESOLVED):** `vat_info` is at the TOP LEVEL of the profile response (sibling of `restaurants[]`), NOT inside `restaurants[0]`. Field shape: `{ "status": true|false, "code": "..." }`. `status` is a **boolean**.

**E1a — L79 (call site):** Add `api.vat_info` as 5th argument to `fromAPI.restaurant()`:
```javascript
// FROM:
restaurant: fromAPI.restaurant(api.restaurants?.[0], api.print_agent, api.restaurant_discount_type, api.payment_types),
// TO:
restaurant: fromAPI.restaurant(api.restaurants?.[0], api.print_agent, api.restaurant_discount_type, api.payment_types, api.vat_info),
```

**E1b — L108 (function signature):** Add `vatInfo` parameter:
```javascript
// FROM:
restaurant: (api, printAgent, discountTypesOverride, paymentTypesOverride) => {
// TO:
restaurant: (api, printAgent, discountTypesOverride, paymentTypesOverride, vatInfo) => {
```

**E1c — L187 area (tax block):** Add `vatStatus`:
```javascript
gstStatus: api.gst_status === true,
vatStatus: vatInfo?.status === true,  // BUG-683: top-level vat_info.status (boolean)
```

**Risk:** LOW — additive field, no existing logic changed. Mirrors existing `printAgent`/`paymentTypes` pass-through pattern.
**Downstream:** Every component that reads `restaurant.tax.vatStatus`

### Edit 2 — OrderEntry.jsx (10 property-path corrections)
**What:** Change `restaurant?.settings?.vatEnabled !== false` → `restaurant?.tax?.vatStatus !== false` at all taxFlags sites. Change `!restaurant?.settings?.vatEnabled` → `restaurant?.tax?.vatStatus === false` at localTax/unplacedTax sites.
**Where:**
| Sub-edit | Line | Context |
|----------|------|---------|
| E2a | L1339 | placeOrder taxFlags |
| E2b | L1402 | placeOrder alternate taxFlags |
| E2c | L1736 | placeOrderWithPayment (QSR prepaid) taxFlags |
| E2d | L1886 | collectBillExisting (QSR edge) taxFlags |
| E2e | L2515 | collectBillExisting (Scenario 2 prepaid) taxFlags |
| E2f | L2619 | collectBillExisting (postpaid) taxFlags |
| E2g | L1152 | localTax (cart button — pre-place display) |
| E2h | L1167 | unplacedTax (cart button — added-items display) |
| E2i | L455 (dep) | CartPanel.jsx useMemo dependency |
| E2j | L434 | CartPanel.jsx taxTotals VAT skip |

**Risk:** LOW per edit (property path change, same intent). HIGH collectively (10 sites in R5 hotspot).
**Note:** E2g and E2h also fix the INVERTED cart-button display (Gap 3-4 from investigation). Currently `!undefined = true` → always skips VAT. After fix: `restaurant?.tax?.vatStatus === false` → skips only when genuinely OFF.

### Edit 3 — CartPanel.jsx (2 fixes, bundled with Edit 2)
**What:** Change `!restaurant?.settings?.vatEnabled` → `restaurant?.tax?.vatStatus === false` at L434. Update useMemo dependency at L455.
**Where:** L434, L455
**Risk:** MEDIUM — R5-adjacent display logic. Financial display (CartPanel tax line).

### Edit 4 — CollectPaymentPanel.jsx (VAT skip check)
**What:** Add `if (taxType === 'VAT' && restaurant?.tax?.vatStatus === false) return;` after L337, mirroring the GST skip at L321.
**Where:** L337 (inside the `taxTotals` forEach)
**Risk:** MEDIUM — R5 hotspot, financial display. But mirrors an existing, proven pattern (GST skip at L321).
**Downstream:** `vat` variable → feeds `rawFinalTotal` → feeds `paymentData.printVatTax` → feeds `collectBillExisting` payload `vat_tax` field.

### Edit 5 — orderTransform.js placeOrderWithPayment cart builder (per-item tax flag check)
**What:** Change L1351-1352 to respect `gstEnabled`/`vatEnabled`:
```
FROM: gst_amount: String((isGst ? newTax : 0).toFixed(2))
TO:   gst_amount: String((isGst && gstEnabled ? newTax : 0).toFixed(2))

FROM: vat_amount: String((!isGst ? newTax : 0).toFixed(2))
TO:   vat_amount: String((!isGst && vatEnabled ? newTax : 0).toFixed(2))
```
**Where:** L1351-1352 (placeOrderWithPayment cart builder)
**Prerequisite:** Extract `gstEnabled`/`vatEnabled` from `taxFlags` at the top of the function scope (add `const { gstEnabled = true, vatEnabled = true } = taxFlags;` near L1315).
**Risk:** MEDIUM — R5 hotspot, financial payload. But mirrors the existing pattern in `applyTaxFlags` (L806-807).

### Edit 6 — orderTransform.js collectBillExisting discount branch (per-item tax flag check)
**What:** Same pattern as Edit 5, applied to L1683-1684.
```
FROM: gst_amount: String((isGst ? newTax : 0).toFixed(2))
TO:   gst_amount: String((isGst && gstEnabled ? newTax : 0).toFixed(2))

FROM: vat_amount: String((!isGst ? newTax : 0).toFixed(2))
TO:   vat_amount: String((!isGst && vatEnabled ? newTax : 0).toFixed(2))
```
**Where:** L1683-1684 (collectBillExisting food_detail discount recomputation)
**Note:** `gstEnabled`/`vatEnabled` already extracted at L1585.
**Risk:** MEDIUM — R5 hotspot, financial payload. Same proven pattern.

### Edit 7 — CollectPaymentPanel.jsx SC/Tip/Delivery GST display gate
**What:** Gate `scGst`, `tipGst`, `deliveryGst` on `restaurant?.tax?.gstStatus !== false`:
```
FROM: const scGst = serviceCharge * scTaxRate;
TO:   const scGst = restaurant?.tax?.gstStatus !== false ? serviceCharge * scTaxRate : 0;
(same for tipGst, deliveryGst)
```
**Where:** L822-824
**Risk:** LOW-MEDIUM — display-only change, payload already correctly zeroed by `calcOrderTotals`. Fixes a cosmetic display-payload mismatch visible only for restaurants with SC GST configured + GST OFF.

---

## Files WILL Change

| # | File | Edits | Hotspot? |
|---|------|-------|----------|
| 1 | `src/api/transforms/profileTransform.js` | E1 (1 line) | No |
| 2 | `src/components/order-entry/OrderEntry.jsx` | E2a-h (8 sites) | YES (R5) |
| 3 | `src/components/order-entry/CartPanel.jsx` | E3 (2 sites) | No (R5-adjacent) |
| 4 | `src/components/order-entry/CollectPaymentPanel.jsx` | E4 + E7 (2 edits) | YES (R5) |
| 5 | `src/api/transforms/orderTransform.js` | E5 + E6 (4 lines) | YES (R5) |

## Files WILL NOT Touch

- `DashboardPage.jsx`, `RestaurantSettingsPage.jsx`, `restaurantSettingsTransform.js`
- Any context, service, hook, or utility file
- Any CSS, config, or test file
- Backend (all fixes are frontend)

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | `vat_info.status` field shape unknown — boolean? int? string? | Probe Mantri + BeanMeUp profile API before coding. OD-683-01. |
| R2 | 10 edits in OrderEntry.jsx (R5 hotspot) | All are identical property-path swaps. No logic change. Self-test each. |
| R3 | CartPanel VAT display will CHANGE for VAT-ON restaurants | Currently always hidden (bug). After fix: shown when VAT is ON. This is correct behavior. Verify with a VAT-ON restaurant. |
| R4 | Per-item tax in placeOrderWithPayment/collectBillExisting affects backend accounting | Backend may use per-item gst_amount/vat_amount for reports. Zeroing them is the correct fix — matches the order-level totals. |
| R5 | Interaction with BUG-678 (SC prepaid) — same CPP file | No line overlap. BUG-678 touches L470-474 (SC init). BUG-683 E4 touches L337 (VAT skip) and E7 touches L822 (SC GST display). Safe to implement in parallel. |
| R6 | Interaction with BUG-684 (round-off) — same OrderEntry.jsx file | No line overlap. BUG-684 touches L1192-1196 (applyRoundOff helper). BUG-683 touches L1152/L1167 (localTax) and taxFlags sites. Safe in parallel. |

---

## Open Decisions for Owner

| # | Question | Recommended | Impact |
|---|----------|-------------|--------|
| OD-683-01 | ~~What is the exact shape of `vat_info.status`?~~ | **RESOLVED** — Boolean at TOP LEVEL of profile response (`data.vat_info.status`). Not inside `restaurants[0]`. Must be passed as 5th param to `fromAPI.restaurant()`. | Edit 1 updated with 3 sub-edits (E1a call site, E1b signature, E1c tax block) |
| OD-683-02 | Should Edit 7 (CPP SC GST display gate) be in BUG-683 scope? | YES — it's a 1-line mirror of the same pattern, same CPP file, same session. Cleaner than a separate item. | Adds 3 lines to scope |
| OD-683-03 | Should BUG-678 (SC prepaid default) be fixed in the same session? | Owner's call — separate item already registered, but same CPP file. | Adds 1 line if YES |

---

## Verification Matrix (seeds QA handover)

| # | Edit | File | How to Verify | Automated? |
|---|------|------|--------------|:---:|
| V1 | E1 | profileTransform.js | Login → check `restaurant.tax.vatStatus` in React DevTools | NO |
| V2 | E2a-f | OrderEntry.jsx (taxFlags) | Place order with VAT OFF → payload `vat_tax: 0` + per-item `vat_amount: "0.00"` | NO |
| V3 | E2g-h | OrderEntry.jsx (localTax) | VAT OFF: cart button = no VAT. VAT ON: cart button includes VAT. | NO |
| V4 | E3 | CartPanel.jsx | VAT OFF: no VAT line in cart. VAT ON: VAT line shows. | NO |
| V5 | E4 | CollectPaymentPanel.jsx | VAT OFF: no VAT line in Collect Payment. | NO |
| V6 | E5 | orderTransform.js (placeOrderWithPayment) | Prepaid order, GST OFF → per-item `gst_amount: "0.00"` in payload | NO |
| V7 | E6 | orderTransform.js (collectBillExisting) | Postpaid + discount, GST OFF → per-item `gst_amount: "0.00"` in food_detail | NO |
| V8 | E7 | CollectPaymentPanel.jsx (SC GST) | GST OFF + SC ON → SC GST display = ₹0 (no SGST/CGST lines under SC) | NO |
| V9 | Regression | All paths | GST ON + VAT ON restaurant → all totals and per-item amounts unchanged from current behavior | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-683 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add 5 files with BUG-683 marker
- [ ] Code markers: // BUG-683 comment in every modified file
```
