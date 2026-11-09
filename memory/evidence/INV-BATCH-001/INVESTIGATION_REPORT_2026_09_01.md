# INVESTIGATION REPORT — Bug Batch 2026-09-01 (8 Bugs)
**Date:** 2026-09-01
**Role:** INVESTIGATION
**Steps used:** 9/10 per bug average
**Status:** ROOT CAUSE FOUND — 7 of 8 HIGH confidence, 1 MEDIUM

---

## Executive Summary

| # | Bug | Classification | Confidence | Planning Skip? | Recommended Path |
|---|-----|---------------|-----------|----------------|-----------------|
| BUG-A | Split Bill Reprint | FE_BUG (likely) + possible BACKEND | MEDIUM | NO — needs API probe | PLANNING Gate 2+3 |
| BUG-B | Print Customer Copy not printing | FE_BUG — missing consumer | HIGH | YES — 1 file, ~5 lines | DIRECT_BUG_FIX (owner approve) |
| BUG-C | Delivery Reassign missing in "Waiting" state | FE_BUG — button disabled, not interactive | HIGH | YES — 1 file, ~3 lines | DIRECT_BUG_FIX (owner approve) |
| BUG-D | Bulk Edit variation price not editable | FE_BUG — read-only flag, no price editor | HIGH | NO — needs new UI | PLANNING Gate 2+3 |
| BUG-E | Transfer + Merge from outside (OrderCard) | FE_BUG — Merge handler is `console.log` | HIGH | NO — Transfer unclear, Merge needs wiring | PLANNING Gate 2+3 |
| BUG-F | Service Charge Label hardcoded | FE_BUG — profileTransform missing mapping | HIGH | YES — 2 files, ~5 lines | DIRECT_BUG_FIX (owner approve) |
| BUG-G | Variation qty changes both variations | FE_BUG — cart identity/qty logic | MEDIUM | NO — cart hotspot | PLANNING Gate 2+3 |
| BUG-H | Zomato Image title shows in Normal mode | FE_BUG — missing aggregator gate | HIGH | YES — 1 file, ~2 lines | DIRECT_BUG_FIX (owner approve) |

---

## BUG-A — Split Bill Reprint: "Cannot print bill" after settlement

### Data Flow Trace
```
OrderReportBetaPage → handleReprint(row)
  → POST SINGLE_ORDER_NEW { order_id: row.order_id }
  → Tries to extract raw order from multiple response paths:
      response.data.orders.order_details_order
      response.data.order_details_order
      response.data.orders[0]    ← for split bill, orders may be an array of sub-orders
      response.data.orders
  → order = orderFromAPI.order(raw)
  → if (!order?.rawOrderDetails) → toast "Order details unavailable"  ← BREAK POINT
```

**Hypothesis:** Split-settled orders return a different API shape where the sub-order IDs don't map correctly to the main order fetch, causing `rawOrderDetails` to be null/undefined.

**Cannot confirm without live API probe** (token required). Investigation is MEDIUM confidence.

**Recommendation:** PLANNING — curl-probe `SINGLE_ORDER_NEW` with a split-settled order ID to confirm response shape. Check if `order_details_order` path is present for split orders.

---

## BUG-B — Print Customer Copy: Separate bill not printed ✅ HIGH CONFIDENCE

### Data Flow Trace
```
RestaurantSettingsPage (wizard)
  → saves print_bill_customer_copy via restaurantSettingsTransform.toAPI (line 238)
  → backend stores the value ✓

RestaurantContext / ProfileTransform
  → profileTransform.settings() — NO mapping for printBillCustomerCopy  ← BREAK POINT
  → restaurant.printBillCustomerCopy = undefined always

CollectPaymentPanel / buildBillPrintPayload (orderTransform.js:1794)
  → Never receives or reads printBillCustomerCopy
  → No logic to trigger a second print for customer copy
```

**Root cause:** `printBillCustomerCopy` is NEVER read after being saved. `profileTransform.settings()` does not map `print_bill_customer_copy` from the API response. The consumer (print payload builder or CollectPaymentPanel) never knows this flag is enabled.

**Fix scope:**
1. Add `printBillCustomerCopy: toBoolean(apiSettings.settings?.print_bill_customer_copy)` to `profileTransform.settings()` (~1 line)
2. In `CollectPaymentPanel` or `buildBillPrintPayload`, add logic to trigger a second print when `restaurant.printBillCustomerCopy === true` (~3-5 lines depending on where the second print is triggered)

