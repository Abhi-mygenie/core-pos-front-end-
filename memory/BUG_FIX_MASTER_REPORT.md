# Bug Fix Agent — Master Issue Report
**Generated:** 2026-07-31
**Session:** MyGenie Core POS Investigation Series
**Credentials for testing:** owner@18march.com / Qplazm@10 | owner@ruby.com / Qplazm@10

---

## Status Key
| Symbol | Meaning |
|--------|---------|
| ✅ FIXED | Applied and verified this session |
| 🔧 READY | Root cause confirmed, fix defined, awaiting Bug Fix Agent |
| 🕐 ON HOLD | Needs backend/external confirmation before fix |
| 📋 PLAN FIRST | Requires planning session before implementation |

---

## ✅ FIXED THIS SESSION — For Reference Only

### FIX-01 — Duplicate Order ID on Aggregator Card
**File:** `src/components/cards/OrderCard.jsx`
**What was wrong:** Aggregator order card showed the order ID twice in the header (e.g. `#LSEJ8FQP #LSEJ8FQP`). CR-118 set `order.customer = "#aggrId"` for TableCard. `getDisplayName()` returned it as customer name. Dedicated aggrId chip also rendered `#aggrId` → two identical tokens.
**Fix applied:** Added `if (isAggregator) return '';` as first line of `getDisplayName()`.
**Test report:** `/app/test_reports/iteration_1.json` — 100% pass

---

### FIX-02 — Cancelled Aggregator Order Not Removed from Dashboard (2 fixes)
**Files:** `src/api/transforms/aggregatorTransform.js`, `src/api/socket/socketHandlers.js`
**What was wrong:**
- Fix A: `fOrderStatus: od.f_order_status` had no Number() conversion. If UrbanPiper sends `"3"` (string), strict `=== 3` check failed → terminal detection missed → `updateOrder` called instead of `removeOrder`
- Fix B: Fallback path in `handleAggregatorOrderUpdate` always called `updateOrder` regardless of status. Cancelled orders arriving without full payload stayed on board forever
**Fix applied:** `Number(od.f_order_status)` + terminal check added to fallback path with `removeOrder`
**Test report:** `/app/test_reports/iteration_2.json` — 100% pass

---

### FIX-03 — Employee Dropdown: System/Default Roles Missing
**File:** `src/components/panels/employee/EmployeeListView.jsx`
**What was wrong:** `roleOptions = roles.filter(r => r.isEditable && r.active)` — system roles (Manager, Cashier, Waiter etc.) have `is_editable: false` from the backend. `isEditable` controls whether a role definition can be modified, NOT whether it can be assigned. All default roles were silently excluded from the dropdown.
**Fix applied:** Removed `r.isEditable &&` from all 3 occurrences (lines 69, 70, 191)
**Test report:** `/app/test_reports/iteration_3.json` — 100% pass. System roles BAR, CAPTAIN, KDS, MANAGER, OWNER, WAITER confirmed live.

---

## 🔧 READY FOR BUG FIX AGENT

---

### BUG-A — Aggregator Pop-up: Add-ons & Variants Not Displaying

**Module:** Aggregator Order Accept Pop-out
**Reported by:** User observation — `AggregatorOrderPopOut` shows items but no add-ons or variations below them
**Previously attempted:** BUG-282 added rendering code to pop-out (correct). CR-118 added data mapping. Both incomplete because the field path in the transform was wrong.

**Root cause:**
`aggregatorTransform.js` lines 111–121 reads add-on and variation data from the wrong level of the UrbanPiper response:

```
UrbanPiper food item structure:
  f  (outer food row)
   ├── f.quantity, f.price, f.food_level_notes …
   └── f.food_details  (fd)
         ├── fd.title        ← transform already reads from here ✓
         ├── fd.category     ← transform already reads from here ✓
         ├── fd.add_ons      ← CORRECT location (not being read)
         └── fd.variation    ← CORRECT location (not being read)

Current (wrong):
  addOns:    (f.add_ons   || [])   ← f.add_ons is undefined → always []
  variation:  f.variation || ...   ← f.variation is undefined → always []
```

The UI rendering code in `AggregatorOrderPopOut.jsx` is correct and ready — `item.addOns?.length > 0` renders the section. The component never shows anything because the data arrives empty.

**Fix — 2 lines, 1 file:**

| File | Line | Change |
|------|------|--------|
| `src/api/transforms/aggregatorTransform.js` | 111 | `(f.add_ons \|\| [])` → `(fd.add_ons \|\| f.add_ons \|\| [])` |
| `src/api/transforms/aggregatorTransform.js` | 116 | `f.variation \|\|` → `fd.variation \|\| f.variation \|\|` |

