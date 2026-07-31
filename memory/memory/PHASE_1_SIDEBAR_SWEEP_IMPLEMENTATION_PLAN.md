# Phase 1 — Sidebar Sweep: Implementation Plan

**Created:** 2026-06-12
**Gate:** 3 (Implementation Plan)
**Items:** CR-040, CR-042, BUG-131, CR-041 (investigation)
**Primary File:** `/app/frontend/src/components/layout/Sidebar.jsx` (631 lines)
**Secondary Files:** Page headers (3 files, label-only)

---

## SCOPE LOCK

### Files I WILL change
| File | Change Type |
|------|-------------|
| `components/layout/Sidebar.jsx` | Label renames, child removal, CSS layout fix |
| `pages/AllOrdersReportPage.jsx` | Page header rename (L920: "Audit Report" → "Daily Report") |
| `pages/OrderSummaryPage.jsx` | Page header rename (L125: "Order Summary" → "Daily Summary") |
| `pages/RoomOrdersReportPage.jsx` | Page header rename (L626: "Room Orders Report" → "Daily Room Report") |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | Page header (L798: "Item Sales" → "Item Ledger"), export title (L717), audit tab header (L1173) |

### Files I will NOT touch
- `App.js` — routes stay as-is (X/Y/Z have no routes; existing report routes keep their paths)
- `DashboardPage.jsx` — no changes needed
- Any transform, service, or context file
- No API changes, no payload changes, no financial logic

---

## CR-040: Rename Report Labels + Remove X/Y/Z Reports

### Edit 1 — Rename "Audit Report" → "Daily Report" (Sidebar)
**File:** `Sidebar.jsx`
**Line:** 53
**Current:** `{ id: "audit", label: "Audit Report", path: "/reports/audit" },`
**New:** `{ id: "audit", label: "Daily Report", path: "/reports/audit" },`
**Notes:** Route path `/reports/audit` stays unchanged. `handleChildClick` at L300 matches on `child.id === 'audit'` — no change needed since the id stays `"audit"`.

### Edit 2 — Rename "Order Summary" → "Daily Summary" (Sidebar)
**File:** `Sidebar.jsx`
**Line:** 54
**Current:** `{ id: "summary", label: "Order Summary", path: "/reports/summary" },`
**New:** `{ id: "summary", label: "Daily Summary", path: "/reports/summary" },`
**Notes:** Same — id stays `"summary"`, route stays `/reports/summary`.

### Edit 3 — Rename "Room Orders" → "Daily Room Report" (Sidebar)
**File:** `Sidebar.jsx`
**Line:** 59
**Current:** `{ id: "rooms", label: "Room Orders", path: "/reports/rooms" },`
**New:** `{ id: "rooms", label: "Daily Room Report", path: "/reports/rooms" },`
**Notes:** Same — id stays `"rooms"`, route stays `/reports/rooms`.

### Edit 4 — Remove X Report, Y Report, Z Report (Sidebar)
**File:** `Sidebar.jsx`
**Lines:** 60-62
**Current:**
```js
      { id: "report-x", label: "X Report", path: "/reports/x" },
      { id: "report-y", label: "Y Report", path: "/reports/y" },
      { id: "report-z", label: "Z Report", path: "/reports/z" },
```
**Action:** Delete these 3 lines entirely.
**Notes:** 
- No routes exist for `/reports/x`, `/reports/y`, `/reports/z` in `App.js` — verified, they are dead links.
- `handleChildClick` at L296-311: X/Y/Z click through to `showComingSoon` (L310) since they aren't in the whitelist at L299-303. After removal, this fallthrough code becomes dead but harmless — leave it for safety.
- No page components exist for X/Y/Z Reports — verified via `find`.

### Edit 5 — Rename "Audit Report" header on page (AllOrdersReportPage)
**File:** `pages/AllOrdersReportPage.jsx`
**Line:** 920
**Current:** `Audit Report`
**New:** `Daily Report`

