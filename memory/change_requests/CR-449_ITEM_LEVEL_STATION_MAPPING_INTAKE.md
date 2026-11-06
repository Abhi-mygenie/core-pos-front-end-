# CR-449 — Item Level Station Mapping

**ID:** CR-449  **Type:** CR  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch
**Severity:** P2  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**TT source:** TT-028

## Description
New feature: map individual menu items to specific kitchen/preparation stations at the item level. When an order is placed, each item is routed to its assigned station. Currently station assignment is at a higher level (category or restaurant-wide). This CR introduces per-item station mapping in Menu Management.

## Owner input (verbatim)
TT-028: "item level station mapping"

## Evidence
- Source: OWNER-REPORTED via TT-028
- Confidence: CONFIRMED
- Screenshot: not provided

## Duplicate check
DISTINCT.
- CR-013 (FROZEN): Food Court Report — station-wise order *reporting*, not item mapping
- CR-353 (IMPLEMENTED): Station config setup — configures station names, not per-item assignment
No existing CR covers per-item station assignment in menu management.

## Code Reality
UNKNOWN until Gate 2 investigation — station field may already exist in product API but not surfaced in ProductForm/BulkEditor.

## Blast radius
MEDIUM — ProductForm.jsx + BulkEditor.jsx (add station field) + menuManagementTransform.js + backend product endpoint (must accept station_id per item). ~3–4 files.

## Open decisions for Gate 2
- OD-449-01: Where is station selected — ProductForm single item edit, BulkEditor, or both?
- OD-449-02: Does the backend product API already accept a station_id field per item, or is this a new backend field?
- OD-449-03: Is this a single station per item, or can one item belong to multiple stations?
- OD-449-04: Does station assignment affect KOT routing (order goes to station printer) or only reporting?
