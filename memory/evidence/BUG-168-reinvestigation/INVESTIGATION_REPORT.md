# BUG-168 Complete Investigation Report — Print Subtotal Drift

**Date:** 2026-07-08
**Agent role:** INVESTIGATION (Alpha v0.7 Role 6)
**Status:** INVESTIGATION COMPLETE — READY FOR IMPLEMENTATION
**Confidence:** HIGH — full data flow traced, API curl-verified, owner socket evidence confirmed, backend fix deployed

---

## 1. Problem Statement (Owner)

> When we place an order and then print it from the order card or order screen, the subtotal amount / item subtotal is coming wrong. The add-on price and variation price are not getting added. But when we do Collect Bill, the bill comes correctly because we locally create the items and send them to backend. For the manual print path, data comes from backend — we should not be doing any manipulation. Just pass through what the backend provides.

---

## 2. Root Cause — 3-Layer Data Loss Chain

### Layer 1: `employee-orders-list` API was missing financial fields
The running orders API (`/api/v1/vendoremployee/pos/employee-orders-list`) did NOT return `order_sub_total_amount` or `order_sub_total_without_tax`. This caused `fromAPI.order()` to set `subtotalAmount = 0` and `subtotalBeforeTax = 0` for all orders loaded on dashboard init.

**Evidence (curl-verified):**
```
employee-orders-list → order_sub_total_amount: MISSING
get-single-order-new → order_sub_total_amount: 219 ✅
Socket new-order     → order_sub_total_amount: 219 ✅
```

### Layer 2: Polling reconciliation destroyed socket-provided data
Socket `new-order` events DO provide correct `order_sub_total_amount: 219`. But the polling reconciliation (`useOrderPollingReconciliation.js`) runs every 60 seconds, fetches from `employee-orders-list` (which had `subtotalAmount: 0`), detects a fingerprint diff (`219.00 ≠ 0.00`), and OVERWRITES the correct socket data with the incomplete list API data.

**Three paths that destroyed socket data:**
1. Polling reconciliation (every 60s) — `updateOrder(orderId, serverOrder)` where server has `subtotalAmount: 0`
2. Socket reconnect — `mergeRunningOrders(freshOrders)` — full replace from list API
3. `refreshOrders()` — full replace from list API (called from OrderEntry L2775)

### Layer 3: FE computation fallback produced wrong values
With `order.subtotalAmount = 0`, `buildBillPrintPayload` (L1938-1940) fell through to `computedSubtotal` — a frontend-computed value from an item-level loop. This computation:
- Was originally missing addon prices entirely (used non-existent `item.total_add_on_price` field)
- Was patched in BUG-168 v2 with an addon reduce, but this was still wrong FE computation
- Was missing variation upcharge (BUG-170)
- Double-counted service charge in `finalOrderSubtotal` (L1946-1960)

---

## 3. Complete API Field Comparison (Socket vs List API)

**Order #940285 — same order, same moment:**

### 6 Fields ONLY in Socket (were missing from `employee-orders-list`)

| Field | Socket Value | Impact |
|-------|-------------|--------|
| **`order_sub_total_amount`** | **219** | Item total — THE critical field |
| **`order_sub_total_without_tax`** | **240.9** | Subtotal before tax (items + SC) |
| `delivery_charge_gst` | "0.00" | Delivery charge GST |
| `billing_auto_bill_print` | "No" | Auto bill print flag |
| `canceled_by` | null | Cancellation info |
| `printer_agent` | [] | Printer agent list |

### 0 Fields only in List API
### 0 Fields with different values
### 43 Fields identical in both sources

Socket is a **superset** of the list API.

### Item-level: identical in both — neither has financial breakdown
Both have: `unit_price`, `price`, `quantity`, `add_ons[]`, `variation[]`
Neither has: `food_amount`, `addon_amount`, `variation_amount`, `gst_tax_amount`, `vat_tax_amount`, `tax_amount`

---

## 4. Backend Fix — DEPLOYED

Backend has now added `order_sub_total_amount` and `order_sub_total_without_tax` to the `employee-orders-list` response.

**Verified via curl (post-fix):**
```
#002292 → order_sub_total_amount=44,  order_sub_total_without_tax=48.4
#002302 → order_sub_total_amount=100, order_sub_total_without_tax=100
#002303 → order_sub_total_amount=198, order_sub_total_without_tax=217.8
#002304 → order_sub_total_amount=885, order_sub_total_without_tax=973.5
```

