# BUG-359 — Settings Tax Cleanup (Revised from Misdiagnosis)

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Investigation completed:** 2026-08-26
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 11) + owner context 2026-08-26
**Sprint:** POS 5.1 backlog

---

## Classification (REVISED post-investigation)

| Field | Value |
|---|---|
| Type | CR (Settings UI Cleanup) |
| Severity | P2 |
| Risk | **MEDIUM** *(downgraded from CRITICAL — no order calculation change)* |
| Side | Frontend |
| Root cause | **MISDIAGNOSIS** — original intake suspected broken order tax. Investigation shows order tax is always item-level and correct. Issue is dead/confusing fields in settings UI. |
| Duplicate check | DISTINCT |
| Code reality | NONE (cleanup not yet done) |
| Blast radius | MEDIUM (RestaurantSettingsPage.jsx + ProductForm.jsx + BulkEditor.jsx) |
| Fast Lane eligible | NO (3 files, UI changes) |

---

## Investigation Findings — 2026-08-26

### How tax ACTUALLY flows (confirmed)

```
Menu Management (ProductForm / BulkEditor)
  ↓  staff sets per-item: tax_type (GST/VAT) + tax% + tax_calc (Exclusive/Inclusive)
  ↓  saved to product catalog in backend

Cart → orderTransform.js:718-721
  const taxPct     = item.tax?.percentage    ← always from the ITEM stored in catalog
  const taxType    = item.tax?.type          ← 'GST' or 'VAT' per item
  const isInclusive= item.tax?.isInclusive   ← per item

CollectPaymentPanel.jsx:269-288
  Reads item.tax.type, item.tax.isInclusive → computes sgst/cgst/vat per item
```

**`restaurant.tax.gstPercentage` is NEVER read in order calculations.** Confirmed by exhaustive grep of `orderTransform.js` — `gstTax` variable in that file is a LOCAL ACCUMULATOR (lines 807-881), not a read of the restaurant setting.

### Dead fields in RestaurantSettingsPage Step 4

| Field | Maps to | Actually used? | Action |
|---|---|---|---|
| GST Tax % (`s4.gstTax`) | `gst_tax` backend key → `restaurant.tax.gstPercentage` | **NO — never read in order flow** | Remove |
| GST Mode (`s4.gstMode`: 'flat'/'category') | `restaurent_gst` backend key | **NO — `'flat'` mode does nothing in FE** | Remove dropdown; only Item Level exists |
| Tax % (`s4.tax`) | `tax` backend key | **NO — VAT comes from item's own rate** | Remove |
| GST Enabled toggle | `gst_status` | YES — gates tax calculation in CollectPaymentPanel:273 | Keep |
| GST Number (`s4.gstCode`) | `gst_no` | YES — printed on bills, required by law | Keep |
| Show GST to Customers | `show_user_gst` | YES | Keep |
| VAT Enabled + VAT Code | `vat_enabled`, `vat_code` | YES — keep for VAT-registered restaurants | Keep |

### Inclusive option in Menu Management — live but unwanted

`ProductForm.jsx:416-417` exposes "Inclusive" / "Exclusive" Tax Calculation.
`orderTransform.js:721` and `CollectPaymentPanel.jsx:279` both handle Inclusive (extract tax from price instead of adding on top).

**Owner confirmed:** "We don't have inclusive GST, always exclusive." The option exists but should be hidden to prevent misconfiguration. Existing items with `tax_calc = 'Exclusive'` (default/vast majority) are unaffected.

---

## Owner Decisions — ALL LOCKED 2026-08-26

| OD | Decision |
|---|---|
| OD-1 | **Remove "GST Tax %" field** from RestaurantSettingsPage Step 4 |
| OD-2 | **Remove "Restaurant Level" from GST Mode dropdown** (or remove dropdown entirely — only Item Level applicable) |
| OD-3 | **Remove "Tax %" field** from RestaurantSettingsPage Step 4 |
| OD-4 | **Remove "Inclusive" from Tax Calculation** in ProductForm + BulkEditor |
| OD-5 | **Keep** GST Enabled toggle + GST Number + Show GST to Customers |
| OD-6 | **Keep** VAT Configuration section (VAT Enabled + VAT Code) |

---

## Revised Scope

### File 1 — `RestaurantSettingsPage.jsx` (Step 4 GST section)

Remove:
- `<NumberInput label="GST Tax %"...>` (line 544)
- `<SelectInput label="GST Mode"...>` (line 543) OR keep it read-only/hidden since only Item Level is valid
- `<NumberInput label="Tax %"...>` (line 545)

Keep:
- GST Enabled toggle (line 539)
- GST Number input (line 542)
- Show GST to Customers toggle (line 548)
- Full VAT section (lines 550-554)

### File 2 — `ProductForm.jsx`

Remove `"Inclusive"` option from `taxCalc` dropdown (line 417):
```jsx
// Before:
options={[{ value: "Inclusive", label: "Inclusive" }, { value: "Exclusive", label: "Exclusive" }]}
// After:
options={[{ value: "Exclusive", label: "Exclusive" }]}
```
Or remove the Tax Calculation field entirely — if always Exclusive, there's no choice to show.

### File 3 — `BulkEditor.jsx`

`taxCalc` column (line 54) — hide from tier-2 columns OR remove entirely since only Exclusive applies.

---

## Files WILL Change

| File | Change | Risk |
|---|---|---|
| `RestaurantSettingsPage.jsx` | Remove 3 fields from Step 4 | LOW |
| `components/panels/menu/ProductForm.jsx` | Remove Inclusive option from taxCalc dropdown | LOW |
| `components/panels/menu/BulkEditor.jsx` | Hide/remove taxCalc column | LOW |

## Files Will NOT Touch

`orderTransform.js`, `CollectPaymentPanel.jsx`, `productTransform.js` — NO order calculation changes needed.

---

## Risk Note

Risk is now **MEDIUM overall** (3 files) but each individual change is LOW risk:
- Removing display fields from settings saves them on backend still (backward compat safe)
- Removing Inclusive from UI doesn't break existing items (all use Exclusive by default anyway)
- No order calculation logic changes at all

---

## Next Gate

Gate 2 complete (this document IS the impact analysis). Ready for Gate 3 (Implementation Plan) → Gate 4 GO.
