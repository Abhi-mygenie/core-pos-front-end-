# Investigation Report — 3 Items (Updated 2026-07-25)

**Role:** INVESTIGATION
**Date:** 2026-07-25

---

# ITEM 1: Channel View — Cards Not Moving

**Steps Used:** 4/10
**Confidence:** HIGH (code fully traced)

## The Conflict Explained

There are **two independent behaviors** layered on top of each other in channel view:

### Layer A — Sort Stability (Previous Fix, ACTIVE)
`ChannelColumn.jsx:109-156` — when `groupingMode='channel'`:
- Sort is **stable** (FIFO for orders, label-numeric for tables)
- Cards do NOT re-sort when status changes (Preparing→Ready→Served)
- Status change only affects badge/color/buttons, not card position
- **This is WORKING as designed. Cards intentionally don't move.**

### Layer B — Status Filter (CR-018 G8 Re-Enable, ACTIVE)
`DashboardPage.jsx:846-849`:
```js
// CR-018 G8: Re-enabled statusMatchesFilter in channel view
// so status pills (YTC/Preparing/Ready/Served) filter cards within channels.
...allTablesList.map(enrichTable).filter(statusMatchesFilter)
```
- Status pills at top of channel view FILTER which cards are VISIBLE
- If user deselects "Preparing" pill → all Preparing cards DISAPPEAR from all channels
- If user deselects "Available" → empty tables DISAPPEAR

### The Conflict
These two layers CONTRADICT each other:
- Layer A says: "cards should be stable, only badges change"
- Layer B says: "cards should appear/disappear based on status pills"

**Result:** Cards don't move position (Layer A) but cards can disappear entirely (Layer B) — which the user perceives as "cards won't move, tables won't come."

### "Tables won't come"
The `statusMatchesFilter` at L785-786:
```js
if (!item.order && !item.fOrderStatus) return true; // available tables → pass
```
Available tables (no order) SHOULD pass through. But if `enrichTable` assigns a status to the table that isn't in `activeStatuses`, the table gets filtered out.

**Root question for owner:** Which status pills are active when tables don't appear? If "Available" or "Reserved" pills are deselected, empty tables won't show.

## Recommendation
No code fix needed IF the current behavior is acceptable. The behavior is:
- Cards stay in position ✅ (Layer A — stable sort)
- Status pills filter visibility ✅ (Layer B — CR-018 G8 owner decision)

If the issue is that tables/cards disappear: check which status pills are active.

---

# ITEM 2: Customized Items Not Merging — Full Impact Analysis

**Steps Used:** 6/10
**Confidence:** HIGH
**Classification:** FE_BUG

## Root Cause — CONFIRMED

`addCustomizedItemToCart()` at `OrderEntry.jsx:676-689` **ALWAYS appends a new line**. Zero merge logic.

```js
// L676-689: ALWAYS appends — never checks for existing identical customized item
setCartItems([...cartItems, {
    ...item, qty: item.quantity || 1, status: "preparing", placed: false
}]);
```

## Will Fixing the Merge Fix Printing?

**YES.** The merge fix is the ONLY fix needed. Here's why:

### How Data Flows Through the System

```
User adds Half Cup 3×
  ↓ (BUG: addCustomizedItemToCart appends 3 separate lines)
cartItems = [ {Half Cup, qty:1}, {Half Cup, qty:1}, {Half Cup, qty:1} ]
  ↓ placeOrder → buildCartItem × 3 → 3 separate order_details records in backend
  ↓ Backend stores 3 lines
  ↓ ALL downstream reads (KOT, Bill, OrderCard) see 3 lines
```

**After fix:**
```
User adds Half Cup 3×
  ↓ (FIXED: merge finds existing → increments qty)
cartItems = [ {Half Cup, qty:3} ]
  ↓ placeOrder → buildCartItem × 1 → 1 order_details record with qty=3
  ↓ Backend stores 1 line
  ↓ ALL downstream reads see 1 line with qty=3
```

**No print code changes needed.** The fix at the cart level cascades through the entire system.

## All Screens Affected (before fix → after fix)

