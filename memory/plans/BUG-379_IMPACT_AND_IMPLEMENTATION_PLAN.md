# BUG-379 Impact Analysis (Gate 2)

**Date:** 2026-09-03
**Role:** PLANNING
**Code Reality:** PARTIAL (code exists but payload is broken)
**Conflict Pre-Check:** NO ACTIVE CONFLICTS (both files last modified by BUG-321 on 2026-08-14, status IMPLEMENTED)

---

## 1. Root Cause Recap (from Investigation)

`toAPI.addStock()` at `inventoryTransform.js:217-224` builds an incomplete payload for the `POST /inventory/add-stock/{id}` endpoint. 5 fields are missing or incorrect vs the backend's required contract (owner-documented).

The sub-recipe branch (`addSubRecipeStock` at L230-241 + `StockAuditPanel.jsx:69-73`) correctly implements all required fields. The regular ingredient branch was never updated to match.

## 2. Data Flow

```
User enters Physical Qty in Stock Audit table
  → StockAuditPanel.jsx handleSaveAll() L80-85
    → inventoryService.addStock(itemId, data) L83-85
      → inventoryTransform.toAPI.addStock(data) L217-224
        → api.post(`/inventory/add-stock/${id}`, payload)
          → Backend 422: "The unit field is required."
```

**Break points:** Two sites — the caller (L80-85) doesn't pass enough data, and the transform (L217-224) doesn't build the required fields.

## 3. Affected Files

| File | Lines | Change Type | Risk |
|------|-------|-------------|------|
| `src/api/transforms/inventoryTransform.js` | L216-224 | MODIFY `toAPI.addStock()` body | LOW — isolated function, no other callers |
| `src/components/inventory/StockAuditPanel.jsx` | L80-85 | MODIFY caller data object | LOW — single call site, follows existing sub-recipe pattern |

## 4. Files NOT Touched

- `src/api/services/inventoryService.js` — pass-through only, no change needed
- `src/components/inventory/StockAuditPanel.jsx` L66-74 — sub-recipe branch (BUG-321, already correct)
- `src/api/transforms/inventoryTransform.js` L230-241 — `addSubRecipeStock` (already correct)
- All other inventory files

## 5. Downstream Consumers

| Consumer | Impact |
|----------|--------|
| `inventoryService.addStock()` L83-85 | Only caller of `toAPI.addStock()` — ONLY from StockAuditPanel regular-ingredient branch |
| Sub-recipe branch L69-73 | Uses `addSubRecipeStock()` — NOT affected |
| Other inventory pages (Purchase, Setup, Recipes) | Don't call `addStock()` — NOT affected |

## 6. Risk Classification

| Risk Factor | Assessment |
|-------------|------------|
| Files changed | 2 (SMALL) |
| Lines changed | ~15 (SMALL) |
| Hotspot files | NO |
| Financial/billing | NO (inventory count, not billing) |
| Auth/permission | NO |
| Existing working reference | YES (sub-recipe branch is identical pattern) |
| Backend contract documented | YES (owner's canonical payload MD) |

**Risk: MEDIUM** (confirmed from intake — no escalation)

## 7. Owner Decisions Needed

**NONE** — owner already provided the canonical backend contract. The fix mirrors the existing sub-recipe pattern. All 5 discrepancies are clear with no ambiguity.

## 8. Blockers

**NONE** — no conflicts, no missing data, no backend dependency, fix pattern exists.

**→ Proceeding to Gate 3: Implementation Plan.**

---

# BUG-379 Implementation Plan (Gate 3)

## 1. Scope Lock

**Files WILL change:**
- `src/api/transforms/inventoryTransform.js` (Edit 1)
- `src/components/inventory/StockAuditPanel.jsx` (Edit 2)

**Files will NOT touch:**
- `src/api/services/inventoryService.js`
- Sub-recipe branch (L66-74 in StockAuditPanel, L230-241 in inventoryTransform)
- All other inventory files
- App.js, Sidebar.jsx, any PMS files

## 2. Edits

### Edit 1 — `inventoryTransform.js` L216-224: Rebuild `toAPI.addStock()`

**Current (L216-224):**
```js
  // B4: add-stock/{id} — physical count / adjustment
  addStock(data) {
    return {
      quantity: data.quantity,
      reason: data.reason || '',
      wastage_reason_id: data.wastageReasonId || null,
      notes: data.notes || '',
    };
  },
```

**New:**
```js
  // B4 + BUG-379: add-stock/{id} — physical count (mirrors addSubRecipeStock pattern)
  // physicalqty_master + physical_qty included ONLY when data.physicalQty is explicitly passed
  // quantity = 0 for count-only (no purchase add). waste_reason for audit trail.
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

**Rationale per discrepancy:**
- D1: `unit: data.unit || ''` — fixes 422 blocker
- D2: `physicalqty_master: true` — flags physical count operation
- D3: `physical_qty: data.physicalQty` — sends shelf count
- D4: `quantity: data.quantity ?? 0` — caller sends `0`, not shelf count
- D5: `waste_reason: data.reason` — audit trail key

### Edit 2 — `StockAuditPanel.jsx` L80-85: Update caller data object

**Current (L80-85):**
```js
        } else {
          // Regular ingredient — correct endpoint
          await inventoryService.addStock(itemId, {
            quantity: Number(entry.qty),
            wastageReasonId: entry.reasonId || null,
            reason: reasonLabel,
          });
        }
