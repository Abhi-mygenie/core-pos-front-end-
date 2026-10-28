# BUG-374 INTAKE — Cart: Changing Quantity of One Variation Changes All Variations of Same Item
**Date:** 2026-09-01 | **Priority:** P0 | **Risk:** CRITICAL | **Severity:** BLOCKER | **Status:** INTAKE

## Description
When the same item is added to the cart with different variations (e.g. 30ml and 60ml), increasing the quantity of one variation (e.g. 30ml from 1 to 3) also changes the other variation (60ml) to the same quantity (3). This causes incorrect orders and incorrect billing.

## Code Reality: NONE
Root cause not yet pinpointed from static analysis. The investigation hypothesis is that the cart identity key builder treats both variations of the same item as the same cart entry — causing qty updates to apply to all matching entries.

**Related but DISTINCT from BUG-VQTY:**
- BUG-VQTY (QA PASS, awaiting smoke): about `variation_amount` not being multiplied by qty in the financial payload (ORDER CALCULATION bug)
- BUG-374 (this): about the cart UI itself syncing qty across variations of the same item (ORDER CAPTURE bug — different and more severe)

## Risk Justification: CRITICAL
- P0 because incorrect qty directly leads to wrong orders being placed and incorrect billing
- OrderEntry.jsx is in the near-hotspot zone (large file, order capture critical path)
- BUG-246 (identity key merge logic) is a related recent change that may be the source

## Duplicate Check: DISTINCT from BUG-VQTY
## Blast Radius: MEDIUM — OrderEntry.jsx cart logic (large file, ~2493 lines)
## Planning Skip: NO — hotspot area, CRITICAL risk, needs full analysis
## Next: Gate 2 — thorough impact analysis with identity key trace before any code changes