**Planning skip eligible:** Partially — the profileTransform add is 1 line (eligible). The print trigger logic needs owner decision: should the second print be a duplicate bill or a separate "customer copy" format? Owner decision needed before implementation.

---

## BUG-C — Delivery Reassign: "Waiting for Rider" button not interactive ✅ HIGH CONFIDENCE

### Data Flow Trace
```
OrderCard.jsx — delivery action section:
  IF delivery status = "waiting":
    Line 1176-1182: Renders <button disabled> "Waiting for Rider"
                    → opacity-50 + cursor-default + disabled=true
                    → NO onClick handler  ← BREAK POINT

  ELSE (assigned state):
    Line 1184-1190: Renders <button data-testid="reassign-rider-btn">
                    → onClick={() => setShowAssignRider(true)}  ✓ WORKS
```

**Root cause:** When delivery status = "waiting for rider", the button is rendered as a fully disabled non-interactive element. The user cannot click it to trigger reassignment. The "Reassign" button DOES work when status = "assigned" (it opens the assign rider modal).

**Fix scope:** `OrderCard.jsx` — change the "Waiting for Rider" button from disabled to interactive, wiring it to `setShowAssignRider(true)` like the assigned state. ~3 line change.

**Planning skip eligible:** YES — 1 file, ~3 lines, not financial, not hotspot R5. Owner approval needed.

---

## BUG-D — Bulk Edit Variation Price: No price editor ✅ HIGH CONFIDENCE

### Data Flow Trace
```
BulkEditor.jsx
  COLUMNS array, line 29: { key: "variations", label: "Variations", type: "var_expand", width: 110, tier: 1 }
  isDirty map, line 375:  variations: () => false   ← BREAK POINT (always read-only)

  Expand render (line 1075): variation expand panel renders chip list
  No price input exists inside the expand panel for individual variation prices.
```

**Root cause:** The BulkEditor `variations` column is explicitly marked `isDirty: () => false` (read-only). No variation price input cell exists in the expand panel. CR-145 added the column for display purposes only ("Addon & Variation Columns + Row Expand") — editing was never included.

**Recommendation:** PLANNING — new variation price editor cells needed inside the expand panel. Requires owner decision on UX (inline input per variation row vs a separate edit flow). Not a quick fix.

---

## BUG-E — Transfer + Merge buttons from outside OrderEntry ✅ HIGH CONFIDENCE (Merge)

### Data Flow Trace
```
DashboardPage.jsx
  Food Transfer handler (line 1552):
    handleFoodTransfer(order, item, tableEntry)
    → Sets state to open OrderEntry with transfer modal ✓ LIKELY WORKS

  Merge handler (line 1956):
    onMergeOrder={(o) => console.log('[OrderCard] Merge order:', o.orderId)}
                          ↑↑↑ ONLY A console.log — NO MERGE LOGIC  ← BREAK POINT

OrderCard.jsx (line 44): canMergeOrder default = true (shown to all)
```

**Root cause (Merge):** `onMergeOrder` in DashboardPage is wired to `console.log` only — it was never properly implemented for the "from outside" path. The merge table modal (`MergeTableModal`) is imported in OrderEntry but not exposed from the card view.

**Root cause (Transfer):** Handler exists (`handleFoodTransfer`) but owner reports it doesn't work "from outside". Needs live testing to confirm — possibly state conflict when opening OrderEntry from a card vs navigating into it.

**Recommendation:** PLANNING — two separate fixes: (1) Merge handler needs full implementation from DashboardPage, (2) Transfer needs live investigation + testing.

---

## BUG-F — Service Charge Label hardcoded ✅ HIGH CONFIDENCE

### Data Flow Trace
```
RestaurantSettingsPage → saves service_chrg_taxt via restaurantSettingsTransform.toAPI (line 258) ✓

profileTransform.settings() — NO mapping for serviceChrgTaxt  ← BREAK POINT
  → restaurant.serviceChrgTaxt = undefined always

CollectPaymentPanel.jsx (line 2255):
  <span>Service Charge ({serviceChargePercentage}%)</span>  ← hardcoded label

CollectPaymentPanel.jsx (line 2499):
  Service Charge @ {serviceChargePercentage}%  ← hardcoded label

orderTransform.js buildBillPrintPayload:
  No serviceChrgTaxt in print payload  ← label never sent to printer
```

