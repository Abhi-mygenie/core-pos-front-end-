# BUG-227 — Smart Purchase: Vendor Shows "No History" Though Vendors Exist — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-227
**Title:** Smart Purchase Vendor Shows No History
**Priority:** P1 (HIGH)
**Risk:** HIGH — UPGRADED from MEDIUM (intake). Rationale: vendor ranking pre-selects the vendor + rate that feed the `add-purchase` financial write; change alters that data flow → regression checklist required (R21 upgrade, agent-permitted).
**Date:** 2026-07-23 (session continuation)
**Analyst:** PLANNING agent (Gate 2)
**Code Reality:** CONFIRMED (intake) + re-verified this session. No code exists for the fix.
**Conflict Pre-Check:** No active conflicts. `SmartPurchasePanel.jsx` last modified CR-078/CR-085 (closed/QA PASS). `vendorRanking.js`, `VendorSuggestionCell.jsx` — CR-078/CR-081. Registry scan: no open item touches these files. Parallel-safe with BUG-224 (BOTH touch `SmartPurchasePanel.jsx` — different concerns: BUG-227 = vendor data flow, BUG-224 = planner rows; if implemented in the same sprint, execute sequentially and declare in FILE_OWNERSHIP; recommend BUG-224 planner change first, BUG-227 second, or same implementation session).

---

## 1. Data Flow Trace

```
SmartPurchasePanel.jsx:35-41  Promise.all → getVendorItemList() = PURCHASE HISTORY feed (not master)
  → :49 rankVendors(vil, r.ingredient_id)                     [vendorRanking.js:20]
  → vendorRanking.js:28 filter(r => r.ingredient_id === id)   ← history-only universe
  → :31 `if (!vid) return;` — rows with vendor_id null are DROPPED   ← BREAK POINT (data)
  → :48 candidates.length === 0 → { winner:null, reason:'No vendor history' }
  → AutoShoppingList.jsx:134 → VendorSuggestionCell.jsx:34-36
  → candidates.length === 0 → renders literal "No history"    ← what owner sees
Vendor MASTER (getVendors() → GET_VENDOR endpoint, CR-084) is NEVER fetched by SmartPurchasePanel.
vendorNamesById (SmartPurchasePanel.jsx:84-88) built ONLY from history rows.
```

**Preprod data evidence (curl 2026-07-23, restaurant 689 Kunafa Mahal):**
| Metric | Value |
|---|---|
| vendor master vendors | **12** (Kunafabake, Rahul Grocery, Tasty Craft, Varun Dairy, Namaste India, Moti Mahal, Coffe Supplier, (GEM) Packing Materials, …) |
| vendor-item-list rows | 1146 |
| rows with `vendor_id: null` | **614 (54%)** — purchases recorded without vendor attribution → dropped at vendorRanking.js:31 |
| distinct ingredients with ANY history | 92 |
| distinct ingredients with vendor-attributed history | 68 |
| data quality note | attributed rows often have `unit_price: 0` / `Amount: 0` → winner shown at ₹0 |

So two compounding causes: (1) master vendors never enter the universe; (2) even purchased ingredients lose 54% of their history rows to null vendor_id.
Evidence: `/app/memory/evidence/BUG-227/vendor_item_list_response.json`, `/app/memory/evidence/BUG-227/vendor_master_response.json`

---

## 2. Exact Lines

### SmartPurchasePanel.jsx:35-41 (current)
`Promise.all([...getStockInventory, getDailyConsumptionReport, getVendorItemList, getIngredients, getPaymentMethods])` — no `getVendors()`.
→ Needs: add `inventoryService.getVendors()` to the Promise.all; hold `vendorMaster` state.

### SmartPurchasePanel.jsx:84-88 (current)
```js
const vendorNamesById = useMemo(() => {
  const m = {};
  vendorItemList.forEach(v => { if (v.vendor_id) m[String(v.vendor_id)] = v.Vendor_Name || ... });
```
→ Needs: seed map from vendorMaster first, then overlay history names.

### vendorRanking.js:20 signature (current)
`rankVendors(vendorItemList, ingredientId)`
→ Needs: optional third param `vendorMaster = []`; after ranking, append master vendors not already in candidates as `alternatives` with `{ unit_price: null, last_purchase_date: null, fromMaster: true }`. When history candidates = 0: return `{ winner: null, alternatives: <master vendors>, reason: 'No purchase history — select vendor' }`. Winner stays null (no auto-preselect — pending owner Q1). B3/B5 ranking math for history candidates UNCHANGED.

### VendorSuggestionCell.jsx:28-36 (current)
`candidates = ranking?.winner ? [winner, ...alternatives] : []` → empty → "No history" literal.
→ Needs: build candidates from winner + alternatives even when winner is null; render master-only options as `name · no history` (no ₹ price); keep placeholder option when nothing selected. Guard `isMateriallyMoreExpensive` + `getReason` for null-price candidates.

### Rate path (financial adjacency — verify at QA)
`SmartPurchasePanel.jsx:52-53` sets `rate: ranking.winner?.unit_price ?? ''`. Master-only vendors carry `unit_price: null` → rate stays `''` → existing validation `rate > 0` (line 109) forces manual rate entry before submit. NO change to validation.

---

## 3. Files WILL Change / WILL NOT Touch

**WILL change (Gate 3):**
- `components/inventory/SmartPurchasePanel.jsx` — +getVendors fetch, vendorMaster state, vendorNamesById seeding, pass master to rankVendors (~10-12 lines)
- `utils/vendorRanking.js` — optional vendorMaster param + master-append logic (~12-15 lines)
- `components/inventory/smart/VendorSuggestionCell.jsx` — render master/unranked candidates (~8-10 lines)

**WILL NOT touch:**
- `utils/purchasePlanner.js` (BUG-224 territory)
- `components/inventory/smart/AutoShoppingList.jsx`, `GroupedVendorPreview.jsx` (consume via props — verify only)
- `api/services/inventoryService.js`, `api/constants.js` (getVendors/GET_VENDOR exist since CR-084)
- Locked rulings B3 (5% override) and B5 (tie-breaker) — unchanged
- Submit/validation logic (rate > 0 stays)

---

## 4. Risk Classification

**HIGH** (upgraded — header). Vendor/rate selection feeds `add-purchase` (financial write). No R5 hotspots. QA regression: full smart-purchase flow (plan → pick vendor → rate → submit), override warning (B3) still fires for history vendors, GroupedVendorPreview names correct for master-only vendors.

---

## 5. Owner Decision Queue

- **Q1:** For an ingredient with NO history: show all 12 master vendors as options with NO auto-preselection (owner picks; rate typed manually)? Or auto-preselect the first master vendor? (Recommend: no auto-preselect.)
- **Q2:** 54% of purchase-history rows have `vendor_id: null` (purchases saved without vendor), and many attributed rows have `unit_price: 0`. This weakens ranking permanently. File a BACKEND/data-quality brief (add to `BACKEND_BLOCKERS_BRIEF` register) asking why add-purchase rows lose vendor attribution? (Recommend: yes — likely relates to how FE/other clients post purchases.)

---

## 6. Effort Estimate

- Files: 3 · Lines: ~30-37 · Test: unit (rankVendors master-append cases) + browser (ingredient w/o history shows 12 vendors, submit with typed rate) + regression (history-ranked ingredient unchanged, B3 warning intact)
