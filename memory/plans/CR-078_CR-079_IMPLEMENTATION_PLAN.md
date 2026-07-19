# Implementation Plan — CR-078 + CR-079 (+ CR-075-B absorbed)

**Gate:** 3 (Implementation Plan) — Written after §Stage Dispatch verification that Gate 2 IA is still accurate.
**Author role:** PLANNING (per AGENT_PROMPT_ALPHA v0.7 §Role 2 · §Stage Dispatch "implementation_plan" branch)
**Date:** 2026-07-18
**Sprint:** pos_5_0_wave_2
**Prior Gate 2 IA:** `/app/memory/impact/CR-078_CR-079_IMPACT_ANALYSIS.md`
**Owner rulings (locked):** All defaults B1-B14 accepted per session 2026-07-18
**Ship bundle:** Single PR — CR-078 + CR-079 + CR-075-B absorbed
**Ship fallback:** If CR-077 slips → hide Receive pill (feature-flag off) · re-enable in 5-line follow-up

---

## 0. IA Re-Verification (§Stage Dispatch line 504 — MANDATORY)

Verified 2026-07-18 in fresh session after repo pull to remote HEAD `0f9757f`:

| Assumed | Current | Delta |
|---|---|---|
| `Sidebar.jsx:117-128` = inventory block with 5 children | Confirmed at lines 117-128 | 0 |
| `App.js:168-171` = 4 inventory routes | Confirmed | 0 |
| `PurchaseEntryPanel.jsx` = 266 lines | 266 lines | 0 |
| `PhysicalCountPanel.jsx` = 191 lines | 191 lines | 0 |
| `InventoryDashboardPanel.jsx` = 193 lines | 193 lines | 0 |
| `inventoryService.js` = 120 lines | 120 lines | 0 |
| `inventoryTransform.js` = 181 lines | 181 lines | 0 |

**IA is accurate. Plan is safe to proceed.**

---

## 1. Locked Owner Decisions (B1-B14 · accept-all-defaults)

| # | Ruling |
|---|---|
| B1 | Velocity window **matches horizon** — 7d horizon → 7d window, 14d → 14d, 30d → 30d |
| B2 | **Hide** 0-gap rows in the auto shopping list |
| B3 | Override warning threshold = **5%** |
| B4 | Planner is **ephemeral** — no draft persistence |
| B5 | Vendor rank tie-breaker = **most recent purchase wins** |
| B6 | Ad-hoc row rate **pre-fills** from vendor-item-list if ingredient known |
| B7 | **No** bulk-clear / reset button (horizon change re-computes anyway) |
| B8 | Master-outlet parent-stock hint = **out of scope** (deferred to CR-080) |
| B9 | CR-075-B **absorbed** into CR-079 (Physical Count → Stock Audit rename ships with the bundle) |
| B10 | Default `/inventory` → **hard `<Navigate replace>`** to `/inventory-dashboard` · role-aware landing DEFERRED |
| B11 | Legacy paths (`/inventory-purchase`, `/inventory-physical`, `/inventory-dashboard`) → **302 redirect** to new paths |
| B12 | Widgets live in **CR-079's dashboard file tree** (`components/inventory/widgets/*`) — reusable outside planner |
| B13 | Receive pill = **YES for both** `franchise` + `master` outlets |
| B14 | Intelligence Dashboard = **show for all** outlets · empty-state placeholders inside each widget when data is thin |

---

## 2. Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| Sidebar.jsx (758 lines · 15+ prior modifiers) hot file | HIGH-FILE / MEDIUM-CHANGE | Surgical edit lines 117-128 only. Re-view lines before edit per §Step-0. |
| Route-rename breaks deep links from email/bookmarks | MEDIUM | 302 redirects (B11) for all 3 old paths |
| Partial submit — N-th `/add-stock` call fails after N-1 succeeded | MEDIUM | Show partial-success toast listing succeeded vs failed vendors. No auto-retry. |
| CR-077 slips → Receive pill breaks | LOW | Feature-flag: hide pill if `restaurantTypeFlag` undefined |
| Rate ≤ 0 or PM missing sneaks past validation | HIGH (financial) | Blocking validation before any API call fires (B1/B2 hard rules) |
| ESLint react-hooks warnings on new widgets | LOW | Follow CR-011 Phase 3 pattern (useMemo for computed lists) |

**Overall bundle risk: HIGH** (CR-078 dominates · money + client-side ranking).

---

## 3. Execution Sequence (ordered · dependencies enforced)

### Phase A — Foundation (utilities first, no UI wiring yet)
1. Create `utils/purchasePlanner.js` (velocity/gap math · unit-test-ready)
2. Create `utils/vendorRanking.js` (ranking + tie-breaker + reason strings)
3. Extend `api/transforms/inventoryTransform.js` — add `origin: 'planner' | 'ad_hoc'` passthrough

