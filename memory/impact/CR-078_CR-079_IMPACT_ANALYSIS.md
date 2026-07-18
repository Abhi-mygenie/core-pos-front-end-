# Impact Analysis — CR-078 + CR-079 (+ CR-075-B absorbed)

**Gate:** 2 (Impact Analysis) — STOP after IA per §Stage Dispatch. Gate 3 in fresh session.
**Author role:** PLANNING (per AGENT_PROMPT_ALPHA v0.7 §Role Decision Tree row 2)
**Date:** 2026-07-18
**Sprint:** pos_5_0_wave_2
**Bundle rationale:**
- **CR-079** renames the Inventory nav (Dashboard=Intelligence, Current Stock, Smart Purchase, Stock Audit).
- **CR-078** rewrites the Purchase Entry surface to become Smart Purchase — the very screen CR-079 is renaming.
- **CR-075-B** was the isolated "Physical Count → Stock Audit" rename; CR-079 already does the same rename as part of its restructure — **absorbing CR-075-B per its intake OQ-1**.
- Shipping any one of the three alone creates a broken interim (renamed pill pointing to old body, or new body under old label). **Ship as one PR.**

---

## HEADER — MANDATORY CHECKS (§Planning Boot)

### Code Reality Check (§Step 0)

| Item | Code today | Change type |
|---|---|---|
| Nav pill "Inventory" section (Sidebar.jsx lines 117-128) | Exists · 5 children (Stock Dashboard · Purchase Entry · Physical Count · Ingredients & Setup · Recipes) | Restructure children + labels |
| Route `/inventory` → Stock list | `App.js:168` → `InventoryDashboardPage` | Repurpose to render Intelligence · move Stock list to `/inventory/current-stock` |
| Route `/inventory-purchase` | `App.js:171` → `PurchaseEntryPage` | Rename route + swap page/body |
| Route `/inventory-physical` | `App.js:169` → `PhysicalCountPage` | Rename route + rename page label |
| `PurchaseEntryPanel.jsx` (266 lines) | Vendor-first form | **Replaced** by `SmartPurchasePanel.jsx` (new) — old file deleted |
| `PhysicalCountPanel.jsx` (191 lines) | Physical Stock Count · uses `add-stock` with wastage_reason_id | **Renamed only** — `StockAuditPanel.jsx`; body ~unchanged |
| `InventoryDashboardPanel.jsx` (193 lines) | KPI cards + stock list | **Renamed** to `CurrentStockPanel.jsx`; content unchanged |
| New file `InventoryIntelligencePanel.jsx` | None | **CREATE** — 6 widgets (Reorder Forecast · Consumption Trends · Cost Trend · Vendor Performance · Recipe Cost & Margin · Vendor Directory) + 2 locked wastage cards |
| Velocity math (daily consumption × horizon) | None | **CREATE** — `utils/purchasePlanner.js` |
| Vendor ranking (lowest last unit_price) | None | **CREATE** — `utils/vendorRanking.js` |
| Sale-price fetch for recipe margins | None · foods list endpoint exists but not wired for recipes | **CREATE** — `api/services/menuPriceService.js` (or extend existing recipe transform) |

### Conflict Pre-Check (§Step 1)

