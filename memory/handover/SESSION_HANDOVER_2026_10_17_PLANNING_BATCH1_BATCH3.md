# Session Handover — 2026-10-17 — PLANNING AGENT: Batch 1 + Batch 3

**Role this session:** INTAKE
**Date:** 2026-10-17
**Next agent role:** PLANNING (Gate 2 — Impact Analysis)
**Code changed:** NO

---

## Context: What Happened This Session

Full investigation + intake of 20 items across Reports, Order Entry, and Inventory.
Two FE-fixable batches are now GATE_1_INTAKE_COMPLETE and ready for Planning Gate 2.
Investigation report: `/app/memory/investigations/REPORTS_BATCH_INVESTIGATION_2026_10_17.md`

---

## YOUR JOB — Two batches, Gate 2 Impact Analysis

Owner has approved both batches for planning.
Run Gate 2 (Impact Analysis) for each item below.
Do NOT write implementation plans yet — owner must see Impact Analysis first and give Gate 3 GO.

---

## BATCH 1 — Reports FE Fix (6 items)
**Intake doc:** `/app/memory/change_requests/BATCH_REPORTS_FE_FIX_001_INTAKE_2026_10_17.md`

---

### BUG-354 — Order Report Status Column Null / Raw Value
**P2 / LOW / Fast Lane eligible**

**Root cause (confirmed):** `getStatusBadge()` in `OrderReportBetaPage.jsx:47-56` only maps 4 payment types.
Orders with `payment_type = TAB | prepaid | postpaid | null` fall through and show raw backend value or `'—'`.

**Exact fix:**
```js
// File: src/pages/reports-module/OrderReportBetaPage.jsx
// Current map (L47-56):
const map = {
  Cash: { label: 'Paid', ... },
  Unpaid: { label: 'Unpaid', ... },
  Cancel: { label: 'Cancel', ... },
  Partial: { label: 'Partial', ... },
};
// Need to add:
  TAB:      { label: 'TAB',      cls: 'bg-amber-100 text-amber-800' },
  prepaid:  { label: 'Prepaid',  cls: 'bg-green-100 text-green-800' },
  postpaid: { label: 'Postpaid', cls: 'bg-zinc-100 text-zinc-600' },
```
**Files:** 1 — `src/pages/reports-module/OrderReportBetaPage.jsx`
**Lines:** ~4 added
**Fast Lane:** YES — owner approval needed

---

### CR-422 — Replace "Last 30 Days" with "Last Month" Preset
**P2 / LOW / 13 files**

**Root cause:** 13 report pages have `'30D'` preset that computes as rolling 30 days from today.
Owner wants **true calendar Last Month** (1st of previous month → last day of previous month).

**Exact change — handler logic:**
```js
// CURRENT (all 13 pages):
case '30D': { f = new Date(t.getTime() - 29 * 86400000); break; }

// NEW (rename to LM):
case 'LM': {
  const now = new Date();
  f = new Date(now.getFullYear(), now.getMonth() - 1, 1);     // 1st of last month
  t = new Date(now.getFullYear(), now.getMonth(), 0);          // last day of last month
  break;
}
```

**Files (13 total — all independent, same 2-line change each):**
`AuditLogMockup`, `CancelDetailMockup`, `CancellationsMockup`, `DailySalesMockup`,
`DashboardMockup`, `DeliveryChargeMockup`, `HourlySalesMockup`, `PrepServeTimeMockup`,
`PurchaseReportPage`, `SalesMockup`, `SettlementReportMockup`, `TaxDetailMockup`, `TipReportMockup`

**Owner decision needed at Gate 3:** Confirm label on button: `"LM"` or `"Last Month"` or `"Prev Month"`?

---

### CR-423 — Fix Export on 6 Report Pages
**P1 / MEDIUM**

**Investigation complete** — 6 specific pages confirmed broken:

| Page | Issue | Fix |
|------|-------|-----|
| `CancellationsMockup` | Download button UI exists but `enabled: false` (L152-153). `buildExportPayload` missing entirely | Add `buildExportPayload()` + change `enabled: true` |
| `PLReportPage` | Only PDF (`handleExportPDF`). No Excel button or handler | Add Excel button + `buildExportPayload()` with expense data |
| `OrderReportBetaPage` | Only Excel (CR-117 backend call). No PDF button | Add PDF button using `exportReportAsPDF` + `openReportWindow` |
| `RoomOrdersMockup` | Has `reportExporter` import + download UI but `buildExportPayload()` missing → crashes on click | Add `buildExportPayload()` using existing `data` state |
| `FoodCourtMockup` | Has inline export logic, not standard `buildExportPayload` pattern | Refactor to standard pattern |
| `FoodCourtBetaPage` | Same as FoodCourtMockup | Same refactor |

**Standard export pattern used by working pages:**
```js
const buildExportPayload = () => ({
  title: 'Report Name',
  subtitle: '...',
  restaurant: { name: restaurant?.name || '' },
  dateRange: { from: appliedFrom, to: appliedTo },
  kpis: [...],
  sheets: [{ name: 'Sheet1', columns: [...], rows: [...] }],
});
const handleDownloadAction = (action) => {
  let pw = null;
  if (action === 'pdf') pw = openReportWindow();
  const p = buildExportPayload();
  if (!p) return;
  if (action === 'excel') exportReportAsExcel(p);
  else if (action === 'pdf') exportReportAsPDF(pw, p);
};
```

**Files:** 6 — all in `src/pages/reports-module/`
**No hotspot files. No financial logic.**

---

### CR-138 — Migrate Variation & Addon Report to Backend Aggregation
**P2 / MEDIUM**

**Current problem:** `VariationAddonMockup.jsx` uses `variationAddonService.js` which fetches `ORDER_LOGS_REPORT` and aggregates on the FE. This is slow (30-day chunks), memory-heavy, and blocks wide date ranges.

**Key finding from investigation:** `fetchInsightsItems` (used by `ItemSalesHybridMockup`) already contains full variation + addon breakdown:
- `drill.variations` — Map of variation name → { label, qty, revenue }
- `drill.addons` — Map of addon name → { name, count, revenue }

This data already exists in the `insights-items` backend endpoint. No new backend work needed.

**Fix:** Rewrite `variationAddonService.js` to use `fetchInsightsItems` from `insightsService.js` and extract the variation/addon drill maps directly. Update `VariationAddonMockup.jsx` to use the new service.

**Files:**
- `src/api/services/variationAddonService.js` — replace FE aggregation logic
- `src/pages/reports-module/VariationAddonMockup.jsx` — update data consumption

**Impact Analysis must check:** What fields does `VariationAddonMockup` currently use from `variationAddonService`? Map those to the `insights-items` drill structure.

---

### CR-164 — Send Payment Link from Orders (Beta) Report
**P1 / MEDIUM**

**Current state:** `WhatsAppPaymentModal` component + `paymentLinkService` already exist and work for Razorpay clients **on the live dashboard** (in `OrderCard.jsx`). The feature is gated by `restaurant.settings.razorpayEnabled`.

**What's missing:** The modal is NOT wired in any report page. CR-164 adds it to `OrderReportBetaPage.jsx` as a row action button.

**Existing working code to reuse:**
```js
// Component: src/components/cards/WhatsAppPaymentModal.jsx
// Service:   src/api/services/paymentLinkService.js → sendPaymentLink()
// Gate:      restaurant.settings.razorpayEnabled (from RestaurantContext)
```

**Files:**
- `src/pages/reports-module/OrderReportBetaPage.jsx` — add import, state, button per row, modal render
- No new service or component needed

**Test account:** `owner@jeshnest.com` (has Razorpay integration — feature visible there)

---

### BUG-353 — Lift Date Range Caps to 730 Days (2 Years)
**P1 / LOW**

