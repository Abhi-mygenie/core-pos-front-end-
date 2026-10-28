# BUG-430 — Implementation Plan (Gate 3)

**ID:** BUG-430  
**Date:** 2026-09-16  
**Risk:** CRITICAL (financial — GST calculation)  
**Gate 4 GO required before coding**

---

## Scope Lock

### Files WILL change:
1. `/app/frontend/src/api/transforms/folioTransform.js` (L115-121 → add 6 lines, modify 1)
2. `/app/frontend/src/api/services/pmsService.js` (L125-131 → add 6 lines, modify 1)

### Files will NOT touch:
- `/app/frontend/src/pages/pms/GuestFolioPage.jsx` (auto-corrects via folioTransform)
- `/app/frontend/src/pages/pms/InHouseGuestsPage.jsx` (auto-corrects via pmsService)
- `/app/frontend/src/api/transforms/orderTransform.js` (reference only — not changed)
- `/app/frontend/src/components/pms/CollectPaymentPanel.jsx` (R5 hotspot — not needed)

---

## Edit 1 — `/app/frontend/src/api/transforms/folioTransform.js`

### Target: L111-115 (current `.map(d => {...})` room orders transform)

### Current State (L111-115):
```javascript
      .map(d => {
        const fd     = d.food_details || {};
        const qty    = Number(d.quantity)  || 1;
        const unit   = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
        const amt    = Math.round(unit * qty * 100) / 100;
```

### New State (L111-121):
```javascript
      .map(d => {
        const fd     = d.food_details || {};
        const qty    = Number(d.quantity)  || 1;
        const unit   = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
        // BUG-430: include add-ons in GST base (match orderTransform.js L1900-1904)
        const addonPerUnit = (d.add_ons || []).reduce(
          (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
          0
        );
        const amt    = Math.round((unit * qty + addonPerUnit * qty) * 100) / 100;
```

### Changes:
- **Line 115 (NEW):** BUG-430 comment marker
- **Lines 116-119 (NEW):** `addonPerUnit` reduction (4 lines)
- **Line 120 (MODIFIED):** `amt` now includes `+ addonPerUnit * qty`

### Verification:
- ✅ `addonPerUnit` variable declared before `amt`
- ✅ Guards: `|| []` for array, `|| 0` for price/quantity
- ✅ Pattern matches `orderTransform.js` L1900-1903 exactly
- ✅ Rounding: `Math.round(...* 100) / 100` preserved
- ✅ Existing BUG-429 GST logic (L117-124 in old numbering, L122-129 in new) **untouched**

---

## Edit 2 — `/app/frontend/src/api/services/pmsService.js`

### Target: L122-125 (current `.reduce((s, d) => {...})` roomOrdersTotal calculation)

### Current State (L122-125):
```javascript
          .reduce((s, d) => {
            const qty  = Number(d.quantity) || 1;
            const unit = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
            const amt  = Math.round(unit * qty * 100) / 100;
```

### New State (L122-131):
```javascript
          .reduce((s, d) => {
            const qty  = Number(d.quantity) || 1;
            const unit = parseFloat(d.unit_price) || (parseFloat(d.price) / qty) || 0;
            // BUG-430: include add-ons in GST base (match orderTransform.js L1900-1904)
            const addonPerUnit = (d.add_ons || []).reduce(
              (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
              0
            );
            const amt  = Math.round((unit * qty + addonPerUnit * qty) * 100) / 100;
```

### Changes:
- **Line 125 (NEW):** BUG-430 comment marker
- **Lines 126-129 (NEW):** `addonPerUnit` reduction (4 lines)
- **Line 130 (MODIFIED):** `amt` now includes `+ addonPerUnit * qty`

### Verification:
- ✅ `addonPerUnit` variable declared before `amt`
- ✅ Guards: `|| []` for array, `|| 0` for price/quantity
- ✅ Pattern matches `orderTransform.js` L1900-1903 exactly
- ✅ Rounding: `Math.round(...* 100) / 100` preserved
- ✅ Existing BUG-429 GST logic (L127-139 in old numbering, L132-144 in new) **untouched**
- ✅ Variable name `s` in inner reduce does NOT collide with outer reduce's `s` (different scopes)

---

## Verification Matrix