### Edit 6 — Rename "Order Summary" header on page (OrderSummaryPage)
**File:** `pages/OrderSummaryPage.jsx`
**Line:** 125
**Current:** `<h1 className="text-xl font-semibold text-white">Order Summary</h1>`
**New:** `<h1 className="text-xl font-semibold text-white">Daily Summary</h1>`

### Edit 7 — Rename "Room Orders Report" header on page (RoomOrdersReportPage)
**File:** `pages/RoomOrdersReportPage.jsx`
**Line:** 626
**Current:** `Room Orders Report`
**New:** `Daily Room Report`

### Regression check
- Route paths unchanged — bookmarks and deep links still work
- Sidebar `id` values unchanged — `handleChildClick` whitelist, `activeItem` state, `useEffect` route matching all unaffected
- No data/payload/financial impact

---

## CR-042: Rename "Items & Menu" → "Item Ledger"

### Edit 8 — Rename in Sidebar (Insights section)
**File:** `Sidebar.jsx`
**Line:** 76
**Current:** `{ id: "insights-items", label: "Items & Menu", path: "/reports-module/items" },`
**New:** `{ id: "insights-items", label: "Item Ledger", path: "/reports-module/items" },`
**Notes:** id stays `"insights-items"`, route stays `/reports-module/items`. `handleChildClick` at L328-335 matches on `parentId === 'insights'` + `!child.comingSoon` — no change needed.

### Edit 9 — Rename page header (ItemSalesHybridMockup)
**File:** `pages/reports-module/ItemSalesHybridMockup.jsx`
**Line:** 798
**Current:** `Item Sales`
**New:** `Item Ledger`

### Edit 10 — Rename export title (ItemSalesHybridMockup)
**File:** `pages/reports-module/ItemSalesHybridMockup.jsx`
**Line:** 717
**Current:** `title:    'Item Sales',`
**New:** `title:    'Item Ledger',`
**Notes:** This flows into `reportExporter.js` which uses `payload.title` for PDF header and Excel filename. Renaming here propagates automatically to all exports.

### Edit 11 — Rename audit tab header (ItemSalesHybridMockup)
**File:** `pages/reports-module/ItemSalesHybridMockup.jsx`
**Line:** 1173
**Current:** `<h2 className="text-base font-semibold text-zinc-900">Audit · S5 Item Sales Hybrid</h2>`
**New:** `<h2 className="text-base font-semibold text-zinc-900">Audit · Item Ledger</h2>`
**Notes:** This is only visible when `REACT_APP_SHOW_AUDIT_TAB=true` (pre-production only). Cosmetic alignment.

### Edit 12 — Rename JSDoc comment (ItemSalesHybridMockup)
**File:** `pages/reports-module/ItemSalesHybridMockup.jsx`
**Line:** 15
**Current:** `*  - Title chip says "Item Sales · Hybrid" so reviewer can tell screens apart`
**New:** `*  - Title chip says "Item Ledger" so reviewer can tell screens apart`
**Notes:** Comment-only. Keeps documentation in sync.

### Regression check
- Route path unchanged (`/reports-module/items`)
- Sidebar id unchanged (`insights-items`)
- Export filenames will now say "Item Ledger" instead of "Item Sales" — intended

---

## BUG-131: Sidebar Bottom Section (Ringer/Refresh/User/Logout) Should Be Sticky

### Root Cause Analysis

The sidebar layout at L356-626 is:
```
<aside className="h-screen flex flex-col">     ← full height, flex column
  <div>Logo + collapse</div>                    ← fixed height
  <div>View toggles (optional)</div>            ← fixed height
  <nav className="flex-1 overflow-y-auto">      ← takes remaining space, scrolls
    {menu items}
  </nav>
  <div className="p-4">                         ← bottom section
    {Ringer, Refresh, Profile, Logout}
  </div>
</aside>
```

