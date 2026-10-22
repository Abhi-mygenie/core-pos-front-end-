# BUG-575 — Intake (Gate 1)
## Order card header click does not open order entry screen

**ID:** BUG-575 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P1 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Duplicate check:** DISTINCT
**Source:** OWNER-REPORTED (smoke test 2026-10-16)
**Fast Lane eligible:** YES — root cause confirmed, 1 targeted change

## Description
Clicking the ORDER CARD HEADER (top section with order number, amount, merge/shift/cancel icons) does not open the Order Entry screen. Only clicking the BODY (items area) opens the order. Expected: clicking anywhere on the card including the header should open the order.

## Code Reality: CONFIRMED ROOT CAUSE
`OrderCard.jsx:L453-468`:
- Root div (L456): `onClick={() => onEdit?.()}` — whole card is clickable ✅
- Header div (L468): **`onClick={(e) => e.stopPropagation()}`** ← blocks click from reaching root

The entire HEADER div stops propagation, which prevents the card-level `onEdit` from being called when clicking the header.

## Fix
Remove the blanket `stopPropagation` from the header div (L468). Keep individual `stopPropagation` on the action buttons INSIDE the header (merge, shift, cancel) so those still work correctly.

## Blast Radius: SMALL
- `OrderCard.jsx:L468` — targeted removal. Verify action buttons (merge/shift/cancel) have their own `stopPropagation` individually.

## Open Decisions: NONE
Root cause clear, fix clear.
