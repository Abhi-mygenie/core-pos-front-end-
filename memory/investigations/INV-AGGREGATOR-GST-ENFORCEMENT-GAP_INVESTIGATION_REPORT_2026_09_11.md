# Investigation Report — Aggregator Menu: GST Enforcement Gap

**Date:** 2026-09-11  
**Agent Role:** INVESTIGATION (Role 6 — AGENT_PROMPT_ALPHA v0.7)  
**Scope:** Does the Aggregator menu enforce GST at 5%? Can items be saved with 0% tax or "None" tax type?  
**Steps used:** 5/10  
**Files read:** `ProductForm.jsx`, `BulkEditor.jsx`, `menuManagementTransform.js`

---

## 1. Summary

| | |
|-|-|
| **Root cause** | No Aggregator-specific tax enforcement exists anywhere in the frontend. Two independent entry points (ProductForm and BulkEditor) both allow saving Aggregator items with 0% tax, "None" tax type, or VAT instead of GST. |
| **Classification** | FE_BUG — missing validation + wrong defaults |
| **Confidence** | HIGH — confirmed in code across all 3 layers (form, validation, transform) |
| **Steps used** | 5/10 |

**Answer to owner's question: YES — the system currently allows saving Aggregator menu items with no GST, 0% tax, or any tax type including "None". There is NO Aggregator-specific tax enforcement anywhere.**

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|-----------|------------|--------|---------|
| H1 | ProductForm validates GST before saving an Aggregator item | Read save handler (lines 594–630) | **ELIMINATED** — Save button calls API directly with zero pre-save validation | `ProductForm.jsx:594–629` — no `if (!form.taxType...)` check before API call |
| H2 | BulkEditor `validateRow` enforces GST specifically for Aggregator rows | Read `validateRow` (lines 532–556) | **ELIMINATED** — Aggregator rows get the same `gstRequired` check as Normal rows, and that check only runs when `restaurant.tax.gstStatus === true` | `BulkEditor.jsx:546–554` |
| H3 | The transform `toAPI.foodInfo` enforces GST for Aggregator items | Read transform (lines 241–288) | **ELIMINATED** — Transform passes through `form.taxType` and `form.taxPercentage` as-is. No Aggregator-specific override | `menuManagementTransform.js:268–269` |
| H4 | Default tax for new Aggregator items is GST at 5% | Read `ProductForm` new-item defaults (line 276) and `BulkEditor addNewRow` (line 498) | **ELIMINATED** — Default `taxPercentage: 0` (not 5) in both forms | `ProductForm.jsx:276`, `BulkEditor.jsx:498–502` |
| H5 | "None" tax type is not available for Aggregator items | Read Tax Type options in ProductForm (line 416–417) | **ELIMINATED** — "None" is a valid selectable option in ProductForm for ALL menu types including Aggregator | `ProductForm.jsx:417`: `{ value: "None", label: "None" }` |

---

## 3. Data Flow Trace — What Actually Happens Today

### Path A: ProductForm (Add/Edit single Aggregator item)

```
User opens ProductForm for Aggregator item (new or edit)
  → taxType:       "GST"  (default — correct type)
  → taxPercentage: 0      (default — WRONG: should be 5)
  → Tax Type dropdown: [GST] [VAT] [None]  ← "None" available — should NOT be for Aggregator

User can:
  (a) Leave tax at 0%  → clicks Save → no validation → API receives { tax: "0", tax_type: "GST" }
  (b) Change to "None" → clicks Save → no validation → API receives { tax: "0", tax_type: "None" }
  (c) Set VAT 5%       → clicks Save → no validation → API receives { tax: "5", tax_type: "VAT" }
  (d) Set GST 12%      → clicks Save → no validation → API receives { tax: "12", tax_type: "GST" }

BREAK POINT: ProductForm.jsx:594 — save handler has NO pre-save validation block
```

### Path B: BulkEditor (Aggregator bulk edit)

```
User opens BulkEditor for Aggregator menu
  → New row defaults: taxPercent from buildRow (existing items) or 0 (new row)
  → taxType from buildRow: "GST" if not set

validateRow() called on save:
  → gstRequired = restaurant?.tax?.gstStatus === true   ← restaurant-level setting
  → IF gstRequired:
      checks taxType ∈ {GST, VAT} AND taxPercent > 0
      (VAT is accepted — should not be for Aggregator)
      (any positive rate accepted — 1%, 3%, 12% all pass)
  → IF NOT gstRequired (restaurant has GST disabled):
      NO tax validation AT ALL for Aggregator rows

BREAK POINT: BulkEditor.jsx:546 — gstRequired gate means Aggregator enforcement
             is conditional on restaurant setting, not unconditional as required
```

