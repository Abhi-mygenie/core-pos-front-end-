# CR-130 — Impact Analysis (Gate 2)

**ID:** CR-130  
**Title:** Add BILL Printer to `printer_agent` Array in Place Order Payload  
**Date:** 2026-08-06  
**Role:** PLANNING AGENT (Gate 2 — Impact Analysis only)  
**Risk:** HIGH (R5 hotspot: `orderTransform.js`, order placement path)  
**Code Reality:** FULL — BILL exclusion is explicitly coded. This CR is a targeted policy reversal of R-OWNER-7/8/9 for the place-order path only.

---

## Conflict Pre-Check

| File | Last Modified By | Risk |
|---|---|---|
| `api/transforms/orderTransform.js` | BUG-298/299 (expandCompItems, L995/L1228) | LOW — no active modifier, last change was comp-item expansion. Target lines L1012-1014 and L1274-1276 are untouched since POS2-003 (May-2026). |
| `api/transforms/printerAgentSelector.js` | CR-POS2-003 (May-2026) | LOW — no changes needed (selectAgentsForBill() already exists and is correct). Read-only for this CR. |

**No active conflicts.** Safe to proceed.

---

## Data Flow Trace

```
profileTransform.js:302-304
  fromAPI.printerAgents(apiArray)
  → maps raw print_agent[] → normalizePrinterAgent() → filters null
  → produces printerAgents[] with { station, printer_agent_id, printer_ip, ... }
  → stored on restaurant.printerAgents (includes BILL entry when configured)

OrderEntry.jsx:55
  const { printerAgents } = useRestaurant()
  → passed into placeOrder / placeOrderWithPayment options as printerAgents: printerAgents || []

orderTransform.js — Path 1: placeOrder (Flow 1, dine-in unpaid)
  L992: options.printerAgents → printerAgents
  L1012-1014: printerAgentForPlace = printAllKOT
    ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))  ← BILL excluded here
    : []
  L1074: printer_agent: printerAgentForPlace                               ← BILL never in payload today

orderTransform.js — Path 2: placeOrderWithPayment (Flow 3, QSR/prepaid)
  L1223: options.printerAgents → printerAgents; options.autoBill → autoBill
  L1274-1276: printerAgentForPlace = printAllKOT
    ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))  ← BILL excluded here
    : []
  L1324: billing_auto_bill_print: autoBill ? 'Yes' : 'No'
  L1400: printer_agent: printerAgentForPlace                               ← BILL never in payload today

printerAgentSelector.js:71-74
  selectAgentsForBill(printerAgents)
  → filters where station matches 'BILL' (case-insensitive)
  → already implemented, already tested (printerAgentSelector.test.js L95-122)
  → returns [] when no BILL agent configured (safe default)
  ← READY TO USE — no changes needed to this file
```

**Break point today:** `selectAgentsForKot` explicitly excludes BILL (L88-90 in selector). This is the only line preventing BILL from appearing. The fix is to concatenate `selectAgentsForBill()` output alongside the KOT result.

---

## Affected Files

### Files WILL Change: 1 file

| File | Hotspot? | Change Type | Lines Affected |
|---|---|---|---|
| `api/transforms/orderTransform.js` | **YES — R5** | MODIFY — 3 edits: import + 2 place-order paths | L4 (import), L1012-1014 (placeOrder), L1274-1276 (placeOrderWithPayment) |

### Files will NOT Touch

| File | Reason |
|---|---|
| `api/transforms/printerAgentSelector.js` | `selectAgentsForBill()` already exists and correct. No changes. |
| `api/transforms/printerAgentSelector.test.js` | `selectAgentsForBill` already fully tested (7 test cases). No new tests needed for selector itself. |
| `components/order-entry/OrderEntry.jsx` | `printerAgents` already passed into both `placeOrder` + `placeOrderWithPayment` options correctly. No changes. |
| `components/order-entry/CollectPaymentPanel.jsx` | Scope: place-order only per OD-2 (owner confirmed). |
| Cancel/update paths | Scope: place-order only per OD-2. `cancelItem`, `cancelOrder`, `updateOrder` in `orderTransform.js` unchanged. |

---

## Owner Decisions — ALL RESOLVED ✅

| # | Question | Status | Analysis |
|---|---|---|---|
| **OD-1** | Apply to both dine-in (`placeOrder`) AND QSR (`placeOrderWithPayment`)? | **RESOLVED → YES** | Owner said "NEED To pass in place order payload" without restricting to one path. Both are "place order" operations. Both use `printer_agent`. |
| **OD-2** | Place order only, or also cancel/update? | **RESOLVED → place order only** | Owner verbatim: "NOTE: NEED To pass in place order payload". Cancel/update paths unchanged. |
| **OD-3** | Always include BILL, or only when `billing_auto_bill_print === 'Yes'`? | **RESOLVED → Option A: Always** | Owner confirmed 2026-08-06. Always append BILL agent unconditionally to both place-order paths. Backend's `billing_auto_bill_print` field already gates actual printing. FE passes agent info; backend decides whether to print. |

### OD-3 — LOCKED: Option A (Always) — Owner confirmed 2026-08-06

