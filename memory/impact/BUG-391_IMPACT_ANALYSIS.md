# Impact Analysis — BUG-391
## Aggregator Menu: GST Not Enforced — Items Can Be Saved With 0% Tax or "None" Tax Type

**Date:** 2026-09-10
**Agent Role:** PLANNING (Role 2 — Gate 2 — AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 — Impact Analysis only. No code written.
**Code Reality:** NONE — no Aggregator-specific GST enforcement exists anywhere (confirmed by grep + code read)
**Risk:** HIGH (Rule R6 — tax-adjacent)
**Sprint:** pos_7_0

---

## Conflict Pre-Check

| File | Other Active Items | Risk |
|------|-------------------|------|
| `ProductForm.jsx` | **BUG-390** (QA PENDING) · **CR-373** (QA PENDING) · BUG-359 (IMPLEMENTED, Gate 5) | ⚠️ CONFLICT — BUG-390 touches lines 337–360; CR-373 touches lines 208/270/362/614. BUG-391 touches lines 231/278/432/434. Different lines → low code-merge risk, but **BUG-391 implementation MUST wait until Batch A QA passes** (ensures stable baseline). |
| `BulkEditor.jsx` | **CR-374** (QA PENDING) · **BUG-392** (QA PENDING) · BUG-371 (IMPLEMENTED) | ⚠️ CONFLICT — CR-374 touches lines 244+/428+/975; BUG-392 touches renderCell. BUG-391 touches validateRow (line 567) only. Different lines → low code-merge risk, but same constraint: **implement after Batch A QA passes**. |
| `menuManagementTransform.js` | No active items | ✅ No conflict |

**Execution constraint:** BUG-391 implementation gates on Batch A (BUG-390 + CR-373 + BUG-392 + CR-374) QA pass. Entry verify at implementation time must confirm all 3 files are at known-good state.

---

## 1. Current State — Code Reality (all verified live)

### Layer 1: ProductForm.jsx

**Edit mode init** (line 231):
```jsx
taxPercentage: product.tax?.percentage || 0,   // ← if stored 0 → stays 0 even for Aggregator
taxType: product.tax?.type || "GST",            // ← preserves wrong stored value (VAT, None)
```
Gap: No Aggregator-specific override on load. Existing items with wrong tax open with wrong values.

**New item init** (line 278):
```jsx
taxPercentage: 0, taxType: "GST", taxCalc: 'Exclusive',   // ← 0% is wrong for Aggregator
```
Gap: New Aggregator items default to 0% — operator saves immediately with no enforcement.
Note: comment at line 288 already flags this: `// CR-140 GAP-2: Aggregator defaults for new items` — known gap, never fixed.

**Tax Type dropdown** (line 432–433):
```jsx
options={[
  { value: "GST", label: "GST" },
  { value: "VAT", label: "VAT" },
  { value: "None", label: "None" },    // ← available for ALL menu types including Aggregator
]}
```
Gap: "None" and "VAT" remain selectable for Aggregator.

**Tax % field** (line 434):
```jsx
<InputField label="Tax %" value={form.taxPercentage} onChange={(v) => update("taxPercentage", v)} type="number" min={0} max={100} step={0.01} />
```
Gap: No Aggregator gate. User can set any value 0–100.

**Save handler** (lines 614–626):
```jsx
const foodInfo = toAPI.foodInfo({ ...form, foodFor: menuType || 'Normal', ... });
if (menuType === 'Aggregator') {
  await menuService.addFoodAggregatorMultipart(foodInfo, form.imageFile, effectiveSwiggyFile);
}
```
Gap: No pre-save tax validation. API called with whatever tax values are in form state.

---

### Layer 2: BulkEditor.jsx

**`gstRequired` gate** (line 220):
```jsx
const gstRequired = restaurant?.tax?.gstStatus === true;
```
Gap: Aggregator tax enforcement is conditional on restaurant-level GST setting, not unconditional.

**`addNewRow` defaults** (line 521):
```jsx
tax: { percentage: 5, type: "GST" },
```
✅ **Already correct** — new rows in BulkEditor already default to GST 5%. This is NOT a gap.

**`validateRow`** (lines 567–574):
```jsx
if (gstRequired && row.packedFood !== "Yes") {
  const hasValidTaxType = row.taxType === "GST" || row.taxType === "VAT";   // ← VAT accepted — wrong for Aggregator
  const hasPositiveRate = Number(row.taxPercent) > 0;                       // ← any positive rate accepted
  if (!hasValidTaxType || !hasPositiveRate) {
    errors.push({ field: "taxType",    message: "GST or VAT tax required (restaurant has GST enabled)" });
    errors.push({ field: "taxPercent", message: "Tax % must be > 0" });
  }
}
```
Gaps:
1. Check only runs when `gstRequired === true`. If restaurant has GST disabled → **zero validation for Aggregator**.
2. Even when `gstRequired === true`: VAT is accepted (wrong for Aggregator). Any positive rate is accepted (12%, 18% pass).
3. Existing rows loaded from API with `taxPercent: 0` or `taxType: "None"` are not corrected on load.

---

### Layer 3: menuManagementTransform.js

**toAPI.foodInfo** (lines 268–269):
```jsx
tax_type: form.taxType || 'GST',
tax: String(Number(form.taxPercentage) || 0),
```
Gap: No Aggregator override. Passes through form values as-is. If form has `taxType: "None"` and `taxPercentage: 0` → API receives `{ tax_type: "None", tax: "0" }`.

---

## 2. Data Flow — Full Trace

```
User opens ProductForm / BulkEditor for Aggregator menu
  ↓
FORM INIT:
  ProductForm new:  taxPercentage = 0  ← WRONG (should be 5)
  ProductForm edit: taxPercentage = product.tax?.percentage || 0  ← may be 0 from DB
  BulkEditor new:   taxPercent = 5, taxType = "GST"  ← ✅ ALREADY CORRECT
  BulkEditor load:  taxPercent = f.tax?.percentage ?? 0  ← may be 0 from DB

  ↓
USER EDITS (ProductForm):
  Tax Type: can select GST / VAT / None  ← None & VAT should not be available
  Tax %:    can type any value 0–100     ← should be locked at 5

  ↓
PRE-SAVE VALIDATION:
  ProductForm:   NONE — zero pre-save tax check
  BulkEditor:    ONLY if gstRequired (restaurant.tax.gstStatus === true)
                 Even then: VAT accepted, any rate > 0 accepted

  ↓
TRANSFORM (menuManagementTransform.js:268-269):
  tax_type: form.taxType || 'GST'              ← no Aggregator override
  tax: String(Number(form.taxPercentage) || 0) ← 0 passes as "0"

  ↓
API CALL:
  menuService.addFoodAggregatorMultipart / editFoodAggregator
  Receives: { tax_type: <whatever>, tax: "<whatever>" }

BREAK POINT: All 3 layers — no enforcement at form init, no validation at save, no override at transform
```

---

## 3. Proposed Fix — Exact Change Set

All owner decisions locked (OD-391-01 → OD-391-05 per intake doc).

### E1 — ProductForm.jsx: Force GST/5% on form init for Aggregator (edit mode)
**File:** `ProductForm.jsx`
**Where:** `useEffect([product, categories])` — inside the `if (product)` branch, after the existing `setForm({...})`
**Current** (line 231–232):
```jsx
taxPercentage: product.tax?.percentage || 0,
taxType: product.tax?.type || "GST",
```
**Change:** Override for Aggregator menu (OD-391-01 + OD-391-02 — auto-lock + auto-correct on open):
```jsx
taxPercentage: menuType === 'Aggregator' ? 5 : (product.tax?.percentage || 0),
taxType:       menuType === 'Aggregator' ? 'GST' : (product.tax?.type || "GST"),
```
**Lines changed:** 2 lines (in-place replacement)
**Risk:** LOW — changes only the init value when `menuType === 'Aggregator'`. Normal/Party/Premium menus: no change.

---

### E2 — ProductForm.jsx: Force GST/5% on new item init for Aggregator
**File:** `ProductForm.jsx`
**Where:** `useEffect([product, categories])` — inside the `else` branch (new item), line 278
**Current:**
```jsx
taxPercentage: 0, taxType: "GST", taxCalc: 'Exclusive',
```
**Change:** Note: `menuType` is not available inside `useEffect([product, categories])` directly without adding it to deps. Add `menuType` to the dependency array and use it:
```jsx
taxPercentage: menuType === 'Aggregator' ? 5 : 0,
taxType: "GST", taxCalc: 'Exclusive',
```
And update the useEffect dependency array from `[product, categories]` → `[product, categories, menuType]`.
**Lines changed:** 1 line value change + 1 dep array update = 2 lines
**Risk:** LOW — adding `menuType` to deps is safe (it doesn't change mid-form lifecycle).

---

### E3 — ProductForm.jsx: Lock tax fields read-only for Aggregator (OD-391-01)
**File:** `ProductForm.jsx`
**Where:** Tax Type SelectField (line 432) and Tax % InputField (line 434)
**Current:**
```jsx
<SelectField label="Tax Type" value={form.taxType} onChange={(v) => update("taxType", v)}
  options={[{ value: "GST", label: "GST" }, { value: "VAT", label: "VAT" }, { value: "None", label: "None" }]} />
<InputField label="Tax %" value={form.taxPercentage} onChange={(v) => update("taxPercentage", v)} type="number" min={0} max={100} step={0.01} />
```
**Change:** Gate both fields behind `menuType`:
```jsx
{menuType === 'Aggregator' ? (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <p className="text-xs text-muted-foreground mb-1">Tax Type</p>
      <p className="text-sm font-medium text-foreground px-3 py-2 bg-muted rounded-md">GST <span className="text-xs text-muted-foreground">(mandatory)</span></p>
    </div>
    <div>
      <p className="text-xs text-muted-foreground mb-1">Tax %</p>
      <p className="text-sm font-medium text-foreground px-3 py-2 bg-muted rounded-md">5% <span className="text-xs text-muted-foreground">(mandatory)</span></p>
    </div>
  </div>
) : (
  <div className="grid grid-cols-2 gap-3">
    <SelectField label="Tax Type" value={form.taxType} onChange={(v) => update("taxType", v)}
      options={[{ value: "GST", label: "GST" }, { value: "VAT", label: "VAT" }, { value: "None", label: "None" }]} />
    <InputField label="Tax %" value={form.taxPercentage} onChange={(v) => update("taxPercentage", v)} type="number" min={0} max={100} step={0.01} />
  </div>
)}
```
**Lines changed:** ~12 lines (replace 2 existing lines with conditional block)
**Risk:** LOW — purely UI rendering. Non-Aggregator menu: zero change.

---

### E4 — BulkEditor.jsx: Aggregator-unconditional GST enforcement in validateRow (OD-391-01 + OD-391-03 + OD-391-04)
**File:** `BulkEditor.jsx`
**Where:** `validateRow` function, after existing `if (gstRequired ...)` block (line 567)
**Current:**
```jsx
if (gstRequired && row.packedFood !== "Yes") {
  const hasValidTaxType = row.taxType === "GST" || row.taxType === "VAT";
  const hasPositiveRate = Number(row.taxPercent) > 0;
  if (!hasValidTaxType || !hasPositiveRate) {
    errors.push({ field: "taxType",    message: "GST or VAT tax required (restaurant has GST enabled)" });
    errors.push({ field: "taxPercent", message: "Tax % must be > 0" });
  }
}
```
**Change:** Add Aggregator-specific block BEFORE the existing `gstRequired` block:
```jsx
// BUG-391: Aggregator items must always have GST at exactly 5% — unconditional, regardless of restaurant.gstStatus
if (menuType === 'Aggregator') {
  if (row.taxType !== 'GST') {
    errors.push({ field: "taxType",    message: "Aggregator items must use GST tax type" });
  }
  if (Number(row.taxPercent) !== 5) {
    errors.push({ field: "taxPercent", message: "Aggregator items must have exactly 5% GST" });
  }
}
```
**Lines changed:** ~7 lines added
**Risk:** MEDIUM — tax validation logic. Does NOT touch `gstRequired` path (non-Aggregator unaffected). Only fires when `menuType === 'Aggregator'`.
**Note:** `menuType` is already in `BulkEditor`'s closure scope (prop, line 217) — no new import needed.

---

### E5 — menuManagementTransform.js: Safety net override for Aggregator (OD-391-05)
**File:** `menuManagementTransform.js`
**Where:** `toAPI.foodInfo` function, lines 268–269
**Current:**
```jsx
tax_type: form.taxType || 'GST',
tax: String(Number(form.taxPercentage) || 0),
```
**Change:** Add Aggregator override:
```jsx
tax_type: form.foodFor === 'Aggregator' ? 'GST' : (form.taxType || 'GST'),
tax:      form.foodFor === 'Aggregator' ? '5'   : String(Number(form.taxPercentage) || 0),
```
**Lines changed:** 2 lines (in-place replacement)
**Risk:** LOW-MEDIUM — transform change, but additive (override only for Aggregator path). Normal/Party/Premium: no change. This is a last-resort safety net — if somehow form state bypasses validation, the API call gets the correct values.

---

## 4. Change Summary

| Edit | File | Lines | Description | Risk |
|------|------|:-----:|-------------|------|
| E1 | `ProductForm.jsx` | 2 | Edit mode: force taxPercentage=5, taxType=GST for Aggregator on form init | LOW |
| E2 | `ProductForm.jsx` | 2 | New item mode: default taxPercentage=5 for Aggregator + add menuType to deps | LOW |
| E3 | `ProductForm.jsx` | ~12 | Lock tax fields read-only for Aggregator (show "GST — mandatory" display) | LOW |
| E4 | `BulkEditor.jsx` | ~7 | validateRow: unconditional Aggregator GST@5% check (before gstRequired block) | MEDIUM |
| E5 | `menuManagementTransform.js` | 2 | Safety net: override to GST/5 at transform level for Aggregator | LOW-MEDIUM |

**Total: ~25 lines across 3 files**

---

## 5. Files WILL Change / WILL NOT Touch

**WILL change:**
- `frontend/src/components/panels/menu/ProductForm.jsx` (E1, E2, E3)
- `frontend/src/components/panels/menu/BulkEditor.jsx` (E4)
- `frontend/src/api/transforms/menuManagementTransform.js` (E5)

**WILL NOT touch:**
- `orderTransform.js` — room billing / POS order transforms, unrelated
- `CollectPaymentPanel.jsx` — payment logic, unrelated
- `OrderEntry.jsx` — order entry, unrelated
- Any service file — no API changes needed
- Any other menu component (ProductCard, AddonManagementPanel, VariationExpandPanel)
- Any PMS or report files

---

## 6. Verification Matrix (seeds QA handover)

| Edit | File | How to Verify | Automated? |
|------|------|--------------|:----------:|
| E1 | ProductForm.jsx | Open existing Aggregator item with 0% tax → form loads with 5% GST pre-filled | NO (browser) |
| E2 | ProductForm.jsx | Add new Aggregator item → tax defaults to 5% GST on first render | NO (browser) |
| E3 | ProductForm.jsx | Open any Aggregator item → Tax Type + Tax % show as read-only labels, not inputs | NO (browser) |
| E3b | ProductForm.jsx | Open Normal item → Tax Type + Tax % still show as editable dropdowns | NO (browser) |
| E4 | BulkEditor.jsx | Load Aggregator BulkEditor → edit row tax to 0% → click Save → red cell error | NO (browser) |
| E4b | BulkEditor.jsx | Load Aggregator BulkEditor with restaurant gstStatus=false → same validation fires | NO (browser) |
| E4c | BulkEditor.jsx | Load Normal BulkEditor → edit row tax to VAT → gstRequired=false → no error (unaffected) | NO (browser) |
| E5 | menuManagementTransform.js | grep `tax_type.*Aggregator` confirms conditional | YES (grep) |
| E5b | menuManagementTransform.js | `form.foodFor='Aggregator', taxType='None', taxPercentage=0` → `toAPI.foodInfo()` returns `{ tax_type:'GST', tax:'5' }` | YES (unit test) |

---

## 7. Regression Scope

Per AGENT_PROMPT_ALPHA Rule R6 (financial/tax logic):

| Test | Why |
|------|-----|
| R1: Save Normal menu item end-to-end | Verify E3 conditional doesn't affect Normal path |
| R2: Save Party/Premium menu item | Same — non-Aggregator path completely unaffected |
| R3: BulkEditor Normal menu — validateRow with gstRequired=true | E4 block must not interfere with existing `gstRequired` path |
| R4: BulkEditor Aggregator — existing correct rows (GST 5%) save cleanly | E4 must not block valid rows |
| R5: Transform unit test: Normal item with 0% tax → passes through as 0 (no override) | E5 safety net must not touch Normal items |

---

## 8. Post-Code Registry Checklist (for Implementation Agent)

```
□ registry.json: BUG-391 → status: IMPLEMENTED, gate: 5, sprint_key: pos_7_0
□ CR_REGISTRY.md / BUG_TRACKER.md: BUG-391 row updated to IMPLEMENTED
□ FILE_OWNERSHIP.md: ProductForm.jsx + BulkEditor.jsx + menuManagementTransform.js listed with BUG-391 + date
□ Code markers: // BUG-391 comment in every modified location (all 5 edits)
□ Compile check: webpack 0 new warnings
```

---

## 9. Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| `menuType` added to ProductForm `useEffect` deps causes unintended re-init on parent re-render | LOW | `menuType` is a stable prop passed from MenuManagementPanel — does not change during form lifecycle |
| E4 Aggregator check blocks a legitimate use case (5% exception) | LOW | Owner confirmed: "always 5%, no exceptions" (OD-391-04). No exclusion path needed. |
| E5 safety net overrides data for non-Aggregator items | VERY LOW | Guard is `form.foodFor === 'Aggregator'` — strict equality, `Normal`/`Party`/`Premium` unaffected |
| Batch A files (BUG-390/CR-373/BUG-392/CR-374) not yet QA-passed at implementation time | MEDIUM | **Mitigation: declare in plan that E1/E2/E3 (ProductForm) and E4 (BulkEditor) use entry-verify against known line refs. If lines have shifted from Batch A changes, plan must be updated before any code is written.** |

---

## 10. Open Questions (none — all ODs locked)

All 5 owner decisions are locked per intake doc (OD-391-01 → OD-391-05). No open questions.
Gate 4 GO from owner required before implementation proceeds (Rule R6).

---

*Impact Analysis complete. Gate 2 done. Awaiting owner Gate 4 GO → Implementation Plan (Gate 3) → Implementation.*
