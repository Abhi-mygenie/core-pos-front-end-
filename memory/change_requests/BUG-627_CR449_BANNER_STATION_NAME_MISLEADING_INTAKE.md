# BUG-627 — CR-449 Banner Shows Item Station as "Category Default" When Override Active

**ID:** BUG-627  **Type:** BUG  **Registered:** 2026-10-28  **Sprint:** nov_cr_batch
**Severity:** P3  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** QA-FOUND (QA batch 2026-10-28, testing agent iteration_10)
**Related:** CR-449

## Description
`ProductForm.jsx:511` — when an item-level station override is active, the banner text reads:
```
Item-level station override active. Category default: {product?.stationName || 'KDS'}
```
But `product.stationName` is the **effective** station name (resolved from item override), not the category's station. So when an item overrides to "BAR", the banner says "Category default: BAR" — which is misleading.

## Evidence
- `ProductForm.jsx:511`: `Category default: {product?.stationName || 'KDS'}`
- `stationName` comes from `menuManagementTransform.js:82`: `stationName: api.station_name || null` — this is the effective station, not category station
- Confidence: CONFIRMED (code traced)

## Blast Radius
SMALL — 1 file, 1 line text change. Need the category's station name, not the item's effective station.

## Fix Scope
Either:
A) Use a separate `categoryStationName` field from the API (if available), or
B) Only show "Category default" text when NO override is active (the banner only appears when override IS active, so the text is inherently contradictory — consider rewording to "Overriding category station").