**Finding:** `OrderReportBetaPage` has NO FE cap at all (backend is the constraint there).
**8 other pages have hardcoded caps** that need lifting to 730 days:

| Pages | Current cap | → New cap |
|-------|-------------|-----------|
| `SalesMockup`, `PaymentsMockup`, `OrderLedgerMockup`, `RoomOrdersMockup` | **60 days** | **730 days** |
| `DashboardMockup`, `ItemSalesHybridMockup`, `CancellationsMockup`, `SettlementReportMockup` | **365 days** | **730 days** |

**IMPORTANT constraint:** Backend-aggregated pages (Dashboard, ItemSales, Cancellations) are safe to lift immediately — single API call. FE-aggregated pages (OrderLedger, RoomOrders, Settlement) make sequential 30-day chunk calls — 730 days = 24+ API calls per load. **Plan must flag this to owner.**

**Fix per page:** Change `MAX_RANGE_DAYS = 60` → `730` or `maxDays = 60` → `730`.

**Impact Analysis must check:** Does the backend accept queries wider than 365 days for the `insights-*` endpoints? If not, only lift FE-aggregated caps with chunking safety and raise a backend brief for the others.

---

## BATCH 3 — Order Entry + Inventory FE Fix (5 items)
**Intake doc:** `/app/memory/change_requests/BATCH_OE_INV_FE_001_INTAKE_2026_10_17.md`

---

### BUG-333 — Add Button Hardcoded to Walk-In
**P1 / LOW**

**Root cause:** `DashboardPage.jsx:1514`:
```js
const handleAddOrder = () => {
  setOrderEntryTable(null);
  setOrderEntryType("walkIn");  // ← hardcoded
};
```

**Fix:** Replace with a type picker. Options:
- (a) Show a small dropdown/modal to pick: Dine-In / Walk-In / Takeaway / Delivery
- (b) Default to `"dineIn"` instead of `"walkIn"` (simpler, less ideal)

**File:** `src/pages/DashboardPage.jsx` — **R5 hotspot**
**Owner decision needed at Gate 3:** Option (a) type-picker OR (b) default to Dine-In?

**Note:** CR-434 (Delivery/Takeaway quick-launch tiles) is the companion feature — plan them together but they can be implemented independently.

---

### CR-434 — Delivery + Takeaway Quick-Launch Tiles on Dashboard
**P1 / MEDIUM — R5 hotspot**

**Problem:** No quick way to start a new Delivery or Takeaway order from the dashboard. Customers want one-click access like table/room cards.

**Current behaviour:** Delivery and Takeaway sections only show cards AFTER an order exists. There are no "start a new delivery/takeaway" tiles.

**Existing code to understand first:**
- `DashboardPage.jsx:2039` — how existing delivery order cards are rendered
- `handleOrderTypeChange('delivery')` and `handleOrderTypeChange('takeAway')` already exist
- `handleAddOrder` only opens Walk-In

**Proposed approach for Impact Analysis:**
- Add a persistent "New Delivery" and "New Takeaway" quick-action button/tile in their respective sections
- Clicking either immediately calls `handleOrderTypeChange('delivery')` or `handleOrderTypeChange('takeAway')` + `setOrderEntryTable(null)`

**File:** `src/pages/DashboardPage.jsx` — **R5 hotspot** — full Gate 2-3 needed
**Owner decision needed at Gate 2:** Should it be a button inside the existing Delivery/Takeaway section header, or a tile similar to empty table cards?

---

### BUG-463 — Promotional Menu Shows Duplicate Pill (Typo)
**P2 / LOW / Fast Lane eligible**

**Root cause:** `MenuContext.jsx:111-117` — `availableMenuTypes` is built directly from product `food_for` values. Backend has a product with `food_for = "promational"` (missing 'o'). This appears as a separate pill from `"Promotional"` in the Local Settings Active Menu selector.

