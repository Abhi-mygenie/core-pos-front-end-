# BACKEND_BRIEF_INV-ACCEPT-PRINTER_2026-11-19

## Summary
- Issue: Web/scan "Accept" (Yet-To-Confirm) commits via the status-update route and sends no `printer_agent`/`print_kot`, so KOT/BILL printer-agent routing that place-order/update-order rely on does not fire on accept.
- Classification: CONTRACT_MISMATCH (FE omits the field; need to know if the endpoint would honor it)
- Frontend impact: Accepting a web/scan order prints nothing to configured printer agents, unlike Place/Update order.
- Priority/Risk: P1 + CRITICAL (printing / order flow)

## Endpoint
- Method: PUT
- URL: `/api/v2/vendoremployee/order/waiter-dinein-order-status-update` (constants.js: CONFIRM_ORDER)
- Auth/context: Bearer *** (masked), role_name from permissions[0]

## Reproduction
1. Web/scan customer places a Dine-In order → appears as "New Web Order — Awaiting Confirmation".
2. Staff clicks **Accept**.
3. FE sends PUT with body `{ order_id, role_name, order_status }` only — no `printer_agent`, no `print_kot`.

## Payload / Response
- Current Accept payload: `{ order_id, role_name, order_status }`
- Place-order payload (reference, same backend family): includes `print_kot` + `printer_agent: [...]`
- Question for backend: Does `waiter-dinein-order-status-update` **accept and act on** `printer_agent` + `print_kot` (trigger KOT/BILL to those agents), or must printing be triggered via a separate print endpoint after confirm (as aggregator does with `manuallyPrintAggregator` / `aggr_kot`,`aggr_bill`)?

## Evidence
- Code trace: /app/memory/evidence/INV-ACCEPT-PRINTER-2026_11_19/code_trace.md

## Frontend Workaround
- Available: YES — after a successful confirm, FE can call the existing `printOrder(orderId,'kot'/'bill',..., printerAgents)` path (already used by the pop-up's manual KOT button) rather than extending the confirm payload. Owner decision OD-1 in the investigation report.