Fallback chain `fd.X || f.X` is safe — tries `food_details` first (correct for UrbanPiper), falls back to direct level for any edge case. Zero risk to currently working fields.

**Files touched:** `aggregatorTransform.js` only
**Risk:** Very low — if neither `fd.add_ons` nor `f.add_ons` exist → still returns `[]`, same as today

---

### BUG-B — Smart Purchase: Same Ingredient Listed Twice (Two Different Status Badges)

**Module:** Inventory → Smart Purchase → Main ingredient list
**Reported by:** Screenshot — BUDWISER PREMIUM appears once as "Low stock" and once as "In stock", both showing "Out of stock" status

**Root cause:**
`src/utils/purchasePlanner.js` — `computePlan()` builds three row groups:

```
1. velocityRows  → items with gap < 0  (consumption-based need)
2. alertRows     → items below min qty alert threshold
3. inStockRows   → items with gap >= 0  (when showAll=true)

Deduplication today:
  inPlan = new Set(velocityRows only)
  alertRows   filters: NOT in inPlan (velocityRows) ✓
  inStockRows filters: gap >= 0 — NO exclusion of alertRows items ✗

Result:
  An item with gap=0 AND a stock alert set → enters BOTH alertRows AND inStockRows
  → appears twice with different origin badges ("Low stock" + "In stock")
```

For BUDWISER PREMIUM (calQuantity=0, velocity=0 in 7-day window, minQtyAlert set):
- `gap = 0` → qualifies for `inStockRows` (origin='in_stock' → "In stock" badge)
- `calQuantity < minQtyAlert` → qualifies for `alertRows` (origin='stock_alert' → "Low stock" badge)
- NOT in velocityRows → no deduplication fires
- Appears twice in the list

**Fix — 3 lines, 1 file:**

After `alertRows` is computed, build a combined `alreadyCovered` set and apply it to `inStockRows` filter:

```
Before:
  inStockRows = showAll
    ? rows.filter(r => r.gap >= 0).map(...)
    : [];

After:
  const alreadyCovered = new Set([
    ...velocityRows.map(r => String(r.ingredient_id)),
    ...alertRows.map(r => String(r.ingredient_id)),
  ]);
  inStockRows = showAll
    ? rows.filter(r => r.gap >= 0 && !alreadyCovered.has(String(r.ingredient_id))).map(...)
    : [];
```

**Files touched:** `src/utils/purchasePlanner.js` only
**Risk:** Zero — items already shown via velocityRows or alertRows are simply not duplicated in inStockRows. No item is removed from the list, only de-duplicated.

---

### BUG-C — Smart Purchase: Same Ingredient Appears Twice in Purchase List

**Module:** Inventory → Smart Purchase → Purchase List (after clicking + Add)
**Reported by:** Screenshot — HEINKEN SILVER appears twice in purchase list with contradictory quantities (gap −100 qty 100, and gap 0 qty 0)

**Root cause:**
Direct cascade from BUG-B. `AutoShoppingList.jsx:104`:

```js
const purchaseRows = rows
  .filter(r => selectedForPurchase.has(r.ingredient_id));
```

`selectedForPurchase` is a Set of ingredient IDs (one entry per ID). When the user clicks `+ Add` for HEINKEN SILVER's "Low stock" row, `ingredient_id` enters the Set. Since `rows` contains HEINKEN SILVER **twice** (from BUG-B), both rows match the filter → both render in the purchase list:
- Row 1 (Low stock): gap −100, suggested qty 100 ← real
- Row 2 (In stock): gap 0, suggested qty 0 ← ghost duplicate

**Fix:**
**BUG-B fix automatically resolves BUG-C.** Once `computePlan` stops generating duplicate rows, `rows` will contain HEINKEN SILVER only once → `purchaseRows` filter returns only one entry → purchase list shows no duplicates.

No separate code change required for BUG-C.

**Files touched:** None (resolved by BUG-B fix)

---

### BUG-D — Silent Auto-Rejection: No Alert When Aggregator Order Times Out

**Module:** Dashboard → Aggregator order pop-out
**Reported by:** User accepted Order 1 (Swiggy), Order 2 (Zomato BU085Q89) disappeared from pop-out. Order ended up as `f_order_status=3`, `f_order_reason_code="CONNECTIVITY_ISSUE"` — auto-rejected by UrbanPiper because POS never called `Acknowledged` in time.

**What is and isn't a bug:**
- fos=3 → removed from dashboard → reports only = **correct behavior** ✓
- Cancellation fix (FIX-02) silently removes the order from board = **correct behavior** ✓
- **The gap:** Zero notification to staff when this happens. Order disappears with no explanation. Staff have no way to know a real customer order was lost and the customer received a "restaurant unavailable" rejection on Zomato/Swiggy.

