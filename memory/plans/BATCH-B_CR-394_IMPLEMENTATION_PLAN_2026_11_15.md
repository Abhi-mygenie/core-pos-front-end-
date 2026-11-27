# BATCH-B · CR-394 (Remove Inclusive GST option — force Exclusive) — Implementation Plan (Gate 3) — 2026-11-15

> Status: GATE_3_PLAN_DRAFT
> HEAD commit: 66ffe518
> Risk: LOW (UI-only removal of a choice; Inclusive maths kept for legacy)
> Conflicts: AddCustomItemModal.jsx — no open edits. ProductCard.jsx — no open edits on L220-228.

## 1. What changes
Remove the "Inclusive" GST option from (a) AddCustomItemModal (open/custom items) and (b) ProductCard (menu product edit). Custom items always send `Exclusive`. Menu products editing saves `Exclusive` on next edit. Legacy Inclusive orders still compute correctly — maths code is untouched. The "Tax Incl." badge on ProductCard stays for legacy data visibility.

Owner decisions: OD-394-A (always Exclusive), OD-394-B (backend one-time fix by Gyan — BB-13 — separate).

## 2. Files changed

| # | File | Line at HEAD | What changes |
|---|------|-------------|--------------|
| E1 | `src/components/order-entry/AddCustomItemModal.jsx` | L256-266 (Tax Calc select) | Remove the `<select>` entirely; `taxCalc` always `'Exclusive'` (state init at L16 already correct) |
| E2 | `src/components/panels/menu/ProductCard.jsx` | L220-228 (Tax Calc select in edit form) | Remove the `<select>`; force `taxCalc: 'Exclusive'` on save; keep stored value for display |

## 3. Exact edits

### E1 — AddCustomItemModal.jsx L252-267

**Before:**
```jsx
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
                  Tax Calc
                </label>
                <select
                  value={taxCalc}
                  onChange={(e) => setTaxCalc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                  data-testid="custom-item-tax-calc"
                >
                  <option value="Exclusive">Exclusive</option>
                  <option value="Inclusive">Inclusive</option>
                </select>
              </div>
```
**After:**
```jsx
              {/* CR-394: Tax Calc always Exclusive — select removed. Value stays 'Exclusive' from useState(L16) */}
```

### E2 — ProductCard.jsx L219-231

**Before:**
```jsx
        <div>
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Tax Calc</label>
          <select
            value={form.taxCalc}
            onChange={(e) => update("taxCalc", e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray }}
          >
            <option value="Inclusive">Inclusive</option>
            <option value="Exclusive">Exclusive</option>
          </select>
        </div>
```
**After:**
```jsx
        {/* CR-394: Tax Calc always Exclusive — select removed. Old Inclusive products show "Tax Incl." badge (L392) */}
        <div>
          <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Tax Calc</label>
          <div className="w-full px-3 py-2 text-sm rounded-lg border bg-zinc-50" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
            Exclusive
          </div>
        </div>
```

**ProductCard.jsx save handler** — find where `form.taxCalc` is sent to the API (the save/update call). Ensure `taxCalc: 'Exclusive'` is always sent regardless of the stored value. Verify at HEAD — grep for `update("taxCalc"` usage in the save function. If save just forwards `form.taxCalc` and the field is no longer editable (read-only "Exclusive" shown), force it:

Add after form initialization (where `form` state is built from product props):
```js
// CR-394: Force Exclusive on any save — no Inclusive choice available
```
In the save handler, override: `taxCalc: 'Exclusive'` in the payload.

## 4. Test steps
| # | Steps | Expected |
|---|-------|----------|
| V1 | Add custom item with GST enabled | No "Tax Calc" dropdown. Item saves as Exclusive |
| V2 | Edit a menu product (currently Exclusive) | "Tax Calc" shows "Exclusive" read-only. Save works |
| V3 | Edit a legacy Inclusive product | "Tax Calc" shows "Exclusive" read-only. "Tax Incl." badge still shows on card. After save → Exclusive |
| V4 | Order with Inclusive product (not re-saved) | Inclusive math still computes correctly (CPP L294 untouched) |
| V5 | Webpack compile | 0 new warnings |

## 5. Rebase note
NONE — no shared files with other open items.

## 6. Scope lock
**WILL change:** AddCustomItemModal.jsx (L252-267), ProductCard.jsx (L219-231 + save handler)
**WILL NOT touch:** BulkEditor.jsx (already removed by BUG-359), ProductForm.jsx (defaults Exclusive, no select), CPP Inclusive calc (L294), orderTransform Inclusive handling, any API