**This layout IS structurally correct.** The `flex-1` on `<nav>` should expand to fill available space, and the bottom `<div>` should stay pinned because it's a flex child AFTER the flex-1 element.

**So why does the owner see it scrolling up?** The likely cause is:

1. **The `<aside>` parent may not be constrained to `h-screen` in practice.** If the sidebar is inside another flex container that gives it a different height, or if a parent has `overflow: visible`, the `h-screen` may not be the effective constraint.

2. **The bottom div has NO `flex-shrink-0`.** Under certain conditions (many expanded menu sections pushing content), the bottom div could be shrunk by flexbox. Adding `flex-shrink-0` ensures it never compresses.

3. **The `<nav>` may not have `min-h-0`.** In flexbox, `min-height` defaults to `auto` (content size), which can prevent the `overflow-y-auto` from activating. Adding `min-h-0` forces the `<nav>` to respect its parent's constraint and actually scroll.

### Edit 13 — Add `flex-shrink-0` to bottom section
**File:** `Sidebar.jsx`
**Line:** 529-531
**Current:**
```jsx
      <div 
        className="p-4"
        style={{ borderTop: `1px solid ${COLORS.borderGray}` }}
```
**New:**
```jsx
      <div 
        className="p-4 flex-shrink-0"
        style={{ borderTop: `1px solid ${COLORS.borderGray}` }}
```

### Edit 14 — Add `min-h-0` to `<nav>` for proper overflow
**File:** `Sidebar.jsx`
**Line:** 464
**Current:** `<nav className="flex-1 overflow-y-auto py-4">`
**New:** `<nav className="flex-1 overflow-y-auto py-4 min-h-0">`
**Notes:** `min-h-0` is the standard flexbox fix — without it, `overflow-y-auto` may not engage because the element's min-height defaults to its content height. With `min-h-0`, the nav element is forced to respect the flex constraint and scroll its content.

### Edit 15 — Add `overflow-hidden` to `<aside>` for belt-and-braces
**File:** `Sidebar.jsx`
**Line:** 359
**Current:** `className="h-screen flex flex-col transition-all duration-300 flex-shrink-0"`
**New:** `className="h-screen flex flex-col transition-all duration-300 flex-shrink-0 overflow-hidden"`
**Notes:** Prevents any child from pushing the aside beyond viewport height. The `<nav>` handles its own scrolling.

### Regression check
- No visual change when content fits — flexbox only activates scroll when needed
- Bottom section (Ringer/Refresh/User/Logout) always visible regardless of nav length
- Collapsed sidebar (70px) unaffected — same flex structure applies
- View toggles area unaffected — it's between logo and nav, fixed height

### Test scenarios
1. Expand all sidebar sections (Order Reports + Insights + Menu Management + Visibility Settings) — bottom should stay pinned, nav should scroll
2. Collapsed sidebar (70px) — bottom icons should still be visible at bottom
3. Short viewport (e.g., 768px height) — nav scrolls, bottom stays
4. No expanded sections — bottom section at natural position, no scroll needed

---

## CR-041: Navigation Consistency — Investigation Catalogue

### Full Navigation Pattern Inventory

