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

## 4. Fix Options & Analysis

### Option A — JSON.stringify per field in FormData (RECOMMENDED)

**Change:** In both `addFoodAggregatorMultipart` (L48-51) and `editFoodAggregator` (L88-91), remove SKIP for variations/addon_ids, instead stringify arrays/objects before appending:

```js
// BEFORE (L48-51):
const SKIP = new Set(['variations', 'addon_ids']);
Object.entries(foodInfo).forEach(([key, val]) => {
    if (SKIP.has(key) || val === undefined || val === null) return;
    formData.append(key, val);
});

// AFTER:
Object.entries(foodInfo).forEach(([key, val]) => {
    if (val === undefined || val === null) return;
    formData.append(key, Array.isArray(val) || typeof val === 'object'
        ? JSON.stringify(val)
        : val);
});
```

- **File:** `menuManagementService.js` only — **1 file, ~6 lines changed** (2 edit locations)
- **Call sites:** `ProductForm.jsx`, `BulkEditor.jsx`, `ProductList.jsx` — **NO changes needed** (payload already includes variations)
- **Backend requirement:** Aggregator endpoint must parse `variations` and `addon_ids` as JSON strings from FormData
- **Risk:** MEDIUM — clean FE fix; BLOCKED on backend confirmation (OD-601-02)
- **Regression risk:** LOW — the "cleanBindings TypeError" was caused by `[object Object]` serialisation, not JSON strings. JSON strings are a valid string value for FormData.

### Option B — Two-step save (separate JSON call for variations)

- Multipart save first (existing behaviour), then immediate JSON PATCH/POST with `{item_id, variations, addon_ids}`
- **Files:** `menuManagementService.js` + `ProductForm.jsx` + `BulkEditor.jsx` + `ProductList.jsx` — 4 files
- **Backend requirement:** New or existing endpoint to accept variations update separately
- **Risk:** HIGH — race condition if first call succeeds but second fails; partial save state
- **Recommendation:** Only if backend cannot accept JSON strings in FormData (Option A fails)

### Option C — Revert to `food_info` JSON wrapper

- Replace FormData loop with `formData.append('food_info', JSON.stringify(foodInfo))`
- **Files:** `menuManagementService.js` only
- **Risk:** HIGH — BUG-327 was introduced because this exact approach caused "cleanBindings TypeError" on the aggregator endpoint. High probability of re-introducing BUG-327.
- **Recommendation:** Do not use unless backend confirms the aggregator endpoint now handles `food_info` wrapper.

---

## 5. Recommendation

**Option A** — only 1 file, 6 lines. The only blocker is OD-601-02: backend must confirm JSON strings for `variations`/`addon_ids` in FormData are acceptable. This is a low-effort backend verification.

If Option A is confirmed: **Fast Lane eligible** — 1 file, ≤10 lines, no hotspot, no financial logic. Requires owner Fast Lane approval.

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

## 7. Owner Decisions Required Before Gate 3

| ID | Question | Blocking |
|---|---|---|
| **OD-601-01** | Which approach — A (JSON.stringify in FormData), B (two-step), or C (food_info revert)? | Gate 3 |
| **OD-601-02** | Backend team to confirm: can the aggregator add/edit endpoints parse `variations` and `addon_ids` as JSON strings from FormData? (Required for Option A) | Gate 3 |

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

**Files WILL change (Option A):** `src/api/services/menuManagementService.js`
**Files WILL NOT touch:** `ProductForm.jsx` · `BulkEditor.jsx` · `ProductList.jsx` · all order/payment/report files
**BLOCKED on:** OD-601-01 (approach choice) + OD-601-02 (backend confirmation)
