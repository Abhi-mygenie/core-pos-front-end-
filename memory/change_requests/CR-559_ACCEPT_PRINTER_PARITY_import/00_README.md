# CR-554 / INV-ACCEPT-PRINTER — Handoff (Investigation → Impact Analysis)

**Purpose:** Let an agent on another branch resume from the **INVESTIGATION role** and carry the
item forward. This package covers the trail **up to and including the Impact Analysis (Gate 2)**.
It deliberately **does NOT include the Implementation Plan (Gate 3)** — that is the next agent's
first deliverable.

**Item:** CR-554 — Web/Scan Accept: `printer_agent` payload parity with Place/Update Order
**Risk:** CRITICAL (printing / order flow) · **Priority:** P1
**Where it stands:** Investigated, backend contract confirmed (Option A), Impact Analysis done.
**Next agent starts at:** Gate 3 — Implementation Plan.

---

## One-paragraph brief
Accepting a web/scan "Awaiting Confirmation" order never forwarded printer details, unlike Place and
Update Order, so kitchen/bill printer-agent routing didn't fire on Accept. Investigation traced the
break point to the status-only confirm payload (`toAPI.updateOrderStatus`) that never built or sent
`printer_agent`, and raised a contract question to the backend. Backend approved **Option A (payload
parity)**: the confirm endpoint (`waiter-dinein-order-status-update`) now accepts `printer_agent`,
built **for web orders only** with the same selectors as Place Order
(`selectAgentsForKot(printerAgents, cartStationsToSet(confirmItems))` + `selectAgentsForBill`), using
only food_status-7 items on a web edit (all items on a new web order), with `print_kot` decided by the
backend (not sent) and no post-accept `printOrder` (no double print). The Impact Analysis also records
a second root cause surfaced during tracing: `OrderContext.orderItemsByTableId` drops `isWebOrder`,
which would make a web-only gate fail for table-rendered web orders.

## Read in this order
1. `01_INTAKE.md` — what/why, classification, duplicate check, owner decisions (locked by backend).
2. `02_INVESTIGATION.md` — hypotheses, data-flow trace, root cause, recommendations.
3. `03_BACKEND_BRIEF.md` — the contract question raised to backend.
4. `04_BACKEND_REPLY_OptionA.md` — backend's approved answer (proof).
5. `05_IMPACT_ANALYSIS.md` — Gate 2: blast radius, downstream consumers, risk register, locked ODs.
6. `evidence/code_trace.md` — line-level proof of the break point vs Place/Update.
7. `evidence/live_probe_1578881.md` — captured PUT payload (included as proof the Option-A shape works).

## Target files identified (for the Gate-3 plan to confirm)
- `frontend/src/pages/DashboardPage.jsx` — `handleConfirmOrder` (build printer_agent, web only) + imports.
- `frontend/src/api/services/orderService.js` — `confirmOrder` (add `printer_agent` when non-empty).
- `frontend/src/contexts/OrderContext.jsx` — `orderItemsByTableId` must carry `isWebOrder`.

## Scope guard (do NOT touch)
`toAPI.updateOrderStatus` (shared with ready/serve/cancel), aggregator accept path, manual KOT button
(CR-545/547), Place/Update payload builders.

## Owner decisions — all LOCKED by backend reply
OD-1 Option A (payload parity); OD-2 new web order = all items, web edit = food_status-7 items only;
OD-3 append BILL agent unconditionally (CR-130 parity).

## Next agent's job
Write the Gate-3 Implementation Plan (exact edits + verification matrix + scope lock) from
`05_IMPACT_ANALYSIS.md`, get Gate-4 GO, then implement.
