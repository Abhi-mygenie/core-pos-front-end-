# BUG-685: Add-to-cart crashes Order Entry — "ReferenceError: onEdit is not defined"

**ID:** BUG-685
**Type:** BUG
**Area:** Menu / Order Entry
**Priority:** P0
**Risk:** HIGH (core order-capture flow broken — crash on add item)
**Severity:** P0 — CRITICAL (place-order flow unusable)
**QA Severity:** BLOCKER (was tracked as BLOCKER-1 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE code error, not backend-blocked)
**Routing reason:** FE code error in CartPanel.jsx, not blocked at backend
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
Tapping any menu item (plain or customizable) in Order Entry shows the React error screen with `ReferenceError: onEdit is not defined`. No item can be added to the cart, so no order can be placed.

## Classification
- **Bug** — core functionality broken (incomplete CR-551 implementation)
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18)
- **Confidence:** CONFIRMED (reproduced in browser + code-traced)

## Root Cause
**CODE_ERROR in `frontend/src/components/order-entry/CartPanel.jsx`.** The main CartPanel component props block (~line 811) destructures `onCustomize` but NOT `onEdit`, while the render path (~line 1353) uses `onEdit={onEdit}`. `OrderEntry.jsx:2964` correctly passes `onEdit` into CartPanel, but inside CartPanel the identifier is undefined → crash.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §BLOCKER-1
- Handover: `memory/handover/HANDOVER_QA_NOV_SPRINT_2026_11_18.md` §B
- Repro: Login (owner@ruby.com) → Order Entry → tap any menu item → error screen.

## Blast Radius
- 1 file (CartPanel.jsx), ~1 line (add `onEdit,` to destructured props).
- Gates: CR-551 (fully), new-order creation for BUG-647/BUG-683/BUG-678 + SC+GST regression, and self-created orders needed for CR-526/BUG-671/BUG-672.
- **Present in remote `main` too** (not branch-specific).

## Proposed Fix (NOT YET APPROVED)
Add `onEdit,` to CartPanel's destructured props next to `onCustomize`. CartPanel is order-entry logic — full Planning gate recommended before the edit.

## Open Questions
None — root cause confirmed. Awaiting owner approval to fix (owner chose HOLD during triage).

## Duplicate Check
- **CR-551:** RELATED — this crash is an incomplete CR-551 (Edit variations/add-ons) implementation.
- **Verdict:** DISTINCT — new defect, registered separately from CR-551.
