# Investigation Report — BUG-325 + BUG-326

**Date:** 2026-08-17
**Role:** INVESTIGATION
**Steps used:** 8/10
**Triggered by:** Owner report — (1) Variation Stock tab has no current availability indicator; (2) `packed_food` key mismatch + missing `swiggy_packing_chrg` for aggregator food

---

## 1. Summary

| Bug | Finding | Root Cause | Classification | Confidence |
|---|---|---|---|---|
| BUG-325 | Variation Stock tab shows En/Dis buttons but NEVER shows current status | `VariationStockTab.jsx` reads `val.label`/`val.optionPrice` but ignores `val.available` returned by API | FE_BUG — CODE_GAP | HIGH (API probed) |
| BUG-326 | Aggregator food `is_packaged_good` always reads as false; `swiggy_packing_chrg` completely absent | Transform reads `api.packed_food` (null/absent) instead of `api.is_packaged_good`; `swiggy_packing_chrg` not wired anywhere | FE_BUG — CONTRACT_MISMATCH | HIGH (API probed) |

---

## 2. Hypotheses Tested

| # | Bug | Hypothesis | Test | Steps | Result | Evidence |
|---|---|---|---|---|---|---|
| H1 | BUG-325 | API returns `available` per variation value | API probe `GET /aggregator-sync/variations` | 1 | ✅ CONFIRMED | `{label:'salsa', optionPrice:'0', available:false}` |
| H2 | BUG-325 | VariationStockTab renders `val.available` | Code trace VariationStockTab.jsx | 1 | ❌ ELIMINATED | Component renders only `val.label` + `val.optionPrice` |
| H3 | BUG-326 | `foods-list` returns `packed_food` | API probe `GET /foods-list?food_for=Aggregator` | 2 | ❌ ELIMINATED | `packed_food = None` (key exists but null — unused legacy key) |
| H4 | BUG-326 | `foods-list` returns `is_packaged_good` | Same API probe | 0 | ✅ CONFIRMED | `is_packaged_good = 0` |
| H5 | BUG-326 | `foods-list` returns `swiggy_packing_chrg` | Same API probe | 0 | ✅ CONFIRMED | `swiggy_packing_chrg = 'NO'` |
| H6 | BUG-326 | Transform reads `is_packaged_good` | Code trace `menuManagementTransform.js` L116 | 1 | ❌ ELIMINATED | Reads `api.packed_food` not `api.is_packaged_good` |
| H7 | BUG-326 | `swiggy_packing_chrg` wired anywhere | grep codebase | 1 | ❌ ELIMINATED | Zero occurrences in src/ |
| H8 | BUG-326 | BulkEditor/ProductForm/ProductCard use `packed_food` key | Code trace | 1 | ✅ CONFIRMED | BulkEditor L193 sends `packed_food`; form uses `packedFood` state |

---

## 3. BUG-325 — Variation Stock: `available` field not rendered

### API Evidence (probed 2026-08-17)
```
GET /api/v2/vendoremployee/aggregator-sync/variations
Response: {
  "status": True,
  "client_id": null,
  "items": [{
    "id": ...,
    "name": "echhi spcl",
    "status": 1,
    "variations": [{
      "name": "choice of",
      "values": [
        {"label": "salsa",  "optionPrice": "0",  "available": false},
        {"label": "gogo",   "optionPrice": "10", "available": false}
      ]
    }]
  }]
}
```

### Data Flow Trace — BREAK POINT
```
API: GET /aggregator-sync/variations → val = {label, optionPrice, available}
VariationStockTab: setItems(res.items)
Component render: items[0].variations[0].values[0] = {label:"salsa", optionPrice:0, available:false}

BREAK POINT — VariationStockTab.jsx (values map):
  <span>{val.label}</span>         ← renders "salsa"
  {val.optionPrice > 0 && ...}     ← renders ₹10 for gogo
  <button>En</button>
  <button>Dis</button>
  ← val.available is NEVER READ → user cannot see current state
```

### Fix Required
**File:** `src/components/settings/aggregatorSetup/VariationStockTab.jsx`
**Change:** Inside the values map, add a status badge next to the label:
```jsx
// CURRENT:
<span style={{ fontSize: 12, color: '#374151' }}>
  {val.label}
  {val.optionPrice > 0 && <span style={{ color: COLORS.grayText }}> · ₹{val.optionPrice}</span>}
</span>
<button>En</button>
<button>Dis</button>

// FIX: add available badge
<span style={{ fontSize: 12, color: '#374151' }}>
  {val.label}
  {val.optionPrice > 0 && <span style={{ color: COLORS.grayText }}> · ₹{val.optionPrice}</span>}
</span>
<span style={{
  fontSize: 10, padding: '1px 6px', borderRadius: 4,
  background: val.available ? '#dcfce7' : '#fee2e2',
  color: val.available ? '#16a34a' : '#dc2626',
  border: `1px solid ${val.available ? '#bbf7d0' : '#fecaca'}`,
  fontWeight: 600
}}>
  {val.available ? 'Active' : 'Inactive'}
</span>
<button>En</button>
<button>Dis</button>
```

