# Implementation Plan — BATCH-02: Settings Gate Sweep + Search + Discount Reason
**Items:** BUG-339 (P1), BUG-329 (P2), BUG-331 (P1), BUG-330 (P1), BUG-332 (P2)
**Date:** 2026-08-19
**Role:** PLANNING (Gate 3)
**Impact Analysis:** `/app/memory/impact/BATCH-02_IMPACT_ANALYSIS.md`
**Status:** AWAITING GATE 4 GO — do not implement until owner approves

---

## Entry Verification (confirmed 2026-08-19)

| File | Plan expects | Confirmed? |
|---|---|---|
| `OrderEntry.jsx:322` | `const isItemCancelAllowed = useCallback((item) => {` | ✅ |
| `OrderEntry.jsx:323` | `return canCancelItem;` | ✅ |
| `profileTransform.js:134` | `deliveryAssign: toBoolean(api.delivery_assign),` | ✅ |
| `profileTransform.js:135` | `},` (closes features block) | ✅ |
| `CartPanel.jsx:6` | `import { useSettings } from "../../contexts/SettingsContext";` | ✅ |
| `CartPanel.jsx:1279` | `{!qsrMode && cartItems.some(i => !i.placed) && orderType !== 'dineIn' && !isRoom && (` | ✅ |
| `DashboardPage.jsx:168` | `const { isLoaded: restaurantLoaded, currencySymbol, cancellation, features, defaultOrderStatus, settings } = useRestaurant();` | ✅ |
| `DashboardPage.jsx:1238` | `}, [searchQuery, activeChannels, allTablesList, allRoomsList, deliveryOrders, takeAwayOrders, walkInOrders, orderItemsByTableId]);` | ✅ |
| `RestaurantSettingsPage.jsx:386` | `options={[{ value: 'Normal', label: 'Normal' }, { value: 'Hotel', label: 'Hotel' }]}` | ✅ |
| `DiscountReportMockup.jsx:71` | `const byEmployee = rawData.by_employee \|\| [];` | ✅ |
| `DiscountReportMockup.jsx:72` | `return { summary: s, daily, byEmployee, total: s.total \|\| 0 };` | ✅ |
| `DiscountReportMockup.jsx:133` | `</div>` (closes Daily Table div) | ✅ |

---

## Execution Order (MANDATORY — implement in this sequence)

```
Pass 1 — Safe files (no hotspot):
  EDIT 1: BUG-339 → RestaurantSettingsPage.jsx (1 line)
  EDIT 2: BUG-329 → DiscountReportMockup.jsx (2 edits)
  EDIT 3: BUG-331a → profileTransform.js (1 line)
  EDIT 4: BUG-331b → CartPanel.jsx (2 edits)

Pass 2 — Hotspot files (separate, each needs regression check before next):
  EDIT 5: BUG-330 → OrderEntry.jsx (hotspot R5)
  EDIT 6: BUG-332 → DashboardPage.jsx (hotspot R5)
```

---

## EDIT 1 — BUG-339: Add Food Court option
**File:** `src/pages/RestaurantSettingsPage.jsx`
**Risk:** LOW

```
Line 386 (current):
  options={[{ value: 'Normal', label: 'Normal' }, { value: 'Hotel', label: 'Hotel' }]}

CHANGE TO:
  options={[{ value: 'Normal', label: 'Normal' }, { value: 'Hotel', label: 'Hotel' }, { value: 'food_court', label: 'Food Court' }]} // BUG-339
```

**Verification:** Open `/restaurant-settings` Step 1 → Restaurant Type dropdown → "Food Court" option present.

---

## EDIT 2 — BUG-329: Parse + render orders_table (Discount Reason)
**File:** `src/pages/reports-module/DiscountReportMockup.jsx`
**Risk:** LOW-MEDIUM

### Edit 2a — Parse orders_table in analytics useMemo

