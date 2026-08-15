# BUG-321 — Intake: Sub-Recipe Stock — Wrong Produce/Recount Semantics

**ID:** BUG-321 (working name: BUG-SRSTOCK)  
**Date:** 2026-08-14  
**Source:** AGENT-DISCOVERED (14aug branch — impact analysis + implementation plan already exist)  
**Confidence:** CONFIRMED (6 curl probes on preprod)  
**Duplicate check:** DISTINCT  
  - BUG-308 (IMPL): wrong endpoint fix — different issue  
  - BUG-320 (IMPL): physical_qty extra key removed — different issue  
  - CR-139 (IMPL): dedicated tab created — different issue  

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1 — HIGH** (every sub-recipe stock save is semantically wrong; UI shows false drift, stock keeps going up) |
| Risk | **MEDIUM** (component state + API contract, non-financial, no hotspot files) |
| Fast Lane eligible | NO — full gate cycle (SubRecipeStockPanel rewrite needed) |

---

## Two Issues (single fix batch)

### Issue A — SubRecipeStockPanel: Produce vs Recount (Active, P1)

The panel shows "New Qty" with drift = `entered − current` and requires a wastage reason for negative drift.  
But the API treats `quantity` as **ADD** not **SET**:
- User enters 50 when stock = 900 → sees "−850 drift" → forced to enter wastage reason
- Backend: 900 + 50 = 950 (stock went UP, not down to 50)
- Wastage reason is sent but **no wastage row written** (no `physical_qty` in payload)

**Result:** Every save increases stock by the entered amount regardless of drift direction. The UI is a lie.

### Issue B — StockAuditPanel sub-recipe branch: Dormant spurious wastage (Latent, activates with transform fix)

`StockAuditPanel.jsx:71` passes `physicalQty: Number(entry.qty)` on every sub-recipe save. Once the transform is fixed to conditionally include `physical_qty`, this call becomes:  
`quantity=shelf, physical_qty=shelf` → wastage = current − shelf written each time, then stock = shelf + shelf

Confirmed by probe P7: stock lands at same value but a **false wastage row** is written each time.

---

## Evidence

- **Curl probes:** `/app/memory/evidence/BUG-320-secondtime/probe_results.json`  
  6 probes confirm: `quantity` = ADD mode; `physical_qty` triggers recount; `physical_qty: 0` = dangerous large loss
- **Impact Analysis:** `/app/memory/BUG-SRSTOCK_IMPACT_ANALYSIS.md` (Gate 2, COMPLETE)  
- **Implementation Plan:** `/app/memory/BUG-SRSTOCK_IMPLEMENTATION_PLAN.md` (Gate 3, COMPLETE)

---

## Fix Scope (from Implementation Plan)

3 files, execution order:
1. `inventoryTransform.js` — conditional `physical_qty` in `addSubRecipeStock` (mode-aware)
2. `StockAuditPanel.jsx` — sub-recipe branch: `quantity:0, physicalQty:shelf` (not `physicalQty=qty`)
3. `SubRecipeStockPanel.jsx` — mode toggle (Produce / Recount), two table layouts, correct payload per mode

---

## Gate Status

| Gate | Status |
|---|---|
| 0 — ID | ✅ BUG-321 |
| 1 — Intake | ✅ This doc |
| 2 — Impact Analysis | ✅ `BUG-SRSTOCK_IMPACT_ANALYSIS.md` |
| 3 — Implementation Plan | ✅ `BUG-SRSTOCK_IMPLEMENTATION_PLAN.md` |
| 4 — GO | ⏳ Awaiting owner approval |
| 5a — Implementation | NOT STARTED |
