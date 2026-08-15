# INVESTIGATION REPORT — Aggregator Menu Management Module
**ID:** INV-AGG-MENU
**Date:** 2026-08-14
**Role:** INVESTIGATION (Agent Prompt Alpha v0.7)
**Scope:** Menu Management → Aggregator tab — Add Food, Edit Food, Stock Toggle
**Steps used:** 9/10
**Confidence:** HIGH — all gaps confirmed via code trace + live API probes

---

## 1. Summary

| # | Gap | Classification | Confidence | Severity |
|---|-----|----------------|------------|----------|
| GAP-1 | Add Food uses wrong endpoint (add-food vs add-food-aggregator) | FE_BUG | HIGH | P0 |
| GAP-2 | swiggy/zomato fields missing from all add/edit transforms AND form UI | FE_BUG | HIGH | P0 |
| GAP-3 | client_id (multi-brand/sub-brand) missing from entire flow | FE_BUG | HIGH | P1 |
| GAP-4 | fromAPI.food() does NOT map swiggy/zomato/client_id from foods-list | FE_BUG | HIGH | P1 |
| GAP-5 | Stock Toggle feature entirely absent (no endpoint, no service, no UI) | FE_BUG | HIGH | P0 |
| GAP-6 | BulkEditor buildPayload() also missing swiggy/zomato/client_id | FE_BUG | HIGH | P1 |

**Overall verdict:** Aggregator menu management is **broken for all write operations.** Read (listing foods) works. Everything else — Add, Edit, Stock Toggle, Multi-Brand — is either missing or uses the wrong contract.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|-----------|-------------|--------|---------|
| H1 | addFood() uses add-food endpoint (wrong) instead of add-food-aggregator | Code trace menuManagementService.js + probe | ✅ CONFIRMED | probe4, probe5b |
| H2 | toAPI.foodInfo() missing swiggy/zomato fields | Code trace menuManagementTransform.js | ✅ CONFIRMED | code L225-264 |
| H3 | stock-toggle endpoint exists and works on backend | curl probe | ✅ CONFIRMED | probe6 |
| H4 | client_id field returned in foods-list but never mapped | API probe + code trace | ✅ CONFIRMED | probe9, fromAPI.food() |
| H5 | fromAPI.food() missing swiggy/zomato mapping | Code trace + probe9 | ✅ CONFIRMED | L34-118 |

---

## 3. Data Flow Trace — Current (Broken) State

### 3A. Add Aggregator Food (current broken path)
```
User clicks "Add Product" in Aggregator menu tab
  → ProductForm.onSave()
  → toAPI.foodInfo({...form, foodFor:'Aggregator'}) [menuManagementTransform.js L225]
      → builds payload WITHOUT swiggy, zomato, client fields
  → menuService.addFood(foodInfo, image)            [menuManagementService.js L26]
      → POST /api/v2/vendoremployee/product/add-food (multipart, food_info=JSON)
  BREAK: Wrong endpoint. Backend creates food_for=Aggregator but never sets swiggy/zomato.
         Item created as aggregator but not synced to Swiggy/Zomato.
```

### 3A. Add Aggregator Food (required path per owner curl)
```
  → POST /api/v2/vendoremployee/product/add-food-aggregator (raw JSON body)
     payload: { name, price, category_id, food_for:"Aggregator",
                swiggy:"YES", zomato:"YES", veg, dinein, takeaway, delivery,
                [client: 107] // only for sub-brand items }
  CONFIRMED WORKING: probe4 created id=13305 with swiggy=YES, zomato=YES
```

### 3B. Edit Aggregator Food (current broken path)
```
User edits existing aggregator food
  → ProductForm populates form from product prop
      → form has NO swiggy, zomato, client values (fromAPI.food() never maps them)
  → toAPI.foodInfo() builds payload WITHOUT swiggy, zomato, client
  → menuService.editFood(productId, foodInfo, image)
      → POST /api/v2/vendoremployee/product/foods/{id} (multipart, food_info=JSON)
  BREAK: No swiggy/zomato/client fields sent. Platform sync not updated.
```

### 3C. Stock Toggle (current state — ABSENT)
```
No stock-toggle entry in AGGREGATOR_ENDPOINTS constants.js
No stockToggle() function in any service file
No UI component (disable picker, timing modes, client routing)
  → Feature is completely absent from the frontend.
  Backend endpoint confirmed live: POST /api/v2/vendoremployee/aggregator-sync/stock-toggle
```