```
Lines 71–72 (current):
    const byEmployee = rawData.by_employee || [];
    return { summary: s, daily, byEmployee, total: s.total || 0 };

CHANGE TO:
    const byEmployee = rawData.by_employee || [];
    const ordersTable = rawData.orders_table || []; // BUG-329: per-order discount reasons
    return { summary: s, daily, byEmployee, ordersTable, total: s.total || 0 };
```

### Edit 2b — Add Discount Orders table section

```
Line 133 (current):
              </div>
            </div>)}</div>

CHANGE TO:
              </div>
              {/* BUG-329: Discount Orders — shows per-order discount_for reason */}
              {analytics.ordersTable.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s26-orders-table">
                  <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Discount Orders</h2></div>
                  <table className="w-full">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Order #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Reason</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Discount</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.ordersTable.map((row, i) => (
                        <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50">
                          <td className="px-6 py-3 text-sm font-medium text-zinc-800">#{row.restaurant_order_id || row.order_id}</td>
                          <td className="px-4 py-3 text-sm text-zinc-600">{row.order_date || '—'}</td>
                          <td className="px-4 py-3 text-sm text-zinc-700">{row.discount_for || '—'}</td>
                          <td className="px-4 py-3 text-sm text-right text-zinc-700">{fmtINR(row.order_discount || 0)}</td>
                          <td className="px-6 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR(row.total_discount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>)}</div>
```

**Verification:** Open Discount Report → if `orders_table` has rows → "Discount Orders" section visible with Reason column. If empty (zero discounts in period) → section hidden (gate `> 0`).

---

## EDIT 3 — BUG-331a: Add scheduleOrderEnabled to profileTransform
**File:** `src/api/transforms/profileTransform.js`
**Risk:** MEDIUM

```
Lines 133–135 (current):
        serviceCharge: toBoolean(api.service_charge),
        deliveryAssign: toBoolean(api.delivery_assign),
      },

CHANGE TO:
        serviceCharge: toBoolean(api.service_charge),
        deliveryAssign: toBoolean(api.delivery_assign),
        scheduleOrderEnabled: toBoolean(api.schedule_order), // BUG-331
      },
```

**Verification:** After login, `restaurant.features.scheduleOrderEnabled` is accessible from `useRestaurant()`. Value matches the "Schedule Orders" setting in Settings Step 5.

---

## EDIT 4 — BUG-331b: Gate schedule section in CartPanel
**File:** `src/components/order-entry/CartPanel.jsx`
**Risk:** MEDIUM

### Edit 4a — Add useRestaurant import

```
Line 6 (current):
import { useSettings } from "../../contexts/SettingsContext";

CHANGE TO:
import { useSettings } from "../../contexts/SettingsContext";
import { useRestaurant } from "../../contexts"; // BUG-331
```

### Edit 4b — Destructure features inside component (after useSettings call at line 803)

```
Line 803 (current):
  const { enableDynamicTables } = useSettings();

CHANGE TO:
  const { enableDynamicTables } = useSettings();
  const { features } = useRestaurant(); // BUG-331
```

### Edit 4c — Add scheduleOrderEnabled gate to wrapper condition

```
Line 1279 (current):
        {!qsrMode && cartItems.some(i => !i.placed) && orderType !== 'dineIn' && !isRoom && (

CHANGE TO:
        {!qsrMode && features?.scheduleOrderEnabled !== false && cartItems.some(i => !i.placed) && orderType !== 'dineIn' && !isRoom && (
```

**Why `!== false`:** If `scheduleOrderEnabled` is `undefined` (profile not loaded or old profile without this field), defaults to visible — no regression.

**Verification:** Settings Step 5 → "Schedule Orders" OFF → Save → open Order Entry on a Takeaway order → schedule checkbox is completely absent. Re-enable → checkbox reappears (BUG-337 ensures fresh profile on save).

---

## EDIT 5 — BUG-330: Gate isItemCancelAllowed on allowPostServeCancel
**File:** `src/components/order-entry/OrderEntry.jsx`
**Risk:** HIGH — HOTSPOT R5
**⚠️ Implement in isolated pass. Run regression check immediately after.**