| # | Sidebar Item | Pattern | Mechanism | Route/Handler |
|---|---|---|---|---|
| 1 | **Dashboard** | Full-page route | `navigate("/dashboard")` | `App.js` → `DashboardPage` |
| 2 | **Orders** | Hidden (empty children, not in VISIBLE_SECTIONS) | — | — |
| 3 | **Order Reports → Daily Report** | Full-page route | `handleChildClick` whitelist → `navigate("/reports/audit")` | `App.js` → `AllOrdersReportPage` |
| 4 | **Order Reports → Daily Summary** | Full-page route | `handleChildClick` whitelist → `navigate("/reports/summary")` | `App.js` → `OrderSummaryPage` |
| 5 | **Order Reports → Daily Room Report** | Full-page route | `handleChildClick` whitelist → `navigate("/reports/rooms")` | `App.js` → `RoomOrdersReportPage` |
| 6 | **Insights → Dashboard** | Full-page route | `handleChildClick` insights branch → `navigate(child.path)` | `App.js` → `InsightsDashboardMockup` |
| 7 | **Insights → Settlement** | Full-page route | Same | `App.js` → `SettlementReportMockup` |
| 8 | **Insights → Sales** | Full-page route | Same | `App.js` → `SalesMockup` |
| 9 | **Insights → Item Ledger** | Full-page route | Same | `App.js` → `ItemSalesHybridMockup` |
| 10 | **Insights → Order Ledger** | Full-page route | Same | `App.js` → `OrderLedgerMockup` |
| 11 | **Insights → Payments** | Full-page route | Same | `App.js` → `PaymentsMockup` |
| 12 | **Insights → Tax** | Coming Soon | `comingSoon: true` → toast | — |
| 13 | **Insights → Discounts & Promos** | Coming Soon | Same | — |
| 14 | **Insights → Cancellations** | Full-page route | Same | `App.js` → `CancellationsMockup` |
| 15 | **Insights → Locations & Channels** | Coming Soon | Same | — |
| 16 | **Insights → Staff Performance** | Coming Soon | Same | — |
| 17 | **Insights → Audit Log** | Coming Soon | Same | — |
| 18 | **Insights → Customers** | Coming Soon | Same | — |
| 19 | **Insights → Kitchen Ops** | Full-page route | Same | `App.js` → `PrepServeTimeMockup` |
| 20 | **Insights → Room Orders** | Full-page route | Same | `App.js` → `RoomOrdersMockup` |
| 21 | **Insights → Food Court** | Full-page route | Same | `App.js` → `FoodCourtMockup` |
| 22 | **Credit Management** | **Slide-over panel** | `onOpenCredit()` → `setIsCreditOpen(true)` in DashboardPage | `CreditManagementPanel.jsx` mounts inside `DashboardPage` |
| 23 | **Settlement** | **Slide-over panel** | `onOpenSettlement()` → `setIsSettlementOpen(true)` in DashboardPage | `SettlementPanel.jsx` mounts inside `DashboardPage` |
| 24 | **Restaurant Setup** | Full-page route | `navigate("/restaurant-settings")` | `App.js` → `RestaurantSettingsPage` |
| 25 | **Menu Management** | **Slide-over panel** | `onOpenMenu()` → `setIsMenuOpen(true)` in DashboardPage | `MenuManagementPanel.jsx` mounts inside `DashboardPage` |
| 26 | **Menu Management → children** | Coming Soon | `showComingSoon` (all children) | — |
| 27 | **Visibility Settings → Status Config** | Full-page route | `handleChildClick` → `navigate("/visibility/status-config")` | `App.js` → `StatusConfigPage` |
| 28 | **Employees** | Coming Soon | `COMING_SOON_ITEMS` set | — |
| 29 | **Expenses** | Coming Soon | Same | — |
| 30 | **Inventory** | Coming Soon | Same | — |
| 31 | **Settings** | **Panel** | `onOpenSettings()` in `handleItemClick` | SettingsPanel (if exists) |

### Summary of Patterns

| Pattern | Count | Items |
|---|---|---|
| **Full-page route** | 15 | Dashboard, 3 Order Reports, 9 Insights, Restaurant Setup, Visibility Settings |
| **Slide-over panel** | 4 | Credit Management, Settlement, Menu Management, Settings |
| **Coming Soon** | 12 | 6 Insights, 5 Menu children, Employees, Expenses, Inventory |

### Inconsistencies Identified

