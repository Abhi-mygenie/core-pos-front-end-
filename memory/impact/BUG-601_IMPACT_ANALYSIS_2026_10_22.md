# BUG-601 — Impact Analysis

**ID:** BUG-601
**Title:** Aggregator menu variations + addon_ids silently dropped on save
**Gate:** 2 — Impact Analysis
**Date:** 2026-10-22
**Risk:** HIGH
**Code Reality:** PARTIAL
**Conflict Pre-Check:** CLEAR

---

## 1. Header Checks

### Code Reality
Root cause confirmed in code. `SKIP = new Set(['variations', 'addon_ids'])` exists at:
- `menuManagementService.js:48` — `addFoodAggregatorMultipart`
- `menuManagementService.js:88` — `editFoodAggregator`

The fields are present in the `foodInfo` payload built by callers — they are dropped only inside the service.

**Code Reality: PARTIAL** — bug is in shipped code, not a missing feature.

### Conflict Pre-Check

| File | Last touched | Status | Open conflict? |
|---|---|---|---|
| `menuManagementService.js` | BUG-327 (2026-08-26) | IMPLEMENTED | **CLEAR** |
| `ProductForm.jsx` | BUG-394 (2026-09-11) | IMPLEMENTED | **CLEAR** |
| `BulkEditor.jsx` | BUG-394/BUG-371 (2026-09-11) | BUG-135/BUG-147 await smoke | **PARALLEL-SAFE** (different code paths) |
| `ProductList.jsx` | CR-022 | CLOSED | **CLEAR** |

---

## 2. Full Data Flow Trace

```
User edits aggregator item, adds variations
  → ProductForm.jsx:641
      foodInfo = toAPI.foodInfo({ ...form, variations: variations, addonIds: selectedAddonIds })
      // variations = [{ group_name, min, max, options:[{label, price}] }]

  → ProductForm.jsx:646 (add) / :653 (edit)
      menuService.addFoodAggregatorMultipart(foodInfo, imageFile, swiggyImageFile)
      menuService.editFoodAggregator(productId, foodInfo, imageFile, swiggyImageFile)

  → menuManagementService.js:46–58 / :86–98
      const SKIP = new Set(['variations', 'addon_ids'])   ← BUG IS HERE
      Object.entries(foodInfo).forEach(([key, val]) => {
          if (SKIP.has(key) ...) return;   ← variations/addon_ids silently dropped
          formData.append(key, val)
      })

  → POST /api/v2/vendoremployee/product/add-food-aggregator  (or  foods/{id})
      FormData has NO variations, NO addon_ids

  → Backend saves item without variations
  → Returns 200 "success"
  → UI shows "Saved" toast  ← user deceived

  → User refreshes → old variations reappear
```

**Same drop happens in BulkEditor.jsx:**
- `BulkEditor.jsx:690` → `addFoodAggregatorMultipart`
- `BulkEditor.jsx:696` → `editFoodAggregator`
- `ProductList.jsx:124` → `editFoodAggregator`

---

## 3. Root Cause

**Classification: CODE_ERROR from BUG-327**

BUG-327 introduced the SKIP set to prevent a backend "cleanBindings TypeError" when variations (nested objects/arrays) were appended as flat FormData string values. The fix correctly stopped the crash — but the side effect was silently losing variation data on every aggregator save.

**Original BUG-327 problem:**
```js
formData.append('variations', [{group_name: 'Dip', options: [...]}])
// FormData serialises arrays as "[object Object]" — backend cleanBindings crashes
```

**The root constraint:** FormData cannot natively serialize nested arrays/objects. They must be either:
- (A) JSON-stringified: `formData.append('variations', JSON.stringify([...]))` — backend receives a string
- (B) Sent separately via a JSON body in a second API call
- (C) Sent as `food_info: JSON.stringify(foodInfo)` wrapper — reverts to pre-BUG-327 approach

---

## 4. Fix Options & Analysis (UPDATED after API probe 2026-10-22)

### API Probe Results (OD-601-02 RESOLVED)

| # | Method | Result |
|---|--------|--------|
| Bare JSON string `--form 'variations=[...]'` | **REJECTED** — "The variations must be an array" |
| `food_info` wrapper `--form 'food_info={"variations":[...]}'` | **ACCEPTED** — 200, variations persisted |
| Bracket notation `--form 'variations[0][name]=...'` | **ACCEPTED** — 200, variations persisted |

Evidence: `evidence/BUG-601/API_PROBE_OD601_02_2026_10_22.md`

### ~~Option A — JSON.stringify per field~~ ❌ ELIMINATED

A standalone `--form 'variations=<JSON string>'` fails backend validation ("must be an array"). This option is dead.

