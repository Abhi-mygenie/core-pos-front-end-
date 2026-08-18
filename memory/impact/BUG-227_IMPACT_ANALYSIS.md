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
→ Needs: optional third param `vendorMaster = []`. Owner-decided behavior (2026-07-23):
1. Null-vendor history rows (54% of feed) are NO LONGER dropped — bucket under synthetic `{ vendor_id: 'system', vendor_name: 'System Vendor' }` candidate so their price/date history participates in display.
2. Master vendors not in candidates appended as unranked `{ unit_price: null, fromMaster: true }`.
3. History candidates keep B3/B5 ranking math UNCHANGED. "System Vendor" is display/ranking-only — submit must NOT send `vendor_id: 'system'` to add-purchase (maps back to null/absent, as today).

### VendorSuggestionCell.jsx:28-36 (current)
`candidates = ranking?.winner ? [winner, ...alternatives] : []` → empty → "No history" literal.
→ Needs (owner-decided): replace plain `<select>` with a **searchable combobox** listing ALL vendors always — ranked/history vendors first (marked "Recommended" with ₹price), then remaining master vendors (no price). User can search + pick any vendor. Guard `isMateriallyMoreExpensive`/`getReason` for null-price candidates.

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

## 5. Owner Decision Queue — RESOLVED (owner, 2026-07-23)

- **Q1 → DECIDED:** Vendor cell becomes a **searchable dropdown (autocomplete/combobox)** listing ALL vendors always. If history exists → ranked/recommended vendors shown first (marked "Recommended"); user can always search and select ANY master vendor. No plain `<select>`. (Gate 3: combobox component — check existing shadcn `command`/`popover` usage in codebase.)
- **Q2 → DECIDED (two parts):**
  1. **Backend brief FILED** (BACKEND_BLOCKERS_BRIEF card `#bug-227`): purchases should never be vendor-less — backend should attach a default **System Vendor** when no vendor is supplied.
  2. **Frontend interim:** do NOT drop null-vendor history rows — bucket them under a synthetic **"System Vendor"** pseudo-candidate (vendor_id `'system'`), so their price/date history is visible in ranking until backend delivers. Gate 3 must define: System Vendor is display/ranking-only, NEVER submitted as vendor_id to add-purchase (submit maps back to null/absent vendor exactly as today).

---

## 6. Effort Estimate

- Files: 3 · Lines: ~30-37 · Test: unit (rankVendors master-append cases) + browser (ingredient w/o history shows 12 vendors, submit with typed rate) + regression (history-ranked ingredient unchanged, B3 warning intact)