| # | Inconsistency | Details |
|---|---|---|
| **I-1** | Panel vs Route for same-level items | Credit Management (panel) and Restaurant Setup (route) are both top-level sidebar items, but open differently |
| **I-2** | Settlement dual identity | "Settlement" top-level → panel. "Insights → Settlement" → full-page route. Two different screens, same label, different patterns |
| **I-3** | Menu Management children dead | Menu Management opens as panel, but its 5 children (Categories, Menu Items, etc.) all show "Coming Soon". The panel doesn't use these children at all — it's the `MenuManagementPanel` which has its own internal navigation |
| **I-4** | Settings item opens panel | Settings (id: 'settings') calls `onOpenSettings()` but is NOT in `VISIBLE_SECTIONS` (L228) — so it's hidden at runtime. Dead code path |

### Recommendation for Owner Decision

When ready to standardize, the owner needs to decide:

**Decision D-1:** Should panel items (Credit, Settlement, Menu) become full-page routes, or should routes become panels?
- **Option A (Routes everywhere):** Convert Credit/Settlement/Menu to standalone pages like Restaurant Setup. Dashboard loses live-order context when these open.
- **Option B (Keep panels for operational tools):** Menu/Credit/Settlement stay as panels (they need dashboard context). Reports/Settings stay as routes. Document the rule: "If it needs live order dashboard visible → panel. If standalone workflow → route."
- **Option C (Per-item decision):** Owner picks individually.

**Decision D-2:** Should Menu Management children be removed from sidebar (since the panel has its own nav)?

**Decision D-3:** Should the hidden items (Orders, Settings, Employees, Expenses, Inventory) be removed from `sidebarMenuItems` entirely to reduce dead code?

---

## Execution Sequence

```
Step 1: CR-040 Edits 1-4 (Sidebar labels + X/Y/Z removal)     ~5 min
Step 2: CR-040 Edits 5-7 (Page header renames)                  ~5 min
Step 3: CR-042 Edits 8-12 (Item Ledger rename)                  ~5 min
Step 4: BUG-131 Edits 13-15 (Sticky bottom CSS)                 ~5 min
Step 5: Visual verification (screenshot)                         ~5 min
Step 6: CR-041 investigation results (this document, no code)    ~0 min (already done above)
```

**Total implementation time: ~25 minutes**

All edits are independent — no ordering dependency. Can be applied in parallel via `search_replace`.

---

## Test Plan

### Manual verification (screenshot-based)
1. Load dashboard → expand "Order Reports" → verify: "Daily Report", "Daily Summary", "Daily Room Report" visible; X/Y/Z gone
2. Expand "Insights" → verify: "Item Ledger" visible (was "Items & Menu")
3. Click "Daily Report" → page header says "Daily Report" (not "Audit Report")
4. Click "Daily Summary" → page header says "Daily Summary"
5. Click "Daily Room Report" → page header says "Daily Room Report"
6. Navigate to Insights → Item Ledger → page header says "Item Ledger"
7. On Item Ledger, trigger Excel export → filename/title says "Item Ledger"
8. Expand all sidebar sections → scroll nav → verify bottom section (Ringer/Refresh/User/Logout) stays pinned at bottom
9. Collapse sidebar to 70px → verify bottom icons still at bottom
10. Test on short viewport (800px height) → nav scrolls, bottom stays

### Automated (testing agent)
- Frontend loads without errors
- Sidebar renders all expected items
- No console errors on navigation
- Screenshot comparison for sticky bottom

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R-1 | Existing bookmarks to "/reports/audit" break | ZERO | — | Route paths unchanged |
| R-2 | Sidebar active state highlighting breaks | ZERO | — | Item `id` values unchanged |
| R-3 | Export filenames change ("Item Sales" → "Item Ledger") | CERTAIN (intended) | LOW | Owner-directed rename |
| R-4 | BUG-131 CSS fix causes layout shift on some viewports | LOW | LOW | `min-h-0` + `flex-shrink-0` are standard flexbox patterns, no side effects |
| R-5 | `handleChildClick` X/Y/Z fallthrough becomes dead code | CERTAIN | ZERO | Harmless — other "coming soon" children still use it |

---

*Phase 1 Implementation Plan — 2026-06-12. Ready for Gate 4 (Code Gate) approval.*
