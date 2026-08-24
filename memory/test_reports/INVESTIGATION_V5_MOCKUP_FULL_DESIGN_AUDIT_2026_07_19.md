# Investigation Report — V5 Mockup vs Live: Screen-by-Screen Design Audit

**Date:** 2026-07-19
**Role:** INVESTIGATION
**Scope:** All 9 inventory screens + navigation architecture
**Reference:** `/app/frontend/public/cr072-inventory-mockup-v5-full.html` (LOCKED v5)

---

## NAVIGATION ARCHITECTURE GAP (applies to ALL screens)

### Mockup has DUAL navigation:
1. **LHS Icon Sidebar** (70px) — Dashboard, Inventory (active), Menu, Settings icons
2. **Top Horizontal Pill Tab Bar** — within Inventory:
   - **OPERATIONS** group: Dashboard · Current Stock · Smart Purchase · Receive(2) · Stock Audit
   - **SETUP** group: Ingredients · Recipes · Vendors · Wastage Reasons
   - Pill style: rounded-full, dark bg when active, orange border on hover
   - Divider line between OPERATIONS and SETUP groups

### Live has ONLY LHS sidebar:
- Expanded sidebar with text labels listing all 7 children vertically
- NO horizontal tab bar within inventory pages
- Each page is a separate route — no single-page tab switching

### Gap:
- **Missing:** Entire top pill tab bar with OPERATIONS / SETUP grouping
- **Missing:** Single-page feel — mockup switches screens without full-page navigation
- **Missing:** Pill active state styling (dark bg + white text)
- **Missing:** Receive badge count (orange circle with "2") in tab
- **Impact:** MAJOR — changes the entire UX paradigm for inventory navigation

---

## SCREEN 1: Stock Intelligence Dashboard (`/inventory-dashboard`)

### Mockup shows:
- Title: "Stock Intelligence" with sparkle icon + "Palm India · Franchise · parent restaurant #813" subtitle
- Time range chips: 7d / 14d / 30d + "All Categories" dropdown + Export button
- **4 KPI cards** in a row: Reorder Alerts (12), Wastage Value (₹4,250 + Phase 2 badge), Cost Change (↑3.2% · 30d), Recipes at Risk (5)
- **Low-Stock Alerts** strip: 3 items with qty + days left
- **6 widgets in 2-column grid:**
  - Reorder Forecast table (5 rows: ingredient, current, days left badge, suggest reorder, preferred vendor)
  - Consumption Trends (line chart with ingredient selector dropdown, avg/day, total, Δ vs prev)
  - Cost Trend per Ingredient (table: ingredient, current rate, sparkline trend, Δ vs prev %)
  - Recipe Cost & Margin (table: recipe, cost/serve, sale price, margin % color-coded, Δ vs prev)
  - Vendor Performance (card per vendor with stats)
  - Vendor Directory (table with spend totals)
- **2 locked wastage placeholders** (Phase 2 badge + dashed border)

### Live shows:
- Title: "Inventory Intelligence" with subtitle text
- **"Loading Inventory Intelligence..."** spinner OR empty state
- When data loads: 6 widget cards + 2 wastage placeholders in 2-column grid

### Gaps:

| # | Element | Mockup | Live | Severity |
|---|---------|--------|------|----------|
| D1 | **KPI cards row** (Reorder Alerts, Wastage Value, Cost Change, Recipes at Risk) | 4 prominent KPI cards at top | **MISSING entirely** | CRITICAL |
| D2 | **Low-Stock Alerts strip** | Horizontal strip with 3 alert items | **MISSING** | MAJOR |
| D3 | **Time range chips** (7d/14d/30d) + Category filter + Export | Top-right filter bar | **MISSING** | MAJOR |
| D4 | **Restaurant context subtitle** | "Palm India · Franchise · parent #813 · Last synced 2 min ago" | Missing | MEDIUM |
| D5 | **Reorder Forecast widget** | Table with Current qty, Days Left color badge, Suggest Reorder qty, Preferred Vendor | Simplified list with name + days badge only — no Current/Suggest/Vendor columns | HIGH |
| D6 | **Consumption Trends widget** | Line chart (recharts) with ingredient selector, avg/day, total, Δ vs prev | Skeleton — exists but no chart rendering visible | HIGH |
| D7 | **Cost Trend widget** | Table with sparkline trend lines per ingredient | Skeleton — no sparklines | HIGH |
| D8 | **Recipe Cost & Margin widget** | Table with cost/serve, sale price, margin %, Δ vs prev, color bands | Exists but margin bands may not match mockup | MEDIUM |
| D9 | **Vendor widgets** | Performance cards + Directory table with spend rollup | Skeleton | MEDIUM |
| D10 | **"View Stock Dashboard →" link** in Low-Stock section | Clickable link to Current Stock | Missing (section missing) | LOW |

---

## SCREEN 2: Current Stock (`/inventory-current-stock`)

### Mockup shows:
- Title: "Current Stock" with package icon
- **"Stock Intelligence Phase 2"** banner: "Looking for forecasts, cost trends, vendor performance? → Open Dashboard" link
- **4 KPI cards:** Total Items, Low Stock (amber), Out of Stock (red), Categories
- Search bar + "All Categories" dropdown + Export button
- **Filter chips:** All / In Stock (green) / Low (amber) / Out (red) — each with count badge
- **Table columns:** INGREDIENT, CATEGORY, CURRENT STOCK (with unit), STATUS (badge), VENDOR (preferred)
- Status badges: "In Stock" (green), "Low Stock" (amber), "Out of Stock" (red)
- Vendor column with preferred vendor name

### Live shows:
- Title: "Current Stock" ✅
- "Stock Intelligence Phase 2" banner ✅
- 4 KPI cards with all 0s (data not loading for Kunafa Mahal — normal restaurant has no stock-inventory data?)
- Search + Category filter + Export ✅
- Filter chips: All / In Stock / Low / Out — all showing 0 ✅ (structure correct)
- Table: INGREDIENT, CATEGORY, CURRENT STOCK, STATUS, VENDOR ✅

### Gaps:

| # | Element | Mockup | Live | Severity |
|---|---------|--------|------|----------|
| CS1 | **Data loading** | Shows items with real qty/status | All 0s — "Loading stock..." | **DATA issue** — may be restaurant-specific (Kunafa Mahal has no stock-inventory endpoint data?) |
| CS2 | **Status badges** | Green/Amber/Red pills per row | Code exists (`StatusBadge` component at L17-21) but no data to render | LOW (code ready, data issue) |
| CS3 | **Intelligence banner CTA** | "Open Dashboard →" link | Exists ✅ | — |
| CS4 | **Overall structure** | Matches | **Closest to mockup of all screens** | ✅ |

---

## SCREEN 3: Smart Purchase (`/inventory-smart-purchase`)

### (Detailed in previous report — 16 gaps)

Summary of critical gaps:
- D-SP1: Vendor suggestion reasoning missing ("Cheapest · 8% below...", "Stable · same rate × 6")
- D-SP2: Stock status badges per ingredient missing (Out of stock, Low · X days)
- D-SP3: ON-HAND color coding missing
- D-SP4: "suggest: X" hints under QTY missing
- D-SP5: "Review & Submit" button missing
- D-SP6: "AUTO SHOPPING LIST · 7-DAY HORIZON" section header missing
- D-SP7: Unit conversion missing (raw gm instead of kg)
- D-SP8: Override warning row (orange bg) missing
- D-SP9: Grouped vendor preview at bottom missing
- D-SP10: ON-HAND showing negative values (data/calc issue)
- D-SP11: Column names abbreviated
- D-SP12: Row status backgrounds missing

---

## SCREEN 4: Stock Audit (`/inventory-audit`)