BILL agent is appended unconditionally to both place-order paths.
- `placeOrder` (dine-in unpaid): always include BILL
- `placeOrderWithPayment` (QSR/prepaid): always include BILL
- Rationale: Backend gates actual printing via `billing_auto_bill_print: Yes/No`. FE role is to pass the agent; backend decides whether to print.
- `selectAgentsForBill()` returns `[]` when no BILL agent is configured — safe no-op.

---

## Exact Edits (pending OD-3 answer)

### Edit 1 — `orderTransform.js` L4: Add `selectAgentsForBill` to import

```js
// CURRENT:
import { selectAgentsForKot, cartStationsToSet } from './printerAgentSelector';

// NEW:
import { selectAgentsForKot, selectAgentsForBill, cartStationsToSet } from './printerAgentSelector';
```

### Edit 2 — `orderTransform.js` L1012-1014: `placeOrder` (dine-in unpaid)

```js
// CURRENT:
// R-OWNER-9 / R-OWNER-10. BILL is excluded by selectAgentsForKot.
const printerAgentForPlace = printAllKOT
  ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
  : [];

// NEW — OD-3 LOCKED Option A (Always):
// CR-130: append BILL agent alongside KOT agents. selectAgentsForBill returns []
// when no BILL agent is configured — safe no-op when absent.
const printerAgentForKot = printAllKOT
  ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
  : [];
const printerAgentForPlace = [...printerAgentForKot, ...selectAgentsForBill(printerAgents)]; // CR-130
```

### Edit 3 — `orderTransform.js` L1274-1276: `placeOrderWithPayment` (QSR/prepaid)

```js
// CURRENT:
// R-OWNER-9 / R-OWNER-10. BILL is excluded by selectAgentsForKot.
const printerAgentForPlace = printAllKOT
  ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
  : [];

// NEW — OD-3 LOCKED Option A (Always):
// CR-130: append BILL agent unconditionally. autoBill gating handled by billing_auto_bill_print field.
const printerAgentForKot = printAllKOT
  ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
  : [];
const printerAgentForPlace = [...printerAgentForKot, ...selectAgentsForBill(printerAgents)]; // CR-130
```

---

## Verification Matrix (seeds QA handover)

| Edit # | File | Change | How to Verify |
|--------|------|--------|---------------|
| 1 | `orderTransform.js:4` | `selectAgentsForBill` added to import | `grep selectAgentsForBill src/api/transforms/orderTransform.js` → 1+ hits |
| 2 | `orderTransform.js:~1012` | `placeOrder` payload includes BILL agent | Network tab → POST /place-order → `printer_agent` array includes `{ station: "BILL", ... }` |
| 3 | `orderTransform.js:~1274` | `placeOrderWithPayment` payload includes BILL agent | Network tab → QSR place+pay → same check |
| R1 | Regression | KOT agents still present alongside BILL | Both BAR/KITCHEN and BILL present in payload |
| R2 | Regression | No BILL when printerAgents has no BILL entry | Restaurant without BILL configured → `printer_agent` unchanged (no BILL row) |
| R3 | Regression | Cancel-item/cancel-order/update-order payloads UNCHANGED | `printer_agent` on cancel/update still excludes BILL |
| R4 | Regression | `selectAgentsForBill([])` returns `[]` | Safeguard — empty printerAgents → no crash |

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | OD-3 answered incorrectly — backend prints unexpectedly | LOW | MEDIUM | Backend gates on `billing_auto_bill_print`. FE passing BILL in array ≠ forcing print. |
| R2 | BILL agent duplicated if printerAgents has 2 BILL entries | LOW | LOW | `selectAgentsForBill` preserves API order + returns all matching. If backend de-dupes, no issue. If not, surface to owner. |
| R3 | Regression on warn block (L1079, L1412) — fires less often | LOW | LOW | Warn only fires when KOT agents empty AND printerAgents configured. BILL being present doesn't affect this logic. Monitor console. |
| R4 | `orderTransform.js` is R5 — high complexity | MEDIUM | HIGH | Edits are surgical (3 lines each, isolated to printerAgentForPlace). Other lines untouched. |

---

## Post-Code Registry Checklist (for Implementation Agent)

```
- [ ] registry.json: CR-130 → status: IMPLEMENTED, sprint_key: pos_5_1, gate: 5
- [ ] CR_REGISTRY.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add `api/transforms/orderTransform.js` under CR-130 section
- [ ] Code markers: // CR-130 in every modified section of orderTransform.js
- [ ] Compile: webpack 0 new warnings
```

---

## Summary

- **Code Reality:** FULL — BILL exclusion is intentional, explicit, and cleanly reversible via `selectAgentsForBill()` which already exists.
- **Scope:** 3 edits in 1 file (`orderTransform.js`). Import + 2 place-order paths.
- **Files WILL change:** `api/transforms/orderTransform.js` only.
- **Blocker:** OD-3 must be answered before Gate 3 can be written.
- **Recommendation:** Option A (Always) — passes BILL agent unconditionally; backend's `billing_auto_bill_print` field already gates actual print execution.
