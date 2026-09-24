# BUG-455 — Single-item ProductForm lacks the tax-required rule (CR-036-FU-03 applies to BulkEditor only)

**ID:** BUG-455 · **Registered:** 2026-09-24 · **Status:** INTAKE — GATE 1 (investigation gate CLOSED 2026-09-24 — see `handover/SESSION_HANDOVER_2026_09_24_GST_INVESTIGATION_CLOSED.md`) · **Type:** BUG · **Priority:** P2 · **Risk:** MEDIUM (menu validation, non-financial at save time) · **Sprint:** unassigned
**Source:** AGENT-DISCOVERED (INV report §4 clash X3) · **Confidence:** CONFIRMED in code

## What the issue is
With `restaurant.tax.gstStatus === true`, Bulk Editor refuses a non-packaged item without GST/VAT type + rate > 0 (`BulkEditor.jsx:576-584`), but the single-item **Add/Edit Product form** accepts it (`ProductForm.jsx` has 0 references to `gstStatus`). The same item is valid in one screen and invalid in the other; Excel import has no FE rule either (backend only).

## Code reality
- `components/panels/menu/BulkEditor.jsx:220, 553-586` — rule present.
- `components/panels/menu/ProductForm.jsx:433-460` — Tax Type / Tax % inputs, no validation on submit (only BUG-391 Aggregator lock).

## Duplicate check: RELATED CR-036-FU-03 (rule origin), CR-158 (validate button), BUG-391. DISTINCT.

## Evidence
Code trace only; screenshot not applicable. Repro: GST-enabled tenant → Menu Management → Add Item (non-Aggregator) → Tax % 0 → Save → accepted.

## Blast radius
SMALL — `ProductForm.jsx` submit handler (+~8 lines), reuse `restaurant.tax.gstStatus` + `packedFood` exemption. Not a hotspot. Fast Lane: NO (>10 lines likely, and validation semantics shared with CR-387 decisions).

## Open decisions
- OD-455-01: apply the identical packaged-item exemption as BulkEditor (recommended YES — single rule source).

*Intake written 2026-09-24 · INVESTIGATION→INTAKE (ALPHA v0.7)*