### Mockup shows:
- Title: "Stock Audit" with clipboard-check icon
- Subtitle: "Compare system quantities with actual physical stock. Enter what you see on the shelf."
- **"Save Adjustments"** green button top-right
- Search bar + "All Categories" dropdown
- **Table columns:** Ingredient (with category subtitle), System Qty, Physical Qty (editable input), Drift (color-coded: red negative, green match/positive), Reason (dropdown: Spillage/Expired/Pilferage/Others)
- Drift shows: "−0.15 kg" (red with trending-down icon), "Match" (green with check icon), "+0.5 ltr" (green with trending-up icon)
- Reason dropdown disabled when drift = 0 ("N/A — no drift")

### Live shows:
- Title: "Stock Audit" ✅
- Subtitle ✅
- Search + Category filter ✅
- Table headers: INGREDIENT, SYSTEM QTY, PHYSICAL QTY, DRIFT, REASON ✅
- **"Loading stock..."** — data not loading

### Gaps:

| # | Element | Mockup | Live | Severity |
|---|---------|--------|------|----------|
| SA1 | **Data loading** | Table with ingredient rows | "Loading stock..." — empty | **DATA issue** (same as Current Stock) |
| SA2 | **"Save Adjustments" button** | Green button top-right | Not visible in screenshot | MEDIUM |
| SA3 | **Drift color coding** | Red (−), green (Match/+) with icons | Code may exist but no data to verify | MEDIUM |
| SA4 | **Reason dropdown** | Per-row with Spillage/Expired/Pilferage/Others + disabled when no drift | Code may exist but no data to verify | MEDIUM |

---

## SCREEN 5: Ingredients & Setup (`/inventory-setup`)

### Mockup shows:
- Title: "Ingredients Master" with book-open icon
- **4 toolbar buttons:** Export, Import, Bulk Edit (orange border), Add Ingredient (green)
- **Left sidebar:** Category list with count badges, orange highlight on selected, "New category..." input at bottom with +/Save/Cancel
- **Table columns:** Ingredient name (with checkbox?), Base Unit, Conversion, Small Unit, Min Alert, Actions (edit + delete icons)
- Orange accent on selected category (border + bg tint)

### Live shows:
- Title: "Inventory Setup" (not "Ingredients Master") ✅ different but acceptable
- **3 tabs:** Ingredients / Vendors / Wastage Reasons ✅
- **1 toolbar button:** + Add Ingredient (green) — **no Export, Import, Bulk Edit**
- Left sidebar: Categories with counts ✅, "New category..." input ✅
- Table columns: INGREDIENT NAME, BASE UNIT, CONVERSION, SMALL UNIT, MIN ALERT, ACTIONS ✅

### Gaps:

| # | Element | Mockup | Live | Severity |
|---|---------|--------|------|----------|
| IS1 | **Title** | "Ingredients Master" | "Inventory Setup" | LOW |
| IS2 | **Export button** | Present in toolbar | **MISSING** | MEDIUM |
| IS3 | **Import button** | Present in toolbar | **MISSING** | MEDIUM |
| IS4 | **Bulk Edit button** | Orange border, "Bulk Edit" with edit icon | **MISSING** | MEDIUM |
| IS5 | **Category selection highlight** | Orange border + orange bg tint on selected | Plain text highlight, no orange styling | LOW |
| IS6 | **Category count badge** | Orange pill badge with count | Plain number | LOW |

---

## SCREEN 6: Recipes (`/recipes`) — ✅ DONE

QA'd with 19/19 PASS after BUG-206 + BUG-207 fixes. Matches mockup.

---

## SCREEN 7: Vendors (`/inventory-setup` Vendors tab)

### Mockup shows:
- Title: "Vendor Management" with truck icon
- "Add Vendor" green button
- Search bar
- **Table columns:** Vendor Name (bold), Contact Person, Phone, Type (colored badge: Wholesale/Retail/Grocery), GST, Actions (edit + delete)
- Type badges: blue "Wholesale", green "Retail", purple "Grocery"