| Target file | Last modifier(s) | Overlap concern | Conflict? |
|---|---|---|---|
| **`components/layout/Sidebar.jsx`** (758 lines) | 15+ CRs incl. CR-041, CR-011 Phase 3, CR-052, CR-059, CR-060, CR-061, CR-044, BUG-131, BUG-136 · latest cluster 2026-06-13 | Adding + renaming children in the `inventory` section | ⚠ **HOT · MEDIUM** — must apply §Step-0 entry verification. Additive/rename change limited to lines 117-128 · low blast radius but hot file. |
| **`App.js`** (182 lines) | Multi-CR touch history (CR-011, CR-015, CR-041, CR-044, CR-045, CR-052, CR-059) | 3 route renames + 2 route additions | ⚠ **HOT · LOW** — simple additions, no logic collisions |
| `pages/InventoryDashboardPage.jsx` (30 lines) | CR-072 · BUG-196 | Rename + body swap | None |
| `pages/PurchaseEntryPage.jsx` | CR-072 | Full body replace | None (greenfield replacement) |
| `pages/PhysicalCountPage.jsx` | CR-072 | Rename to `StockAuditPage.jsx` + label change | None |
| `components/inventory/PurchaseEntryPanel.jsx` (266 lines) | CR-072, BUG-197 | Deleted / replaced by `SmartPurchasePanel.jsx` | None active — CR-072 CLOSED, BUG-197 IMPLEMENTED |
| `components/inventory/PhysicalCountPanel.jsx` (191 lines) | CR-072 | Rename to `StockAuditPanel.jsx` + heading change | None |
| `components/inventory/InventoryDashboardPanel.jsx` (193 lines) | CR-072 | Rename to `CurrentStockPanel.jsx` · no logic change | None |
| `api/services/inventoryService.js` (120 lines) | CR-072, BUG-197 | Extension: batch add for planner (planned single-call brief · P2 · not in v1) | None |
| `api/transforms/inventoryTransform.js` (181 lines) | CR-072, BUG-197 | Extension: `origin: planner\|ad_hoc` passthrough field on line rows | None |

**No BLOCKING conflict.** Sidebar + App.js are hot files but changes are surgical.

### FILE_OWNERSHIP.md Gap (§R1)

Inventory files added by CR-072 are still not listed in FILE_OWNERSHIP.md (already noted in prior handover as OPEN GAP). This IA also touches those files — the implementation agent **MUST register**:
- `Sidebar.jsx` · label + child structure change (CR-078+CR-079)
- `App.js` · route additions + renames (CR-078+CR-079)
- `pages/Inventory*Page.jsx` · renames (CR-078+CR-079)
- `components/inventory/*.jsx` · renames + new file (CR-078+CR-079)
- All new files created

### Open Gaps intersected
- **OG-FE-NAV-001** (CR-041 nav consistency) — 3 unresolved owner decisions (D-1/D-2/D-3). This bundle **only affects Inventory nav section**, does not touch the D-1/D-2/D-3 items. Safe to proceed independently.

---

## RISK CLASSIFICATION (§R21)

| Item | Risk | Trigger |
|---|---|---|
| **CR-078** Smart Purchase | **HIGH** | Financial · client-side ranking drives purchase decisions · replaces core Purchase surface · new velocity & vendor math · 6-8 files · ~400-500 lines |
| **CR-079** IA restructure | **MEDIUM** | Sidebar hot file + route renames · non-financial · deep-link redirects · UX-facing |
| **CR-075-B** Stock Audit rename (absorbed) | LOW | Pure label + file rename inside `PhysicalCountPanel` |

**Fast Lane eligible:** ❌ NO — CR-078 alone disqualifies (HIGH risk · replaces core surface).

---

## §Step 2 — DATA-FLOW TRACES

### A. Smart Purchase (CR-078)

```
User opens /inventory-smart-purchase
  → InventorySmartPurchasePage.jsx mounts SmartPurchasePanel
  → SmartPurchasePanel fires 3 parallel requests:
      • GET  /stock-inventory                       (on-hand qty per ingredient)
      • POST /report/daily-consumption-report       (velocity per ingredient · date range = today − horizon)
      • GET  /inventory/vendor-item-list            (full purchase history · powers ranking)

  → utils/purchasePlanner.js:
      projected_need = velocity_per_day × horizon_days
      gap            = projected_need − on_hand
      suggest_qty    = |gap|   (FB-6-a · exact)
      Only include rows where gap < 0.

  → utils/vendorRanking.js (per line):
      candidates = vendor-item-list rows filtered by ingredient_id
      pick winner = min(unit_price) over most-recent-N rows
      alternatives = other candidates sorted by unit_price asc
      reason string = "Cheapest · Xk% below <2nd cheapest>" | "Only vendor with history" | "Stable · same rate × N purchases"

  → User adjusts qty / vendor / adds ad-hoc rows

  → Submit clicked → group by vendor_id → for each vendor:
      POST /add-stock with { vendor_id, payment_method, lines: [...] }
      (N sequential calls per Q7-a · atomic single-call brief filed for future)

  → Success → toast + redirect to /inventory-current-stock

BREAK POINTS:
  - No velocity data for an ingredient → row hidden (unless added as ad-hoc)
  - Only 1 vendor in history → no ranking · shown as "Only vendor with history"
  - Missing payment_method on a vendor group → validation error, submit blocked
  - Any rate ≤ 0 → validation error (B2 hard rule)
  - N-th call fails after N-1 succeeded → partial state · toast lists succeeded vendors + failed ones (documented UX limitation until backend brief Q7-b lands)
```

