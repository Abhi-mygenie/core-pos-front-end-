# Intake — BUG-391
## Aggregator Menu: GST Not Enforced — Items Can Be Saved With 0% Tax or "None" Tax Type

**Date:** 2026-09-11  
**Registered by:** Investigation Agent (ALPHA v0.7)  
**Source:** OWNER-REPORTED business rule + AGENT-CONFIRMED-IN-CODE  
**Sprint:** pos_7_0 (suggested)  
**Related investigation:** `/app/memory/investigations/INV-AGGREGATOR-GST-ENFORCEMENT-GAP_INVESTIGATION_REPORT_2026_09_11.md`

---

## Classification

| Field | Value |
|-------|-------|
| **Type** | BUG — missing enforcement / wrong defaults |
| **Severity** | P1 — HIGH |
| **Risk** | HIGH (tax-adjacent — Rule R6 applies) |
| **Area** | Menu Management > ProductForm.jsx + BulkEditor.jsx |
| **Fast Lane** | NOT ELIGIBLE — 2 files, tax-adjacent (Rule R6), requires Gate 4 GO |

**Severity rationale:** Aggregator platforms (Swiggy, Zomato) require GST at 5% to be attached to every menu item. Saving an item with 0% tax or "None" tax type means the platform will compute incorrect tax on every order for that item — billing error with real financial impact.

**Risk rationale:** Fix touches tax fields. Rule R6 mandates owner approval + regression verification before any tax-adjacent change.

---

## Owner Requirement (verbatim)

> "If we save the menu from the aggregator, does it allow if there is no GST in it? Because in the aggregator, should be chosen always GST. It has to be always 5%."

---

## Description

The Aggregator menu (Swiggy/Zomato items) allows saving food items with:
- `tax_type: "None"` — completely tax-free
- `tax: "0"` — 0% GST
- `tax_type: "VAT"` — wrong tax type for Swiggy/Zomato
- Any arbitrary GST rate (e.g., 12%, 18%) — wrong rate for Swiggy/Zomato

**Business rule:** Aggregator menu items must always be saved with `tax_type = "GST"` and `tax = "5"`. No exceptions.

**Confirmed failing in all 3 layers:**
1. `ProductForm.jsx` — no pre-save validation, "None" is selectable, default is 0%
2. `BulkEditor.jsx` — tax enforcement only runs if `restaurant.tax.gstStatus === true`, not unconditionally for Aggregator
3. `menuManagementTransform.js` — passes through whatever tax values are in the form with no Aggregator override

---

## Root Cause (code evidence)

```jsx
// ProductForm.jsx:276 — new item default (WRONG: should be 5, not 0)
taxPercentage: 0, taxType: "GST",

// ProductForm.jsx:416–417 — "None" is selectable for ALL menu types including Aggregator
options={[
  { value: "GST", label: "GST" },
  { value: "VAT", label: "VAT" },
  { value: "None", label: "None" },   // ← should not be available for Aggregator
]}

// ProductForm.jsx:594–629 — save handler: ZERO pre-save validation
onClick={async () => {
  setSaving(true);
  const foodInfo = toAPI.foodInfo({ ...form, ... });
  await menuService.addFoodAggregatorMultipart(foodInfo, ...);  // ← no tax check before this
  ...
}}

// BulkEditor.jsx:544–554 — validateRow: Aggregator tax only enforced if restaurant has GST enabled
const gstRequired = restaurant?.tax?.gstStatus === true;  // ← restaurant-level setting
if (gstRequired && row.packedFood !== "Yes") {
  // accepts VAT, accepts any rate > 0
  // if gstRequired is false → NO tax check at all, even for Aggregator
}

// menuManagementTransform.js:268–269 — passes through as-is, no Aggregator override
tax_type: form.taxType || 'GST',
tax: String(Number(form.taxPercentage) || 0),
```

---

## Desired State (after fix)

### ProductForm (single item add/edit):
```
When menuType === 'Aggregator':
  • taxType and taxPercentage fields are auto-set to "GST" / 5 on mount
  • Both fields shown as read-only / locked (no user editing allowed)
  • Tooltip/label: "Aggregator menus: GST 5% is mandatory"
  • "None" and "VAT" options removed from Tax Type dropdown for Aggregator
  • Default for new items: taxPercentage = 5 (not 0)
```

### BulkEditor (bulk edit):
```
When menuType === 'Aggregator':
  • Tax validation is unconditional (NOT gated on restaurant.gstStatus)
  • validateRow blocks save if taxType !== "GST" → red cell error
  • validateRow blocks save if taxPercent !== 5 → red cell error
  • Error message: "Aggregator items must have GST at 5%"
```

---

## Implementation Scope

| Item | Detail |
|------|--------|
| **Files** | `ProductForm.jsx`, `BulkEditor.jsx` |
| **ProductForm changes** | (1) Change new-item default `taxPercentage: 0` → `5` when Aggregator, (2) Disable/read-only tax fields for Aggregator, (3) Remove "None" from options for Aggregator, (4) Auto-correct on edit-open if existing tax is wrong |
| **BulkEditor changes** | Add Aggregator-specific check in `validateRow`: unconditionally enforce GST at 5% when `menuType === 'Aggregator'` |
| **Transform changes** | Optional safety net: if `foodFor === 'Aggregator'` and taxType is not "GST" or taxPercent ≠ 5, override silently. Owner to decide. |
| **Lines estimate** | ~20–30 lines across both files |
| **Hotspot?** | NO — but tax-adjacent (Rule R6) |

---

## Owner Decisions — ALL LOCKED (2026-09-11)

| OD | Question | Decision | Locked by |
|----|----------|----------|----------|
| OD-391-01 | Lock or validate? | **Auto-lock** — GST/5% fields shown read-only for Aggregator. User cannot edit. | Owner (2026-09-11) |
| OD-391-02 | Existing items with wrong tax: auto-correct on open? | **Auto-correct silently on form open** | Agent default — owner may override |
| OD-391-03 | BulkEditor wrong rows: red cell + block or auto-correct? | **Red cell + block save** (consistent with current validateRow pattern) | Agent default — owner may override |
| OD-391-04 | GST rate: exactly 5% or minimum 5%? | **Exactly 5%** — any other rate (3%, 12%, 18%) is blocked | Owner (2026-09-11) |
| OD-391-05 | Transform safety net? | **YES** — override to GST/5% at transform level if validation somehow passes | Agent default — owner may override |

**All ODs locked. Ready for Gate 2 Planning.**

---

## Evidence

- **Source:** Owner-reported (2026-09-11)
- **Confidence:** HIGH — confirmed in code across all 3 layers
- **Code evidence:** `ProductForm.jsx:276, 417, 594–629` · `BulkEditor.jsx:544–554` · `menuManagementTransform.js:268–269`

---

## Duplicate Check

| Check | Result |
|-------|--------|
| BUG-386 (GST hardcoded '0.00' in PMS) | DIFFERENT module — PMS GST, not Menu Management |
| Any aggregator tax validation item | DISTINCT |

**Verdict: DISTINCT.**

---

*Intake complete. Status: BLOCKED on OD-391-01..05 — owner decisions required before Gate 2 Planning.*  
*Rule R6 applies: owner Gate 4 GO required before any implementation.*
