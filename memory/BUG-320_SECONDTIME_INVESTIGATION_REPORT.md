# BUG-320 Follow-up — Investigation: `physical_qty` Second-Call Behaviour & Add-vs-Set Semantics

**Date:** 2026-08-13
**Role:** INVESTIGATION AGENT (Role 6)
**Trigger:** Owner question — "we are sending physical_qty everytime if the new quantity is low from current — but what if its second time we are adding stocks which is less than current quantity?"
**Steps used:** 7/10
**Method:** Curl-only probing against preprod. NO code changes.
**Evidence:** `/app/memory/evidence/BUG-320-secondtime/probe_results.json`

---

## 1. Summary

**Root cause of the "second time" issue:**
Backend `add-sub-recipe-stock` endpoint runs in **ADD/produce mode** — it always adds `quantity` to current stock. The `physical_qty` field, when present, triggers a **recount** (writes a wastage row for the difference between current stock and `physical_qty`, then credits production). Every subsequent call that includes `physical_qty` writes another wastage row, even when the user intends a simple produce operation.

**Classification:** DATA_ISSUE + FE_DESIGN_GAP
**Confidence:** HIGH (all confirmed by curl probes — no inference)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Backend is ADD mode (quantity always added to current) | Probe P2: qty=10, current=900 | **CONFIRMED** stock→910 | probe_results.json P2 |
| H2 | Backend stays ADD even when qty < current (negative UI drift) | Probe P4+P5: qty=5, current=910 | **CONFIRMED** stock→915→920 | probe_results.json P4,P5 |
| H3 | `physical_qty` triggers recount + wastage row | Probe P6: physical_qty=5, qty=5, current=920 | **CONFIRMED** wastage=915 written, stock→10 | probe_results.json P6 |
| H4 | Second call with same `physical_qty` writes another wastage row | Probe P7: same payload, current=10 | **CONFIRMED** wastage=5 written, stock stays 10 | probe_results.json P7 |

---

## 3. Curl Probe Results (verbatim)

### P2 — Produce-only, qty=10, no physical_qty
```
Stock before : 900.00 gm
Payload      : { sub_recipe_id: 235, quantity: 10, unit: "gm" }
Stock after  : 910.00 gm   ← backend ADDED 10
```

### P4 — qty=5, no physical_qty, qty < current (1st call — current FE behaviour)
```
Stock before : 910.00 gm
Payload      : { sub_recipe_id: 235, quantity: 5, unit: "gm" }
Stock after  : 915.00 gm   ← still ADDS. UI shows drift=-905, but backend ignores that.
```

### P5 — qty=5, no physical_qty (2nd call — "second time" question, no physical_qty)
```
Stock before : 915.00 gm
Payload      : { sub_recipe_id: 235, quantity: 5, unit: "gm" }
Stock after  : 920.00 gm   ← adds again. Each call +5, stock keeps rising.
```

### P6 — physical_qty=5, qty=5, current=920 (1st call — OLD FE behaviour before BUG-320 fix)
```
Stock before  : 920.00 gm
Payload       : { sub_recipe_id: 235, quantity: 5, unit: "gm", physical_qty: 5, waste_reason: "..." }
Backend logic : wastage = 920 - 5 = 915 gm → loss row written
               new FG   = physical_qty + quantity = 5 + 5 = 10 gm
Stock after   : 10.00 gm
```

### P7 — physical_qty=5, qty=5, current=10 (2nd call — THE SECOND TIME ANSWER)
```
Stock before  : 10.00 gm
Payload       : { sub_recipe_id: 235, quantity: 5, unit: "gm", physical_qty: 5, waste_reason: "..." }
Backend logic : wastage = 10 - 5 = 5 gm → ANOTHER loss row written  ← THE PROBLEM
               new FG   = 5 + 5 = 10 gm
Stock after   : 10.00 gm   (same value as before)

Net stock change : 0 gm  (user produced 5 but wastage ate it)
Audit trail      : CORRUPTED — spurious 5 gm loss written every subsequent call
```

---

## 4. Data Flow Trace

### Path A — Current FE (no physical_qty, post BUG-320 fix)
```
User enters qty=5 on panel (current=920)
  → getDrift() shows diff = 5-920 = -915  [UI only, negative]
  → UI requires wastage reason (misleading — no wastage will actually occur)
  → handleSaveAll() → addSubRecipeStock(235, { quantity:5, unit:"gm", reason:"..." })
  → inventoryTransform.addSubRecipeStock()
      payload = { sub_recipe_id:235, quantity:5, unit:"gm", waste_reason:"..." }
  → POST add-sub-recipe-stock
  → Backend: ADD mode — stock = 920 + 5 = 925
  → waste_reason sent but NO wastage row written (no physical_qty present)

PROBLEM: UI drift display and wastage reason requirement are MISLEADING.
         User thinks they are adjusting stock DOWN to 5, but stock goes UP to 925.
```