### Phase B — Rename layer (no logic changes · git mv where possible)
4. Rename `InventoryDashboardPanel.jsx` → `CurrentStockPanel.jsx`
5. Rename `pages/InventoryDashboardPage.jsx` → `pages/InventoryCurrentStockPage.jsx`
6. Rename `PhysicalCountPanel.jsx` → `StockAuditPanel.jsx` · update heading string
7. Rename `pages/PhysicalCountPage.jsx` → `pages/StockAuditPage.jsx` · update heading

### Phase C — New Smart Purchase surface
8. Create `components/inventory/smart/HorizonPicker.jsx`
9. Create `components/inventory/smart/VendorSuggestionCell.jsx`
10. Create `components/inventory/smart/AutoShoppingList.jsx` (consumes utilities from Phase A)
11. Create `components/inventory/smart/GroupedVendorPreview.jsx`
12. Create `components/inventory/SmartPurchasePanel.jsx` (parent · orchestrates 8-11)
13. Create `pages/SmartPurchasePage.jsx` (thin wrapper)

### Phase D — Intelligence Dashboard widgets
14. Create `components/inventory/widgets/ReorderForecastWidget.jsx`
15. Create `components/inventory/widgets/ConsumptionTrendsWidget.jsx`
16. Create `components/inventory/widgets/CostTrendWidget.jsx`
17. Create `components/inventory/widgets/RecipeCostMarginWidget.jsx`
18. Create `components/inventory/widgets/VendorPerformanceWidget.jsx`
19. Create `components/inventory/widgets/VendorDirectoryWidget.jsx`
20. Create `components/inventory/InventoryIntelligencePanel.jsx` (hosts 14-19 + 2 locked wastage placeholder cards)
21. Create `pages/InventoryIntelligencePage.jsx`

### Phase E — Nav + routing wire-up (Sidebar.jsx + App.js are HOT — surgical)
22. Edit `components/layout/Sidebar.jsx` lines 117-128 — restructure inventory children per mock v5
23. Edit `App.js` — add 3 new routes + 3 legacy redirects + reroute `/inventory` to Intelligence

### Phase F — Cleanup
24. Delete `components/inventory/PurchaseEntryPanel.jsx`
25. Delete `pages/PurchaseEntryPage.jsx` (superseded by `SmartPurchasePage.jsx`)

### Phase G — Post-code hygiene (§Step 5 checklist)
26. Registry sync (CR-078/079 → IMPLEMENTED; CR-075-B → CLOSED-ABSORBED-BY-CR-079)
27. FILE_OWNERSHIP.md — register all 21 files (closes long-standing gap)
28. Code markers `// CR-078` / `// CR-079` in every touched file

---

## 4. File-by-File Edit Ledger (24 files)

> Legend: **NEW** = create · **EDIT** = search_replace · **RENAME** = git-mv equivalent + rewrite · **DELETE** = remove

### 4.1 · Utilities (Phase A)

#### Edit #1 — **NEW** `utils/purchasePlanner.js`
**Purpose:** Compute daily velocity, projected need, gap, suggested qty.
**Locked rules:** B1 (window = horizon), B2 (hide gap ≥ 0)
**Public API:**
```
computePlan({ stockInventory, dcr, horizonDays })
  → returns [{ ingredient_id, name, unit, on_hand, velocity_per_day, projected_need, gap, suggest_qty }]
  Only rows where gap < 0 (B2).
```
**Verify:** unit test `purchasePlanner.test.js` — fixture: on_hand=2, velocity=1/day, horizon=7 → suggest_qty=5

#### Edit #2 — **NEW** `utils/vendorRanking.js`
**Purpose:** Rank vendors per ingredient by lowest last unit_price. Tie-breaker = most recent purchase (B5).
**Public API:**
```
rankVendors(vendorItemList, ingredientId)
  → { winner: {vendor_id, unit_price, last_date}, alternatives: [...], reason: string }
```
**Reason string logic:**
- Only 1 vendor with history → `"Only vendor with history"`
- Winner rate < 2nd cheapest by ≥5% → `"Cheapest · X% below <2nd>"`
- All vendors same rate → `"Stable · same rate × N purchases"`
- Winner rate matches 2nd by <5% → `"Best of N vendors"`
**Verify:** unit test `vendorRanking.test.js` — 3 vendors, 5 fixtures for each branch

#### Edit #3 — **EDIT** `api/transforms/inventoryTransform.js`
**Location:** `toAPI.addPurchase()` line 116-134 · `purchase_items` mapper
**Changes (2 concerns · same edit):**

1. **`origin` passthrough** (CR-078 planner marker · used by future backend brief Q7-b):
   ```js
   origin: item.origin || 'legacy',   // 'planner' | 'ad_hoc' | 'legacy'
   ```

