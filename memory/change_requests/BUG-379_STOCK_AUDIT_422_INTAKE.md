# BUG-379: Stock Audit save fails with 422 — "The unit field is required"

## Metadata
- **ID:** BUG-379
- **Type:** BUG
- **Severity:** P1 — HIGH (Stock Audit save 100% broken, no workaround)
- **Risk:** MEDIUM (2 files, ~15 lines, fix pattern exists in sub-recipe branch)
- **Area:** Inventory > Stock Audit
- **Sprint:** pos_pms_1
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (owner-reproduced + agent code-traced)
- **Related:** BUG-321 (sub-recipe branch fix — same files, different branch)
- **Parent:** CR-072 (Inventory Management)
- **Duplicate check:** DISTINCT (Related: BUG-321)
- **Code reality:** PARTIAL (code exists but payload is broken)
- **FAST LANE eligible:** YES (MEDIUM risk, owner approval needed)

## Description
Stock Audit page (`/inventory-audit`) → user enters Physical Qty for any ingredient → clicks "Save Adjustments" → POST `/api/v2/vendoremployee/inventory/add-stock/{id}` returns **422 Unprocessable Content** with message **"The unit field is required."**

Every save attempt fails. The feature is completely non-functional for regular ingredients. Sub-recipe stock (different branch) works correctly.

## Root Cause (from Investigation Report)
`inventoryTransform.toAPI.addStock()` (L217-224) builds an incomplete payload. **5 discrepancies** vs the backend's required contract:

| # | Field | Current | Required | Impact |
|---|-------|---------|----------|--------|
| D1 | `unit` | MISSING | `item.displayUnit \|\| item.unit` | **422 BLOCKER** |
| D2 | `physicalqty_master` | MISSING | `true` | Backend doesn't flag as physical count |
| D3 | `physical_qty` | MISSING | `Number(entry.qty)` (shelf count) | Backend can't set inventory |
| D4 | `quantity` | shelf count | `0` (count-only) | Double-count risk |
| D5 | `waste_reason` | MISSING | reason label | Audit trail incomplete |

The sub-recipe branch (`StockAuditPanel.jsx:69-73` + `addSubRecipeStock`) correctly sends all required fields. The regular ingredient branch never got the same treatment.

## Evidence
- **Screenshot:** Owner-provided — 422 in Network tab on `POST add-stock/16950`
- **Owner doc:** Canonical payload specification with curl examples
- **Steps to reproduce:**
  1. Login → navigate to Inventory > Stock Audit
  2. Enter any Physical Qty for a regular ingredient (not sub-recipe)
  3. Click "Save Adjustments"
  4. Observe 422 toast error "The unit field is required"
- **Investigation report:** `/app/memory/BUG-AUDIT-422_INVESTIGATION_REPORT.md`
- **Evidence folder:** `/app/memory/evidence/BUG-AUDIT-422/`

## Blast Radius
- **Scope:** SMALL (2 files)
- **Files to fix:**
  - `src/api/transforms/inventoryTransform.js` — `toAPI.addStock()` (L217-224)
  - `src/components/inventory/StockAuditPanel.jsx` — regular ingredient call (L80-85)
- **Files NOT touched:**
  - `src/api/services/inventoryService.js` — pass-through, unchanged
  - Sub-recipe branch (L69-73) — already correct
- **Hotspot files:** NO
- **Lines:** ~15

## Recommended Fix
Mirror the sub-recipe branch pattern:

**StockAuditPanel.jsx L80-85:**
```js
await inventoryService.addStock(itemId, {
  quantity: 0,                                    // count-only
  unit: item.displayUnit || item.unit || '',      // ← D1 fix
  physicalQty: Number(entry.qty),                 // ← D3 fix (shelf count)
  reason: reasonLabel || 'Physical stock count',  // ← D5 fix
});
```

**inventoryTransform.toAPI.addStock() L217-224:**
```js
addStock(data) {
  const hasRecount = data.physicalQty != null;
  return {
    quantity: data.quantity ?? 0,
    unit: data.unit || '',                                               // ← D1 fix
    ...(hasRecount ? { physicalqty_master: true, physical_qty: data.physicalQty } : {}), // ← D2+D3 fix
    ...(hasRecount && data.reason ? { waste_reason: data.reason } : {}), // ← D5 fix
    wastage_reason_id: data.wastageReasonId || null,
    notes: data.notes || '',
  };
},
```

## Open Questions
None — root cause confirmed, fix pattern exists, owner-documented canonical contract available.