**Scope:** 1 file, ~8 lines added inside existing map
**Risk:** LOW — no API/state/financial change, purely visual
**Planning skip eligible:** YES — owner approval needed

---

## 4. BUG-326 — Aggregator `is_packaged_good` / `swiggy_packing_chrg` mismatch

### API Evidence (probed 2026-08-17)
```
GET /api/v2/vendoremployee/product/foods-list?food_for=Aggregator
Response food[0] packing-related fields:
  packed_food:         None   ← legacy key, null (no longer used by backend)
  is_packaged_good:    0      ← correct new key (1=packaged, 0=not)
  swiggy_packing_chrg: "NO"  ← new key (YES/NO)
```

### Data Flow Trace — BREAK POINTS

**Read side:**
```
API: foods-list → food.packed_food = null, food.is_packaged_good = 0
Transform fromAPI.food() L116: packedFood: toBoolean(api.packed_food)
  toBoolean(null) = false   ← ALWAYS false regardless of actual value
  (api.is_packaged_good is IGNORED)

swiggy_packing_chrg: NEVER READ → no swiggyPackingChrg in frontend state at all
```

**Write side (toAPI.foodInfo):**
```
Transform toAPI.foodInfo() L275: packed_food: form.packedFood ? 'Yes' : 'No'
  → sends key 'packed_food' — backend ignores this for aggregator
  → should send 'is_packaged_good': form.packedFood ? 1 : 0  (aggregator only)
  → should send 'swiggy_packing_chrg': form.swiggyPackingChrg ? 'YES' : 'NO'  (aggregator only)
```

**BulkEditor buildPayload L193:**
```
packed_food: row.packedFood === "Yes" ? "Yes" : "No"
  → same wrong key for aggregator rows
```

**Form state:**
```
ProductForm.jsx L241:  packedFood: product.packedFood || false  ← reads always-false packedFood
ProductForm.jsx L545:  <ToggleField label="Packaged Item" checked={form.packedFood} ...>
                       ← swiggyPackingChrg toggle MISSING entirely
ProductCard.jsx L51:   packedFood: product.packedFood || false  ← same
ProductCard.jsx L240:  <select value={form.packedFood ? "yes" : "no"} ...>
                       ← swiggyPackingChrg selector MISSING
```

### Key Mapping (owner-provided)
| API field | Stored value | Accepted inputs → stored |
|---|---|---|
| `is_packaged_good` | 1 / 0 | yes/y/1/true → 1, else 0 |
| `swiggy_packing_chrg` | YES / NO | yes/y/1/true → YES, else NO |
| `packed_food` | (null — legacy) | Not used anymore for aggregator |

### Scope of Fix
| File | Change | Risk |
|---|---|---|
| `menuManagementTransform.js` | fromAPI: read `api.is_packaged_good` + `api.swiggy_packing_chrg`; toAPI: send `is_packaged_good`/`swiggy_packing_chrg` for Aggregator only (keep `packed_food` for Normal) | MEDIUM |
| `BulkEditor.jsx` | buildPayload: for Aggregator rows send `is_packaged_good` + `swiggy_packing_chrg`; add `swiggyPackingChrg` to COLUMNS definition + buildRow + isDirty | MEDIUM |
| `ProductForm.jsx` | Add `swiggyPackingChrg` state; add UI toggle for Aggregator food only | LOW |
| `ProductCard.jsx` | Add `swiggyPackingChrg` state; add UI selector for Aggregator food only | LOW |

**Planning skip NOT eligible** — 4 files, API contract change, requires full Gate 2-3.

---

## 5. Evidence Artifacts
- Token: `/app/memory/inv_goan_token.txt` (refreshed 2026-08-17)
- `GET /aggregator-sync/variations` full response: `/app/memory/evidence/BUG-VAR-STATUS/variations_response.json`
- `GET /foods-list?food_for=Aggregator` field summary: `/app/memory/evidence/BUG-VAR-STATUS/foods_list_aggregator.json`

---

## 6. Recommendations

### BUG-325 — Planning skip eligible
- 1 file, ~8 lines, purely visual, LOW risk
- **OWNER APPROVAL REQUIRED** before direct fix

### BUG-326 — Full planning gate (Gate 2 → 3)
- 4 files, API contract change, MEDIUM risk
- Needs Impact Analysis + Implementation Plan
- Note: `packed_food` key must remain in `toAPI.foodInfo` for Normal food (it's still used there); only the Aggregator branch needs `is_packaged_good` + `swiggy_packing_chrg`

---

## 7. Retroactive Candidates
None.