**Exact fix:**
```js
// File: src/contexts/MenuContext.jsx
// Current:
const availableMenuTypes = useMemo(
  () => [...new Set(
    products
      .filter(p => p.isActive && !p.isDisabled && p.foodFor !== 'Aggregator')
      .map(p => p.foodFor)
  )].sort(...),
  [products]
);

// Fix: deduplicate case-insensitively by normalising to title case
// Use a Map keyed on p.foodFor.toLowerCase() → keeps first seen, dedupes typos
```

**File:** `src/contexts/MenuContext.jsx`
**Lines:** ~3 changed
**Fast Lane:** YES — owner approval needed

**Separate backend action (not FE):** Backend to update the typo product's `food_for` from `"promational"` → `"Promotional"` in the database. File a backend brief at Gate 2.

---

### BUG-480 — Cancel After Serve Gate Broken
**P1 / MEDIUM — touches R5 OrderEntry.jsx**

**Root cause (code confirmed):**

1. `profileTransform.js:226-227` maps TWO backend fields:
   ```js
   allowPostServeCancel:  toBoolean(api.cancle_post_serve),        // field with typo "cancle"
   allowPostServeCancel2: toBoolean(api.allow_cancel_post_server), // newer correct field
   ```

2. `OrderEntry.jsx:352` only checks ONE of them:
   ```js
   if (item.status !== 'preparing' && cancellation?.allowPostServeCancel === false) return false;
   ```
   `allowPostServeCancel2` is **mapped but never used** — dead code.

3. `RestaurantContext.jsx:52-54` defaults BOTH to `false` — so if the API doesn't return `cancle_post_serve = true`, cancel is always blocked.

**Fix:** Add `allowPostServeCancel2` as a fallback in the gate:
```js
// OrderEntry.jsx:352 — CURRENT:
if (item.status !== 'preparing' && cancellation?.allowPostServeCancel === false) return false;

// FIX:
if (item.status !== 'preparing' &&
    cancellation?.allowPostServeCancel === false &&
    cancellation?.allowPostServeCancel2 === false) return false;
```

**Files:**
- `src/components/order-entry/OrderEntry.jsx` — R5 hotspot — gate fix (~2 lines)
- `src/api/transforms/profileTransform.js` — verify field names (no logic change)

**Test account:** `owner@thegoankitchen.com`
**Impact Analysis must confirm:** Which field does the backend actually send — `cancle_post_serve` or `allow_cancel_post_server`? (Probe the settings API for goankitchen account)

---

### CR-435 — Remove Redundant Inventory Sidebar Links
**P2 / LOW / Fast Lane eligible**

**Problem:** `Sidebar.jsx:123-135` has 7 child items under "Inventory". All 7 are accessible from the `InventoryTabBar` that appears on every inventory page. Owner confirmed 2026-10-17 the sidebar links are not needed — the tab bar handles all inventory navigation.

**Exact fix:**
```js
// File: src/components/layout/Sidebar.jsx
// CURRENT (L123-135):
{
  id: "inventory",
  label: "Inventory",
  icon: ...,
  children: [
    { id: "inventory-dashboard",     label: "Dashboard",         path: "/inventory-dashboard" },
    { id: "inventory-current-stock", label: "Current Stock",     path: "/inventory-current-stock" },
    { id: "inventory-smart-purchase",label: "Stock Update",      path: "/inventory-smart-purchase" },
    { id: "inventory-receive",       label: "Receive",           path: "/inventory-receive", ... },
    { id: "inventory-audit",         label: "Stock Audit",       path: "/inventory-audit" },
    { id: "inventory-setup",         label: "Ingredients & Setup",path: "/inventory-setup" },
    { id: "inventory-recipes",       label: "Recipes",           path: "/recipes" },
  ]
}

// AFTER (remove children, keep single entry):
{
  id: "inventory",
  label: "Inventory",
  icon: ...,
  path: "/inventory-dashboard",   // direct link, no dropdown
}
```