2. **P6 fix — Batch + Expiry passthrough** (folded from CR-075-A per code-walk 2026-07-18):
   - Prior state: fields captured in UI + line-item model, but **silently dropped** at transform → backend never receives them
   - Backend field names (curl-verified 2026-07-18): `batch` (raw string) · `expiry_date` (DD-MM-YYYY string)
   - Reuse existing `formatDateForAPI(item.expiry)` helper (already in `PurchaseEntryPanel.jsx:82-85` — extract to shared util or inline the 2-line conversion inside the mapper)
   - **Add to `purchase_items` mapper:**
     ```js
     batch: item.batch || '',
     expiry_date: item.expiry ? formatDateForAPI(item.expiry) : '',
     ```

**After (final purchase_items object):**
```js
purchase_items: (data.items || []).map(item => ({
  Ingredient: item.ingredientId,
  Unit: item.unit,
  quantity: item.quantity,
  rate: item.rate,
  Amount: item.amount,
  converion_factor: item.conversionFactor || 1,   // R9 typo preserved
  batch: item.batch || '',                          // P6 · CR-075-A folded
  expiry_date: item.expiry ? formatDateForAPI(item.expiry) : '',  // P6 · CR-075-A folded
  origin: item.origin || 'legacy',                  // CR-078
})),
```

**Δ:** ~7 lines (3 new fields + 4 lines inline formatter or import)

**Verify:**
- Curl an `/add-purchase` POST with `batch: 'B-2026-07'` + `expiry_date: '31-12-2026'` + `origin: 'planner'` → response 200 · fields present in stored record (per P6 curl proof in CR-075 intake §P6)
- Unit test: transform input `{ items: [{ batch: 'B1', expiry: '2026-12-31', origin: 'planner' }] }` → output has `batch: 'B1'`, `expiry_date: '31-12-2026'`, `origin: 'planner'`
- Regression: transform input WITHOUT batch/expiry → output has empty strings (backwards compat)

### 4.2 · Renames (Phase B)

#### Edit #4 — **RENAME** `InventoryDashboardPanel.jsx` → `CurrentStockPanel.jsx`
- File content: no logic change · update internal comment `// CR-072 → repurposed by CR-079` at top
- Update named export (if any) — component name becomes `CurrentStockPanel`
- Update all imports across codebase (grep `InventoryDashboardPanel`)
- Heading string change (`h1`/`h2`): "Stock Dashboard" → "Current Stock"