### B. IA Restructure (CR-079)

```
User clicks Inventory in sidebar
  → sidebar renders 5 items with new labels/order:
       Dashboard (default active · /inventory)         ← Intelligence view
       Current Stock (/inventory/current-stock)         ← old Dashboard body
       Smart Purchase (/inventory-smart-purchase)       ← CR-078 body
       Stock Audit (/inventory-audit)                    ← CR-075-B absorbed · renamed body
       Receive (/inventory-receive)                      ← CR-077 preview · conditional
       Ingredients & Setup (unchanged)
       Recipes (unchanged)

  → conditional visibility on Receive:
       shown when restaurant?.restaurant_type_flag ∈ {franchise, master}
       hidden when 'normal'
       (context field surfaced by CR-077 · fallback = hidden if flag undefined)

  → default /inventory route now serves Intelligence Dashboard (was Stock list)
     Redirect strategy: hard <Navigate to="/inventory/dashboard"> at index route
     Deep-link safety: /inventory-dashboard soft-redirects to /inventory (deprecation notice in code comment)

BREAK POINTS:
  - Any code that hard-codes /inventory expecting stock list → must handle 302 or update to /inventory/current-stock
  - RestaurantContext must expose restaurant_type_flag BEFORE this ships (CR-077 dependency ordering — see §Ship Ordering below)
```

### C. Stock Audit Rename (CR-075-B absorbed)

```
No logic change. Pure rename:
  file:     PhysicalCountPanel.jsx     → StockAuditPanel.jsx
  file:     PhysicalCountPage.jsx      → StockAuditPage.jsx
  route:    /inventory-physical         → /inventory-audit
  label:    "Physical Count"            → "Stock Audit"
  heading:  "Physical Stock Count"      → "Stock Audit"
Legacy /inventory-physical → 302 redirect to /inventory-audit
```

---

## §Step 2 — AFFECTED FILES & LINE ESTIMATES

### Files WILL change (13)

