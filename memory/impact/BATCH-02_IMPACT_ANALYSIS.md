# Impact Analysis — BATCH-02: Settings Gate Sweep + Search + Discount Reason
**Items:** BUG-330 (P1), BUG-331 (P1), BUG-332 (P2), BUG-339 (P1), BUG-329 (P2)
**Date:** 2026-08-19
**Role:** PLANNING (Gate 2)
**Status:** COMPLETE — awaiting Gate 3 (Implementation Plans)

---

## Code Reality (Step 0)

| ID | Reality | Location |
|---|---|---|
| BUG-330 | FULL — bug at `OrderEntry.jsx:322-324`, `allowPostServeCancel` in scope at line 55 | `OrderEntry.jsx` |
| BUG-331 | FULL — `schedule_order` absent from `profileTransform`, CartPanel renders unconditionally at line 1279 | `profileTransform.js`, `CartPanel.jsx` |
| BUG-332 | FULL — `searchItems` at `DashboardPage.jsx:84` hardcodes `all:[]`, `searchOptions` available but never consumed | `DashboardPage.jsx` |
| BUG-339 | FULL — `RestaurantSettingsPage.jsx:386` options array missing `food_court` | `RestaurantSettingsPage.jsx` |
| BUG-329 | FULL — `DiscountReportMockup.jsx:71` never reads `rawData.orders_table`; `orders_table` confirmed in API | `DiscountReportMockup.jsx` |

---

## Conflict Pre-Check (Step 1)

| File | Last Modified By | In-flight Conflict? |
|---|---|---|
| `OrderEntry.jsx` | BUG-246 (2026-07-24) — item merge; BUG-281 (2026-07-31) — custGST | ⚠️ **HOTSPOT (R5)** — no active in-flight items. Gate 3 plan must include regression checklist. |
| `profileTransform.js` | BUG-144 (token display), CR-056 (showScanPopup) | ✅ No conflict. Additive addition inside `features` block. |
| `CartPanel.jsx` | BUG-304 (2026-08-11) — taxTotals discountable buckets at lines 805-819 | ✅ No conflict. BUG-331 touches line 1279 (wrapper condition). |
| `DashboardPage.jsx` | CR-097 (2026-07-23) — auto-settle queue | ⚠️ **HOTSPOT (R5)** — no active in-flight items. Gate 3 plan must include regression checklist. |
| `RestaurantSettingsPage.jsx` | BATCH-01 BUG-337 (2026-08-18) — profile re-fetch | ✅ No conflict. BUG-339 touches line 386 (options array). BATCH-01 change was at line 285. |
| `DiscountReportMockup.jsx` | CR-011 Phase 3 (2026-06-16) — initial build | ✅ No conflict. Additive new section. |

---

## BUG-330 — Cancel After Serve Gate

### Data Flow
```
Settings Step 5: "Cancel After Serve" toggle → canclePostServe (boolean)
  → restaurantSettingsTransform.js:141 → saved as cancle_post_serve
  → profileTransform.js:222 → restaurant.cancellation.allowPostServeCancel (toBoolean)
  → RestaurantContext → available via useRestaurant()

OrderEntry.jsx:55:
  const { restaurant, features, cancellation, ... } = useRestaurant();
  → cancellation.allowPostServeCancel IS in scope ✅

OrderEntry.jsx:307:   canCancelItem = hasPermission('food')
OrderEntry.jsx:322–324 (isItemCancelAllowed):
  return canCancelItem;  ← NEVER reads allowPostServeCancel ← BREAK
```

### What "post-serve" means in code
```
orderTransform.js:953:
  cancel_type: item.status === 'preparing' ? 'Pre-Serve' : 'Post-Serve'
→ Post-serve = item.status !== 'preparing' (includes 'ready', 'served', etc.)
→ Gate should fire when: item is NOT 'preparing' AND allowPostServeCancel is false
```

### Fix Scope
- **1 file:** `OrderEntry.jsx`
- **Lines 322–324** (isItemCancelAllowed callback)
- Add 2 lines inside callback + add dep to useCallback array
- `cancellation` already in scope — no new imports or context reads

### Risk: HIGH
- OrderEntry is R5 hotspot
- Cancel flow touches order state — regression test mandatory
- Change is additive guard (early return) — does NOT alter logic when `allowPostServeCancel = true`

### Downstream
- `isItemCancelAllowed` is passed to `OrderCard` via CartPanel props (line 2531)
- No other consumers

---

## BUG-331 — Schedule Order Gate

### Data Flow
```
Settings Step 5: "Schedule Orders" toggle → scheduleOrder (boolean)
  → restaurantSettingsTransform.js:143 → scheduleOrder: toBool(basic.schedule_order) ✅
  → restaurantSettingsTransform.js (toAPI) → schedule_order: toYesNo(s5.scheduleOrder) ✅

profileTransform.js: schedule_order → NOT MAPPED ← BREAK POINT 1
  → restaurant.features does NOT contain scheduleOrderEnabled

CartPanel.jsx:1279 (outer wrapper):
  {!qsrMode && cartItems.some(i => !i.placed) && orderType !== 'dineIn' && !isRoom && (
    <label data-testid="schedule-order-checkbox">  ← always renders ← BREAK POINT 2
```

