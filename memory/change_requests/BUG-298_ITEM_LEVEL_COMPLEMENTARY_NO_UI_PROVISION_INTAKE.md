# BUG-298 — Item-Level Complementary: No UI Provision to Mark Only Selected Items

**ID:** BUG-298  
**Type:** BUG  
**Priority:** P1 — HIGH  
**Risk:** HIGH (order flow, discount/complementary logic, R5 hotspot: `OrderEntry.jsx`)  
**Status:** INTAKE  
**Gate:** 1  
**Sprint:** pos_5_1  
**Registered:** 2026-08-05  
**Source:** OWNER-REPORTED  

---

## Description

When a cart has 2+ items and only one needs to be marked as complementary (comp), there is no UI provision to do so. The cashier cannot selectively mark individual items as complementary — it is either all or none.

Owner example: 2 items in cart, only 1 should be complimentary. Currently no button/toggle per item to achieve this.

## Evidence
- Screenshot: not provided
- Steps to reproduce: Order Entry → add 2+ items → attempt to mark only 1 as complementary → no per-item comp button visible
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (owner reproduced)

## Area
Order Entry — cart item row controls

## Code Reality Check
- `OrderEntry.jsx:793` — `toggleItemComplementary()` function EXISTS: `{ ...item, isComplementaryRuntime: !item.isComplementaryRuntime }`
- `OrderEntry.jsx:1745` — comment: "Cashier-driven per-item marking; catalog-complimentary items locked"
- `OrderEntry.jsx:2209` — filters `isComplementaryRuntime === true` items
- **Code Reality: PARTIAL — the toggle function and state logic exist, but there is likely no visible UI button/trigger on the cart item row to invoke it.**
- **INVESTIGATION NEEDED** to confirm whether the button was removed/never built vs a display bug.

## Duplicate Check
- DISTINCT — per-item UI provision not previously registered
- RELATED: CR-058 (order-level Mark Order Complimentary — INTAKE), CR-104 (item-level complementary REASON field — BACKEND-BLOCKED)
- Note: CR-058 is ORDER-level (all items). This bug is about per-ITEM granularity.

## Blast Radius
- `OrderEntry.jsx` (R5 hotspot) — cart item row JSX
- ~1 file, SMALL blast radius
- Hotspot files: YES (`OrderEntry.jsx` is R5)

## Severity Rubric
P1 — Feature effectively broken (function exists but unreachable by cashier)

## Risk Classification
- **Risk: HIGH**
- Trigger: Order flow, discount semantics, R5 hotspot
- Fast Lane eligible: NO (hotspot)

## Open Questions
- OQ-1: Was the per-item comp button intentionally removed at some point? Check git history.
- OQ-2: Should the button appear on hover, or always visible?
- OQ-3: Complementary items — still charge other items normally? (assumed YES)

## Next Step
INVESTIGATION recommended — confirm exact UI state of cart item rows, locate where `toggleItemComplementary` should be called, then fast-path to BUG FIX if ≤10 lines.
