# CR-130 — Add BILL Printer to printer_agent Array in Place Order Payload

**ID:** CR-130  
**Type:** CR  
**Priority:** P1 — HIGH  
**Risk:** HIGH (order placement, printing, R5 hotspot: `orderTransform.js` + `printerAgentSelector.js`)  
**Status:** INTAKE  
**Gate:** 1  
**Sprint:** pos_5_1  
**Registered:** 2026-08-05  
**Source:** OWNER-REPORTED  

---

## Description

Currently, `printer_agent` in the Place Order payload contains **only food-station printers** (e.g., BAR, KITCHEN, KDS) for KOT printing. The BILL printer is intentionally excluded (per historical owner rules `R-OWNER-7`, `R-OWNER-8`, `R-OWNER-9`).

**New requirement:** Also include the BILL printer as an additional object with `station: "BILL"` in the same `printer_agent` array when placing an order.

### Old payload structure:
```json
"printer_agent": [
  { "station": "BAR", "printer_agent_id": "2819", ... }
]
```

### New payload structure:
```json
"printer_agent": [
  { "station": "BAR", "printer_agent_id": "2819", "printer_ip": null, ... },
  { "station": "BILL", "printer_agent_id": "2819", "printer_ip": "60:6E:41:45:6F:EF", ... }
]
```

**Scope:** Place Order payload ONLY (not cancel-item, cancel-order, update-order).

## Evidence
- Old payload: provided verbatim by owner (restaurant_id 618)
- New payload: provided verbatim by owner
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (owner provided exact before/after payloads)

## Area
Order Entry → Place Order → `orderTransform.js` + `printerAgentSelector.js`

## Code Reality Check
- `printerAgentSelector.js` L13: `R-OWNER-7: BILL agent only for bill print (case-insensitive match on 'BILL')`
- `printerAgentSelector.js` L76-78: `selectAgentsForKot()` — **intentionally excludes BILL** (R-OWNER-8/9)
- `orderTransform.js` L990-1053: `printerAgentForPlace = selectAgentsForKot(...)` → BILL excluded
- **Code Reality: FULL — BILL exclusion is explicitly coded. This CR reverses R-OWNER-7/8/9 for Place Order.**
- `selectAgentsForBill()` already exists at `printerAgentSelector.js:73` — can be used to fetch BILL agent.

## Duplicate Check
- DISTINCT — no prior CR for BILL printer in place-order printer_agent
- RELATED: POS2-003 (original printer_agent feature), POS2-003-REOPEN-A (cancel-item/order printer_agent)

## Blast Radius
- `printerAgentSelector.js` — new export or parameter
- `orderTransform.js` — 2 place-order paths (dine-in ~L991, QSR ~L1253)
- ~2 files, SMALL-MEDIUM blast radius
- Hotspot files: YES (`orderTransform.js` is R5)

## Owner Decision Required
- OD-1: Apply to both dine-in place-order AND QSR place-order paths? (assumed YES)
- OD-2: Apply to `update-order` / `cancel-item` / `cancel-order` too, or ONLY place-order? (owner said "NOTE: NEED To pass in place order payload" → place order only for now)
- OD-3: Always append BILL printer, or only when `billing_auto_bill_print === 'Yes'`?

## Risk Classification
- **Risk: HIGH**
- Trigger: Order flow, printing, R5 hotspot files
- Fast Lane eligible: NO (hotspot + multi-path)

## Next Step
PLANNING (Gate 2 Impact Analysis) — trace both place-order paths, confirm `selectAgentsForBill()` is sufficient, get OD-1/2/3 answers.