```

**New:**
```js
        } else {
          // Regular ingredient — BUG-379: mirrors sub-recipe recount pattern
          await inventoryService.addStock(itemId, {
            quantity: 0,
            unit: item.displayUnit || item.unit || '',
            physicalQty: Number(entry.qty),
            wastageReasonId: entry.reasonId || null,
            reason: reasonLabel || 'Physical stock count',
          });
        }
```

**Changes per line:**
- `quantity: 0` — count-only, not purchase (D4)
- `unit: item.displayUnit || item.unit || ''` — from stock item data (D1)
- `physicalQty: Number(entry.qty)` — shelf count as physical_qty source (D3)
- `reason: reasonLabel || 'Physical stock count'` — fallback label (D5)

## 3. Execution Sequence

1. Edit 1: `inventoryTransform.js` — rebuild `toAPI.addStock()`
2. Compile check: `tail -3 /var/log/supervisor/frontend.out.log` → "Compiled successfully"
3. Edit 2: `StockAuditPanel.jsx` — update caller
4. Compile check: same
5. Self-test matrix (§4)
6. EXIT GATE (§5)
7. QA handover + session handover

## 4. Verification Matrix

| # | Edit | File | Check | How to Verify | Auto? |
|---|------|------|-------|---------------|:-----:|
| V1 | 1 | inventoryTransform.js | `unit` key present in addStock return | `grep 'unit:' inventoryTransform.js` in addStock block | YES |
| V2 | 1 | inventoryTransform.js | `physicalqty_master` conditional present | `grep 'physicalqty_master' inventoryTransform.js` | YES |
| V3 | 1 | inventoryTransform.js | `physical_qty` conditional present | `grep 'physical_qty' inventoryTransform.js` — count ≥2 (addStock + addSubRecipeStock) | YES |
| V4 | 1 | inventoryTransform.js | `waste_reason` conditional present | `grep 'waste_reason' inventoryTransform.js` — count ≥2 | YES |
| V5 | 1 | inventoryTransform.js | `quantity` defaults to 0 | `grep 'data.quantity ?? 0' inventoryTransform.js` | YES |
| V6 | 2 | StockAuditPanel.jsx | Caller sends `quantity: 0` | `grep 'quantity: 0' StockAuditPanel.jsx` — count ≥2 (sub-recipe + regular) | YES |
| V7 | 2 | StockAuditPanel.jsx | Caller sends `unit:` | `grep 'unit: item' StockAuditPanel.jsx` — count ≥2 | YES |
| V8 | 2 | StockAuditPanel.jsx | Caller sends `physicalQty:` | `grep 'physicalQty:' StockAuditPanel.jsx` — count ≥2 | YES |
| V9 | — | — | Compile check | webpack compiled successfully | YES |
| V10 | — | addSubRecipeStock | Sub-recipe transform unchanged | `grep -A10 'addSubRecipeStock' inventoryTransform.js` — lines 230-241 match baseline | YES |
| V11 | — | StockAuditPanel L69-73 | Sub-recipe branch unchanged | `grep -B1 -A4 'addSubRecipeStock' StockAuditPanel.jsx` — L69-73 match baseline | YES |
| V12 | — | Browser | Stock Audit page renders, table loads | Screenshot: /inventory-audit table visible | NO |
| V13 | — | Browser | Save → no 422, toast success | Enter Physical Qty, Save → toast "adjustment(s) saved" | NO |

**13 checks: 11 automated (grep + compile), 2 manual (browser).**

## 5. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-379 → status: IMPLEMENTED, gate: 5a
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: add BUG-379 entries for inventoryTransform.js + StockAuditPanel.jsx
- [ ] Code markers: // BUG-379 comment in both modified files
```

## 6. Risk Register

| # | Risk | Mitigation |
|---|------|------------|
| R1 | Backend rejects new payload fields | Owner-provided canonical contract; sub-recipe uses same pattern successfully |
| R2 | `physicalqty_master` not recognized by backend | Owner doc explicitly lists it; sub-recipe endpoint uses same pattern |
| R3 | Regression on sub-recipe branch | V10 + V11 verify sub-recipe code unchanged |
| R4 | `item.displayUnit` is empty for some items | Fallback chain: `item.displayUnit \|\| item.unit \|\| ''` — matches sub-recipe branch pattern |

---

*Plan ready. 2 edits across 2 files. 13-check verification matrix (11 auto / 2 manual). No owner decisions needed. No blockers. Awaiting Gate 4 GO.*
