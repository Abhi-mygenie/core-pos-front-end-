# Implementation Plan — BUG-391
## Aggregator Menu: GST Not Enforced — Items Can Be Saved With 0% Tax or "None" Tax Type

**Date:** 2026-09-10
**Agent Role:** PLANNING (Role 2 — Gate 3 — AGENT_PROMPT_ALPHA v0.7)
**Based on:** `memory/impact/BUG-391_IMPACT_ANALYSIS.md` (Gate 2, same session)
**Entry verify:** All line references confirmed live on 2026-09-10 — no drift from Batch A changes.
**Risk:** HIGH (Rule R6 — tax-adjacent)
**Sprint:** pos_7_0

---

## Pre-Implementation Constraint (MANDATORY)

⚠️ **Batch A conflict:** BUG-390, CR-373, BUG-392, CR-374 are currently QA-pending and touch the same files (`ProductForm.jsx`, `BulkEditor.jsx`). The Implementation Agent **MUST NOT start BUG-391 until Batch A QA passes and files are at a confirmed stable state**.

At implementation time, re-run entry verification (Step 0) before writing any code. If any line has shifted, note the drift and adjust.

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/components/panels/menu/ProductForm.jsx`
2. `frontend/src/components/panels/menu/BulkEditor.jsx`
3. `frontend/src/api/transforms/menuManagementTransform.js`

**Files WILL NOT touch:**
- `orderTransform.js` — POS order transforms, unrelated
- `CollectPaymentPanel.jsx` — payment logic, unrelated
- `OrderEntry.jsx` — order entry, unrelated
- `menuManagementService.js` — no API changes needed
- Any PMS, report, or socket file

---

## Execution Sequence

Execute in this order — each edit is independent within its file, no dependencies between edits except E1 must precede E2 (same useEffect).

```
1. menuManagementTransform.js  →  E5  (2 lines — safest, no UI, start here)
2. ProductForm.jsx             →  E1  (edit mode tax defaults)
                               →  E2  (new item tax defaults + deps)
                               →  E3  (UI lock — read-only display)
3. BulkEditor.jsx              →  E4  (validateRow Aggregator block)
4. Compile check after each file
```

---

## Edit 1: menuManagementTransform.js — E5 (Safety Net)

**File:** `frontend/src/api/transforms/menuManagementTransform.js`
**Lines:** 268–269

**Current (exact):**
```jsx
    tax_type: form.taxType || 'GST',
    tax: String(Number(form.taxPercentage) || 0),
```

**Replace with:**
```jsx
    tax_type: form.foodFor === 'Aggregator' ? 'GST' : (form.taxType || 'GST'),           // BUG-391: Aggregator safety net — always GST
    tax:      form.foodFor === 'Aggregator' ? '5'   : String(Number(form.taxPercentage) || 0), // BUG-391: Aggregator safety net — always 5%
```

**Verification:** `grep -n "BUG-391" menuManagementTransform.js` returns 2 hits at line 268–269.

---

## Edit 2: ProductForm.jsx — E1 (Edit Mode Defaults)

**File:** `frontend/src/components/panels/menu/ProductForm.jsx`
**Lines:** 231–232

**Current (exact):**
```jsx
        taxPercentage: product.tax?.percentage || 0,
        taxType: product.tax?.type || "GST",
```

**Replace with:**
```jsx
        taxPercentage: menuType === 'Aggregator' ? 5 : (product.tax?.percentage || 0), // BUG-391: Aggregator always 5%
        taxType: menuType === 'Aggregator' ? 'GST' : (product.tax?.type || "GST"),     // BUG-391: Aggregator always GST
```

**Verification:** Open existing Aggregator item with 0% tax in DB → form loads with 5% GST pre-filled.

---

## Edit 3: ProductForm.jsx — E2 (New Item Defaults + useEffect deps)

**File:** `frontend/src/components/panels/menu/ProductForm.jsx`

**Part A — Line 278:**

**Current (exact):**
```jsx
        taxPercentage: 0, taxType: "GST", taxCalc: 'Exclusive',