```
Lines 322–324 (current):
  const isItemCancelAllowed = useCallback((item) => {
    return canCancelItem;
  }, [canCancelItem]);

CHANGE TO:
  const isItemCancelAllowed = useCallback((item) => {
    if (!canCancelItem) return false;
    // BUG-330: block cancel on post-serve items when allowPostServeCancel is OFF
    if (item.status !== 'preparing' && cancellation?.allowPostServeCancel === false) return false;
    return true;
  }, [canCancelItem, cancellation?.allowPostServeCancel]);
```

**Why `=== false`:** If `allowPostServeCancel` is `undefined` (old profile), defaults to allow — no regression on existing restaurants.

**`cancellation` is already in scope** at line 55:
`const { restaurant, features, cancellation, settings, printerAgents } = useRestaurant();`

**Regression checklist (R5 — mandatory before moving to EDIT 6):**
1. Place an order → item in "preparing" state → cancel button visible → click cancel → works ✅
2. Place an order → mark item as "ready/served" → cancel button visible IF allowPostServeCancel=true ✅
3. Settings → "Cancel After Serve" OFF → save → served item → cancel button hidden ✅
4. Walk-in order cancel still works ✅

**Verification:** Settings Step 5 → "Cancel After Serve" OFF → Save → mark an item as Ready/Served → cancel icon absent on that item. "Preparing" items still show cancel.

---

## EDIT 6 — BUG-332: Wire searchOptions to Dashboard search
**File:** `src/pages/DashboardPage.jsx`
**Risk:** MEDIUM — HOTSPOT R5
**⚠️ Implement in isolated pass after EDIT 5 regression check passes.**

### Edit 6a — Add searchOptions to useRestaurant destructure

```
Line 168 (current):
  const { isLoaded: restaurantLoaded, currencySymbol, cancellation, features, defaultOrderStatus, settings } = useRestaurant(); // CR-056: added settings

CHANGE TO:
  const { isLoaded: restaurantLoaded, currencySymbol, cancellation, features, defaultOrderStatus, settings, searchOptions } = useRestaurant(); // CR-056: added settings; BUG-332: searchOptions
```

### Edit 6b — Filter all:[] arrays inside searchResults useMemo + add searchOptions to deps

```
Lines 1161–1238 (current searchResults useMemo):
  const searchResults = useMemo(() => {
    ...
    if (!searchQuery.trim()) return results;
    const query = searchQuery.toLowerCase().trim();

    if (activeChannels.includes("dineIn")) {
      ...
      results.tables = searchItems(allSearchableTables, query, item => ({
        id: item.id,
        all: [item.label || item.id, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("delivery")) {
      results.delivery = searchItems(deliveryOrders, query, item => ({
        id: String(item.orderId),
        all: [item.orderNumber, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("takeAway")) {
      results.takeAway = searchItems(takeAwayOrders, query, item => ({
        id: String(item.orderId),
        all: [item.orderNumber, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("room")) {
      ...
      results.rooms = searchItems(enrichedRooms, query, item => ({
        id: item.id,
        all: [item.id, item.guestName || item.guest || ""]
      }));
    }

    return results;
  }, [searchQuery, activeChannels, allTablesList, allRoomsList, deliveryOrders, takeAwayOrders, walkInOrders, orderItemsByTableId]);

TARGETED CHANGES (3 insertions + 1 dep update):

A) After `const query = searchQuery.toLowerCase().trim();` — insert:
    // BUG-332: respect restaurant searchOptions setting; empty = no restriction
    const opts = searchOptions?.length ? searchOptions : ['order id', 'table no', 'phone no', 'user id'];

B) Replace tables all:[]:
    all: [item.label || item.id, item.customer, item.phone]
    → all: [opts.includes('table no') && (item.label || item.id), opts.includes('user id') && item.customer, opts.includes('phone no') && item.phone].filter(Boolean)

C) Replace delivery all:[] (line 1212):
    all: [item.orderNumber, item.customer, item.phone]
    → all: [opts.includes('order id') && item.orderNumber, opts.includes('user id') && item.customer, opts.includes('phone no') && item.phone].filter(Boolean)

D) Replace takeAway all:[] (line 1219):
    all: [item.orderNumber, item.customer, item.phone]
    → all: [opts.includes('order id') && item.orderNumber, opts.includes('user id') && item.customer, opts.includes('phone no') && item.phone].filter(Boolean)

E) Replace rooms all:[] (line 1231):
    all: [item.id, item.guestName || item.guest || ""]
    → all: [opts.includes('table no') && item.id, opts.includes('user id') && (item.guestName || item.guest || '')].filter(Boolean)

F) Deps array (line 1238):
    }, [searchQuery, activeChannels, allTablesList, allRoomsList, deliveryOrders, takeAwayOrders, walkInOrders, orderItemsByTableId]);
    → }, [searchQuery, activeChannels, allTablesList, allRoomsList, deliveryOrders, takeAwayOrders, walkInOrders, orderItemsByTableId, searchOptions]); // BUG-332
```