### Path C: Transform (common to both paths)

```
toAPI.foodInfo(form)
  → tax_type: form.taxType || 'GST'   ← no Aggregator override
  → tax: String(Number(form.taxPercentage) || 0)   ← 0 passes through as "0"

No Aggregator-specific tax coercion at transform layer.
```

---

## 4. Gap Matrix

| Check | ProductForm | BulkEditor | Transform |
|-------|:-----------:|:----------:|:---------:|
| Blocks save if taxType = "None" for Aggregator | ❌ | ❌ | ❌ |
| Blocks save if taxPercent = 0 for Aggregator | ❌ | ❌ | ❌ |
| Blocks save if taxType = VAT for Aggregator | ❌ | ❌ | ❌ |
| Blocks save if taxPercent ≠ 5 for Aggregator | ❌ | ❌ | ❌ |
| Default taxPercent = 5 for new Aggregator items | ❌ (defaults 0) | ❌ (defaults 0) | — |
| Hides "None" option for Aggregator | ❌ | N/A (no None option in grid) | — |
| Locks/auto-sets GST 5% for Aggregator | ❌ | ❌ | ❌ |

**All 7 checks fail across all 3 layers.**

---

## 5. Recommendations

### Classification: FE_FIX — two files

**This is a P1 business-rule violation.** Aggregator platforms (Swiggy, Zomato) apply GST at the platform level. If items are sent with 0% or "None" tax, the tax computation on the aggregator platform will be incorrect, leading to wrong billing amounts for orders placed through Swiggy/Zomato.

Risk: **HIGH** (tax-adjacent per Rule R6 — involves tax fields, though fix is FE validation/enforcement only)

---

### Recommended fix approach: Auto-lock in ProductForm + Mandatory validation in BulkEditor

**Option 1 — Auto-lock (recommended):**
- In ProductForm, when `menuType === 'Aggregator'`: auto-set `taxType = "GST"` and `taxPercentage = 5` on mount and disable both fields (show as read-only with a tooltip "GST at 5% is mandatory for Aggregator menus")
- Remove "None" from tax type options for Aggregator
- Default new Aggregator items to `taxPercentage: 5` (not 0)
- In BulkEditor, when `menuType === 'Aggregator'`: force `taxType = "GST"` and block save if `taxPercent !== 5` regardless of `gstRequired` restaurant setting

**Option 2 — Validate-only (warn but allow):**
- Show a pre-save warning if Aggregator item doesn't have GST at 5%
- User can override (not recommended — defeats the business rule)

**Recommendation: Option 1 (auto-lock).** The owner said "has to be always 5%" — this is a fixed rule with no exception path.

---

### Planning skip eligibility: NOT ELIGIBLE
- Touches 2 files (`ProductForm.jsx` + `BulkEditor.jsx`)
- ~20–30 lines across both
- Tax-adjacent (Risk: HIGH) → requires owner Gate 4 GO + full Gate flow per Rule R6
- Not a hotspot file but tax logic requires owner sign-off

---

## 6. Open Questions (owner decisions needed before planning)

| OQ | Question | Suggested default |
|----|----------|-----------------|
| OQ-376-01 | **Lock or validate?** Should the GST/5% fields be auto-locked (read-only, no user choice) or validated on save (user can change but blocked)? | Auto-lock — owner said "always" |
| OQ-376-02 | **Existing items with wrong tax:** When user edits an existing Aggregator item that currently has 0% or None tax, should the form auto-correct it on open, or should it preserve the existing value and only enforce on save? | Auto-correct on open (fix silently when form loads) |
| OQ-376-03 | **BulkEditor: what to do with existing rows that have wrong tax?** Show red cell + block save, or auto-correct when user saves? | Show red cell + block save (same as current validateRow pattern) |
| OQ-376-04 | **GST rate: always exactly 5%, or "at least 5%"?** For example, if a restaurant uses 12% GST for some items on Swiggy, should that be blocked? | Exactly 5% (standard Swiggy/Zomato rate) — owner to confirm |

---

## 7. Retroactive Candidates

None. No existing CR/BUG covers this rule. DISTINCT.

---

*Investigation complete. 5/10 steps used. HIGH confidence. Root cause confirmed in code across 3 layers.*  
*Next: Register BUG-391 → owner decisions OQ-376-01..04 → Gate 2 Planning → Gate 4 GO → Implementation.*