**Root cause — notification gap only:**
`socketHandlers.js` — `handleAggregatorOrderUpdate` correctly calls `removeOrder` when `fos=3` arrives (after FIX-02). But it fires no alert. Staff see the pop-out close or the card vanish — indistinguishable from a normal dismiss.

**Fix — 1 targeted toast, 1 file:**

In `socketHandlers.js` → `handleAggregatorOrderUpdate`, before calling `removeOrder`:

```
When:
  isTerminal = true (fos === 3)
  AND order was previously unconfirmed (fos was 0 or 7 before this update)
  OR f_order_reason_code === "CONNECTIVITY_ISSUE"

Fire a warning toast:
  "Zomato order #BU085Q89 was auto-rejected — not accepted in time"
  (use aggr_id or orderId as identifier, use platform name from order.platform)
```

Implementation note: To know the previous status, check the current order in the orders list before calling `removeOrder`. If `existing.fOrderStatus === 0 || existing.fOrderStatus === 7`, the order was unconfirmed → fire the warning. Otherwise it was a staff-initiated cancel → no toast needed (normal flow).

**Files touched:** `src/api/socket/socketHandlers.js`
**Risk:** Very low — additive only, no logic change to removal flow

---

## 🕐 ON HOLD — Needs External Confirmation

### HOLD-01 — Aggregator "Served" Column: fos=5 on Dashboard

**Module:** Dashboard → Aggregator order cards → Served column
**Status:** Investigating with backend team — do not touch until confirmed

**Summary:** `fos=5` (Served) appears on dashboard for aggregator orders. After POS triggers `Dispatched`, orders are supposed to leave the dashboard (reports only). But some aggregator orders reach `fos=5` and stay on the board in the Served column with no action buttons.

**Open question for backend:** Is `f_order_status=5` pushed by UrbanPiper asynchronously after rider confirms delivery (acceptable — brief Served state before terminal `fos=6`)? OR is it set synchronously when POS sends `Dispatched` (in which case it should be terminal)?

**Pending action:** Backend team confirms. If `fos=5` should be terminal for aggregators → add `fos === 5` to `isTerminal` check in `socketHandlers.js:953`.

---

## 📋 PLAN FIRST — Needs Design/Backend Alignment

### PLAN-01 — Logout: POS API Not Called / Token Not Invalidated

**Module:** Auth → Logout flow
**Summary:** `authService.logout()` is local-only cleanup. No call to a POS logout endpoint. JWT token remains valid server-side until natural expiry. FCM push token not deregistered (notifications keep arriving after logout). CRM token not invalidated on CRM backend.

**Why plan first:**
- Backend logout endpoint path must be confirmed (`/api/v1/auth/vendoremployee/logout` assumed but not verified)
- Need to decide: JWT blacklist or session-based invalidation?
- Firebase `deleteToken(messaging)` call needs Firebase SDK access in `NotificationContext`
- `authService.logout()` must become async — all callers need updating (`AuthContext`, `Sidebar`)
- Error handling: logout must always clear local state even if API call fails

**Recommended planning items:**
1. Confirm backend logout endpoint URL and method
2. Confirm whether CRM has a logout endpoint
3. Decide on Firebase deregistration scope (same session only vs all devices)
4. Map all callers of `authService.logout()` for async refactor

---

## Summary Table — All Issues

| ID | Issue | Module | Files | Status |
|----|-------|--------|-------|--------|
| FIX-01 | Duplicate order ID on aggregator card | Dashboard | `OrderCard.jsx` | ✅ FIXED |
| FIX-02 | Cancelled aggregator order not removed | Dashboard | `aggregatorTransform.js`, `socketHandlers.js` | ✅ FIXED |
| FIX-03 | System roles missing from employee dropdown | Employee Mgmt | `EmployeeListView.jsx` | ✅ FIXED |
| BUG-A | Add-ons/variants blank in aggregator pop-up | Dashboard | `aggregatorTransform.js` | ✅ FIXED — iteration_4.json |
| BUG-B | Same ingredient listed twice in Smart Purchase | Inventory | `purchasePlanner.js` | ✅ FIXED — iteration_4.json |
| BUG-C | Ingredient appears twice in purchase list | Inventory | *(resolved by BUG-B)* | ✅ FIXED — iteration_4.json |
| BUG-D | No alert when aggregator order auto-rejected | Dashboard | `socketHandlers.js` | ✅ FIXED — iteration_4.json |
| HOLD-01 | Aggregator fos=5 stays on dashboard | Dashboard | `socketHandlers.js` | 🕐 ON HOLD |
| PLAN-01 | Logout does not call POS API | Auth | `authService.js` + Firebase | 📋 PLAN FIRST |
