# CR-482 — Keyboard navigation — select items and process orders without a mouse

**ID:** CR-482  **Type:** CR  **Registered:** 2026-11-04  **Sprint:** nov_cr_batch
**Severity:** P1 (owner: "all p1")  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE — ODs OPEN (owner to discuss scope)
**Area:** Menu / Order Entry
**Source:** OWNER-REPORTED (chat, 2026-11-04)  **Related:** —

## Description
Cashier must be able to search/select menu items, set quantity, place the order and collect payment using only the keyboard.

## Expected Behaviour
Full order cycle (search item → add → qty → place order → collect bill → pay) operable from keyboard with defined shortcuts and visible focus.

## Evidence
- Screenshot: not provided
- Steps to reproduce: n/a (feature request)
- Curl output: not applicable at intake
- Source: OWNER-REPORTED
- Confidence: REPORTED

## Duplicate Check
DISTINCT

## Code Reality
NONE — only an Enter handler on the dynamic-price input (OrderEntry.jsx ~L2765). No global shortcut layer.

## Risk
- Risk: HIGH
- Reason: Order flow; OrderEntry.jsx + CollectPaymentPanel.jsx are R5 hotspots
- Fast Lane eligible: NO

## Blast Radius
LARGE (OrderEntry, CategoryPanel, product grid, CartPanel, CollectPaymentPanel; 2 hotspots)

## Open Owner Decisions
- OD-482-01 Scope: Order Entry only, or also Dashboard (table/order selection)? — OPEN (owner: "will discuss")
- OD-482-02 Key map (e.g. F2 search, Enter add, +/- qty, F8 place order, F9 pay) — OPEN
- OD-482-03 Shortcuts must not fire while typing in inputs — agent recommendation, to confirm

## Next
Planning Gate 2 (Impact Analysis) once ODs are answered.

## Owner (2026-11-05): all CR-482 questions deferred — "will discuss later".

## (2026-11-05) Intake kept OPEN — owner to discuss scope/keys.
