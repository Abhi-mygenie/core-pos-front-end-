# BUG-608 — Menu Management: GST Not Editable for New Restaurant

**ID:** BUG-608  **Type:** BUG  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE
**TT source:** TT-032 + TT-033 (combined)

## Description
In Menu Management (ProductForm / BulkEditor), GST values cannot be edited. For a new restaurant setting up their menu, GST fields appear locked or read-only, preventing configuration. The user cannot change GST percentage or type on menu items.

## Owner input (verbatim)
TT-032: "Screen share Old POS — demonstrate how GST is enabled for new restaurant"
TT-033: "Send screenshot to tech group demonstrating that GST values cannot be edited"
Owner clarification: "in menu management user is not able to edit GST that the issue"

## Evidence
- Source: OWNER-REPORTED via TT-032 + TT-033
- Confidence: CONFIRMED
- Screenshot: not provided

## Duplicate check
RELATED to BUG-391 (IMPLEMENTED): Aggregator items intentionally have GST locked read-only (5% mandatory). However this bug is about **normal (non-aggregator) menu items** being uneditable — DISTINCT.
Code found: `ProductForm.jsx:440` — `{/* BUG-391: Aggregator — tax fields locked read-only (GST 5% mandatory) */}` — this lock may be incorrectly applied to non-aggregator items, or a separate condition is blocking edits.

## Code Reality
PARTIAL — GST lock exists in ProductForm.jsx (BUG-391 for aggregator). Possible regression where lock condition is too broad, affecting normal items too.

## Blast radius
SMALL — ProductForm.jsx primarily, possibly BulkEditor.jsx tax column. ~1–2 files.

## Open decisions for Gate 2
- OD-608-01: Is this for all items or only when a new restaurant first sets up (gstStatus=false initially)?
- OD-608-02: Is the GST field visually disabled/greyed out, or does it accept input but not save?
- OD-608-03: Does this affect both ProductForm (single item edit) and BulkEditor (bulk edit)?