| # | Edit | File | How to Verify | Manual/Auto |
|---|------|------|---------------|:-----------:|
| V1 | `addonPerUnit` reduction present | `folioTransform.js` L116-119 | Code read — reduction block matches orderTransform L1900-1903 | Manual |
| V2 | `amt` includes add-ons | `folioTransform.js` L120 | Code read — `(unit * qty + addonPerUnit * qty)` | Manual |
| V3 | BUG-429 GST logic untouched | `folioTransform.js` L122-129 | Code read — 3-step pattern unchanged from BUG-429 | Manual |
| V4 | Code marker present | `folioTransform.js` L115 | Grep `// BUG-430` | Manual |
| V5 | `addonPerUnit` reduction present | `pmsService.js` L126-129 | Code read — reduction block matches orderTransform L1900-1903 | Manual |
| V6 | `amt` includes add-ons | `pmsService.js` L130 | Code read — `(unit * qty + addonPerUnit * qty)` | Manual |
| V7 | BUG-429 GST logic untouched | `pmsService.js` L132-144 | Code read — 3-step pattern unchanged from BUG-429 | Manual |
| V8 | Code marker present | `pmsService.js` L125 | Grep `// BUG-430` | Manual |
| V9 | Webpack compiles | Terminal | `yarn start` log — 0 new warnings | Manual |
| V10 | Folio Room Orders = ₹256 | Browser | Navigate to Folio for "test gst" → Room Orders tile | Manual |
| V11 | Folio Total Balance Due = ₹1,947 | Browser | Same folio → Balance Breakdown section | Manual |
| V12 | In-House balance = ₹1,947 | Browser | In-House Guests page → Balance column for "test gst" | Manual |
| V13 | All three totals match | Browser | Checkout ₹1,947 = Folio ₹1,947 = In-House ₹1,947 | Manual |
| V14 | No regression (no add-ons) | Browser | Test order without add-ons → GST correct (same as before) | Manual |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-430 → status: GATE_5A_IMPLEMENTED, sprint_key: pos_pms_1
- [ ] BUG_TRACKER.md: BUG-430 row updated
- [ ] FILE_OWNERSHIP.md: folioTransform.js + pmsService.js listed under BUG-430
- [ ] Code markers: // BUG-430 in both modified files
- [ ] Compile: webpack 0 new warnings
```

---

## Execution Sequence

1. **Edit folioTransform.js** (E1: L115-120 → insert 6 lines, modify line 120)
2. **Edit pmsService.js** (E2: L125-130 → insert 6 lines, modify line 130)
3. **Verify webpack compiles** (yarn start → 0 new warnings)
4. **Self-test V1-V14**
5. **EXIT GATE (5 checkboxes)**
6. **Write QA handover** (combined with BUG-426/427/428/429 if in same batch)

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `add_ons` field absent in API response | LOW | `|| []` guard → reduce returns 0 (same as before fix) |
| Add-on `price`/`quantity` non-numeric | LOW | `parseFloat() || 0` guards in reduce function |
| Variable name collision (`addonPerUnit`) | NONE | Scoped inside callback, no outer variable with same name |
| Breaking BUG-429 GST logic | NONE | Zero changes to L122-129 (folioTransform) / L132-144 (pmsService) |
| Rounding differences | NONE | Uses same `Math.round(...*100)/100` pattern as orderTransform |
| BUG-426 `roomOrdersTotal` summation broken | NONE | Only changes `amt` input to existing summation logic |

---

## Edge Cases

### EC1: Order item has no add-ons
**Input:** `d.add_ons = []` or `d.add_ons = undefined`  
**Behavior:** `(d.add_ons || []).reduce(...)` returns 0  
**Result:** `amt = unit * qty + 0 * qty` = same as before (no change)  
**Status:** ✅ Safe

### EC2: Add-on has `price: null` or `quantity: null`
**Input:** `a.price = null`, `a.quantity = null`  
**Behavior:** `parseFloat(a.price) || 0` = 0, `parseFloat(a.quantity) || 1` = 1  
**Result:** Add-on contributes 0 to sum  
**Status:** ✅ Safe (guarded)

### EC3: Add-on has `price: "abc"` (string)
**Input:** `a.price = "abc"` (non-numeric)  
**Behavior:** `parseFloat("abc")` = NaN, `NaN || 0` = 0  
**Result:** Add-on contributes 0 to sum  
**Status:** ✅ Safe (guarded)

### EC4: Multiple add-ons on same item
**Input:** `d.add_ons = [{price: 10}, {price: 20}]`, `qty = 2`  
**Behavior:** `addonPerUnit = 10 + 20 = 30`, `amt = (unit*2 + 30*2)`  
**Result:** Both add-ons included in GST base  
**Status:** ✅ Expected behavior

### EC5: Item with `gst_tax_amount` present (BUG-429 Step 1)
**Input:** `d.gst_tax_amount = 45.60` (pre-calculated)  
**Behavior:** BUG-429 logic uses pre-calculated value, skips fallback calculation  
**Result:** Add-ons irrelevant (GST already computed correctly by backend)  
**Status:** ✅ Safe (BUG-429 path unchanged)

---

## Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | BUG-427 Room Orders section display (per-row amount, expand functionality) | folioTransform modified — ensure per-row `amount` field uses new `amt` value |
| R2 | BUG-426 transferredFnb and roomBalance still correct | pmsService modified — only roomOrdersTotal calculation changed, others untouched |
| R3 | BUG-429 `gst_tax_amount` path still works | Both files — if backend sends pre-computed GST, it should be used (Step 1 of 3-step logic) |
| R4 | BUG-429 `inclusive` tax handling still works | Both files — ensure `isInclusive` branch still computes correctly |
| R5 | `gstPercent` display field correct | folioTransform — `gstPct` variable unchanged, still used for display |
| R6 | sgst/cgst fields correct | folioTransform — still computed as `gstAmt / 2` each |

---

## Combined QA Handover Note

**Recommendation:** Combine BUG-430 QA with BUG-426/427/428/429 testing since:
1. All 5 bugs affect the same guest balance calculation
2. Test data: "test gst" guest (order #000069) exercises all 5 fixes
3. Expected final result: ₹1,947 across all 3 surfaces (Checkout, Folio, In-House)
4. Single test cycle covers entire PMS balance calculation flow

**If separate QA needed:** BUG-430 can be tested independently by comparing room orders with vs without add-ons.

---

## Summary

**Scope:** 2 files, 12 lines added, 2 lines modified  
**Pattern:** Copy-paste from `orderTransform.js` L1900-1903  
**Complexity:** SIMPLE (straightforward addition, no logic change)  
**Risk:** LOW (additive only, BUG-429 untouched)  
**Testing:** 14 verification checks (9 code-read, 5 browser)  

**Awaiting Gate 4 GO**