### Fix Scope — 2 files
**File 1: `profileTransform.js`**
- Line 134: after `deliveryAssign: toBoolean(api.delivery_assign),` — add:
  `scheduleOrderEnabled: toBoolean(api.schedule_order), // BUG-331`
- Pattern: identical to all other features flags in the block (lines 127–134)

**File 2: `CartPanel.jsx`**
- Add `import { useRestaurant } from "../../contexts";` (CartPanel already imports `useSettings` from contexts — pattern established)
- Destructure `const { features } = useRestaurant();` inside component
- Line 1279: extend condition:
  `{!qsrMode && features?.scheduleOrderEnabled !== false && cartItems.some(...)  && ...`
- Using `!== false` guard: if flag is undefined (old profile), default to visible (safe)

### Why NOT touching OrderEntry (hotspot)
CartPanel already imports `useSettings` from contexts (confirmed line 6). Adding `useRestaurant` follows the same pattern — no prop threading through the hotspot required.

### Risk: MEDIUM
- profileTransform is a shared transform — read by ALL profile consumers
- Change is additive (new field) — no existing logic disturbed
- CartPanel change is a wrapper condition — hidden when false, visible otherwise
- `scheduleOrderEnabled !== false` guard: undefined → visible (safe, no regression)

### Downstream
- `isScheduled` prop flows from OrderEntry → CartPanel → order payload
- When schedule is hidden: `isScheduled` remains `false` (unchanged) — no payload impact

---

## BUG-332 — Search By Gate

### Data Flow
```
Settings Step 5: searchBy multi-select → saved as search_by array
  → restaurantSettingsTransform.js:154 → searchBy: Array.isArray(advanced.search_by) ? ...
  → profileTransform.js:232:
      searchOptions: api.search_by || ['order id', 'table no', 'user id'] ✅ MAPPED

DashboardPage.jsx:168 (useRestaurant destructure):
  const { isLoaded, currencySymbol, cancellation, features, defaultOrderStatus, settings } = useRestaurant();
  → searchOptions NOT destructured ← BREAK POINT 1

DashboardPage.jsx:84 (searchItems helper):
  const searchItems = (items, query, getFields) => { ... }
  → called with hardcoded all:[] at lines 1205, 1212, 1219, 1231 ← BREAK POINT 2

  Line 1205: all: [item.label || item.id, item.customer, item.phone]  // ← hardcoded
  Line 1212: all: [item.orderNumber, item.customer, item.phone]       // ← hardcoded
  Line 1219: all: [item.orderNumber, item.customer, item.phone]       // ← hardcoded
  Line 1231: all: [item.id, item.guestName || item.guest || ""]       // ← hardcoded
```

### searchOptions → field mapping
| Value in searchOptions | Field |
|---|---|
| `'order id'` | `item.orderNumber` / `item.id` |
| `'table no'` | `item.label` / `item.id` |
| `'phone no'` | `item.phone` |
| `'user id'` | `item.customer` (customer name) |

### Empty array rule
`searchOptions = []` → no restriction → treat as all fields (same as current behaviour).
Use: `const opts = (searchOptions?.length ? searchOptions : ['order id','table no','phone no','user id']);`

### Fix Scope — 1 file: `DashboardPage.jsx`
1. Line 168: add `searchOptions` to `useRestaurant()` destructure
2. Lines 1205, 1212, 1219, 1231: replace hardcoded `all:[]` with `opts`-filtered arrays
3. Build a helper inline or small const to map opts → fields per channel type

### Risk: MEDIUM
- DashboardPage is R5 hotspot
- Change is at the `getFields` function level — does NOT touch search rendering, dropdown, or table display logic
- `searchOptions` read from context (already available) — no API call
- `!== false` pattern not needed here — empty fallback handles undefined

### Downstream
- `searchResults` useMemo (line 1161) depends on `searchItems` calls — will recompute when `searchOptions` changes
- `matchingTableIds`, `matchingRoomIds` etc. are derived from `searchResults` — correct reactivity through existing chain
- No UI rendering changes needed

---

## BUG-339 — Food Court Option

### Data Flow
```
RestaurantSettingsPage.jsx:386 (SelectInput options):
  options={[
    { value: 'Normal', label: 'Normal' },
    { value: 'Hotel',  label: 'Hotel'  }
    ← { value: 'food_court', label: 'Food Court' } MISSING
  ]}

restaurantSettingsTransform.js:38:
  restaurantFor: basic.restaurant_for || 'Normal'   ← handles any string ✅
restaurantSettingsTransform.js (toAPI):
  restaurant_for: s1.restaurantFor                  ← passes through as-is ✅

No transform change needed. Backend accepts 'food_court' string.
```