### Option A-revised — `food_info` wrapper for arrays only (OWNER SELECTED)

**Change:** In both `addFoodAggregatorMultipart` and `editFoodAggregator`, remove `variations` and `addon_ids` from the SKIP set. Instead, collect them separately and append as a `food_info` JSON string field:

```js
// BEFORE:
const SKIP = new Set(['variations', 'addon_ids']);
Object.entries(foodInfo).forEach(([key, val]) => {
    if (SKIP.has(key) || val === undefined || val === null) return;
    formData.append(key, val);
});

// AFTER:
const FOOD_INFO_KEYS = new Set(['variations', 'addon_ids']); // BUG-601
const foodInfoPayload = {};
Object.entries(foodInfo).forEach(([key, val]) => {
    if (val === undefined || val === null) return;
    if (FOOD_INFO_KEYS.has(key)) {
        foodInfoPayload[key] = val;  // collect for food_info wrapper
        return;
    }
    formData.append(key, val);
});
if (Object.keys(foodInfoPayload).length > 0) {
    formData.append('food_info', JSON.stringify(foodInfoPayload)); // BUG-601
}
```

- **File:** `menuManagementService.js` only — **1 file, ~12 lines changed** (2 edit locations)
- **Call sites:** `ProductForm.jsx`, `BulkEditor.jsx`, `ProductList.jsx` — **NO changes needed**
- **Backend:** ✅ CONFIRMED — `food_info` wrapper accepted and persisted (probe #1)
- **Risk:** LOW — `food_info` is the documented approach in the owner's API reference
- **Regression risk:** LOW — simple values still go as flat FormData; only arrays route through `food_info`

### ~~Option B — Two-step save~~ (not selected)

### ~~Option C — Full food_info revert~~ (not selected — too risky, BUG-327 history)

---

## 5. Recommendation

**Option A-revised (`food_info` wrapper)** — owner selected, backend confirmed via live probe. 1 file, ~12 lines, 2 edit locations. No backend changes needed. No blockers remaining.

**OD-601-01: LOCKED** — Option A-revised (food_info wrapper)
**OD-601-02: RESOLVED** — Backend accepts `food_info` JSON string with variations array. Probe confirmed on preprod (item 14247, RID 69).

---

## 6. Affected Files

### Files WILL change (Option A)
| File | Lines | Change |
|---|---|---|
| `src/api/services/menuManagementService.js` | L48-51 + L88-91 | Replace SKIP logic with JSON.stringify for arrays/objects |

### Files WILL NOT change
- `ProductForm.jsx` — payload already includes variations ✓
- `BulkEditor.jsx` — payload already includes variations ✓
- `ProductList.jsx` — payload already includes variations ✓
- All order/payment/report files — zero impact ✓

### Files WILL change (Option B only, if A fails)
- `menuManagementService.js` + `ProductForm.jsx` + `BulkEditor.jsx` + `ProductList.jsx`

---

## 7. Owner Decisions — RESOLVED

| ID | Question | Answer | Status |
|---|---|---|---|
| **OD-601-01** | Which approach? | **Option A-revised** — `food_info` wrapper for arrays | **LOCKED** |
| **OD-601-02** | Backend accepts variations via food_info? | **YES** — probe confirmed on preprod | **RESOLVED** |

---

## 8. Verification Matrix (seeds QA handover — Option A)

| # | Verification | Method |
|---|---|---|
| V1 | `menuManagementService.js` SKIP set removed | `grep "SKIP" menuManagementService.js` → 0 hits |
| V2 | variations JSON-stringified in FormData | Code review: `JSON.stringify` on array values |
| V3 | Compile check | `py_compile` / webpack exit 0 |
| V4 | Add aggregator item with 2 variations → save → refresh → variations persist | Browser test on preprod (owner@thegoankitchen.com) |
| V5 | Edit aggregator item, change variation price → save → refresh → new price shown | Browser test |
| V6 | Bulk Editor aggregator save with variations → refresh → data persists | Browser test |
| V7 | Normal menu (non-aggregator) save unaffected | Browser test: add/edit normal item |
| V8 | No "cleanBindings TypeError" in backend response | Network tab: response 200, no error body |

---

## 9. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-601 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: menuManagementService.js + BUG-601 + date
- [ ] Code marker: // BUG-601 in modified lines
- [ ] Compile: webpack 0 new warnings
```

---

## 10. Scope Lock

**Files WILL change (Option A-revised):** `src/api/services/menuManagementService.js`
**Files WILL NOT touch:** `ProductForm.jsx` · `BulkEditor.jsx` · `ProductList.jsx` · all order/payment/report files
**BLOCKERS: NONE** — OD-601-01 locked, OD-601-02 resolved via probe. Ready for Gate 3.
