# BUG-320 — Intake: Sub-Recipe Stock — `physical_qty` Incorrectly Sent in Payload

**Date:** 2026-08-13  
**Source:** OWNER-REPORTED (screenshot)  
**Confidence:** CONFIRMED (code trace + screenshot)  
**Duplicate check:** DISTINCT  
  - BUG-308 (IMPLEMENTED): Wrong routing endpoint — different issue  
  - BUG-176: `physical_qty` in expense entries — DISTINCT domain  
  - No prior bug about `physical_qty` in sub-recipe stock payload  

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P2 — MEDIUM** (extra field in payload; API returns 200 so not crashing, but data semantics wrong) |
| Risk | **LOW** (payload key removal, non-financial, not hotspot) |
| Fast Lane eligible | NO — 2 files (inventoryTransform.js + SubRecipeStockPanel.jsx) |

---

## Description

When adding/adjusting sub-recipe stock quantities on the Sub-Recipe Stock page (`/inventory-sub-recipe-stock`), the `POST add-sub-recipe-stock` request payload includes an extra `physical_qty` key that should not be there for sub-recipe stock:

```json
{
  "physical_qty": 50,    ← EXTRA / WRONG KEY
  "quantity": 50,
  "sub_recipe_id": 235,
  "unit": "gm",
  "waste_reason": ""
}
```

**Why it's wrong:** `physical_qty` is a concept from the **ingredient Stock Audit tab** — it represents a physical physical count of raw ingredients on hand (what you actually see on the shelf vs. what the system computed). Sub-recipes are produced quantities, not physically counted shelf stock. The `physical_qty` field always mirrors `quantity` (both = 50 in screenshot), making it semantically incorrect and potentially confusing the audit trail.

**Owner statement:** "when adding sub recipe extra key physical_quantity is being used when updating stock that will be part of audit tab"

---

## Code Reality

**Code exists — confirmed:**

| File | Line | Code | Status |
|---|---|---|---|
| `inventoryTransform.js` | 232 | `physical_qty: data.physicalQty ?? 0` | ❌ should be REMOVED |
| `SubRecipeStockPanel.jsx` | 94 | `physicalQty: Number(entry.qty), // V4: physicalQty always equals quantity entered` | ❌ should be REMOVED |

**Origin:** The `physical_qty` field was included during CR-139/BUG-308 implementation. The comment "V4: physicalQty always equals quantity entered" confirms it was always mirroring `quantity` — a placeholder pattern copied from the StockAuditPanel, not a real semantic field for sub-recipe stock.

**Compare with regular addStock (ingredients):**
```js
// Regular addStock — NO physical_qty (it's on a separate audit path)
addStock(data) {
  return { quantity, reason, wastage_reason_id, notes };
}

// Sub-recipe addStock — has physical_qty (wrong)
addSubRecipeStock(data) {
  return { sub_recipe_id, quantity, unit, physical_qty, waste_reason, ... };
}
```

---

## Evidence

- **Screenshot (owner-provided):** Network tab → `add-sub-recipe-stock` POST → Request tab shows `physical_qty: 50, quantity: 50` (always equal, semantically redundant)
- **Code trace:** `SubRecipeStockPanel.jsx:94` → `physicalQty: Number(entry.qty)` → `inventoryTransform.js:232` → `physical_qty: data.physicalQty ?? 0`

---

## Blast Radius

- 2 files: `inventoryTransform.js` (1 line remove) + `SubRecipeStockPanel.jsx` (1 line remove)
- Hotspot files: NO
- Scope: SMALL (2 line removals, no API or state change)
- No downstream consumers of `physicalQty` in sub-recipe context

---

## Fix Summary

**`inventoryTransform.js:232`** — Remove `physical_qty` from `addSubRecipeStock` payload:
```js
// REMOVE this line:
physical_qty: data.physicalQty ?? 0,
```

**`SubRecipeStockPanel.jsx:94`** — Remove `physicalQty` from service call:
```js
// REMOVE this line:
physicalQty: Number(entry.qty), // V4: physicalQty always equals quantity entered
```

**Risk:** LOW — removing an extra key that the backend accepts but doesn't need for sub-recipe semantics.

---

## Owner Decisions Needed

1. Confirm: should `physical_qty` be COMPLETELY removed from the sub-recipe stock payload? Or should it be repurposed for a genuine physical count field on this screen?
2. Does the backend audit trail currently store `physical_qty` from this endpoint? (If yes, removal changes audit data — needs backend confirmation.)