### Path B — Old FE (physical_qty = qty, pre BUG-320 fix)
```
User enters qty=5 on panel (current=920)
  → handleSaveAll() → addSubRecipeStock(235, { quantity:5, physicalQty:5, unit:"gm", reason:"..." })
  → inventoryTransform.addSubRecipeStock()
      payload = { sub_recipe_id:235, quantity:5, unit:"gm", physical_qty:5, waste_reason:"..." }
  → POST add-sub-recipe-stock
  → Backend: recount — wastage = 920-5 = 915 gm (loss row), new stock = 5+5 = 10

  SECOND CALL (current now 10):
  → same payload: physical_qty:5, quantity:5
  → Backend: recount — wastage = 10-5 = 5 gm (ANOTHER loss row — SPURIOUS)
                       new stock = 5+5 = 10 (unchanged)
  → Net: 0 production gain, 1 false wastage entry per call

BREAK POINT: physical_qty was always equal to quantity (never a real shelf count).
             Every call treated as a recount, every call wrote wastage.
```

---

## 5. Direct Answer to Owner's Question

> "what if its second time we are adding stocks which is less than current quantity?"

**If `physical_qty` is sent (old FE behavior):**
- 1st call (current=920, phys=5, qty=5): wastage=915 written ✓ (intended if this was a real shelf count)
- 2nd call (current=10, phys=5, qty=5): wastage=5 written ✗ (user just wants to produce 5 more, but backend writes loss for 5 and the net stock is still 10 — the production was cancelled out by the spurious wastage)
- 3rd, 4th... calls: same pattern — stock never increases, wastage keeps accumulating

**If `physical_qty` is NOT sent (current FE after BUG-320 fix):**
- 1st call (current=920, qty=5): stock→925 ✓ (produces 5, correct backend behavior)
- 2nd call (current=925, qty=5): stock→930 ✓ (produces 5 again, correct)
- Stock correctly grows with each produce operation
- BUT: UI drift is misleading (shows -920 drift, requires wastage reason, none is written)

---

## 6. Two Distinct Problems Identified

### Problem A — Semantic mismatch in current FE (UI says "adjust", backend says "add")
- **Where:** `SubRecipeStockPanel.jsx` UI logic
- **What:** `getDrift()` computes `entered_qty - current_qty` and labels it "drift". Negative drift requires wastage reason. But `entered_qty` is sent as `quantity` (produce amount) not a target stock level.
- **Effect:** User entering 5 when stock is 920 sees "−915 drift" and is forced to provide wastage reason, but backend just adds 5 → stock 925. No wastage is written. Both the UI feedback and the wastage reason UX are lies.
- **Confirmed by:** Probes P4 and P5 — stock went UP on every "negative drift" call.

### Problem B — Spurious wastage on second `physical_qty` call (OLD behaviour, now removed)
- **Where:** Pre-BUG-320 code in `inventoryTransform.addSubRecipeStock` + `SubRecipeStockPanel`
- **What:** `physicalQty` was set to `Number(entry.qty)` — always equal to the entered produce quantity. This meant every add-stock call was also a full recount. The second call (when current stock already equalled `physical_qty + previous_quantity`) wrote another wastage row for `current - physical_qty`.
- **Effect:** User trying to produce 5 gm when current is 10: wastage of 5 gm written, stock stays 10 — net zero production gain.
- **Confirmed by:** Probe P7 — stock stayed 10.00 after "producing" 5 gm.

---

## 7. Recommendations

### Problem A (current — semantic mismatch)
**Classification:** FE_DESIGN_GAP / MEDIUM risk
**Root cause:** The "New Qty" input is labelled and behaves like a target-stock field (drift, wastage reason requirement) but sends its value as a produce-quantity to the backend.

**Two valid design choices — owner must decide:**
- **Option 1 (Produce-mode):** Remove drift display and wastage reason entirely from SubRecipeStockPanel. "New Qty" = "how much to produce this session". UI becomes: enter production amount → save → stock increases. Clean, matches backend semantics.
- **Option 2 (Adjustment-mode):** Keep drift/wastage UI but send `physical_qty = entered_qty` (reverting BUG-320 partial fix) AND send `quantity = 0`. "New Qty" = "what I count on the shelf". Produces a true recount without production credit. Needs owner decision on whether SubRecipeStockPanel should be a physical-count screen or a production screen.

**Current state is worst of both worlds**: UI implies adjustment, backend does production.

### Problem B (old — spurious wastage)
**Already removed by BUG-320 fix.** The fix was correct to remove `physicalQty`. The residual issue from Problem A (misleading UI) is separate from BUG-320 itself.

**Owner action needed:**
1. Decide: SubRecipeStockPanel = **produce screen** (Option 1) or **recount screen** (Option 2)?
2. Based on decision, plan either UI strip (Option 1, LOW risk, ~5 lines) or physical_qty semantic fix (Option 2, MEDIUM risk, design rework).

---

## 8. Evidence Artifacts
- Probe results (all 7 probes, raw numbers): `/app/memory/evidence/BUG-320-secondtime/probe_results.json`
- Endpoint: `POST https://preprod.mygenie.online/api/v2/vendoremployee/inventory/add-sub-recipe-stock`
- Tested account: owner@mantri.com (Owner role), restaurant: mantri, sub-recipe: churmura toe (recipe_id=235)

---

```
Root cause: CONFIRMED (HIGH confidence). Steps: 7/10.
FE fix needed: YES — design decision required (produce-mode vs recount-mode).
Backend ask: NO — backend behaviour is correct and well-documented.
Planning skip eligible: NO — owner decision needed before any code change (two valid design paths).
Retroactive candidates: NONE.
Investigation report: /app/memory/BUG-320_SECONDTIME_INVESTIGATION_REPORT.md
```
