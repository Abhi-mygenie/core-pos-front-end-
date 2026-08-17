# BUG-SRSTOCK — Impact Analysis (Gate 2)
# Sub-Recipe Stock Panel: Produce vs Recount Semantic Fix

**Date:** 2026-08-13
**Role:** PLANNING AGENT
**Code Reality:** PARTIAL — SubRecipeStockPanel, transform, and service exist but panel semantics are wrong
**Conflict Pre-Check:** No active items touching target files (last touch: CR-139 on SubRecipeStockPanel; BUG-244/BUG-275/CR-102 on inventoryTransform.js)
**Risk:** MEDIUM — component state + API contract change, non-financial, no hotspot files
**Related:** BUG-320 (physical_qty extra key), BUG-sub-recipe-stock (wrong endpoint) — both prior, now need semantic layer fix

---

## 1. Problem Statement

The `/inventory-sub-recipe-stock` page (`SubRecipeStockPanel`) is broken in two ways:

**A — Wrong UI semantic vs API contract (active, P1):**
- The panel shows "New Qty" with drift = `entered − current` and requires a wastage reason for negative drift
- But the panel sends `quantity: entered_qty` which the backend treats as "produce X units" (ADD to current)
- **Result:** user enters 5 when stock is 900, sees "−895 drift", is forced to provide a wastage reason — but the backend just adds 5 → stock becomes 905, no wastage row written
- The drift display and wastage reason requirement are UI lies

**B — StockAuditPanel sub-recipe branch activated by transform fix (latent, will become active):**
- `StockAuditPanel.jsx:71` passes `physicalQty: Number(entry.qty)` but the current transform drops it silently
- When the transform is fixed to conditionally include `physical_qty`, this call becomes `quantity=shelf, physical_qty=shelf` → stock = shelf+shelf (e.g. shelf=5, stock=10: wastage=5, new stock=10 — net zero gain)
- Correct behavior: `quantity: 0, physicalQty: shelfCount` (recount-only, no production credit)

---

## 2. API Contract (confirmed by curl probes 2026-08-13)

| Probe | Payload | Stock Before | Stock After | Verdict |
|---|---|---|---|---|
| A | qty=5, no physical_qty | 10 | 15 | ADD mode confirmed |
| B | qty=0, physical_qty=8 | 15 | 8 | Recount-only: 8+0=8, wastage=7 written |
| C | qty=5, physical_qty=8 | 8 | 13 | Recount+produce: 8+5=13, |diff|≤0.01 no wastage |
| D | qty=3, no physical_qty | 13 | 16 | ADD mode again |
| E | qty=3, physical_qty=0 | 16 | 3 | DANGER: 0+3=3, huge loss row written |

**Backend rules (confirmed):**
- `quantity` = always ADDED to current stock (produce mode)
- `physical_qty` = triggers recount: wastage = current − physical, then new = physical + quantity
- `physical_qty: 0` = DANGER: treats 0 as shelf count, writes large loss
- `physical_qty` absent = no recount, no wastage row, clean ADD

---

## 3. Correct Screen Design (per owner contract doc)

| Screen | "New qty" means | Backend payload |
|---|---|---|
| **Produce** | Amount to produce this run | `quantity: X` only — no `physical_qty`, no drift/wastage UI |
| **Recount** | What is on the shelf now | `physical_qty: X` (shelf count). `quantity: 0` (not producing). Drift/wastage UI. Omit `physical_qty` when shelf == book. |

**Rule: never default `physical_qty` to `quantity`. Never send `physical_qty: 0` as placeholder.**

---

## 4. Data Flow Trace

### Current (broken) flow
```
User enters qty=50 on SubRecipeStockPanel (current=900)
  → getDrift: 50−900 = −850 (negative → amber row, wastage reason required)
  → handleSaveAll → addSubRecipeStock(id, { quantity:50, unit, reason })
  → inventoryTransform.addSubRecipeStock → { sub_recipe_id, quantity:50, unit, waste_reason }
  → POST add-sub-recipe-stock
  → Backend ADD: 900+50 = 950 gm (wrong — stock went UP not DOWN)
  → waste_reason sent but no wastage row written (no physical_qty)
BREAK POINT: "New Qty" is labelled and validated as SET-target but sent as produce-qty
```

