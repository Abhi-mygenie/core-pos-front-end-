# BUG-678 — Impact Analysis (Gate 2)

**ID:** BUG-678
**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-16
**Risk:** CRITICAL (money — order_amount != amount collected)
**Code Reality:** NONE (fix not yet applied)
**Conflict Pre-Check:** CLEAN (see §3)

---

## 1. Root Cause (from INV-SC-PREPAID-2026-11-16)

**CODE_ERROR** at `OrderEntry.jsx` — BUG-662 regression.

Two `scApplicable` conditions use `!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0`. When `autoServiceCharge=true`, the `||` short-circuits — `scApplicable` is ALWAYS true regardless of the cashier's toggle state in CollectPaymentPanel. `calcOrderTotals` receives the full SC percentage and computes SC + SC GST into `order_amount` even when the cashier explicitly turned SC OFF.

**Result:** `order_amount` = ₹275 (with SC). Actual collected = ₹250. Discrepancy = ₹25.

---

## 2. Affected Lines at HEAD (verified 2026-11-16)

**File:** `frontend/src/components/order-entry/OrderEntry.jsx` (3,358 lines, R5 hotspot)

### Location 1 — QSR prepaid path (L1719-1720)

```javascript
// L1717-1720:
// BUG-662: honour cashier's manual SC toggle on prepaid. paymentData.serviceCharge > 0
// means the cashier ticked SC ON in CollectPaymentPanel (even when auto=No).
const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0);
```

`scApplicable` feeds into L1730:
```javascript
serviceChargePercentage: scApplicable ? (restaurant?.serviceChargePercentage || 0) : 0,
```

### Location 2 — Scenario 2 prepaid path (L2504-2506)

```javascript
// L2504-2506 (inline in options object):
serviceChargePercentage: (
  (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0) // BUG-662
) ? (restaurant?.serviceChargePercentage || 0) : 0,
```

### Line Shift vs Investigation

| Location | Investigation (INV) | HEAD (actual) | Shift | Cause |
|----------|-------------------|---------------|-------|-------|
| QSR prepaid | L1708-1709 | **L1719-1720** | +11 | BUG-647 taxFlags L1736, CR-515 L353, BUG-674 L1601, BUG-670 L1560, CR-523 L1103-1126 |
| Scenario 2 prepaid | L2492-2493 | **L2505-2506** | +13 | Same Batch 1 additions above |

---

## 3. Conflict Pre-Check

| Item | File | Lines | Conflict? |
|------|------|-------|-----------|
| BUG-647 (Batch 1, IMPLEMENTED) | OrderEntry.jsx | L1149, L1164, L1339, L1401-1402, L1736, L1886, L2515, L2619 | **NO** — different lines (taxFlags plumbing), doesn't touch scApplicable |
| CR-515 (Batch 1, IMPLEMENTED) | OrderEntry.jsx | L353 | **NO** — permission check, 1,366 lines away |
| BUG-674 (Batch 1, IMPLEMENTED) | OrderEntry.jsx | L1601 | **NO** — cancel note param, 118 lines away |
| BUG-670 (Batch 1, IMPLEMENTED) | OrderEntry.jsx | L1560 | **NO** — cancel item note, 159 lines away |
| CR-523 (Batch 1, IMPLEMENTED) | OrderEntry.jsx | L1103-1126 | **NO** — customer save rewrite, 596 lines away |
| CR-493 B5 (Batch 1, IMPLEMENTED) | OrderEntry.jsx | L3148, L3158 | **NO** — cancel note mandatory, 1,428 lines away |
| CR-482 (IMPLEMENTED) | OrderEntry.jsx | P1-P10 kbd shortcuts | **NO** — search/highlight/arrows, doesn't touch payment paths |
| BUG-662 (IMPLEMENTED) | OrderEntry.jsx | L1719-1720, L2505-2506 | **TARGET** — this is the code we're fixing |

**Result: CLEAN — no blocking conflicts. BUG-678 fix can proceed independently.**

---

## 4. Affected vs Unaffected Paths (verified at HEAD)

| Path | Function | SC Logic | Affected? |
|------|----------|----------|-----------|
| `placeOrderWithPayment` — QSR prepaid | L1719-1720 → L1730 | `autoServiceCharge \|\| serviceCharge > 0` | **YES** |
| `placeOrderWithPayment` — Scenario 2 prepaid | L2504-2506 | Same buggy logic | **YES** |
| `placeOrder` (unpaid) | L1339 | Uses only `autoServiceCharge` (no toggle exists) | NO — correct by design |
| `updateOrder` (add items) | L1401-1402 | Uses only `autoServiceCharge` | NO — correct by design |
| `collectBillExisting` | orderTransform.js L1522 | Reads `paymentData.serviceCharge` (₹ amount) directly | NO — correct |
| `collectBillExisting` — QSR | orderTransform.js L1707 | Same direct ₹ read | NO — correct |

**Scope: ONLY `placeOrderWithPayment` (prepaid fresh orders). Both QSR and non-QSR Scenario 2.**

---

## 5. Downstream Consumers

```
OrderEntry L1719-1720 (or L2504-2506)
  → scApplicable = TRUE (BUG)
  → L1730 (or L2507): serviceChargePercentage = restaurant.serviceChargePercentage (e.g. 10)
  → orderToAPI.placeOrderWithPayment(... { serviceChargePercentage: 10, ... })
    → orderTransform.js L1296: receives SC % = 10
    → orderTransform.js L1338: calcOrderTotals(items, 10, {...})
      → L862-863: serviceCharge = postDiscount * 10 / 100 = ₹23.81
      → L893: scGstAmt = ₹23.81 * 5% = ₹1.19
      → L916: rawTotal = ₹238.10 + ₹23.81 + ₹13.09 = ₹275.00
    → L1410: payload.service_tax = 23.81, service_gst_tax_amount = 1.19, order_amount = 275
  → Backend records ₹275 (but only ₹250 was collected)
```