### Live (inside Setup Vendors tab):
- Vendor list renders with type categories
- Structure exists but needs mockup comparison

### Gaps: Need detailed screenshot comparison — deferred to implementation

---

## SCREEN 8: Wastage Reasons (`/inventory-setup` Wastage tab)

### Mockup shows:
- Title: "Wastage Reasons" with trash icon
- "Add Reason" green button
- List of reasons as cards (Expired, Pilferage, Spillage, Others) with edit + delete icons
- Inline add form with orange border highlight + Save/Cancel

### Live: Exists inside Setup tab — needs detailed comparison

---

## SCREEN 9: Receive (`/inventory-receive`) — NOT BUILT (CR-077 Phase 1)

---

## CONSOLIDATED GAP REGISTER

### CRITICAL (blocks usability)
| ID | Screen | Gap | Est. Lines |
|---|---|---|---|
| NAV-1 | ALL | **Top horizontal pill tab bar missing** — no OPERATIONS/SETUP tab switching | ~80-100 |
| D1 | Dashboard | **4 KPI cards missing** | ~40 |
| D2 | Dashboard | **Low-Stock Alerts strip missing** | ~30 |

### HIGH (major design mismatch)
| ID | Screen | Gap | Est. Lines |
|---|---|---|---|
| D3 | Dashboard | Time range chips + Category filter + Export missing | ~25 |
| D5 | Dashboard | Reorder Forecast widget missing columns (Current/Suggest/Vendor) | ~30 |
| D6 | Dashboard | Consumption Trends chart not rendering | ~40 |
| D7 | Dashboard | Cost Trend sparklines missing | ~30 |
| D-SP1-12 | Smart Purchase | 12 design gaps (vendor reasoning, status badges, color coding, etc.) | ~200 |
| SA1 | Stock Audit | Data not loading + design polish | ~30 |
| CS1 | Current Stock | Data not loading (may be restaurant-specific) | ~20 |

### MEDIUM (missing features from mockup)
| ID | Screen | Gap | Est. Lines |
|---|---|---|---|
| IS2-4 | Setup | Export, Import, Bulk Edit buttons missing | ~40 |
| D8-9 | Dashboard | Widget design polish (Recipe Margin, Vendor cards) | ~50 |
| SA2-4 | Stock Audit | Save button, drift color coding, reason dropdown polish | ~30 |

### LOW (cosmetic)
| ID | Screen | Gap | Est. Lines |
|---|---|---|---|
| IS5-6 | Setup | Category orange highlight + badge styling | ~10 |
| D4 | Dashboard | Restaurant context subtitle | ~5 |
| Various | All | Column name alignment, subtitle text differences | ~15 |

---

## TOTAL ESTIMATED EFFORT

| Priority | Screens | Est. Lines |
|---|---|---|
| NAV architecture (pill tab bar) | ALL | ~100 |
| Dashboard widgets (D1-D10) | Dashboard | ~200 |
| Smart Purchase polish (D-SP1-12) | Smart Purchase | ~200 |
| Current Stock + Stock Audit (data + polish) | 2 screens | ~80 |
| Setup (Export/Import/Bulk Edit) | Setup | ~40 |
| Minor polish across all | ALL | ~30 |
| **TOTAL** | | **~650 lines** |

---

## RECOMMENDATION

Register as **CR-081: Inventory Design Alignment Pass** (or extend CR-075 "UX Overhaul" scope).

**Phased approach:**
1. **Phase A (P0):** Navigation pill tab bar — changes the entire UX feel
2. **Phase B (P1):** Dashboard KPIs + widgets — most visible screen
3. **Phase C (P1):** Smart Purchase design polish — most complex screen  
4. **Phase D (P2):** Current Stock + Stock Audit + Setup polish

Each phase can be tested independently. Phase A is the foundation — changes how users navigate between screens.
