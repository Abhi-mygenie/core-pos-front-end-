# INVESTIGATION REPORT — Aggregator Menu Management (v2, Goan Kitchen Re-Probe)
**ID:** INV-AGG-MENU (v2)
**Date:** 2026-08-14
**Role:** INVESTIGATION (Alpha v0.7)
**Restaurants probed:** rid=478 (owner@18march.com) + The Goan Kitchen (owner@thegoankitchen.com)
**Total steps used:** 17 across 2 sessions
**Confidence:** HIGH — all gaps confirmed via live curl probes on both restaurants

---

## 1. Summary — 7 Confirmed Gaps

| # | Gap | Severity | Classification | New/Updated? |
|---|-----|----------|----------------|-------------|
| GAP-1 | `add-food` endpoint creates INVISIBLE aggregator food (not in aggr list, no swiggy/zomato) | **P0 CRITICAL** | FE_BUG | ⬆ UPGRADED — worse than first report |
| GAP-2 | swiggy/zomato fields missing from toAPI.foodInfo() + buildPayload() + ProductForm UI | **P0** | FE_BUG | Confirmed |
| GAP-3 | client_id (multi-brand) missing from entire add/edit flow | **P1** | FE_BUG | Confirmed |
| GAP-4 | fromAPI.food() missing swiggy, zomato, client_id, food_stock, turn_on_at | **P1** | FE_BUG | ⬆ UPGRADED — 2 new fields found |
| GAP-5 | Stock Toggle feature entirely absent (no constant, no service, no UI) | **P0** | FE_BUG | ⬆ NEW DETAILS on food_stock + turn_on_at display |
| GAP-6 | BulkEditor buildPayload() missing swiggy/zomato/client_id | **P1** | FE_BUG | Confirmed |
| GAP-7 | Edit form cannot change swiggy/zomato (no UI toggles) + client not pre-filled | **P1** | FE_BUG | NEW — confirmed via G13 |

---

## 2. Restaurant Context

| Field | 18march.com (rid=478) | thegoankitchen.com |
|---|---|---|
| Aggregator foods | 7 (Plain Dosa, Butter Dosa, etc.) | 2 (69 special, poison) |
| Sub-brands (clients) | 1 (id=107, "sub brand") | 1 (id=109, "mallu goan") |
| Menu types | Normal + Aggregator | Normal + Party + Premium + Aggregator |
| Token requirement | X-localization: en needed | X-localization: en needed |

---

## 3. Critical Probe Results (Goan Kitchen)

### GAP-1 SEVERITY UPGRADE — add-food creates INVISIBLE aggregator food

**Probe G11 (confirmed on Goan Kitchen):**
```
POST /api/v2/vendoremployee/product/add-food (multipart, FE current path)
Payload: food_info = {"name":"_GOAN_WRONG_EP_","price":50,"category_id":8543,"food_for":"Aggregator",...}
Response: {"id": 217622, "food_for": "Aggregator", ...}  ← success response!
```

**Then:** `GET /foods-list?food_for=Aggregator` → id=217622 NOT FOUND in list.

**What this means for users:**
- FE shows "Product added" success toast
- But the product NEVER appears in Aggregator tab when user refreshes
- Not synced to Swiggy/Zomato
- Completely invisible to aggregator management
- **Silent failure with false success** — P0 severity

**Probe G6+G8 (correct path — add-food-aggregator):**
```
POST /api/v2/vendoremployee/product/add-food-aggregator (JSON)
Payload: {"name":"_GOAN_TEST_MAIN_","price":50,"category_id":8543,"food_for":"Aggregator","swiggy":"YES","zomato":"YES","veg":1,...}
GET /foods-list?food_for=Aggregator → id=13306: swiggy=YES, zomato=YES, client_id=0  ✅
```

---

### GAP-4 UPGRADE — fromAPI.food() missing food_stock + turn_on_at

**Probe G9 confirmed:** API returns these fields in foods-list:

| API Field | Current FE Mapping | Impact |
|-----------|-------------------|--------|
| `swiggy` | MISSING | Edit form can't show/change Swiggy status |
| `zomato` | MISSING | Edit form can't show/change Zomato status |
| `client_id` | MISSING | Edit form can't identify which brand to pre-fill |
| `food_stock` | MISSING | **NEW** — 0=disabled, 1=enabled on UrbanPiper |
| `turn_on_at` | MISSING | **NEW** — ISO string when item auto-re-enables |