All three data sources now provide consistent financial fields:
- ✅ Socket `new-order`
- ✅ `employee-orders-list` (FIXED)
- ✅ `get-single-order-new`

---

## 5. Audit of Wrong FE Computations

### What was EXISTING (in 6-july branch, written Apr-Jun 2026)
The entire computation block (L1802-1907) was pre-existing code accumulated across multiple bug fixes:

| Lines | Bug/CR | What it does |
|-------|--------|-------------|
| L1802-1807 | BUG-246, BUG-018 Part 3 | Loop setup: iterates `billFoodList`, computes `computedSubtotal` from `unit_price × qty` |
| L1808 (original) | BUG-168 v1 | `(parseFloat(item.total_add_on_price) ǀǀ 0)` — tried to add addons but `total_add_on_price` doesn't exist on API → always 0 |
| L1828-1843 | Original | Tax computation from `food_details.tax` percentage |
| L1846-1863 | BUG-006, BUG-050 | Discount/tip/delivery override handling + `postDiscountSubtotal` |
| L1865-1887 | BUG-023 | SC-applicability rule + SC recomputation from `postDiscountSubtotal × percentage` |
| L1898-1907 | CR-013 | GST recomputation with discount ratio + SC/tip/delivery tax rates |
| L1938-1940 | BUG-273/277 | `finalOrderItemTotal` with `computedSubtotal` fallback |
| L1946-1960 | BUG-282/281 | `finalOrderSubtotal` recomputation (double-counts SC) |

### What was NEW (agent-added, Jul 8 2026)
Only **one change** — BUG-168 v2 fix (L1808-1825):
```diff
- const lineTotal = (price * qty) + (parseFloat(item.total_add_on_price) || 0);
+ const addonPerUnit = (item.add_ons || []).reduce(
+     (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)), 0);
+ const lineTotal = (price * qty) + (addonPerUnit * qty);
```
This replaced the broken `total_add_on_price` reference with an actual addon computation — but was itself another layer of wrong FE computation.

---

## 6. Exact Changes Required (Post Backend Fix)

### Self-resolving (no code change needed): 2 locations

| # | Where | Why |
|---|-------|-----|
| 1 | `useOrderPollingReconciliation.js` L68 — `subtotalAmount` in fingerprint | Both sources now have the field → fingerprints match → no destructive overwrite |
| 2 | `fromAPI.order` L220-222 — field mapping | Already maps `order_sub_total_amount` → `subtotalAmount` correctly |

### Must change: 4 locations (all in `orderTransform.js` → `buildBillPrintPayload`)

**All changes affect ONLY the manual print path (OrderCard / TableCard / RePrintButton / Reports). Collect Bill flow is untouched — it uses overrides.**

| # | Lines | Current (wrong) | Should be | Why |
|---|-------|----------------|-----------|-----|
| **3** | L1938-1940 | `order.subtotalAmount ǀǀ computedSubtotal ǀǀ 0` | `order.subtotalAmount` | Backend always provides correct item total. Drop `computedSubtotal` fallback. |
| **4** | L1946-1960 | Recomputes `itemBase + serviceChargeAmount + tip + delivery` | `order.subtotalBeforeTax` | Backend's `order_sub_total_without_tax` already includes SC/tip/delivery. Current code double-counts SC. |
| **5** | L1881-1887 | Recomputes SC from `postDiscountSubtotal × serviceChargePercentage` | `order.serviceTax` | Backend provides `total_service_tax_amount`. Just use it. |
| **6** | L1964-1965 | Uses FE-computed `gst_tax` / `vat_tax` from item loop | Derive from backend: `order.amount - order.subtotalBeforeTax` | **Owner decision needed on GST/VAT split** (see §7) |

### Guard computation block: 1 location

| # | Lines | Change |
|---|-------|--------|
| **7** | L1802-1907 | Wrap in `if (overrides.orderItemTotal !== undefined)` — only runs for Collect Bill, never for manual print |

---

## 7. Owner Decision Needed

**Tax split (Change 6):** Backend provides `order_amount` (250) and `order_sub_total_without_tax` (240.9) but NOT separate `gst_tax` / `vat_tax` totals. For the print payload's `gst_tax` and `vat_tax` fields:

- **Option A:** Derive total tax = `order_amount - subtotalBeforeTax` (= 9.1), assign based on predominant tax type from items
- **Option B:** Keep ONLY the item-level tax loop (L1828-1843) for GST/VAT split, remove everything else
- **Option C:** Ask backend to add `gst_tax_total` / `vat_tax_total` fields to the API

