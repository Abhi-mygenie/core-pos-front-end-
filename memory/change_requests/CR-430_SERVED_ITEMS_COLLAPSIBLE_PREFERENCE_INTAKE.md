# CR-430 — Intake (Gate 1)
## Served items collapsible with restaurant-level default preference

**ID:** CR-430 · **Type:** CR · **Date:** 2026-10-16
**Severity:** P2 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Duplicate check:** RELATED to BUG-293 (auto-expand on all-served). CR-430 extends this — DISTINCT.
**Source:** OWNER-REPORTED (smoke test 2026-10-16)

## Description
When all items in an order are served, the "Served" section auto-expands (BUG-293 fix). This takes significant vertical space on the order card. Owner wants: (1) served items to be compact/collapsed by default, and (2) a restaurant-level preference to control the default behavior.

## Code Reality: PARTIAL
`OrderCard.jsx:L70-88` — `showServed` state + BUG-293 auto-expand when `_allServed=true`. No restaurant-level setting. No persistence.

## Blast Radius: SMALL
- `OrderCard.jsx` — change auto-expand logic
- Restaurant Settings — add a toggle for default served section behavior
- `profileTransform.js` — new setting field

## Open Decisions
**OD-430-01:** Default behavior — should served items collapse by default, or remain auto-expanded? Can restaurant settings override?
**OD-430-02:** Scope — only for order view, or also table view?