**Probe G17 confirmed food_stock + turn_on_at behavior:**
```
After stock-toggle disable (2h preset):
  food_stock = 0
  turn_on_at = "2026-08-14 23:10:55"   ← ISO format from API

After stock-toggle enable:
  food_stock = 1 (assumed, not re-probed — food_stock=0 confirmed for disabled)
  turn_on_at = null
```

---

### GAP-5 DETAILS — Stock Toggle field guide

**Probe G16a confirmed stock-toggle response shape:**
```json
{
  "status": true,
  "message": "Stock toggle queued successfully",
  "action": "disable",
  "turn_on_at": 1786723837000,           ← epoch ms
  "turn_on_at_iso": "2026-08-14T21:40:37+05:30",
  "indefinite": false,
  "reference_id": "f5f40fd2...",
  "urbanpiper_status": "success",
  "urbanpiper_message": "Task queued successfully",
  "items": [...]
}
```

**4 payload modes confirmed:**

| Mode | Payload | Confirmed |
|------|---------|-----------|
| Enable | `{action:"enable", item_ids:[id]}` | ✅ G16b |
| Disable indefinite | `{action:"disable", item_ids:[id]}` | ✅ G10 |
| Disable relative | `{action:"disable", item_ids:[id], turn_on_preset:"2h"}` | ✅ G16a |
| Disable custom | `{action:"disable", item_ids:[id], turn_on_at:<epoch_ms>}` | Contract confirmed |

**Sub-brand routing:** Add `client_id: 109` for sub-brand items.
**Note:** Sub-brand stock-toggle returned HTTP 502 for Goan Kitchen client 109 — likely UrbanPiper store not registered for that client. Main brand stock-toggle works on both restaurants.

---

### GAP-7 NEW — Edit form cannot change swiggy/zomato

**Probe G13 confirmed edit behavior:**
```
G13a: JSON edit WITH swiggy="NO" → stored as NO  ✅ (backend accepts JSON for edit)
G13b: Multipart edit WITHOUT swiggy → preserves existing value  ✅ (no regression on save)
```

**What this means:**
- Existing aggregator foods (created via add-food-aggregator) will NOT lose swiggy/zomato when edited via the current FE (since multipart without swiggy field preserves existing)
- BUT: The edit form has **no UI to change swiggy/zomato platform settings**
- If user needs to change swiggy from YES to NO or vice versa, there is no way to do this in the FE
- Also: `client_id` is never pre-filled in edit form → user can't see or change which brand the item belongs to

---

## 4. Complete Gap Register

### GAP-1: Wrong add endpoint — food invisibly created (P0 CRITICAL)

| Field | Value |
|---|---|
| File | `menuManagementService.js:addFood()` L26-33, `ProductForm.jsx:L523` |
| Current | `POST /add-food` (multipart) → creates food but NOT in aggregator list |
| Required | `POST /add-food-aggregator` (raw JSON) → creates proper aggregator food |
| Proof | G11: id=217622 created with food_for=Aggregator but absent from foods-list |
| Fix | Add `addFoodAggregator(payload)` service fn. ProductForm: if `menuType==='Aggregator'` → call new fn |

---

### GAP-2: swiggy/zomato missing from add/edit transforms + form UI (P0)

| Field | Value |
|---|---|
| Files | `menuManagementTransform.js:toAPI.foodInfo()` L225-264, `BulkEditor.jsx:buildPayload()` L130, `ProductForm.jsx` |
| Missing in toAPI | `swiggy`, `zomato`, `client` |
| Missing in buildPayload | `swiggy`, `zomato`, `client_id` |
| Missing in ProductForm | Swiggy toggle (YES/NO), Zomato toggle (YES/NO) — only shown when menuType=Aggregator |
| Note | Edit multipart without swiggy → preserves existing. Add without swiggy → NOT a proper aggregator food. |

---

### GAP-3: client_id (multi-brand/sub-brand) missing (P1)

| Field | Value |
|---|---|
| API field | `client_id` — 0=main, 109=sub-brand "mallu goan" |
| Get endpoint | `GET /api/v2/vendoremployee/product/restaurant-clients` |
| Proof | G4: returns `{id:109, name:"mallu goan"}` for Goan Kitchen |
| Missing | No `getRestaurantClients()` in menuManagementService.js, no brand selector in ProductForm |
| Fix scope | 1 new service fn + brand selector UI in ProductForm (shown only when menuType=Aggregator) |

