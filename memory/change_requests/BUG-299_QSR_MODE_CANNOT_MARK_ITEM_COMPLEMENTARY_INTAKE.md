# BUG-299 — QSR Mode: Cannot Mark Item as Complementary

**ID:** BUG-299  
**Type:** BUG  
**Priority:** P1 — HIGH  
**Risk:** HIGH (order flow, discount/complementary logic, R5 hotspot: `CartPanel.jsx`)  
**Status:** INTAKE  
**Gate:** 1  
**Sprint:** pos_5_1  
**Registered:** 2026-08-05  
**Source:** OWNER-REPORTED  

---

## Description

In QSR mode (CartPanel), there is no way to mark an item as complementary. The complementary feature is not available at all in the QSR cart flow.

## Evidence
- Screenshot: not provided
- Steps to reproduce: QSR mode → add item(s) → no complementary option visible anywhere in cart
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (owner reproduced)

## Area
Order Entry → QSR mode (CartPanel.jsx)

## Code Reality Check
- `CartPanel.jsx` — grep for `complementary` returned NO results
- `OrderEntry.jsx` has `toggleItemComplementary()` but CartPanel is a separate code path
- **Code Reality: NONE — QSR mode has zero complementary support**
- RELATED: BUG-298 (per-item comp in dine-in mode)

## Duplicate Check
- DISTINCT — no prior bug for QSR complementary gap
- RELATED: BUG-298 (same feature, dine-in path)

## Blast Radius
- `CartPanel.jsx` (R5 hotspot) — needs comp toggle per cart item
- `orderTransform.js` — QSR place-order path must respect `isComplementaryRuntime` flag
- ~2 files, MEDIUM blast radius
- Hotspot files: YES (`CartPanel.jsx` is R5)

## Severity Rubric
P1 — Feature completely absent in QSR mode

## Risk Classification
- **Risk: HIGH**
- Trigger: Order flow, financial (complementary = zero-charge item), R5 hotspot files
- Fast Lane eligible: NO

## Open Questions
- OQ-1: Should QSR complementary work identically to dine-in (toggle per item)?
- OQ-2: Should order-level comp (CR-058, when implemented) also cover QSR?

## Next Step
PLANNING (Gate 2) recommended — depends on BUG-298 investigation outcome. Both can be planned together since they share the complementary toggle pattern. Recommend batching BUG-298 + BUG-299 in one planning session.
