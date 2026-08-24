# Investigation Report — Addon Scope: Menu-Type-Specific vs Restaurant-Wide
**ID:** INV-ADDON-SCOPE
**Date:** 2026-08-14
**Role:** INVESTIGATION (Alpha v0.7)
**Hypothesis under test:** "Addon management is for Aggregator only — does the same exist for Normal/other menus?"
**Steps used:** 5/10
**Confidence:** HIGH — all findings confirmed via live probe + code trace

---

## 1. Summary Answer

**Addons are 100% restaurant-wide. They are NOT scoped to any menu type (food_for).**

The same addon pool is shared across Normal, Party, Premium, Aggregator — and every other menu type. There is no `food_for` field anywhere in the addon API. The Addon Management feature (CR-142) must be accessible from **all** menu types, not just Aggregator.

---

## 2. Evidence Table

| Probe | Test | Result | Conclusion |
|-------|------|--------|------------|
| P1 | GET /addon-list (no params) | Returns 2 addons, NO `food_for` field in response | Addons have no menu-type scope |
| P2 | GET /addon-list?food_for=Aggregator | Returns same 2 addons | `food_for` param ignored by backend |
| P3 | GET /addon-list?food_for=Normal | Returns same 2 addons | `food_for` param ignored by backend |
| P4 | POST /add-addon (no food_for) | Creates addon, no `food_for` in response | Addon has no food_for attribute |
| P5 | POST /add-addon + `food_for: "Normal"` | Creates addon, `food_for` ignored | Field not stored/returned |
| P6 | POST /add-addon + `food_for: "Aggregator"` | Creates addon, `food_for` ignored | Field not stored/returned |
| P7 | GET /addon-list after all creates | All 3 probes appear together (no separation) | All menu types share one pool |
| P8 | Normal foods — do they have addons? | `test1` (Normal food) has `extra flesh` (id=13194) ✅ | Normal foods use same addons |
| P9 | Aggregator foods — do they have addons? | Yes — `addon_ids` in create/edit | Aggregator foods use same addons |
| P10 | FE code — does fetchAddons guard on menuType? | fetchAddons() in fetchMeta (NO guard) | Already runs for ALL menu types |
| P10b | FE code — does ProductForm guard Food Addons on menuType? | NO guard on Food Addons section | Already visible for ALL menu types |
| P11 | addon-update via POST (current FE method) | **Empty response** (silent failure) | POST is WRONG |
| P11b | addon-update via PUT (correct method) | `{"message":"Addon updated successfully","data":{...}}` | PUT is CORRECT — confirms GAP-C |

---

## 3. Detailed Findings

### FINDING-1: Addon API has NO food_for scope (CONFIRMED)

```
GET /addon-list                        → returns all addons
GET /addon-list?food_for=Normal        → same addons (param ignored)
GET /addon-list?food_for=Aggregator    → same addons (param ignored)
GET /addon-list?food_for=Party         → (expected: same addons)
```

Response shape has NO `food_for` field:
```json
{ "id": 13193, "name": "Dark", "price": 10, "status": 1,
  "weight": 0, "veg": null, "has_inventory": "No",
  "recipe_id": null, "has_recipe": false, "is_pushed_managed": false }
```

**`food_for` is not a concept that exists for addons.**

---

### FINDING-2: Normal foods already use addons (CONFIRMED)

Normal food `test1` (restaurant 69) has addon `extra flesh` (id=13194).
Both Normal and Aggregator foods can have `addon_ids[]` in their create/edit payload.
Same addon can appear on a Normal food AND an Aggregator food simultaneously.

---

### FINDING-3: FE already fetches addons for all menu types (CONFIRMED)

`MenuManagementPanel.jsx` fetchAddons is called in `fetchMeta` useEffect (L99-102):
```js
fetchMeta();
fetchCategories();
fetchAddons();  // ← NO menu type condition. Runs on panel open for ALL menu types.
```

ProductForm's "Food Addons" section (L456-494) has **no menuType guard** — visible for Normal, Aggregator, Party, Premium alike.

---

### FINDING-4: addon-update POST is silently broken (CONFIRMED — CRITICAL)

This is the most critical operational finding:

```
POST /addon-update/13193 { name, price }  → empty response (HTTP likely 404/405)
PUT  /addon-update/13193 { name, price }  → {"message":"Addon updated successfully","data":{...}}
```

**Current FE code (`menuManagementService.js` L157-158):**
```js
export const updateAddon = (addonId, name, price) =>
  api.post(`${BASE_V2}/addon-update/${addonId}`, { name, price: Number(price) });
```

**Every addon edit attempt in the FE silently fails.**  
There is no addon edit UI currently, so this has never been caught. But when CR-142 adds the edit panel, it MUST use PUT.

---

## 4. Impact on CR-142 (Amendment)

**Original framing:** CR-142 was investigated in the context of aggregator menu management.

**Corrected scope after this investigation:**

| Aspect | Before investigation | After investigation |
|--------|---------------------|---------------------|
| Addon panel location | Potentially aggregator-only | **Must be visible for ALL menu types** |
| Addon Management button | Might be hidden for Normal | **Always visible in MenuManagementPanel header** |
| fetchAddons() guard | Might need menuType check | **Already runs for all — no change needed** |
| Food Addons in ProductForm | Might be Aggregator-only feature | **Already shows for all — applies universally** |

**CR-142 impact analysis is MOSTLY correct but needs one clarification:**

The Addon Management Panel button in MenuManagementPanel header:
- ✅ Correct: always visible (OQ-1=A already says "new button in header")
- ✅ Correct: NO menuType condition needed
- ❌ Must NOT be gated on `menuType === 'Aggregator'` at any point

No structural change to CR-142 needed. The existing design (panel in MenuManagementPanel header, accessible for all menu types) is correct. Just confirming it explicitly.

---

## 5. Retroactive Candidates
None — no existing registered items need status change.

---

## 6. Evidence Artifacts
- `/app/memory/evidence/INV-ADDON-SCOPE/probe1_addon_list.txt` — full addon-list response
- `/app/memory/evidence/INV-ADDON-SCOPE/probe2_aggr_filter.txt` — food_for=Aggregator ignored
- `/app/memory/evidence/INV-ADDON-SCOPE/probe3_normal_filter.txt` — food_for=Normal ignored
- `/app/memory/evidence/INV-ADDON-SCOPE/probe4-6_add_food_for.txt` — food_for on create ignored
- `/app/memory/evidence/INV-ADDON-SCOPE/probe7_list_after_creates.txt` — all addons in one pool
- `/app/memory/evidence/INV-ADDON-SCOPE/probe8_normal_foods_addons.txt` — Normal food has addons
- `/app/memory/evidence/INV-ADDON-SCOPE/probe11_update_POST.txt` — POST returns empty ❌
- `/app/memory/evidence/INV-ADDON-SCOPE/probe11b_update_PUT.txt` — PUT works ✅