**File:** `src/components/layout/Sidebar.jsx`
**Lines:** ~7 lines removed, 1 line changed
**Fast Lane:** YES — owner approval needed
**Conflict check:** CR-415 already ran on Sidebar.jsx (2026-10-12) — check FILE_OWNERSHIP.md before editing

---

## Execution Priority Order

```
FAST LANE (do first — minimal scope):
  BUG-463 → 1 line, MenuContext.jsx
  CR-435  → 7 lines removed, Sidebar.jsx

MEDIUM (own session each):
  BUG-354 → 4 lines, OrderReportBetaPage.jsx
  BUG-480 → 2 lines, OrderEntry.jsx (R5) + profileTransform confirm
  CR-422  → 13 files, 2 lines each (batch all 13 together)

GATE 2-3 NEEDED (planning before code):
  CR-423  → 6 files, export wiring
  BUG-353 → 8 files, cap lift (confirm backend first)
  CR-164  → 2 files, wire existing component to report
  BUG-333 → R5, owner decision on type-picker vs default
  CR-434  → R5, owner decision on tile design
```

---

## Key Files

| File | Relevance |
|------|-----------|
| `src/pages/reports-module/OrderReportBetaPage.jsx` | BUG-354, CR-164 |
| `src/pages/reports-module/CancellationsMockup.jsx` | CR-423 item 1 |
| `src/pages/reports-module/PLReportPage.jsx` | CR-423 item 2 |
| `src/pages/reports-module/RoomOrdersMockup.jsx` | CR-423 item 4 |
| `src/pages/reports-module/FoodCourtMockup.jsx` | CR-423 item 5 |
| `src/pages/reports-module/FoodCourtBetaPage.jsx` | CR-423 item 6 |
| `src/api/services/variationAddonService.js` | CR-138 — replace FE agg |
| `src/pages/reports-module/VariationAddonMockup.jsx` | CR-138 — update consumer |
| `src/components/layout/Sidebar.jsx` | CR-435 (last touched: CR-415 2026-10-12) |
| `src/contexts/MenuContext.jsx` | BUG-463 |
| `src/pages/DashboardPage.jsx` | BUG-333, CR-434 — **R5** |
| `src/components/order-entry/OrderEntry.jsx` | BUG-480 — **R5** |
| `src/api/transforms/profileTransform.js` | BUG-480 |
| `src/components/cards/WhatsAppPaymentModal.jsx` | CR-164 — reuse this |
| `src/api/services/paymentLinkService.js` | CR-164 — reuse this |
| `src/utils/reportExporter.js` | CR-423 — all 6 pages use this |

---

## Test Accounts

| Account | Use for |
|---------|---------|
| `owner@palmhouse.com` / `Qplazm@10` | General reports testing |
| `owner@jeshnest.com` / *(ask owner)* | CR-164 payment link (Razorpay enabled) |
| `owner@thegoankitchen.com` / `Qplazm@10` | BUG-480 cancel after serve |
| `owner@cafe103.com` / `Qplazm@10` | General order entry testing |

---

## What Needs Owner GO Before Code

1. **BUG-354 Fast Lane** — owner says "BUG-354 Fast Lane GO"
2. **CR-435 Fast Lane** — owner says "CR-435 Fast Lane GO"
3. **BUG-463 Fast Lane** — owner says "BUG-463 Fast Lane GO"
4. **BUG-333 Gate 3** — owner decides: type-picker or default to Dine-In
5. **CR-434 Gate 3** — owner decides: button in section header or tile design
6. **BUG-353 Gate 3** — backend must confirm 2-year query support first

---

## DO NOT TOUCH

- `CollectPaymentPanel.jsx` — R5, not in scope
- `orderTransform.js` — R5, not in scope
- `DashboardPage.jsx` useEffect, socket handlers — stay away except handleAddOrder L1514
- Any `memory/final/` files
- `package.json`, `requirements.txt` unless installing a new dependency