| Screen | Component | Before Fix (3 separate lines) | After Fix (1 merged line) |
|--------|-----------|------------------------------|--------------------------|
| **Cart Panel** | `CartPanel.jsx` | 3 rows showing "Half Cup ×1" each | 1 row showing "Half Cup ×3" |
| **Collect Bill** | `CollectPaymentPanel.jsx:1822` | 3 line items, each ×1 | 1 line item ×3 |
| **OrderCard (Dashboard)** | `OrderCard.jsx:675` | 3 items with individual prep timers | 1 item with single prep timer |
| **KOT Print** | `orderService.js:148` via `rawOrderDetails` | 3 separate KOT lines | 1 KOT line with qty=3 |
| **Bill Print (manual)** | `orderTransform.js:1714` `buildBillPrintPayload` | 3 bill lines | 1 bill line with qty=3 |
| **Bill Print (Collect Bill)** | `CollectPaymentPanel.jsx:1119` `handlePrintBill` | 3 bill lines | 1 bill line with qty=3 |
| **QSR Place & Pay** | `OrderEntry.jsx:1242` | Same cart → same bug | Same cart → same fix |
| **Place Order payload** | `orderTransform.js:970` `placeOrder` | 3 `order_details` entries | 1 entry with qty=3 |
| **Update Order payload** | `orderTransform.js:1200` `updateOrder` | 3 entries | 1 entry |

## Prep/Serve Time Display

| Component | Current (3 lines) | After Fix (1 line) |
|-----------|-------------------|-------------------|
| `OrderCard.jsx:679-690` | 3 separate prep timers (one per line) — confusing | 1 timer for the merged item — correct |
| `CollectPaymentPanel.jsx` | No timer — shows qty × price per line | Shows 1 line with qty=3 × price — correct |

## QSR Considered?

**YES.** QSR mode uses the same `addToCart()` / `addCustomizedItemToCart()` path (L1242-1346). The same merge bug exists. The fix in `addCustomizedItemToCart` covers QSR automatically.

## Print Trigger Points Checked

| # | Trigger | Where | Uses |
|---|---------|-------|------|
| 1 | **Place Order** (auto KOT) | `orderTransform.js:970` `placeOrder` | `buildCartItem` × cart items → `cart[]` in payload |
| 2 | **Update Order** (auto KOT) | `orderTransform.js:1200` `updateOrder` | Same `buildCartItem` |
| 3 | **QSR Place & Pay** (auto KOT + Bill) | `orderTransform.js:1200` `prepaidPlaceOrder` | Same `buildCartItem` |
| 4 | **Manual KOT** (OrderCard button) | `OrderCard.jsx:182` → `orderService.printOrder(type='kot')` | Reads `rawOrderDetails` from backend |
| 5 | **Manual Bill** (OrderCard button) | `OrderCard.jsx:223` → `orderService.printOrder(type='bill')` → `buildBillPrintPayload` | Reads `rawOrderDetails` from backend |
| 6 | **Collect Bill Print** | `CollectPaymentPanel.jsx:1119` → `onPrintBill(overrides)` → `buildBillPrintPayload` | Reads `rawOrderDetails` from backend |
| 7 | **RePrint** (CartPanel) | `RePrintButton.jsx` → `orderService.printOrder` | Reads `rawOrderDetails` from backend |
| 8 | **Audit Report Print** | `AllOrdersReportPage.jsx:805` → `handlePrintBillFromAudit` | Reads `rawOrderDetails` from backend |

**Triggers 1-3** send cart items directly → merge fix reduces line count at source.
**Triggers 4-8** read `rawOrderDetails` from backend → backend stores what was placed → merge fix means backend gets 1 line instead of 3.

## Fix — Single Function Change

**File:** `OrderEntry.jsx` — `addCustomizedItemToCart()` (L676-689)
**Change:** ~10 lines — build customization key, findIndex matching cart item, increment qty if found

```
Customization key = JSON.stringify({
  id: item.id (or item.foodId),
  size: item.customizations.size,
  variants: sorted(item.customizations.variants),
  addons: sorted(item.customizations.addons),
  notes: item.customizations.notes
})

existing = cartItems.findIndex(ci =>
  !ci.placed && buildKey(ci) === buildKey(item)
)

if (existing >= 0) → increment qty
else → append new line (current behavior)
```

**Risk:** MEDIUM — `OrderEntry.jsx` is an R5 hotspot. Full gate flow required.

---

# ITEM 3: Smart Purchase Ad-Hoc Search Blocking UI

**Root cause confirmed in prior session.** Typeahead keystroke re-renders entire table (50+ VendorSuggestionCell comboboxes). Fix: `React.memo` wrapper on VendorSuggestionCell (~5 lines). Risk: LOW.

---

# Summary

| # | Item | Root Cause | Fix Scope | Risk | Print Impact? |
|---|------|-----------|-----------|------|:---:|
| 1 | Channel view cards/tables | Intentional stability + status filter (CR-018 G8). Check status pills. | Likely no code change | — | NO |
| 2 | Customized items not merging | `addCustomizedItemToCart` has zero merge logic | ~10 lines in OrderEntry.jsx (R5 hotspot) | MEDIUM | YES — fix cascades through all 8 print paths |
| 3 | Ad-hoc search blocking | Full table re-render per keystroke | ~5 lines React.memo | LOW | NO |