---

## 4. GAP-BY-GAP Detail

### GAP-1: Wrong endpoint for Add Aggregator Food (P0)

| Field | Value |
|---|---|
| File | `src/api/services/menuManagementService.js` |
| Current | `addFood(foodInfo, image)` → `POST /api/v2/vendoremployee/product/add-food` (multipart) |
| Required | New `addFoodAggregator(payload)` → `POST /api/v2/vendoremployee/product/add-food-aggregator` (raw JSON) |
| Blast radius | 1 new function + 1 call site change in ProductForm |

**Probe evidence:**
- `add-food-aggregator` with `{swiggy:"YES",zomato:"YES"}` → returned `id=13305, swiggy=YES, zomato=YES` ✅
- `add-food` (multipart) with `food_for=Aggregator` → returned id but `swiggy: MISSING, zomato: MISSING` ❌

---

### GAP-2: swiggy/zomato missing from add/edit transforms + form UI (P0)

| Field | Value |
|---|---|
| Files | `menuManagementTransform.js:toAPI.foodInfo()` (L225-264), `BulkEditor.jsx:buildPayload()` (L130-175), `ProductForm.jsx` (no UI fields) |
| Missing from toAPI | `swiggy`, `zomato`, `client` |
| Missing from buildPayload | `swiggy`, `zomato`, `client_id` |
| Missing from ProductForm | Swiggy/Zomato toggles (YES/NO), Brand selector (main vs sub-brand) |
| API expects | `swiggy:"YES"/"NO"`, `zomato:"YES"/"NO"`, `client: 0` (main) or `client: 107` (sub-brand) |

**Fix needed in `toAPI.foodInfo()`:**
```js
swiggy: form.swiggy ? 'YES' : 'NO',          // NEW
zomato: form.zomato ? 'YES' : 'NO',          // NEW
...(form.clientId ? { client: form.clientId } : { client: 0 }),  // NEW
```

---

### GAP-3: client_id (multi-brand) missing from entire flow (P1)

| Field | Value |
|---|---|
| API field | `client_id` (int) — 0 = main brand, 107 = sub brand "sub brand" |
| Endpoint for clients | `GET /api/v2/vendoremployee/product/restaurant-clients` |
| Probe result | Returns `{ status:true, clients_found:true, clients:[{id:107,name:"sub brand",...}] }` |
| FE constants | `RECIPE_MAPPING_ENDPOINTS.RESTAURANT_CLIENTS` exists (used for recipe mapping CR-119) |
| menuManagementService | No `getRestaurantClients()` function |
| ProductForm | No brand selector UI |
| BulkEditor | No brand/client column |

**Required flow:**
1. On opening Aggregator tab → fetch `/product/restaurant-clients` → populate brand selector
2. Brand selector: "Main Brand" (client=0) vs "sub brand" (client=107)
3. On add/edit → include `client` (not `client_id`) in payload

**Payload difference:**
- Main brand add: no `client` field (or `client: 0`)
- Sub-brand add: `client: 107`
- Main brand edit: `client: 0`
- Sub-brand edit: `client: 107`

---

### GAP-4: fromAPI.food() doesn't map swiggy/zomato/client_id/turn_on_at (P1)

| Field | Value |
|---|---|
| File | `menuManagementTransform.js:fromAPI.food()` L34-118 |
| API returns | `swiggy`, `zomato`, `client_id`, `turn_on_at` (stock toggle status) |
| FE maps | NONE of these 4 fields |
| Impact | Edit form never pre-fills swiggy/zomato/client values → always defaults to missing/false |

**API field proof (probe9):**
```
ALL KEYS (relevant subset): [..., 'swiggy', 'zomato', 'client_id', 'turn_on_at', ...]
swiggy: YES
zomato: YES
client_id: 107
```

**Fix needed in `fromAPI.food()`:**
```js
swiggy: api.swiggy === 'YES',                 // NEW
zomato: api.zomato === 'YES',                 // NEW
clientId: api.client_id || 0,                 // NEW
turnOnAt: api.turn_on_at || null,             // NEW (for stock toggle display)
```

---

### GAP-5: Stock Toggle — ENTIRELY ABSENT (P0)

**Confirmed live endpoint (probe6):**
```
POST /api/v2/vendoremployee/aggregator-sync/stock-toggle
Response: { status:true, message:"Stock toggle queued successfully", action:"enable",
            turn_on_at:null, indefinite:false, reference_id:"...", urbanpiper_status:"success" }
```