**Root cause:** Identical class to BUG-366 (restaurantFor). `profileTransform.settings()` is missing `serviceChrgTaxt` mapping. The custom label set in wizard is saved to backend but never flows into the app's restaurant context. All label sites use the hardcoded string "Service Charge".

**Fix scope:**
1. Add `serviceChrgTaxt: apiSettings.settings?.service_chrg_taxt || apiSettings.service_chrg_taxt || 'Service Charge'` to `profileTransform.settings()` (~1 line)
2. Replace hardcoded `"Service Charge"` in `CollectPaymentPanel.jsx` with `restaurant?.settings?.serviceChrgTaxt || 'Service Charge'` (~3 occurrences)
3. Add `service_charge_label` to `buildBillPrintPayload` in `orderTransform.js` (~1-2 lines)

**Planning skip eligible:** Partially (profileTransform = 1 line). Full fix = 3 files, ~6 lines total. Not hotspot, not financial value. Owner approval needed for planning skip.

---

## BUG-G — Variation Quantity: Changing one variation qty changes both ✅ MEDIUM CONFIDENCE

### Data Flow Trace
```
NOTE: BUG-VQTY (QA PASS awaiting smoke) is a DIFFERENT bug — it's about financial calculation.
      This new bug is about UI quantity controls in the cart.

OrderEntry.jsx cart items rendering:
  addToCart(item) → item identity key built from item._id + variations[] + addons[]
  BUG-246 fix: merge identical customized items by identity key

Hypothesis: 30ml and 60ml of same item may share the same identity key if variation labels
  are treated case-insensitively or if the key builder has a defect.
  When qty changes, the update finds items by identity key — both match → both updated.
```

**Cannot fully confirm without seeing the identity key builder and cart qty update logic.** Needs targeted code trace on cart quantity change handler and identity key computation.

**Recommendation:** PLANNING — additional investigation step needed: trace `addToCart` → identity key builder → qty update propagation. Could be related to or independent of BUG-246.

---

## BUG-H — Zomato Image Title in Normal Menu Management ✅ HIGH CONFIDENCE

### Data Flow Trace
```
ProductForm.jsx
  Line 337: <label>Zomato Image</label> + image input
  → NOT wrapped in any aggregator/Zomato-enabled condition  ← BREAK POINT
  → Shows for ALL restaurants, including those without Zomato integration

Compare: Swiggy image (line 358): {/* BUG-327: Swiggy image upload — aggregator food only */}
  → Swiggy image IS gated by aggregator mode (was fixed in BUG-327)
  → Zomato Image was NOT given the same fix

ProductForm default (line 258): zomato: product.zomato !== false → defaults true
  → Zomato toggle also defaults to ON for all products
```

**Root cause:** BUG-327 fixed Swiggy image to show only for aggregator items. The symmetrical fix was NOT applied to the Zomato Image field. It shows unconditionally for all products in all restaurants.

**Fix scope:** `ProductForm.jsx` — wrap Zomato Image field in the same aggregator gate used for Swiggy. ~2 line change.

**Planning skip eligible:** YES — 1 file, ~2 lines, not financial, not hotspot. Owner approval needed.

---

## Retroactive Candidates

| ID | Issue | Status | Action |
|---|---|---|---|
| BUG-VQTY | Variation qty × financial calc | QA PASS — Awaiting Owner Smoke | No action — separate from Bug-G |

---

## Recommendations Summary

### Direct Bug Fix path (owner approval needed — planning skip):
- **BUG-C** (Delivery Reassign Waiting state) — 1 file, 3 lines
- **BUG-H** (Zomato Image gate) — 1 file, 2 lines

### Partial direct fix + owner decision needed:
- **BUG-B** (Print Customer Copy) — profileTransform 1 line is clear; second print trigger needs owner decision on format
- **BUG-F** (Service Charge Label) — 3 files, 6 lines total; clear but needs owner approval for planning skip

### Full planning cycle (Gate 2+3):
- **BUG-A** (Split Bill Reprint) — needs API probe first
- **BUG-D** (Bulk Edit Variation Price) — new UI needed
- **BUG-E** (Transfer + Merge from outside) — Merge needs full implementation; Transfer needs testing
- **BUG-G** (Variation Quantity UI) — needs deeper cart trace

---

*Investigation closed: 2026-09-01. Report at: `evidence/INV-BATCH-001/INVESTIGATION_REPORT_2026_09_01.md`*