| # | File | Change | Δ lines |
|---|---|---|---|
| 1 | `components/layout/Sidebar.jsx` | Restructure `inventory` children · new labels · conditional Receive item · re-order per mock v5 | ~25 |
| 2 | `App.js` | 2 renames + 2 new routes · 3 legacy redirects | ~15 |
| 3 | **NEW** `pages/InventoryIntelligencePage.jsx` | Page wrapper for the new Dashboard | ~35 |
| 4 | **NEW** `components/inventory/InventoryIntelligencePanel.jsx` | 6 widgets host + 2 locked wastage cards | ~180 |
| 5 | **NEW** `components/inventory/widgets/ReorderForecastWidget.jsx` | Uses DCR + stock-inventory | ~70 |
| 6 | **NEW** `components/inventory/widgets/ConsumptionTrendsWidget.jsx` | Inline chart (recharts already available in package.json) | ~60 |
| 7 | **NEW** `components/inventory/widgets/CostTrendWidget.jsx` | Sparklines per ingredient · rate delta | ~65 |
| 8 | **NEW** `components/inventory/widgets/RecipeCostMarginWidget.jsx` | Cost/serve × margin bands · FB-7 | ~80 |
| 9 | **NEW** `components/inventory/widgets/VendorPerformanceWidget.jsx` | Grouped vendor cards | ~55 |
| 10 | **NEW** `components/inventory/widgets/VendorDirectoryWidget.jsx` | Distinct vendors + spend rollup | ~45 |
| 11 | `pages/InventoryDashboardPage.jsx` → **RENAME** `pages/InventoryCurrentStockPage.jsx` · heading label change | ~5 |
| 12 | `components/inventory/InventoryDashboardPanel.jsx` → **RENAME** `CurrentStockPanel.jsx` · no logic change | ~5 (rename only) |
| 13 | `pages/PhysicalCountPage.jsx` → **RENAME** `StockAuditPage.jsx` · heading change | ~5 |
| 14 | `components/inventory/PhysicalCountPanel.jsx` → **RENAME** `StockAuditPanel.jsx` · heading change | ~5 |
| 15 | `pages/PurchaseEntryPage.jsx` → **RENAME** `SmartPurchasePage.jsx` · body swap | ~10 |
| 16 | **NEW** `components/inventory/SmartPurchasePanel.jsx` | Main planner container · replaces `PurchaseEntryPanel.jsx` | ~180 |
| 17 | **NEW** `components/inventory/smart/HorizonPicker.jsx` | Chip picker (3/7/10/14/custom) | ~35 |
| 18 | **NEW** `components/inventory/smart/AutoShoppingList.jsx` | Auto-generated table with velocity/gap columns | ~110 |
| 19 | **NEW** `components/inventory/smart/VendorSuggestionCell.jsx` | Vendor `<select>` + suggestion reasoning + override warning | ~65 |
| 20 | **NEW** `components/inventory/smart/GroupedVendorPreview.jsx` | Per-vendor summary cards with Payment Method | ~55 |
| 21 | **NEW** `utils/purchasePlanner.js` | Velocity math · gap · projected need | ~40 |
| 22 | **NEW** `utils/vendorRanking.js` | Lowest-last-rate ranking + tie-breakers + reason strings | ~55 |
| 23 | `api/transforms/inventoryTransform.js` | Add `origin` passthrough on line rows | ~5 |
| 24 | `components/inventory/PurchaseEntryPanel.jsx` | **DELETED** | −266 |

**Net add: ~1,190 lines · 21 new files · 6 renames · 1 delete.** Larger than intake estimates (400-500 for CR-078 · 55-80 for CR-079) because Intelligence Dashboard's 6 widgets are being modularised into separate files (better for testing / future CR-08X drill-downs).

### Files WILL NOT touch (scope lock — §R14)

- Order flow · Menu Management · Expense · Reports (Insights)
- `orderTransform.js` · `menuManagementTransform.js`
- Auth flow · payment/settlement/tax
- `RecipeManagementPage.jsx` / `RecipeManagementPanel.jsx` (recipes stay in Setup section untouched by IA restructure)
- `InventorySetupPanel.jsx` (Ingredients & Setup unchanged)
- Any HIGH-RISK §R5 file except the two hotspots listed

### Downstream consumers to verify

| Change | Verify |
|---|---|
| Route rename `/inventory-purchase` → `/inventory-smart-purchase` | Any `useNavigate('/inventory-purchase')` or `<Link>` calls in codebase. `grep -r "inventory-purchase" /app/frontend/src` before shipping |
| Route rename `/inventory-physical` → `/inventory-audit` | Same grep |
| `/inventory` default now Intelligence | Any deep-links from Reports/Insights that expected stock list |
| Sidebar item label changes | Any test hardcoded label strings (grep tests for "Stock Dashboard", "Physical Count", "Purchase Entry") |
| Recipe cost widget needs sale prices | Products/foods endpoint currently used only by menu module. Cross-module wiring · low risk |

---

## §Step 2 — HIGH-RISK NOTES & MITIGATIONS