**4 required modes:**

| Mode | Payload | Notes |
|------|---------|-------|
| Enable | `{ action:"enable", item_ids:[3162] }` | Clears all timing |
| Disable — Indefinite | `{ action:"disable", item_ids:[3162] }` | No turn_on fields |
| Disable — Relative | `{ action:"disable", item_ids:[3162], turn_on_preset:"2h" }` | Options: 30m,1h,2h,6h,12h,1d,7d |
| Disable — Custom | `{ action:"disable", item_ids:[3162], turn_on_at:<epoch_ms> }` | Future epoch ms, max 90 days |

**Multi-brand routing:**
- Main brand: omit `client_id` from payload
- Sub-brand: include `client_id: 107` in payload

**What's missing from FE:**
- `AGGREGATOR_ENDPOINTS.STOCK_TOGGLE` constant
- `stockToggle(payload)` service function
- Stock toggle UI (per-row action on aggregator food list):
  - Enable/Disable toggle button
  - Timing picker (indefinite / relative presets / custom datetime)
  - `turn_on_at` display (when item comes back online)

**Note:** This is different from `toggleFoodStatus()` (BUG-301). `toggleFoodStatus` controls item active/inactive in POS. `stockToggle` controls item availability on Swiggy/Zomato via UrbanPiper.

---

### GAP-6: BulkEditor buildPayload() missing aggregator fields (P1)

| Field | Value |
|---|---|
| File | `src/components/panels/menu/BulkEditor.jsx:buildPayload()` L130-175 |
| Missing fields | `swiggy`, `zomato`, `client_id` |
| Impact | Bulk save for aggregator foods loses platform sync settings |
| Fix scope | Add fields to buildPayload + add columns to BulkEditor if menuType=Aggregator |

---

## 5. Evidence Artifacts

All saved to: `/app/memory/evidence/INV-AGG-MENU/`

| File | Content |
|------|---------|
| `probe1_restaurant_clients.json` | GET /product/restaurant-clients → client id=107 "sub brand" |
| `probe2_aggregator_foods.txt` | 7 aggregator foods, swiggy/zomato=YES confirmed |
| `probe3_single_aggr_food.json` | Full field structure of aggregator food |
| `probe4_add_food_aggr.json` | add-food-aggregator creates with swiggy/zomato ✅ |
| `probe5b_normal_add_aggr_fields.txt` | add-food: swiggy=MISSING, zomato=MISSING ❌ |
| `probe6_stock_toggle.json` | stock-toggle confirmed working, response shape |
| `probe7_edit_food_json.txt` | edit with JSON → "food updated successfully" |
| `probe7b_edit_food_multipart.txt` | edit with multipart → "food updated successfully" |
| `probe9_full_aggr_fields.txt` | Full key list including swiggy, zomato, client_id, turn_on_at |

---

## 6. Recommendations

| Gap | Classification | Scope | Planning skip? |
|-----|---------------|-------|----------------|
| GAP-1 | FE_BUG | 1 new service fn + conditional dispatch in ProductForm | NO — touches ProductForm (hotspot-adjacent) |
| GAP-2 | FE_BUG | 3 files: transform, BulkEditor, ProductForm UI | NO — multi-file, UI changes |
| GAP-3 | FE_BUG | 3 files: service (new fn), transform, ProductForm UI | NO — multi-file |
| GAP-4 | FE_BUG | 1 file (fromAPI.food in transform) | YES — eligible if ≤10 lines, 1 file |
| GAP-5 | FE_BUG | New constant + new service fn + new UI component | NO — new feature |
| GAP-6 | FE_BUG | 1 file (BulkEditor buildPayload + columns) | NO — multi-line |

**Recommended batching for planning:**
- **Batch A (Add/Edit core fix):** GAP-1 + GAP-2 + GAP-3 + GAP-4 → single Implementation Plan (all touch same files)
- **Batch B (Stock Toggle):** GAP-5 → separate CR/BUG intake (new feature, large scope)
- **Batch C (BulkEditor):** GAP-6 → fast-lane eligible if only buildPayload changes

**Risk:** HIGH for Batch A (ProductForm, transform, platform sync). MEDIUM for Batch B (new component). LOW for Batch C.

---

## 7. Retroactive Candidates
None. No existing registered CR/BUG covers this aggregator menu management gap set.
These are all new gaps requiring fresh intake.