### Target (correct) flow — Produce Mode
```
User selects "Produce" tab (default), enters produceQty=50
  → UI shows: produce 50 gm → stock will become 950 gm
  → No drift column, no wastage reason column
  → handleSaveAll → addSubRecipeStock(id, { quantity:50, unit, batch?, expiry? })
  → inventoryTransform → { sub_recipe_id, quantity:50, unit }  (no physical_qty, no waste_reason)
  → Backend ADD: 900+50 = 950 gm ✓
```

### Target (correct) flow — Recount Mode
```
User selects "Recount" tab, enters shelfCount=50 (shelf shows 50 gm)
  → UI computes drift: current(900)−shelf(50) = 850 loss → wastage reason required
  → handleSaveAll:
      |900-50| > 0.01 → include physical_qty
      → addSubRecipeStock(id, { quantity:0, physicalQty:50, reason:"text", unit })
  → inventoryTransform → { sub_recipe_id, quantity:0, unit, physical_qty:50, waste_reason:"text" }
  → Backend RECOUNT: wastage=850 written, new stock = 50+0 = 50 gm ✓

  If shelf == book (no mismatch, |diff| ≤ 0.01):
  → skip row entirely (omit physical_qty per contract)
```

---

## 5. Affected Files

| File | Change Type | Risk |
|---|---|---|
| `src/components/inventory/SubRecipeStockPanel.jsx` | MEDIUM rewrite — mode toggle + two table layouts | MEDIUM |
| `src/api/transforms/inventoryTransform.js` | SMALL — conditional physical_qty in addSubRecipeStock | LOW |
| `src/components/inventory/StockAuditPanel.jsx` | TINY — fix sub-recipe branch: quantity:0, physicalQty:shelf | LOW |

**NOT touching:**
- `src/api/services/inventoryService.js` — service layer unchanged
- `src/pages/SubRecipeStockPage.jsx` — wrapper unchanged
- `src/components/inventory/InventoryTabBar.jsx` — tab bar unchanged
- All hotspot files (orderTransform, CollectPaymentPanel, OrderEntry, etc.)

---

## 6. Downstream Consumer Check

| Consumer | Uses addSubRecipeStock? | Impact of transform change |
|---|---|---|
| `SubRecipeStockPanel.jsx` | YES (primary) | Will be redesigned to pass correct params |
| `StockAuditPanel.jsx:68` | YES (sub-recipe branch) | Needs fix: currently passes physicalQty=qty (will activate wrong recount if transform is fixed without also fixing this) |
| `inventoryService.js` | Calls transform | No change needed |
| All other files | No | None |

**Activation risk:** The transform change (conditional physical_qty) will make `StockAuditPanel`'s dormant physicalQty pass-through LIVE. Must fix StockAuditPanel sub-recipe branch in same plan.

---

## 7. Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | physicalQty=0 accidentally sent | Transform guards: `data.physicalQty != null` only (0 is falsy but null-safe check ensures 0 is included if explicitly passed) — must use `!= null` not `!data.physicalQty` |
| R2 | Entries not cleared on mode switch | handleModeChange() clears entries before setting mode |
| R3 | StockAuditPanel sub-recipe calls break if transform changes without panel fix | Include StockAuditPanel fix in same implementation batch |
| R4 | User confusion about "Produce" vs "Recount" tab labels | Clear tooltip/description text per mode |
| R5 | shelfCount=0 valid input in Recount mode | Must allow 0 as a valid shelf count (stock went to 0); UI must not block 0 entry |

---

## 8. Open Questions

None — owner contract doc is explicit. No owner decision needed before implementation.
Mode design is defined: **Produce** (default) + **Recount** toggle.

---

```
Impact Analysis complete: BUG-SRSTOCK
Code reality: PARTIAL (wrong semantics, not missing)
Conflict pre-check: NO conflicts (no other items on target files)
Risk: MEDIUM
Files will change: SubRecipeStockPanel.jsx, inventoryTransform.js, StockAuditPanel.jsx
Files will NOT touch: inventoryService.js, SubRecipeStockPage.jsx, InventoryTabBar.jsx, all hotspot files
Owner decisions: NONE
Next: Gate 3 Implementation Plan (below)
```