#### Edit #5 — **RENAME** `pages/InventoryDashboardPage.jsx` → `pages/InventoryCurrentStockPage.jsx`
- Import updated: `CurrentStockPanel` (from Edit #4)
- Export component `InventoryCurrentStockPage`
- Update `pages/index.js` export re-map

#### Edit #6 — **RENAME** `PhysicalCountPanel.jsx` → `StockAuditPanel.jsx` (CR-075-B absorbed)
- Content: no logic change
- Heading: "Physical Stock Count" → "Stock Audit"
- Comment marker: `// CR-072 · renamed CR-079 (absorbs CR-075-B)`

#### Edit #7 — **RENAME** `pages/PhysicalCountPage.jsx` → `pages/StockAuditPage.jsx`
- Import `StockAuditPanel` (from Edit #6)
- Export `StockAuditPage`
- `pages/index.js` re-map

### 4.3 · Smart Purchase (Phase C)

#### Edit #8 — **NEW** `components/inventory/smart/HorizonPicker.jsx`
**Interface:**
```jsx
<HorizonPicker
  value={horizonDays}                       // 3 | 7 | 10 | 14 | number (custom)
  onChange={(days) => setHorizonDays(days)}
  data-testid="horizon-picker"
/>
```
**UI:** Chips 3d · 7d · 10d · 14d · Custom (number input). Active chip highlighted per mock v5.
**Verify:** Manual — click each chip → parent state updates → downstream list re-computes

#### Edit #9 — **NEW** `components/inventory/smart/VendorSuggestionCell.jsx`
**Interface:**
```jsx
<VendorSuggestionCell
  candidates={vendorCandidates}             // from rankVendors()
  selectedVendorId={row.vendor_id}
  onChange={(vid) => update(rowIx, {vendor_id: vid})}
  overrideWarningPct={5}                    // B3 locked
  data-testid={`vendor-cell-${row.ingredient_id}`}
/>
```
**Behaviour:**
- Default = winner
- Show `<select>` listing candidates sorted by unit_price asc
- Tooltip below cell shows reason string
- If user picks a candidate whose unit_price > winner × 1.05 → yellow triangle icon + hover text "Vendor A rate ₹X is 5.6% above cheapest"

#### Edit #10 — **NEW** `components/inventory/smart/AutoShoppingList.jsx`
**Interface:**
```jsx
<AutoShoppingList
  rows={plannedRows}                        // from computePlan(); already gap<0 only (B2)
  vendorItemList={vendorItemList}
  onRowChange={(ix, patch) => ...}
  onRowRemove={(ix) => ...}
  onAddAdHoc={() => ...}
  data-testid="auto-shopping-list"
/>
```
**Columns:** Ingredient · Unit · On-hand · Velocity/day · Projected need · Gap · **Suggest qty** (help-text) · **Qty input** · **Rate** · **Vendor cell (VendorSuggestionCell)** · Remove
**Empty state:** "You're covered — no items need to be purchased for the next N days." (per B2 hide + B14 empty-state)
**Ad-hoc row (B6):** New row appended with blank velocity/gap columns. Ingredient input triggers pre-fill of Rate from `vendorItemList` if a match exists.

#### Edit #11 — **NEW** `components/inventory/smart/GroupedVendorPreview.jsx`
**Interface:**
```jsx
<GroupedVendorPreview
  linesByVendor={groupBy(rows, 'vendor_id')}
  paymentMethodsByVendor={pmMap}
  onPmChange={(vid, pm) => ...}
  data-testid="grouped-vendor-preview"
/>
```
**UI:** One card per vendor · lists lines + subtotal + `<select>` Payment Method (mandatory · B1 hard rule). Red border + inline error if PM empty.

#### Edit #12 — **NEW** `components/inventory/SmartPurchasePanel.jsx`
**Purpose:** Container — orchestrates all Smart Purchase pieces.
**State:**
```jsx
const [horizonDays, setHorizonDays] = useState(7);          // default per mock v5
const [rows, setRows] = useState([]);                       // planner + ad-hoc rows merged
const [pmByVendor, setPmByVendor] = useState({});
const [submitting, setSubmitting] = useState(false);
const [submitResults, setSubmitResults] = useState(null);    // {succeeded: [], failed: []}
```
**Data fetches on mount + on horizonDays change:**
- 3 parallel: `getStockInventory()` · `getDailyConsumptionReport({days: horizonDays})` · `getVendorItemList()`
- On response → `rows = computePlan({...}).map(r => ({...r, vendor_id: rankVendors(vil, r.ingredient_id).winner.vendor_id }))`
**No draft persistence (B4)** — pure component state.
**No bulk-clear button (B7).**
**Submit flow:**
```
1. Validate: rate>0 all rows (B2 hard); PM set for all vendor groups (B1 hard)
2. If invalid → toast + focus first invalid field · NO API call
3. Group by vendor_id · call POST /add-stock N times sequentially
4. Collect {ok:[...], fail:[{vendor_id, error}]}
5. If all ok → toast "N vendors updated" + navigate('/inventory/current-stock')
6. If partial → show <SubmitResults/> banner listing succeeded + failed · no auto-retry
```
**data-testid:** `smart-purchase-panel`, `smart-purchase-submit`

#### Edit #13 — **NEW** `pages/SmartPurchasePage.jsx`
Thin wrapper — no logic. Mounts `SmartPurchasePanel`.

### 4.4 · Intelligence Widgets (Phase D)

> **All widgets live under `components/inventory/widgets/`** per B12 (CR-079 owns file tree).
> **All widgets show empty state when data thin** per B14.
> **All widgets export a "View details →" link marker** — visual only in v1, deferred wiring to CR-08X.

#### Edit #14 — **NEW** `ReorderForecastWidget.jsx`
**Data:** `getStockInventory()` + `getDailyConsumptionReport({days: 7})`
**Logic:** For each ingredient: `days_left = on_hand / velocity_per_day` · sort ascending
**UI:** Top 5 rows with red/amber/green indicator based on days_left ≤ 3 / ≤ 7 / > 7
**Empty state:** "Not enough consumption data yet — check back after 3+ days of activity."

#### Edit #15 — **NEW** `ConsumptionTrendsWidget.jsx`
**Data:** `getDailyConsumptionReport({days: 30})`
**UI:** recharts LineChart · 30-day daily consumption total (all ingredients aggregated) · sparkline per top-5 ingredient beneath
**Empty state:** "No consumption data for the last 30 days."

#### Edit #16 — **NEW** `CostTrendWidget.jsx`
**Data:** `getVendorItemList()` grouped by ingredient · 30-day rate delta
**UI:** Top-5 ingredients showing avg rate this week vs prior week · red arrow ↑ if up, green ↓ if down
**Empty state:** "No purchase history in the last 30 days."

#### Edit #17 — **NEW** `RecipeCostMarginWidget.jsx`
**Data:** Recipes list (existing endpoint) + current ingredient rates (`vendorItemList` latest) + food sale prices (existing menu endpoint)
**Logic per recipe:**
```
cost_per_serve = Σ(ingredient_qty × latest_rate) / serves
sale_price = matched food's price (name match against menu)
margin_pct = (sale_price - cost_per_serve) / sale_price × 100
```
**Colour bands (FB-7-Q2 locked):**
- margin ≥ 50% → **green**
- 30% ≤ margin < 50% → **amber**
- margin < 30% → **red**
**UI:** Top 10 recipes sorted by margin asc (worst first) · badge with percentage
**Empty state:** "Add recipes to see cost-margin analysis."

#### Edit #18 — **NEW** `VendorPerformanceWidget.jsx`
**Data:** `getVendorItemList()` grouped by vendor over last 30 days
**Metrics per vendor:** total spend · items supplied · avg rate delta vs cheapest for same ingredients
**UI:** Vendor cards with 3 stats each · sorted by total spend desc

#### Edit #19 — **NEW** `VendorDirectoryWidget.jsx`
**Data:** `getVendorItemList()` · distinct vendors
**UI:** Simple list — name · phone (if in payload) · total lifetime spend · last purchase date

#### Edit #20 — **NEW** `components/inventory/InventoryIntelligencePanel.jsx`
**Purpose:** Host all 6 widgets + 2 Phase-2 locked wastage cards (grey/disabled visual placeholder).
**Layout per mock v5:** 2-col grid on desktop · single col mobile · widgets order: Reorder Forecast (top-left · biggest) · Consumption Trends · Cost Trend · Recipe Cost & Margin · Vendor Performance · Vendor Directory.
**Wastage cards (Phase 2 locked):** Two greyed-out cards labelled "Wastage Insights" and "Top Wasted Items" with tooltip "Coming when backend wastage endpoint ships (brief filed)".
**Empty overall:** If ALL widgets are empty (brand new outlet), show a friendly banner "Insights arrive after a few days of activity" + link to Current Stock.

#### Edit #21 — **NEW** `pages/InventoryIntelligencePage.jsx`
Thin wrapper — mounts `InventoryIntelligencePanel`.

### 4.5 · Nav + routing (Phase E · HOT files)

#### Edit #22 — **EDIT** `components/layout/Sidebar.jsx` lines 117-128
**§Step-0 mandatory:** Before editing, re-view lines 115-130. Confirm structure hasn't drifted from IA.

**Before (verified 2026-07-18):**
```jsx
{
  id: "inventory",
  label: "Inventory",
  icon: Package,
  children: [
    { id: "inventory-dashboard", label: "Stock Dashboard", path: "/inventory" },
    { id: "inventory-purchase", label: "Purchase Entry", path: "/inventory-purchase" },
    { id: "inventory-physical", label: "Physical Count", path: "/inventory-physical" },
    { id: "inventory-setup", label: "Ingredients & Setup", path: "/inventory-setup" },
    { id: "inventory-recipes", label: "Recipes", path: "/recipes" },
  ],
},
```

**After (per mock v5 · B10 + B13):**
```jsx
{
  id: "inventory",
  label: "Inventory",
  icon: Package,
  children: [
    { id: "inventory-dashboard", label: "Dashboard", path: "/inventory-dashboard" },                                  // CR-079 · Intelligence view (default)
    { id: "inventory-current-stock", label: "Current Stock", path: "/inventory-current-stock" },                       // CR-079 · was "Stock Dashboard"
    { id: "inventory-smart-purchase", label: "Smart Purchase", path: "/inventory-smart-purchase" },                    // CR-078 · was "Purchase Entry"
    { id: "inventory-receive", label: "Receive", path: "/inventory-receive", featureGate: "restaurantTypeFlagged" },   // CR-077 · conditional B13
    { id: "inventory-audit", label: "Stock Audit", path: "/inventory-audit" },                                         // CR-079 · absorbs CR-075-B · was "Physical Count"
    { id: "inventory-setup", label: "Ingredients & Setup", path: "/inventory-setup" },
    { id: "inventory-recipes", label: "Recipes", path: "/recipes" },
  ],
},
```

**Conditional-render helper** (already exists at line 495 per CR-011 F-10 · reuse `featureGate` pattern):
- Add case for `featureGate === 'restaurantTypeFlagged'`:
  - Read `restaurant?.restaurant_type_flag` from RestaurantContext
  - Show pill iff value ∈ `{'franchise', 'master'}` (B13)
  - Else hide
- **Fallback if CR-077 hasn't surfaced field:** context returns undefined → hide (safe default)

**Δ:** ~15 lines child block + ~5 lines featureGate case

#### Edit #23 — **EDIT** `App.js`
**Location:** Lines 168-171

**Before:**
```jsx
<Route path="/inventory" element={<ProtectedRoute><InventoryDashboardPage /></ProtectedRoute>} />
<Route path="/inventory-physical" element={<ProtectedRoute><PhysicalCountPage /></ProtectedRoute>} />
<Route path="/inventory-setup" element={<ProtectedRoute><InventorySetupPage /></ProtectedRoute>} />
<Route path="/inventory-purchase" element={<ProtectedRoute><PurchaseEntryPage /></ProtectedRoute>} />
```

**After:**
```jsx
{/* CR-079 · Inventory IA restructure — new landing */}
<Route path="/inventory" element={<ProtectedRoute><Navigate to="/inventory-dashboard" replace /></ProtectedRoute>} />
<Route path="/inventory-dashboard" element={<ProtectedRoute><InventoryIntelligencePage /></ProtectedRoute>} />
<Route path="/inventory-current-stock" element={<ProtectedRoute><InventoryCurrentStockPage /></ProtectedRoute>} />
<Route path="/inventory-smart-purchase" element={<ProtectedRoute><SmartPurchasePage /></ProtectedRoute>} />
<Route path="/inventory-audit" element={<ProtectedRoute><StockAuditPage /></ProtectedRoute>} />
<Route path="/inventory-setup" element={<ProtectedRoute><InventorySetupPage /></ProtectedRoute>} />
{/* CR-079 · Legacy 302 redirects — B11 (safe for bookmarks/emails) */}
<Route path="/inventory-purchase" element={<Navigate to="/inventory-smart-purchase" replace />} />
<Route path="/inventory-physical" element={<Navigate to="/inventory-audit" replace />} />
```

**Imports (top of file):**
- Add: `import InventoryIntelligencePage from './pages/InventoryIntelligencePage';`
- Add: `import InventoryCurrentStockPage from './pages/InventoryCurrentStockPage';`
- Add: `import SmartPurchasePage from './pages/SmartPurchasePage';`
- Add: `import StockAuditPage from './pages/StockAuditPage';`
- Add: `import { Navigate } from 'react-router-dom';` (if not already imported)
- Remove: `import InventoryDashboardPage from './pages/InventoryDashboardPage';`
- Remove: `import PhysicalCountPage from './pages/PhysicalCountPage';`
- Remove: `import PurchaseEntryPage from './pages/PurchaseEntryPage';`

**Δ:** ~15 lines net (8 imports swapped · 4 routes → 8 routes)

### 4.6 · Cleanup (Phase F)

#### Edit #24 — **DELETE** `components/inventory/PurchaseEntryPanel.jsx` (266 lines)
Superseded by `SmartPurchasePanel.jsx` (Edit #12).
Grep confirms only import site is `PurchaseEntryPage.jsx` (also being deleted).

#### Edit #25 — **DELETE** `pages/PurchaseEntryPage.jsx`
Superseded by `SmartPurchasePage.jsx` (Edit #13).
Update `pages/index.js` — remove export.

---

## 5. Scope Lock (§R14)

### Files WILL change (24)
1. `utils/purchasePlanner.js` — NEW
2. `utils/vendorRanking.js` — NEW
3. `api/transforms/inventoryTransform.js` — EDIT (+5)
4. `components/inventory/InventoryDashboardPanel.jsx` — RENAME → `CurrentStockPanel.jsx`
5. `pages/InventoryDashboardPage.jsx` — RENAME → `InventoryCurrentStockPage.jsx`
6. `components/inventory/PhysicalCountPanel.jsx` — RENAME → `StockAuditPanel.jsx`
7. `pages/PhysicalCountPage.jsx` — RENAME → `StockAuditPage.jsx`
8. `components/inventory/smart/HorizonPicker.jsx` — NEW
9. `components/inventory/smart/VendorSuggestionCell.jsx` — NEW
10. `components/inventory/smart/AutoShoppingList.jsx` — NEW
11. `components/inventory/smart/GroupedVendorPreview.jsx` — NEW
12. `components/inventory/SmartPurchasePanel.jsx` — NEW
13. `pages/SmartPurchasePage.jsx` — NEW
14. `components/inventory/widgets/ReorderForecastWidget.jsx` — NEW
15. `components/inventory/widgets/ConsumptionTrendsWidget.jsx` — NEW
16. `components/inventory/widgets/CostTrendWidget.jsx` — NEW
17. `components/inventory/widgets/RecipeCostMarginWidget.jsx` — NEW
18. `components/inventory/widgets/VendorPerformanceWidget.jsx` — NEW
19. `components/inventory/widgets/VendorDirectoryWidget.jsx` — NEW
20. `components/inventory/InventoryIntelligencePanel.jsx` — NEW
21. `pages/InventoryIntelligencePage.jsx` — NEW
22. `components/layout/Sidebar.jsx` — EDIT (lines 117-128 + featureGate case)
23. `App.js` — EDIT (routes + imports)
24. `components/inventory/PurchaseEntryPanel.jsx` — DELETE
25. `pages/PurchaseEntryPage.jsx` — DELETE
26. `pages/index.js` — EDIT (export map for 4 renamed + 1 deleted)

Net add: **~1,190 lines · 21 net-new files · 4 renames · 2 deletes.**

### Files WILL NOT touch
- Order flow: `orderTransform.js` · `OrderEntry.jsx` · `CartPanel.jsx` · `CollectPaymentPanel.jsx`
- Menu Management: `menuManagementTransform.js` · `BulkEditor.jsx` · `MenuManagementPanel.jsx`
- Expense module (any file)
- Reports/Insights: any `reports-module/*` file · `insightsService.js` · `reportTransform.js`
- Auth: `authService.js` · `authTransform.js` · `AuthContext.jsx`
- Recipes: `RecipeManagementPage.jsx` · `RecipeManagementPanel.jsx` · `RecipeFormPanel.jsx` · `recipeService.js` · `recipeTransform.js` · `/recipes` route
- Setup: `InventorySetupPanel.jsx`
- Any Sidebar section OTHER than the `inventory` block (lines 117-128)
- Any `HIGH-RISK §R5 hotspot` file except the two explicit hotspots above

Cross-check per §Step 1: no active CR/BUG claims edits on any of these 24 files.

---

## 6. Verification Matrix (§Step 4 · seeds QA handover)

| # | File / Behaviour | How to Verify | Automated? |
|---|---|---|:---:|
| 1 | `utils/purchasePlanner.js` — gap math | Unit test: fixture (on_hand=2, velocity=1/day, horizon=7) → suggest_qty=5. Edge: velocity=0 → row excluded (B2). | **YES** |
| 2 | `utils/vendorRanking.js` — lowest last rate + tie-breaker | Unit test: 3 vendors (₹100 · ₹95 · ₹95 with later date) → winner is the ₹95 with later date (B5). | **YES** |
| 3 | `inventoryTransform.js` — `origin` field | Curl POST /add-stock with `origin: 'planner'` · confirm 200. | NO |
| 4 | Sidebar renders 7 inventory children in new order | Manual: login → open Inventory in sidebar → verify pill labels + order match mock v5. `data-testid` selectors `inventory-{dashboard,current-stock,smart-purchase,receive,audit,setup,recipes}` present. | NO |
| 5 | `/inventory` redirects to `/inventory-dashboard` | Manual URL entry · watch address bar rewrite. | NO |
| 6 | `/inventory-purchase` (legacy) → 302 to `/inventory-smart-purchase` | Same pattern. | NO |
| 7 | `/inventory-physical` (legacy) → 302 to `/inventory-audit` | Same pattern. | NO |
| 8 | Intelligence Dashboard renders 6 widgets + 2 locked wastage cards | Manual · screenshot vs mock v5. | NO |
| 9 | Intelligence Dashboard empty-state banner for brand-new outlet | Manual · use test outlet with zero purchase/consumption history. | NO |
| 10 | Smart Purchase — horizon change re-computes gap for all rows | Manual: 7d → 14d → suggest_qty doubles (approx) for velocity-driven rows. | NO |
| 11 | Smart Purchase — 0-gap rows hidden (B2) | Manual: ingredient with on_hand ≥ projected_need → row absent. | NO |
| 12 | Smart Purchase — ad-hoc row pre-fills rate (B6) | Manual: click "+ Add Ad-hoc" → type ingredient known in vendor-item-list → Rate input auto-populated. | NO |
| 13 | Ad-hoc row unknown ingredient → Rate blank | Manual: type new ingredient name → Rate empty. | NO |
| 14 | Override warning at 5% threshold (B3) | Manual: pick vendor 5.1% above winner → yellow icon + tooltip appears. Pick 4.9% above → no warning. | NO |
| 15 | Payment Method missing per vendor group blocks submit (B1) | Manual: 2 vendor groups, PM set only on one → Submit → toast error, no /add-stock call in Network tab. | NO |
| 16 | Rate ≤ 0 blocks submit (B2) | Manual: set rate to 0 → Submit → toast, no call. | NO |
| 17 | Successful submit fires N sequential /add-stock calls | Network tab: 4 vendor groups → 4 calls in order. | NO |
| 18 | Partial-success state on N-th call failure | Mock backend 500 on call 3 · verify banner lists succeeded (2) + failed (1) · no auto-retry. | NO |
| 19 | On full success → toast + navigate to /inventory-current-stock | Manual. | NO |
| 20 | Stock Audit rename — all 4 touch-points ("Physical Count" → "Stock Audit") | Manual grep in DOM: sidebar label · page heading · panel heading · breadcrumb. | NO |
| 21 | Receive pill visibility gated by `restaurant_type_flag` (B13) | Login as `owner@kunafamahal.com` (normal) → pill hidden · Login as `owner@palmindia.com` (franchise) → pill visible. | NO |
| 22 | Receive pill hidden when `restaurant_type_flag` undefined | Stub AuthContext to return undefined → pill hidden (safe fallback). | NO |
| 23 | Recipe Cost & Margin colour bands (FB-7-Q2 · B14) | Unit test fixture: margin=25% → red · margin=45% → amber · margin=65% → green. | **YES** |
| 24 | Widget "View details →" links visually present (v1 non-functional) | Manual — verify each of 6 widgets has the link glyph/text. Click = no-op. Deferred to CR-08X. | NO |
| 25 | ESLint / webpack compile clean | `yarn build --dry` OR watch supervisor log — 0 errors. | **YES (in CI)** |
| 26 | No dead imports left after PurchaseEntryPanel/PurchaseEntryPage deletion | `grep -rn "PurchaseEntryPanel\|PurchaseEntryPage" /app/frontend/src` → 0 results. | **YES** |

**Summary:** 26 checks · 5 automated · 21 manual. Manual set is browser-driven — implementation agent runs first, hands to QA for repeat + regression.

---

## 7. Post-Code Registry Checklist (§Step 5 — implementation MUST execute)

```
- [ ] registry.json: CR-078 → status="IMPLEMENTED", gate=3, sprint_key="pos_5_0_wave_2"
- [ ] registry.json: CR-079 → status="IMPLEMENTED", gate=3, sprint_key="pos_5_0_wave_2"
- [ ] registry.json: CR-075-B → status="CLOSED — ABSORBED-BY-CR-079", gate=5, sprint_key="pos_5_0"
- [ ] CR_REGISTRY.md: rows updated for CR-078, CR-079 with links to plan doc + IA doc
- [ ] BUG_TRACKER.md: no bugs touched (skip)
- [ ] FILE_OWNERSHIP.md: add first-ever inventory section (closes long-standing gap — see IA §R1). Enumerate all 24 files + owning CR marker.
- [ ] Code markers `// CR-078` in: SmartPurchasePanel.jsx, HorizonPicker.jsx, AutoShoppingList.jsx, VendorSuggestionCell.jsx, GroupedVendorPreview.jsx, SmartPurchasePage.jsx, purchasePlanner.js, vendorRanking.js, inventoryTransform.js (only added lines)
- [ ] Code markers `// CR-079` in: Sidebar.jsx (only added lines), App.js (only added lines), all 6 widget files, InventoryIntelligencePanel.jsx, InventoryIntelligencePage.jsx, renamed files (top-of-file "renamed by CR-079" comment)
- [ ] Deleted files recorded: PurchaseEntryPanel.jsx, PurchaseEntryPage.jsx (log in FILE_OWNERSHIP.md "Deleted Files" section)
- [ ] Rename mapping table added to CR-079 intake doc for future greppers:
      InventoryDashboardPanel.jsx → CurrentStockPanel.jsx
      InventoryDashboardPage.jsx → InventoryCurrentStockPage.jsx
      PhysicalCountPanel.jsx → StockAuditPanel.jsx
      PhysicalCountPage.jsx → StockAuditPage.jsx
      /inventory-purchase → /inventory-smart-purchase (route rename)
      /inventory-physical → /inventory-audit (route rename)
      /inventory (default) → renders Intelligence (was Stock list)
```

---

## 8. Data-testid Registry (for QA)

New elements added by this bundle (all interactive UI elements MUST carry a data-testid per platform rule):

| Component | testid |
|---|---|
| SmartPurchasePanel | `smart-purchase-panel` |
| Submit button | `smart-purchase-submit` |
| HorizonPicker | `horizon-picker` (chip: `horizon-chip-{days}`) |
| AutoShoppingList | `auto-shopping-list` |
| Row qty input | `row-qty-{ingredient_id}` |
| Row rate input | `row-rate-{ingredient_id}` |
| Row remove | `row-remove-{ingredient_id}` |
| Ad-hoc add button | `add-adhoc-row` |
| VendorSuggestionCell | `vendor-cell-{ingredient_id}` |
| GroupedVendorPreview | `grouped-vendor-preview` |
| Per-vendor PM select | `pm-select-{vendor_id}` |
| InventoryIntelligencePanel | `inventory-intelligence-panel` |
| Each widget wrapper | `widget-{reorder-forecast,consumption-trends,cost-trend,recipe-cost-margin,vendor-performance,vendor-directory}` |
| Widget "View details" link | `widget-details-{name}` |
| Sidebar inventory children | `sidebar-inventory-{dashboard,current-stock,smart-purchase,receive,audit,setup,recipes}` |

---

## 9. Fallback / Feature-Flag (CR-077 slip protection)

If CR-077 has not landed by ship day:
- `restaurant_type_flag` will be `undefined` in RestaurantContext
- `featureGate: 'restaurantTypeFlagged'` case returns `false` → Receive pill hidden universally
- Bundle ships with 0 breakage
- 5-line follow-up PR once CR-077 lands (just remove the fallback branch)

**No feature-flag env var required** — behaviour is data-driven.

---

## 10. Owner Decisions Needed for Plan (§Planning output)

**None.** All 14 open questions (B1-B14) locked as defaults per session 2026-07-18 owner ruling "accept all defaults Option 1".

---

## §Planning final response format

```
Planning complete: CR-078 + CR-079 (+ CR-075-B absorbed)
Stage: Implementation Plan (Gate 3)
Code reality: NONE for new planner/widgets · PARTIAL for renamed shells (rename only, no logic change)
Risk: HIGH (CR-078 dominates; financial + client-side ranking; single bundled PR)
Files WILL change: 24 (21 net-new · 4 rename · 2 delete · surgical HOT-file edits to Sidebar.jsx + App.js)
Files WILL NOT touch: order flow · menu · expense · insights · auth · recipes · setup · non-inventory sidebar sections
Owner decisions: NONE (all B1-B14 defaults accepted)
Docs: /app/memory/plans/CR-078_CR-079_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO / Implementation
```