**Regression checklist (R5 — mandatory):**
1. Type order number in search → matching Takeaway order appears ✅
2. Type customer name → matching tables appear ✅
3. Type phone number → matching orders appear ✅
4. No search options configured (defaults) → all results still appear ✅
5. Dashboard still loads, no errors ✅

**Verification:** Settings Step 5 → searchBy = only `['phone no']` → save → Dashboard search by phone shows results → search by order number shows NO results (filtered out).

---

## Verification Matrix

| # | Edit | File | How to Verify | Auto? |
|---|---|---|---|---|
| 1 | BUG-339: Food Court option | `RestaurantSettingsPage.jsx` | Step 1 dropdown shows "Food Court" | Browser |
| 2 | BUG-329: ordersTable parsed | `DiscountReportMockup.jsx` | analytics.ordersTable populated from rawData.orders_table | Code |
| 3 | BUG-329: orders table renders | `DiscountReportMockup.jsx` | "Discount Orders" section visible when data exists; hidden when empty | Browser |
| 4 | BUG-331a: scheduleOrderEnabled added | `profileTransform.js` | restaurant.features.scheduleOrderEnabled truthy after login | Code |
| 5 | BUG-331b: import + destructure | `CartPanel.jsx` | features.scheduleOrderEnabled readable in CartPanel | Code |
| 6 | BUG-331b: schedule hidden | `CartPanel.jsx` | Schedule checkbox absent when scheduleOrderEnabled=false | Browser |
| 7 | BUG-331b: default visible | `CartPanel.jsx` | Schedule checkbox visible when scheduleOrderEnabled=true/undefined | Browser |
| 8 | BUG-330: pre-serve always cancellable | `OrderEntry.jsx` | preparing item → cancel shows regardless of setting | Browser |
| 9 | BUG-330: post-serve gated | `OrderEntry.jsx` | allowPostServeCancel=false → cancel hidden on served items | Browser |
| 10 | BUG-330: undefined safe | `OrderEntry.jsx` | cancellation undefined → cancel still works (=== false guard) | Code |
| 11 | BUG-332: searchOptions destructured | `DashboardPage.jsx` | no runtime error; searchOptions in scope | Code |
| 12 | BUG-332: restricted search | `DashboardPage.jsx` | searchBy=['phone no'] → phone search works, order id search returns nothing | Browser |
| 13 | BUG-332: empty = no restriction | `DashboardPage.jsx` | searchOptions=[] → all fields still searched | Browser |
| 14 | Regression: BUG-337 roundtrip | `RestaurantSettingsPage.jsx` | After save, scheduleOrderEnabled refreshed in context (no reload needed) | Browser |

---

## Risk Register