```

**Replace with:**
```jsx
        taxPercentage: menuType === 'Aggregator' ? 5 : 0, taxType: "GST", taxCalc: 'Exclusive', // BUG-391: new Aggregator items default to 5%
```

**Part B — Line 294 (useEffect dependency array):**

**Current (exact):**
```jsx
  }, [product, categories]);
```

**Replace with:**
```jsx
  }, [product, categories, menuType]); // BUG-391: menuType change re-applies tax defaults
```

**Verification:** Click "Add Item" on Aggregator menu → tax field shows 5% from first render (before any interaction).

---

## Edit 4: ProductForm.jsx — E3 (UI Lock — Read-Only Display)

**File:** `frontend/src/components/panels/menu/ProductForm.jsx`
**Lines:** 431–435 (the `grid grid-cols-2` block containing Tax Type + Tax %)

**Current (exact):**
```jsx
          <div className="grid grid-cols-2 gap-3"> {/* BUG-359: removed Tax Calculation — always Exclusive, item-level only */}
            <SelectField label="Tax Type" value={form.taxType} onChange={(v) => update("taxType", v)}
              options={[{ value: "GST", label: "GST" }, { value: "VAT", label: "VAT" }, { value: "None", label: "None" }]} />
            <InputField label="Tax %" value={form.taxPercentage} onChange={(v) => update("taxPercentage", v)} type="number" min={0} max={100} step={0.01} />
          </div>
```

**Replace with:**
```jsx
          {/* BUG-391: Aggregator — tax fields locked read-only (GST 5% mandatory) */}
          {menuType === 'Aggregator' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tax Type</p>
                <p className="text-sm px-3 py-2 bg-muted rounded-md text-foreground">
                  GST <span className="text-xs text-muted-foreground ml-1">(mandatory)</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tax %</p>
                <p className="text-sm px-3 py-2 bg-muted rounded-md text-foreground">
                  5% <span className="text-xs text-muted-foreground ml-1">(mandatory)</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3"> {/* BUG-359: removed Tax Calculation — always Exclusive, item-level only */}
              <SelectField label="Tax Type" value={form.taxType} onChange={(v) => update("taxType", v)}
                options={[{ value: "GST", label: "GST" }, { value: "VAT", label: "VAT" }, { value: "None", label: "None" }]} />
              <InputField label="Tax %" value={form.taxPercentage} onChange={(v) => update("taxPercentage", v)} type="number" min={0} max={100} step={0.01} />
            </div>
          )}
```

**Verification:**
- Aggregator item open → Tax Type and Tax % render as grey labels "GST (mandatory)" and "5% (mandatory)" — no input/dropdown visible.
- Normal item open → Tax Type and Tax % render as interactive SelectField + InputField — no change.

---

## Edit 5: BulkEditor.jsx — E4 (validateRow Aggregator Block)

**File:** `frontend/src/components/panels/menu/BulkEditor.jsx`
**Line:** 567 — insert NEW block immediately BEFORE the existing `if (gstRequired ...)` line

**Current (exact, lines 567–575):**
```jsx
    if (gstRequired && row.packedFood !== "Yes") {
      const hasValidTaxType = row.taxType === "GST" || row.taxType === "VAT";
      const hasPositiveRate = Number(row.taxPercent) > 0;
      if (!hasValidTaxType || !hasPositiveRate) {
        // Both cells tinted red per OQ-F3-4 default.
        errors.push({ field: "taxType",    message: "GST or VAT tax required (restaurant has GST enabled)" });
        errors.push({ field: "taxPercent", message: "Tax % must be > 0" });
      }
    }