1. **Sidebar.jsx is HOT** — apply §Step-0 view of the current `inventory` children block (lines ~117-128) BEFORE editing. Any prior CR may have shifted the block.
2. **Route rename compatibility** — provide 302 redirects for old paths for at least one sprint so bookmarks/emails still work.
3. **`restaurant_type_flag` context dependency** — CR-079's conditional Receive pill requires CR-077 to have added the field to RestaurantContext. **Ship ordering below.**
4. **Silent regression on N-th add-stock failure in Smart Purchase** — partial-success state MUST be shown to the operator. FE toast lists succeeded vs failed vendor calls; no auto-retry.
5. **Payment Method on grouped preview** — required per vendor. Blocking submit until all set. B1 hard rule.
6. **Rate > 0 hard rule (B2)** — Smart Purchase validation must block submit before any /add-stock fires.

## §Ship Ordering (important)

| # | Ship step | Depends on |
|---|---|---|
| 1 | **CR-077** RestaurantContext work (surface `restaurant_type_flag` from profile) | — |
| 2 | **CR-078 + CR-079 + CR-075-B bundle** (this IA) | Step 1 for the Receive pill conditional to render correctly · **can pre-ship with pill hidden if CR-077 delayed** |
| 3 | CR-077 full Receive/Dispatch flows | — |

**Fallback if CR-077 slips:** Ship this bundle with the Receive pill statically hidden (feature-flag off) · enable pill in a follow-up 5-line PR when CR-077 lands.

---

## §Step 4 — VERIFICATION MATRIX (seeds QA · not exhaustive)

| # | File / Behaviour | Check | Auto? |
|---|---|---|---|
| 1 | Sidebar renders 5 inventory children in the new order | Manual click through each · pill labels match mock v5 | NO |
| 2 | `/inventory` renders Intelligence Dashboard by default | Fresh login → land on Inventory → see widgets, not stock list | NO |
| 3 | `/inventory-dashboard` legacy path redirects to `/inventory` | Manual URL entry | NO |
| 4 | Smart Purchase horizon change re-computes gaps for all rows | Change 7d → 14d → auto qty updates | NO |
| 5 | Purchase-planner utility math correctness | Unit test `purchasePlanner.js` — gap = projected − on-hand | YES |
| 6 | Vendor ranking picks lowest last unit_price | Unit test `vendorRanking.js` with fixture data | YES |
| 7 | Payment Method missing on any vendor group blocks submit | Manual — click Submit with one PM empty → toast error, no API call | NO |
| 8 | Rate = 0 on any line blocks submit | Same pattern | NO |
| 9 | N sequential /add-stock calls with correct payloads | Network tab check · 4-vendor submit fires 4 calls | NO |
| 10 | N-th call failure surfaces partial-success state | Manual — mock 500 on call 3 | NO |
| 11 | Ad-hoc row inserted at bottom · no velocity columns · manual qty required | Click "+ Add Ad-hoc Item" → row appears without help text | NO |
| 12 | Stock Audit rename — all 4 touch-points renamed (nav · route · page · panel heading) | Manual pass | NO |
| 13 | Receive pill visibility gated by `restaurant_type_flag` | Login as Kunafa Mahal (normal) → pill hidden · Login as Palm India (franchise) → pill visible | NO |
| 14 | Recipe Cost & Margin widget colour bands correct | Fixture with margins 25% / 45% / 65% → red / amber / green | YES |
| 15 | Widget "View details →" links are visually present (non-functional) | Manual · deferred to CR-08X | NO |

---

## §Step 5 — POST-CODE REGISTRY CHECKLIST

Implementation agent must run:

```
- [ ] registry.json: CR-078 → IMPLEMENTED, sprint_key = pos_5_0_wave_2
- [ ] registry.json: CR-079 → IMPLEMENTED, sprint_key = pos_5_0_wave_2
- [ ] registry.json: CR-075-B → CLOSED-ABSORBED-BY-CR-079
- [ ] CR_REGISTRY.md rows updated for CR-078, CR-079 (status + evidence links)
- [ ] FILE_OWNERSHIP.md — first-ever inventory entries added (see §R1 gap above)
- [ ] Code markers // CR-078 / // CR-079 in every modified file
- [ ] Old `PurchaseEntryPanel.jsx` deletion recorded
- [ ] Rename mapping documented in CR-079 for future greppers (old-path → new-path table)
```

---

## OPEN QUESTIONS — Owner rulings needed before Gate 3

The 8 OQs from CR-078 intake + 6 OQs from CR-079 intake are still open. Owner rulings collect below:

### CR-078 (Smart Purchase)

| # | Question | Recommended default |
|---|---|---|
| **B1** | Velocity window — 7d / 14d / 30d rolling for computing daily consumption rate | **Match horizon** — if horizon 7d, use 7d window; if horizon 14d, use 14d window. Simplest mental model. |
| **B2** | Show 0-gap rows (velocity=0 or on-hand covers) or hide? | **Hide** — the list stays clean |
| **B3** | "Materially more expensive" threshold for override warning | **5%** — mock v5 already shows this at 4.8% (Butter row). Match. |
| **B4** | Planner persistence across sessions | **Ephemeral** — no draft save in v1 |
| **B5** | Vendor ranking tie-breakers | **Most recent purchase wins** among equal rates |
| **B6** | Ad-hoc row rate pre-fill from history when ingredient known? | **YES** if a matching row exists in vendor-item-list |
| **B7** | Bulk-clear / reset horizon button? | **NO** — changing horizon re-computes everything anyway |
| **B8** | Master-outlet special handling (parent stock hint) | **Out of scope** — deferred to CR-080 |

### CR-079 (IA Restructure)

| # | Question | Recommended default |
|---|---|---|
| **B9** | Absorb CR-075-B into CR-079? | ✅ **Absorb** — done in this IA already |
| **B10** | Default `/inventory` hard or soft redirect to Intelligence Dashboard? | **Hard** (`<Navigate replace>`) — cleanest URL, no user confusion |
| **B11** | Legacy `/inventory-purchase` etc. — redirect or 404? | **302 redirect** to new paths — safe for bookmarks/emails |
| **B12** | Widgets owned by CR-078 (planner file tree) or CR-079 (dashboard file tree)? | **Dashboard file tree** (`components/inventory/widgets/*`) — reusable outside planner |
| **B13** | Receive pill visible for `master` too? | **YES** — master outlets see all their outgoing dispatch confirmations there. Both flags show the pill; internal tabs differ. |
| **B14** | Show Intelligence Dashboard for all outlets or only those with sufficient history? | **Show for all** — empty-state placeholders inside each widget when data thin |

---

## §Planning final response format

```
Planning complete (Gate 2 · Impact Analysis): CR-078 + CR-079 (+ CR-075-B absorbed)
Stage: Impact Analysis (Gate 2 CLOSED · Gate 3 Plan pending owner Q&A B1-B14 + GO)
Code reality: CR-078 NONE (greenfield planner) · CR-079 mostly-rename · CR-075-B pure rename
Risk: CR-078 HIGH · CR-079 MEDIUM · CR-075-B LOW
Files WILL change: 21 files (14 modify/rename + 7 net-new) · ~1,190 lines added, 266 deleted
Files WILL NOT touch: order/menu/expense/insights/auth
Hot files: Sidebar.jsx (758 lines · 15+ modifiers) · App.js — both with surgical additive changes
Owner decisions needed: 14 (B1-B14) — see §Open Questions
Backend deps: NONE for v1 · optimisation brief already filed (multi-vendor purchase)
Ship as: SINGLE bundled PR — pre-shippable with Receive pill hidden if CR-077 slips
Docs: /app/memory/impact/CR-078_CR-079_IMPACT_ANALYSIS.md
Next: Owner resolves B1-B14 → Planning Gate 3 (Implementation Plans) → Gate 4 GO
```