### Fix Scope — 1 file: `RestaurantSettingsPage.jsx`
- **Line 386:** add `{ value: 'food_court', label: 'Food Court' }` to options array

### Risk: LOW
- UI-only change (new dropdown option)
- No logic, no API contract change
- Downstream unlock: CR-161 StationsTab shows `station_gst` when `restaurantFor === 'food_court'`
- Fast Lane eligible per original intake doc

### Downstream
- `restaurantSettingsTransform.js` passes `restaurant_for` through unchanged — safe
- `profileTransform.js` does not currently surface `restaurant_for` (it's not gated on profile) — no action needed

---

## BUG-329 — Discount Reason Column

### Data Flow
```
API: POST /api/v2/vendoremployee/report/insights-discounts
  Response (confirmed 2026-08-19):
    summary: { manual_discount, coupon_discount, loyalty_discount, comp_total, total }
    daily: [{ date, manual, coupon, loyalty, comp }]
    by_employee: [{ name, manual_discount, coupon_applied, comp_count }]
    coupons: []
    orders_table: []   ← NEW key — per-order rows, contains discount_for
                         (empty when no discounts; discount_for: null when no reason)

DiscountReportMockup.jsx:71–72 (analytics useMemo):
  const byEmployee = rawData.by_employee || [];
  return { summary, daily, byEmployee, total };
  ← ordersTable NOT parsed ← BREAK POINT

DiscountReportMockup.jsx has: Daily table, By Employee table
← No "By Reason / Order Detail" section
```

### Fix Scope — 1 file: `DiscountReportMockup.jsx`
1. **Line 71:** add `const ordersTable = rawData.orders_table || [];`
2. **Line 72:** add `ordersTable` to returned analytics object
3. **After By Employee table (~line 138):** add new "Discount Orders" section — table showing:
   - `order_id` / `restaurant_order_id` (order reference)
   - `discount_for` (reason — show "—" when null)
   - `order_discount` (manual discount amount)
   - `total_discount`
   - `order_date`
4. Gate section: only render when `analytics.ordersTable.length > 0`

### Risk: LOW-MEDIUM
- Reports module — display only, no order flow
- Additive new section — existing Daily + By Employee tables untouched
- `orders_table` may be empty (new backend field) — gate handles this gracefully

### Downstream
- `buildExportPayload` (line 75) can optionally add `orders_table` as a new sheet — out of scope for this fix (additive, low risk to skip)

---

## Scope Declaration

### Files WILL Change
| File | Items | Nature |
|---|---|---|
| `src/components/order-entry/OrderEntry.jsx` | BUG-330 | ~3 lines in isItemCancelAllowed + dep array update |
| `src/api/transforms/profileTransform.js` | BUG-331 | 1 line — add scheduleOrderEnabled to features block |
| `src/components/order-entry/CartPanel.jsx` | BUG-331 | +1 import, +1 destructure, wrapper condition extended |
| `src/pages/DashboardPage.jsx` | BUG-332 | Add searchOptions to destructure + update 4 all:[] calls |
| `src/pages/RestaurantSettingsPage.jsx` | BUG-339 | 1 line — add food_court option |
| `src/pages/reports-module/DiscountReportMockup.jsx` | BUG-329 | +1 analytics field + new table section (~25 lines) |

### Files Will NOT Touch
- `restaurantSettingsTransform.js` — passes through correctly already
- `CollectPaymentPanel.jsx` — no tax/financial impact
- `orderTransform.js` — no payload change
- `OrderCard.jsx` — receives `isItemCancelAllowed` as callback, no change needed
- `insightsService.js` — `fetchInsightsDiscounts` returns raw data including new `orders_table` already

### Hotspot Files Involved: 2
- `OrderEntry.jsx` (R5) — BUG-330: change is additive 2-line guard, no logic restructure
- `DashboardPage.jsx` (R5) — BUG-332: change at `getFields` helper, no render/state logic touched

---

## Execution Order (Gate 3 will specify exact sequence)

```
Batch A (no hotspot dependency):
  1. BUG-339 — RestaurantSettingsPage.jsx:386 (1 line, Fast Lane candidate)
  2. BUG-329 — DiscountReportMockup.jsx (new section, ~25 lines, safe)
  3. BUG-331a — profileTransform.js (1 line, additive)

Batch B (complete Batch A first):
  4. BUG-331b — CartPanel.jsx (import + wrapper condition)
  5. BUG-330 — OrderEntry.jsx (hotspot — isolated session, regression check)
  6. BUG-332 — DashboardPage.jsx (hotspot — isolated session, regression check)
```

---

## Owner Decisions
None — all OQs resolved. No remaining questions before Gate 3.

---

**Gate 2 Complete.**
**Next: Gate 3 — Implementation Plans (one doc per item or combined)**
**Files: 6 changed, ~40 total lines, 2 hotspot files (BUG-330, BUG-332)**