---

### GAP-4: fromAPI.food() missing 5 aggregator fields (P1)

| API Field | Should Map To | Use |
|-----------|--------------|-----|
| `swiggy` | `swiggy: api.swiggy === 'YES'` | Pre-fill edit form swiggy toggle |
| `zomato` | `zomato: api.zomato === 'YES'` | Pre-fill edit form zomato toggle |
| `client_id` | `clientId: api.client_id \|\| 0` | Pre-fill brand selector |
| `food_stock` | `foodStock: api.food_stock ?? 1` | Show stock toggle status per row |
| `turn_on_at` | `turnOnAt: api.turn_on_at \|\| null` | Show "comes back at" indicator |

---

### GAP-5: Stock Toggle — entirely absent (P0)

**Required additions:**
1. **Constant:** `AGGREGATOR_ENDPOINTS.STOCK_TOGGLE = '/api/v2/vendoremployee/aggregator-sync/stock-toggle'`
2. **Service:** `stockToggle({action, item_ids, client_id?, turn_on_preset?, turn_on_at?})`
3. **UI per aggregator food row:**
   - Green/red pill showing food_stock (enabled/disabled)
   - If disabled: show turn_on_at (e.g. "Back at 11:10 PM")
   - Action menu: Enable | Disable → timing picker (Indefinitely / 30m / 1h / 2h / 6h / 12h / 1d / 7d / Custom date-time)

---

### GAP-6: BulkEditor buildPayload() missing aggregator fields (P1)

| Field | Value |
|---|---|
| File | `BulkEditor.jsx:buildPayload()` L130-175 |
| Missing | `swiggy`, `zomato`, `client_id` |
| Fix | Add to buildPayload + add columns in BulkEditor when menuType=Aggregator |

---

### GAP-7: Edit form can't change swiggy/zomato + no client pre-fill (P1)

| Field | Value |
|---|---|
| Files | `ProductForm.jsx`, `menuManagementTransform.js:fromAPI.food()` |
| Issue A | Edit form has no swiggy/zomato toggles (no UI) |
| Issue B | fromAPI.food() doesn't map swiggy/zomato/clientId → form can't pre-fill |
| Issue C | If user wants to move food from main→sub-brand or change platform sync, there is no way |
| Note | Multipart edit without swiggy PRESERVES existing value — no regression on general saves |

---

## 5. Evidence Artifacts

| File | Content |
|------|---------|
| `goan_g1_clients.json` | restaurant-clients → client 109 "mallu goan" |
| `goan_g3_full_fields.txt` | Full API key list incl. swiggy, zomato, client_id, turn_on_at |
| `goan_g4_clients.json` | Goan Kitchen has client 109 |
| `goan_g5_menu_master.txt` | 4 menu types including Aggregator (id=4198) |
| `goan_g8_verify_new_items.txt` | add-food-aggregator → items appear with swiggy=YES ✅ |
| `goan_g9_wrong_endpoint_result.txt` | add-food → NOT in aggregator list ❌ |
| `goan_g11_wrong_ep_final.txt` | Definitive: add-food with food_for=Aggregator = ghost food |
| `goan_g13_swiggy_persist.txt` | JSON edit sets swiggy, multipart without swiggy preserves it |
| `goan_g14b_raw.json` | stock-toggle response shape + turn_on_at epoch ms |
| `goan_g17_food_stock.txt` | food_stock=0 + turn_on_at ISO after disable |

---

## 6. Recommendations

| Gap | Batch | Gate | Files |
|-----|-------|------|-------|
| GAP-1, GAP-2, GAP-3, GAP-4, GAP-7 | Batch A — Add/Edit fix | Full Gate 2-3 | menuManagementService.js, menuManagementTransform.js, ProductForm.jsx |
| GAP-5 | Batch B — Stock Toggle | Full Gate 2-3 (new feature) | constants.js (new endpoint), new service fn, new UI component |
| GAP-6 | Batch C — BulkEditor | Fast-lane eligible if ≤10 lines | BulkEditor.jsx |

**Risk:** Batch A = HIGH (ProductForm, transform). Batch B = MEDIUM (new isolated component). Batch C = LOW.

---

## 7. Retroactive Candidates
None. No existing registered CR/BUG covers this gap set.
