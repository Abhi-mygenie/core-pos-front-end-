# BUG-607 — Item-Level GST Not Working in New POS

**ID:** BUG-607  **Type:** BUG  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch  
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE  
**TT source:** TT-027

## Description
Item-level GST is not working in the new POS. GST calculated or displayed per item is incorrect — either not computing, not displaying, or sending wrong values to backend.

## Owner input (verbatim)
"item level gst not working" / TT-027: "item level gst in new pos"

## Evidence
- Source: OWNER-REPORTED via TT-027 (Tech Tasks sheet) + direct report
- Confidence: CONFIRMED (owner reported)
- Screenshot: not provided

## Duplicate check
DISTINCT. Related items (all CLOSED/IMPLEMENTED):
- BUG-304 (item-level discount discountRatio wrong base — IMPLEMENTED QA PASS)
- BUG-305 (orderTransform discountRatio wrong — IMPLEMENTED QA PASS)
- BUG-336 (GST applied when disabled — QA PASS)
None cover item-level GST broken in the new POS flow.

## Code Reality
PARTIAL — `itemGst` exists in `orderTransform.js:840`, `CartPanel.jsx:437`, `CollectPaymentPanel.jsx:722`. Feature exists but behaviour is broken.

## Blast radius
MEDIUM — orderTransform.js (R5-adjacent) + CartPanel.jsx (R5) + CollectPaymentPanel.jsx (R5) + possibly productTransform.js. ~3–4 files, all hotspot-adjacent.

## Open decisions for Gate 2
- OD-607-01: What exactly is broken — GST not showing per item in cart, wrong amount, or not sent in order payload?
- OD-607-02: Which tax type(s) affected — GST only, or VAT too?
- OD-607-03: Is this broken for all items or only specific item types (custom items, addons, packed food)?
- OD-607-04: "New POS" — is this a specific new OrderEntry flow/branch or the standard POS?