```

**Replace with (insert BUG-391 block before existing block):**
```jsx
    // BUG-391: Aggregator items must always have GST at exactly 5% — unconditional, regardless of restaurant.gstStatus
    if (menuType === 'Aggregator') {
      if (row.taxType !== 'GST') {
        errors.push({ field: 'taxType',    message: 'Aggregator items must use GST tax type' });
      }
      if (Number(row.taxPercent) !== 5) {
        errors.push({ field: 'taxPercent', message: 'Aggregator items must have exactly 5% GST' });
      }
    }
    if (gstRequired && row.packedFood !== "Yes") {
      const hasValidTaxType = row.taxType === "GST" || row.taxType === "VAT";
      const hasPositiveRate = Number(row.taxPercent) > 0;
      if (!hasValidTaxType || !hasPositiveRate) {
        // Both cells tinted red per OQ-F3-4 default.
        errors.push({ field: "taxType",    message: "GST or VAT tax required (restaurant has GST enabled)" });
        errors.push({ field: "taxPercent", message: "Tax % must be > 0" });
      }
    }
```

**Verification:**
- Aggregator BulkEditor → change a row's tax to 0% → click Save → row gets red tint on taxPercent cell + error "Aggregator items must have exactly 5% GST".
- Aggregator BulkEditor with `restaurant.gstStatus = false` → same red cell error fires (unconditional).
- Normal BulkEditor → change tax to 0% → no new error from BUG-391 block (existing `gstRequired` path unaffected).

---

## Verification Matrix

| # | Edit | File | Verification Step | Auto? | Account |
|---|------|------|------------------|:-----:|---------|
| V1 | E5 | menuManagementTransform.js | `grep -c "BUG-391" menuManagementTransform.js` returns 2 | YES | — |
| V2 | E5 | menuManagementTransform.js | `form.foodFor='Aggregator', taxType='None', taxPercentage=0` → `toAPI.foodInfo()` → `{ tax_type:'GST', tax:'5' }` | YES (console) | — |
| V3 | E5 | menuManagementTransform.js | `form.foodFor='Normal', taxType='VAT', taxPercentage=12` → `toAPI.foodInfo()` → `{ tax_type:'VAT', tax:'12' }` (Normal unchanged) | YES (console) | — |
| V4 | E1 | ProductForm.jsx | Open existing Aggregator item (any tax value) → `form.taxPercentage === 5` and `form.taxType === 'GST'` on mount | NO (browser) | owner@cafe103.com |
| V5 | E2 | ProductForm.jsx | Click "+ Add Item" on Aggregator menu → `form.taxPercentage === 5` before any user interaction | NO (browser) | owner@cafe103.com |
| V6 | E3 | ProductForm.jsx | Aggregator → Add/Edit item → Tax section shows grey labels "GST (mandatory)" + "5% (mandatory)", no dropdown/input visible | NO (browser) | owner@cafe103.com |
| V7 | E3 | ProductForm.jsx | Normal → Add/Edit item → Tax section shows SelectField + InputField as before (no change) | NO (browser) | owner@cafe103.com |
| V8 | E4 | BulkEditor.jsx | Aggregator BulkEditor → edit any row's Tax % to 12 → Save Changes → red cell + "Aggregator items must have exactly 5% GST" | NO (browser) | owner@cafe103.com |
| V9 | E4 | BulkEditor.jsx | Aggregator BulkEditor → edit Tax Type to VAT → Save Changes → red cell + "Aggregator items must use GST tax type" | NO (browser) | owner@cafe103.com |
| V10 | E4 | BulkEditor.jsx | Normal BulkEditor (gstStatus=false) → edit Tax % to 0 → Save Changes → NO new BUG-391 error (gstRequired path governs, not BUG-391 block) | NO (browser) | owner@cafe103.com |
| V11 | E4 | BulkEditor.jsx | Aggregator BulkEditor → row with correct GST 5% → Save Changes → no validation error | NO (browser) | owner@cafe103.com |

---

## Regression Tests (Rule R6 — tax-adjacent)

| # | Test | Why |
|---|------|-----|
| R1 | Save Normal menu item (name + price + GST 12%) end-to-end | E1/E2/E3 conditional — Normal path must be 100% unaffected |
| R2 | Save Party / Premium menu item | Same — non-Aggregator unchanged |
| R3 | BulkEditor Normal menu — `gstRequired=true` row with GST 0% → red cell (original CR-036-FU-03 behavior) | E4 must not interfere with existing gstRequired path |
| R4 | BulkEditor Aggregator — row already at GST 5% → Save → no error, saves successfully | E4 must not block valid Aggregator rows |
| R5 | Transform: Normal item with `taxType="None", taxPercentage=0` → API receives `{ tax_type:"None", tax:"0" }` (pass-through, E5 safety net only applies to Aggregator) | E5 must not override Normal items |

---

## Step 5 — Post-Code Registry Checklist

```
□ 1. registry.json: BUG-391 → gate: 5, status: "IMPLEMENTED — QA PENDING", sprint_key: "pos_7_0"
□ 2. BUG_TRACKER.md: BUG-391 row → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: Add row for ProductForm.jsx (BUG-391, 2026-09-10), BulkEditor.jsx (BUG-391, 2026-09-10), menuManagementTransform.js (BUG-391, 2026-09-10)
□ 4. Code markers: `// BUG-391` present in ALL 5 edit locations (E1 ×2, E2 ×2, E3 ×1 comment, E4 ×1 comment, E5 ×2)
□ 5. Compile check: `webpack compiled` — 0 new warnings from BUG-391 changes
```

---

## QA Handover Seed

### Test cases for QA agent

| # | Steps | Expected | Severity if fail |
|---|-------|----------|:---:|
| T1 | Menu Mgmt → Aggregator → Add Item → look at Tax section | "GST (mandatory)" and "5% (mandatory)" displayed as read-only labels | MAJOR |
| T2 | Menu Mgmt → Aggregator → Add Item (do not touch tax) → Save | Item saved with tax_type=GST, tax=5 (verify in Network tab payload) | MAJOR |
| T3 | Menu Mgmt → Aggregator → Edit existing item (tax=0 in DB) → form opens | Tax section shows "GST (mandatory)" / "5% (mandatory)" — not the stored 0% | MAJOR |
| T4 | Menu Mgmt → Normal → Add Item → Tax section | SelectField + InputField still present (editable, not locked) | MAJOR |
| T5 | Menu Mgmt → Normal → Edit item → Tax section | SelectField + InputField still present | BLOCKER (regression) |
| T6 | BulkEditor → Aggregator → change any row Tax % to 0 → Save Changes | Red cell on Tax % + "Aggregator items must have exactly 5% GST" error | MAJOR |
| T7 | BulkEditor → Aggregator → change any row Tax Type to VAT → Save Changes | Red cell on Tax Type + "Aggregator items must use GST tax type" error | MAJOR |
| T8 | BulkEditor → Aggregator → row with Tax GST 5% → Save Changes | Saves successfully, no validation error | BLOCKER |
| T9 | BulkEditor → Normal → gstRequired=false → Tax % = 0 → Save Changes | No BUG-391 error (existing gstRequired path governs) | BLOCKER (regression) |
| T10 | Network tab: Aggregator item save payload | `{ tax_type: "GST", tax: "5" }` — safety net confirmed | MAJOR |

### Regression tests (same as above R1–R5)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `menuType` in useEffect deps causes re-render loop | LOW | HIGH | `menuType` is a stable prop, doesn't change during form lifecycle. Safe dep. |
| E3 Aggregator branch breaks form layout | LOW | MEDIUM | Ternary wraps same `grid grid-cols-2` structure. Visual only. |
| E4 fires on non-Aggregator rows if `menuType` prop has unexpected value | LOW | MEDIUM | Guard is strict `=== 'Aggregator'`. Any other value (Normal/Party/Premium/undefined) skips the block. |
| Batch A line drift at implementation time | MEDIUM | MEDIUM | Mandatory entry verify before any code. Plan supersedes if lines have shifted. |

---

*Implementation Plan complete. Gate 3 done. Awaiting owner Gate 4 GO before code is written.*