| Risk | Item | Likelihood | Mitigation |
|---|---|---|---|
| `allowPostServeCancel` undefined on old profile | BUG-330 | LOW | `=== false` guard — undefined defaults to allow |
| `scheduleOrderEnabled` undefined on old profile | BUG-331 | LOW | `!== false` guard — undefined defaults to visible |
| `searchOptions` undefined | BUG-332 | LOW | `opts` fallback to all 4 options |
| `filter(Boolean)` removes valid zero/empty values | BUG-332 | LOW | All fields are string IDs/names — falsy only when field is `false` (not included) |
| CartPanel double-context calls | BUG-331 | LOW | React contexts are cached per provider — no performance impact |
| DashboardPage search returns empty on misconfigured searchOptions | BUG-332 | LOW | Empty fallback ensures no blank results |
| DiscountReportMockup orders_table row shape unknown (empty during test) | BUG-329 | MEDIUM | All field reads use `|| '—'` / `|| 0` guards |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-329 → status: IMPLEMENTED, sprint_key: pos_5_x
- [ ] registry.json: BUG-330 → status: IMPLEMENTED, sprint_key: pos_5_x
- [ ] registry.json: BUG-331 → status: IMPLEMENTED, sprint_key: pos_5_x
- [ ] registry.json: BUG-332 → status: IMPLEMENTED, sprint_key: pos_5_x
- [ ] registry.json: BUG-339 → status: IMPLEMENTED, sprint_key: pos_5_x
- [ ] BUG_TRACKER.md: all 5 rows updated
- [ ] FILE_OWNERSHIP.md: all 6 files listed with BUG IDs + date
- [ ] Code markers: // BUG-XXX comment in every modified file
- [ ] webpack compiles with 0 new warnings
```

---

## Scope Lock

**Files WILL change (6):**
1. `src/pages/RestaurantSettingsPage.jsx` — BUG-339 (1 line)
2. `src/pages/reports-module/DiscountReportMockup.jsx` — BUG-329 (~30 lines)
3. `src/api/transforms/profileTransform.js` — BUG-331 (1 line)
4. `src/components/order-entry/CartPanel.jsx` — BUG-331 (3 lines)
5. `src/components/order-entry/OrderEntry.jsx` — BUG-330 (3 lines + dep update)
6. `src/pages/DashboardPage.jsx` — BUG-332 (~10 lines)

**Files will NOT touch:**
- `restaurantSettingsTransform.js` — save/load already correct
- `CollectPaymentPanel.jsx` — no billing change
- `orderTransform.js` — no payload change
- `OrderCard.jsx` — receives isItemCancelAllowed as callback; no change
- `insightsService.js` — fetchInsightsDiscounts passes through orders_table already

---

## Gate 4 GO Required

Per AGENT_PROMPT_ALPHA.md Owner Approval Matrix:
- BUG-330 touches OrderEntry (R5 hotspot) + cancel flow → **owner approval mandatory**
- BUG-332 touches DashboardPage (R5 hotspot) → **owner approval mandatory**
- BUG-329, BUG-331, BUG-339 are LOW-MEDIUM risk — covered by same Gate 4 GO

```
OWNER APPROVAL REQUIRED
Reason: 2 hotspot files (OrderEntry + DashboardPage) + cancel flow (HIGH risk)
Risk: HIGH (BUG-330, BUG-332), MEDIUM (BUG-331), LOW (BUG-329, BUG-339)
Proposed: All 5 in one implementation session. ~48 lines across 6 files.
Awaiting Gate 4 GO.
```

---

Planning complete: BATCH-02
Stage: Implementation Plan (Gate 3)
Code reality: FULL on all 5 items
Risk: HIGH (BUG-330, BUG-332) + MEDIUM (BUG-331) + LOW (BUG-329, BUG-339)
Files WILL change: RestaurantSettingsPage.jsx, DiscountReportMockup.jsx, profileTransform.js, CartPanel.jsx, OrderEntry.jsx, DashboardPage.jsx
Files WILL NOT touch: restaurantSettingsTransform.js, CollectPaymentPanel.jsx, orderTransform.js, OrderCard.jsx, insightsService.js
Owner decisions: NONE
Next: Gate 4 GO → Implementation