---

## 8. How the Two Print Paths Work (Post-Fix)

```
buildBillPrintPayload(order, scPct, overrides)

COLLECT BILL PATH (overrides present):
  overrides = { orderItemTotal, orderSubtotal, gstTax, vatTax, serviceChargeAmount, ... }
  → All final* values use overrides directly
  → FE computation block runs (existing code, unchanged)
  → ✅ Works correctly today, NO CHANGE

MANUAL PRINT PATH (no financial overrides):
  overrides = { serviceChargeTaxPct, deliveryChargeGstPct }  (only tax rate pcts)
  
  CURRENT (broken):
    → overrides.orderItemTotal = undefined
    → order.subtotalAmount = 0 (was missing from list API, destroyed by polling)
    → Falls to computedSubtotal (FE computation) → WRONG ❌
  
  AFTER FIX:
    → overrides.orderItemTotal = undefined
    → order.subtotalAmount = 219 (now available from all sources)
    → Uses backend value directly → CORRECT ✅
```

---

## 9. Files & Scope Summary

| Item | Value |
|------|-------|
| Files changing | 1 (`frontend/src/api/transforms/orderTransform.js`) |
| Lines affected | ~100 (L1802-1907 guarded, L1938-1965 simplified) |
| Paths affected | Manual print only (OrderCard, TableCard, RePrintButton, Reports) |
| Paths untouched | Collect Bill (uses overrides, unchanged) |
| Risk | LOW-MEDIUM (financial semantics, but simplification — removing wrong computation, not adding new logic) |
| Prerequisite | ✅ Backend deployed — `employee-orders-list` now returns `order_sub_total_amount` |

---

## 10. Evidence Artifacts

```
/app/memory/evidence/BUG-168-reinvestigation/
├── api_list_940285.json                    ← employee-orders-list response (post backend fix)
├── single_order_940279.json                ← get-single-order-new response
├── socket_940285.json                      ← Socket new-order payload (from owner)
├── running_orders_940279.json              ← employee-orders-list (pre backend fix — MISSING fields)
├── INVESTIGATION_REPORT.md                 ← THIS FILE
├── AUDIT_WRONG_FE_COMPUTATIONS.md          ← Detailed audit of all wrong FE code
└── EXACT_CHANGES_REQUIRED.md               ← Precise change-by-change implementation guide
```

---

## 11. Investigation Timeline

| Step | Action | Finding |
|------|--------|---------|
| 1-2 | Traced `buildBillPrintPayload` code flow | Found `computedSubtotal` fallback fires when `order.subtotalAmount = 0` |
| 3-4 | Traced order data source for OrderCard | Orders come from `employee-orders-list` (on load) and socket (on events) |
| 5 | Traced socket handler `handleNewOrder` | Socket data includes `order_sub_total_amount` — correctly mapped |
| 6 | Curl'd `employee-orders-list` | **MISSING** `order_sub_total_amount` — confirmed root cause |
| 7 | Curl'd `get-single-order-new` | **HAS** `order_sub_total_amount: 219` |
| 8 | Owner shared socket payload | **Confirmed** socket has the field — corrected investigation direction |
| 9 | Traced polling reconciliation | **Found** 60s polling overwrites socket data with list API data |
| 10 | Complete field comparison | Socket is superset of list API — 6 fields missing from list |
| +1 | Git blame L1802-1907 | 88 lines existing (Apr-Jun 2026), 18 lines new (BUG-168 v2, Jul 8) |
| +2 | Backend fix deployed | `employee-orders-list` now returns both fields — verified via curl |

---

**INVESTIGATION COMPLETE — Alpha v0.7 Compact Final:**

Root cause: 3-layer data loss — `employee-orders-list` was missing `order_sub_total_amount` (now fixed by backend), polling reconciliation was overwriting socket-provided values, and FE computation fallback produced wrong results. 
Classification: DATA_EDGE + INTERACTION. Confidence: HIGH. Steps: 10/10 + 2 follow-up.
Backend fix: DEPLOYED ✅. FE changes: 4 simplifications in `buildBillPrintPayload` (manual print path only, Collect Bill untouched). 1 owner decision pending (GST/VAT split).
Planning skip eligible: NO — financial semantics + hotspot file.
Report at `/app/memory/evidence/BUG-168-reinvestigation/INVESTIGATION_REPORT.md`.
Next: Owner decision on Change 6 (tax split) → PLANNING Gate 2-3 → IMPLEMENTATION.
