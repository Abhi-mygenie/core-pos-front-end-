# BUG-602 — Intake (Gate 1)
## order_note sent but backend returns empty — notes pushed to food_level_notes

**ID:** BUG-602
**Type:** BUG
**Date:** 2026-10-21
**Sprint:** nov_cr_batch
**Area:** Other
**Priority:** P1
**Risk:** MEDIUM
**Source:** INVESTIGATION (BUG-573 session)
**Duplicate check:** DISTINCT (related BUG-573)
**Status:** GATE_1_INTAKE_BACKEND_BLOCKED

---

## Description
When a cashier enters order-level notes (via OrderNotesModal), the frontend correctly sends `order_note: "Birthday, Anniversary, VIP Guest, ORDER 123 TEST"` in the place-order payload. But the backend returns `order_note: ""` in both `employee-orders-list` and `employee-order-details` responses. The notes appear at item level as `food_level_notes` instead of at order level.

## Evidence
- Place-order payload captured: `order_note: "Birthday, Anniversary, VIP Guest, ORDER 123 TEST"` ✅
- employee-orders-list response for same order: `order_note: ""` ❌
- employee-order-details response: `order_note: ""` ❌
- Item level: `food_level_notes: "No Garlic, Less Spicy"` ← notes appear here

## FE Status
FE chain complete — `orderTransform.js:306` maps `api.order_note`, `OrderCard.jsx:636` renders it. No FE fix needed.

## Next
Backend must store `order_note` at order level and return it in API responses.
