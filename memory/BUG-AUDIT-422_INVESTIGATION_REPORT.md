# Investigation Report — BUG-AUDIT-422: Stock Audit save fails with 422 "The unit field is required"

**Date:** 2026-09-03
**Role:** INVESTIGATION
**Steps used:** 4/10
**Confidence:** HIGH (traced + owner-documented canonical payload confirms)

---

## 1. Summary

**Root cause:** `toAPI.addStock()` payload missing 4 of 5 required fields (`unit`, `physicalqty_master`, `physical_qty`, `waste_reason`) and incorrectly puts the shelf count in `quantity` instead of `physical_qty`.

**Classification:** FE_BUG
**Confidence:** HIGH — code trace confirmed, owner's canonical payload doc confirms expected contract, screenshot + 422 reproduce.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|---------|
| H1 | Save handler builds POST body WITHOUT `unit` field | Code trace: `inventoryTransform.js:217-224` | 1 | **CONFIRMED** | `addStock()` returns `{ quantity, reason, wastage_reason_id, notes }` — no `unit` key |
| H2 | `unit` data missing from stock items | Code trace: `inventoryTransform.js:15,25` + `StockAuditPanel.jsx:53,173` | 1 | **ELIMINATED** | `item.unit` and `item.displayUnit` both mapped and used for display |
| H3 | Field named differently | Code trace: compare `addStock` vs `addSubRecipeStock` | 0 (free with H1) | **ELIMINATED** | Sub-recipe path correctly uses `unit` key |

---

## 3. Data Flow Trace

```
API: POST /inventory/add-stock/{id}
  ← StockAuditPanel.jsx:81-85 (handleSaveAll, regular ingredient branch)
    ← inventoryService.addStock(itemId, { quantity, wastageReasonId, reason })
      ← inventoryTransform.toAPI.addStock(data) → { quantity, reason, wastage_reason_id, notes }
        → POST body — MISSING: unit, physicalqty_master, physical_qty, waste_reason
          → Backend 422: "The unit field is required."

BREAK POINT: inventoryTransform.js:217-224 (toAPI.addStock)
CONTRIBUTING: StockAuditPanel.jsx:80-85 (caller doesn't pass unit/physicalQty to service)
```

## 4. Five Discrepancies (Current → Required)

| # | Field | Current payload | Required per canonical contract | Severity |
|---|-------|----------------|-------------------------------|----------|
| D1 | `unit` | **MISSING** | `item.displayUnit \|\| item.unit` (e.g. `"piece"`) | **422 BLOCKER** — immediate cause |
| D2 | `physicalqty_master` | **MISSING** | `true` — flags this as physical count, not purchase | **SEMANTIC** — without it, backend may treat as purchase |
| D3 | `physical_qty` | **MISSING** | `Number(entry.qty)` — the shelf count | **SEMANTIC** — backend uses this to set inventory |
| D4 | `quantity` | `Number(entry.qty)` (shelf count) | `0` (count-only, no purchase add) | **SEMANTIC** — server math: `new_stock = physical_qty + quantity`. With qty=shelf_count and no physical_qty, result is wrong |
| D5 | `waste_reason` | **MISSING** (sends `reason` key) | `reasonLabel \|\| "Physical stock count"` | **AUDIT TRAIL** — wastage row source_type needs this |

## 5. Reference: Sub-recipe path IS correct

`StockAuditPanel.jsx:69-73` (sub-recipe branch) correctly sends:
```js
{
  quantity: 0,              // ← count-only
  unit: item.unit || '',    // ← included
  physicalQty: Number(entry.qty),  // ← shelf count
  reason: reasonLabel || '',
}
```

And `inventoryTransform.toAPI.addSubRecipeStock()` at L230-241 correctly maps to:
```js
{
  sub_recipe_id, quantity, unit,
  physical_qty,   // ← from physicalQty
  waste_reason,   // ← from reason
}
```

**The fix pattern exists. The regular ingredient path just never received it.**

---

## 6. Evidence Artifacts

All saved to: `/app/memory/evidence/BUG-AUDIT-422/`
- Owner intake doc: `stock_audit.md` (canonical payload, curl examples, checklist)
- Owner screenshot: 422 error in Network tab on `POST add-stock/16950`
- Code traces: `inventoryTransform.js:217-224`, `StockAuditPanel.jsx:80-85`, `inventoryService.js:83-85`
- Working reference: sub-recipe path `StockAuditPanel.jsx:69-73` + `inventoryTransform.js:230-241`

---

## 7. Recommendations

**Classification:** FE_FIX

**Files to change:**
1. `src/api/transforms/inventoryTransform.js` — rewrite `toAPI.addStock()` (L217-224) to match canonical physical-count contract
2. `src/components/inventory/StockAuditPanel.jsx` — update caller (L80-85) to pass `unit` and `physicalQty` like the sub-recipe branch

**Estimated scope:** ~15 lines across 2 files

**Planning skip eligible?**
- ≤10 lines? NO (~15 lines)
- 1 file? NO (2 files)
- **NOT ELIGIBLE for planning skip → recommend DIRECT_BUG_FIX with owner approval (simple mirroring of existing sub-recipe pattern)**

**Recommended fix approach:** Mirror the sub-recipe branch pattern:

StockAuditPanel.jsx L80-85 should become:
```js
await inventoryService.addStock(itemId, {
  quantity: 0,
  unit: item.displayUnit || item.unit || '',
  physicalQty: Number(entry.qty),
  reason: reasonLabel || 'Physical stock count',
});
```

inventoryTransform.toAPI.addStock() L217-224 should become:
```js
addStock(data) {
  const hasRecount = data.physicalQty != null;
  return {
    quantity: data.quantity ?? 0,
    unit: data.unit || '',
    ...(hasRecount ? { physicalqty_master: true, physical_qty: data.physicalQty } : {}),
    ...(hasRecount && data.reason ? { waste_reason: data.reason } : {}),
    wastage_reason_id: data.wastageReasonId || null,
    notes: data.notes || '',
  };
},
```

---

## 8. Retroactive Candidates

NONE — Stock Audit (CR-079) is already registered and implemented.

---

## Handover

```
Root cause: FE_BUG — toAPI.addStock() missing 4/5 required fields (unit, physicalqty_master,
  physical_qty, waste_reason) + quantity carries shelf count instead of 0.
Confidence: HIGH. Steps: 4/10.
FE fix: YES — 2 files, ~15 lines. Pattern already exists in sub-recipe path.
Backend ask: NO.
Planning skip eligible: NO (2 files, >10 lines) — but recommend DIRECT_BUG_FIX with owner
  approval since fix is a direct mirror of existing working sub-recipe pattern.
Escalated from Bug Fix: NO (fresh investigation).
Retroactive candidates: NONE.
Investigation report at memory/BUG-AUDIT-422_INVESTIGATION_REPORT.md
```