**After fix:** `scApplicable = FALSE` when toggle OFF → `serviceChargePercentage = 0` → `calcOrderTotals` computes 0 SC → `order_amount = 250` ✅

---

## 6. Fix Definition

### Edit 1 — L1719-1720 (QSR prepaid)

```
CURRENT (L1719-1720):
const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0);

FIX:
const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
  && paymentData?.serviceCharge > 0; // BUG-678: trust CPP toggle, not autoServiceCharge
```

### Edit 2 — L2505-2506 (Scenario 2 prepaid)

```
CURRENT (L2505-2506):
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0) // BUG-662

FIX:
  && paymentData?.serviceCharge > 0 // BUG-678: trust CPP toggle, not autoServiceCharge
```

### Why this is safe

| Scenario | `autoServiceCharge` | Cashier toggle | `paymentData.serviceCharge` | `scApplicable` (fix) | Correct? |
|----------|-------------------|----------------|---------------------------|---------------------|----------|
| Auto=Yes, toggle ON (default) | true | ON | >0 | true → passes SC % | ✅ |
| Auto=Yes, toggle OFF | true | OFF | 0 | false → passes 0 | ✅ (THE FIX) |
| Auto=No, toggle ON (manual) | false | ON | >0 | true → passes SC % | ✅ (BUG-662 original fix preserved) |
| Auto=No, toggle OFF (default) | false | OFF | 0 | false → passes 0 | ✅ |
| Takeaway/Delivery (SC N/A) | any | N/A | 0 | false → passes 0 | ✅ |
| Comp items (₹0 base) | any | ON | 0 (SC of ₹0) | false → passes 0 | ✅ |

**Key insight:** `autoServiceCharge` controls the DEFAULT toggle state in CollectPaymentPanel (L466-474). That code is unaffected. The toggle state flows as `paymentData.serviceCharge` — trusting this value alone is correct and simpler.

---

## 7. Risk Assessment

| Factor | Assessment |
|--------|-----------|
| Risk | **CRITICAL** — money, billing, financial payload |
| File | OrderEntry.jsx — **R5 hotspot** |
| Lines changed | 2 (remove `!!restaurant?.autoServiceCharge \|\|` from two locations) |
| Files changed | 1 |
| Financial logic | YES — SC computation affects `order_amount` |
| Blast radius | SMALL — 1 file, 2 edit sites, no new imports/exports/state |
| Regression surface | `placeOrder` (unpaid) + `updateOrder` NOT affected (they don't use `paymentData`) |
| `collectBillExisting` NOT affected | Reads ₹ amount directly, not `scApplicable` |
| Planning skip eligible | **NO** — R5 hotspot + financial logic = full gate required |

---

## 8. Owner Decisions

**None required.** The fix is deterministic: remove the OR branch that short-circuits the toggle check. All 6 scenarios in §6 are correct after the fix. No ambiguity.

---

## 9. Verification Matrix (seeds QA)

| # | Check | Method | Expected |
|---|-------|--------|----------|
| V1 | Auto=Yes, toggle OFF, prepaid dine-in | Browser: place prepaid order, toggle SC OFF. Network tab: check `service_tax` and `order_amount` | `service_tax=0`, `order_amount` = items + GST only |
| V2 | Auto=Yes, toggle ON (default), prepaid dine-in | Browser: place prepaid order, leave SC ON | `service_tax > 0`, `order_amount` includes SC + SC GST |
| V3 | Auto=No, toggle ON (manual), prepaid | Browser: auto=No restaurant, manually toggle SC ON | `service_tax > 0` (BUG-662 original fix preserved) |
| V4 | Auto=No, toggle OFF (default), prepaid | Browser: auto=No restaurant, default state | `service_tax=0` |
| V5 | Collect Bill (not prepaid) | Browser: place unpaid → collect bill with SC OFF | `service_tax=0` (collectBillExisting path, NOT affected — regression check) |
| V6 | Takeaway/Delivery | Browser: place takeaway prepaid | `service_tax=0` (SC not applicable) |
| V7 | Code marker `// BUG-678` present at both edit sites | grep | 2 hits |
| V8 | Webpack compiles with 0 new warnings | `yarn build` or dev server | 0 new warnings |

---

## 10. Artifacts

| Artifact | Path |
|----------|------|
| Intake | `change_requests/BUG-678_SC_PREPAID_PAYLOAD_INTAKE.md` |
| Investigation | `investigations/INV-SC-PREPAID-2026-11-16.md` |
| Impact Analysis (this doc) | `impact/BUG-678_IMPACT_ANALYSIS.md` |
| Owner decisions | `change_requests/BATCH_2_OWNER_DECISIONS_2026_11_16.md` |
| Evidence | `evidence/INV-SC-PREPAID-2026-11-16/` |

---

```
Planning complete: BUG-678
Stage: Impact Analysis (Gate 2 only)
Code reality: NONE
Risk: CRITICAL
Files WILL change: OrderEntry.jsx (L1719-1720, L2505-2506)
Files WILL NOT touch: CollectPaymentPanel.jsx, orderTransform.js, CartPanel.jsx, any other file
Owner decisions: NONE required
Docs: impact/BUG-678_IMPACT_ANALYSIS.md
Next: Gate 3 (Implementation Plan) or combined Gate 3+4 GO
```
