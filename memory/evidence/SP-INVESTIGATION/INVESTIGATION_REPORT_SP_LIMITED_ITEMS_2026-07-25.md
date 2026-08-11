# INVESTIGATION REPORT — Smart Purchase: Limited Items / In-Stock Items Not Shown

**Date:** 2026-07-25
**Module:** Inventory → Smart Purchase
**Reported by:** Owner (screenshot: 36 items for 7d horizon, all Out of Stock / Low Stock)
**Steps used:** 4/10

---

## 1. Summary

Smart Purchase intentionally shows **only items that need purchasing**. In-stock items are hidden by design per owner ruling **B2** from CR-078.

**Root cause:** NOT A BUG — this is the approved behavior.

**Classification:** BY_DESIGN
**Confidence:** HIGH (code traced, ruling documented in source)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|:---:|--------|---------|
| H1 | FE filter is too aggressive — hiding items that SHOULD show | Code trace: purchasePlanner.js filter chain | 2 | **ELIMINATED** — filter matches B2 ruling exactly |
| H2 | In-stock items excluded by design (B2 ruling) | Code trace: L140 `gap < 0` filter + B2 comment at L4 | 1 | **CONFIRMED** — gap ≥ 0 items intentionally dropped |
| H3 | Items missing due to secondary filter in SmartPurchasePanel | Code trace: SmartPurchasePanel.jsx L52-64 | 1 | **ELIMINATED** — no additional row filter; all planned rows passed through |

---

## 3. Data Flow Trace

```
API: getStockInventory() → inventoryTransform.stockItems() → 
  → Array of { id, name, unit, calQuantity, smallUnit, minQtyAlert, isSubRecipe, ... }

Transform: computePlan() in purchasePlanner.js →
  Stage 1: Filter out isSubRecipe (G9)
  Stage 2: For each item: gap = calQuantity - (velocity × horizonDays)
  Stage 3: KEEP only gap < 0  ← THIS IS B2 (items needing purchase)
  Stage 4: ALSO ADD items below minQtyAlert threshold (BUG-224 Rule 2)

State: SmartPurchasePanel rows[] → NO additional filter

Component: AutoShoppingList renders ALL rows[]

UI: "36 items suggested" matches output of computePlan()
```

**BREAK POINT:** None — the chain works as designed. Items with sufficient stock (gap ≥ 0) are correctly excluded.

---

## 4. What Owner Sees vs What's Happening

| What owner sees | Why |
|---|---|
| Only 36 items (not all ingredients) | B2: items with enough stock for 7 days are hidden |
| All items show "Out of stock" / "Low stock" | Correct — only deficit items pass the gap < 0 filter |
| No "in-stock" items visible | By design — you don't need to buy what you already have |

---

## 5. Edge Case: Invisible Ingredients

There IS one class of items that may be unexpectedly invisible:

**Ingredients with NO consumption history AND no minQtyAlert configured:**
- velocity = 0 (no DCR data)
- gap = onHand - 0 = onHand (always ≥ 0)
- B2 hides them
- BUG-224 Rule 2 doesn't catch them (no minQtyAlert threshold)
- These items are effectively invisible to Smart Purchase even if the restaurant wants to order them

**This is not a bug but a coverage gap.** If the owner wants these items purchasable, two options exist:
1. **Set minQtyAlert** on those ingredients → they'll appear via BUG-224 Rule 2
2. **Add a "Manual Add" feature** to let users add arbitrary ingredients to the purchase list (not currently built)

---

## 6. Recommendations

| # | Classification | Action | Priority |
|---|---|---|---|
| R1 | BY_DESIGN | No code change needed for current behavior | — |
| R2 | OWNER_DECISION | If owner wants ALL ingredients visible (not just deficit): new CR needed to add "Show all" toggle or "Add item" manual entry | P3 |
| R3 | CONFIGURATION | For invisible ingredients (no consumption + no minQtyAlert): set minQtyAlert in Ingredients setup as a workaround | Immediate |

---

## 7. Evidence Artifacts

- Source: `utils/purchasePlanner.js` L1-4 (B2 ruling), L140 (gap < 0 filter), L143-166 (BUG-224 Rule 2)
- Source: `components/inventory/SmartPurchasePanel.jsx` L45-65 (no additional filter)
- Owner screenshot: 36 items, all Out of Stock / Low Stock — consistent with B2 behavior
