# BUG-028 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-028
> **Title:** Service Charge Auto-Added on Bill Even When Auto Service Charge Toggle Is Off
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Related docs:**
> - Analysis: `/app/memory/bugs/BUG_ANALYSIS_028.md`
> - Implementation Plan: `/app/memory/bugs/BUG_IMPLEMENTATION_PLAN_028.md`
> - Implementation Summary: `/app/memory/bugs/BUG_IMPLEMENTATION_SUMMARY_028.md`
> - Implementation Summary (rework): `/app/memory/bugs/BUG_IMPLEMENTATION_SUMMARY_028_REWORK.md`
> - QA Report: `/app/memory/bugs/BUG_QA_REPORT_028.md`

---

## 1. Owner Smoke Results

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1 | Restaurant config `auto_service_charge = false` → place a Dine-In order → SC NOT auto-added on bill | ✅ PASS | Owner confirmed |
| 2 | Same config → cashier can still manually toggle SC ON from the Adjustments panel | ✅ PASS | Manual override available |
| 3 | Restaurant config `auto_service_charge = true` → SC auto-added (regression anchor) | ✅ PASS | Existing behaviour preserved |
| 4 | Takeaway / Delivery order types → SC toggle gated by `scApplicable` (not shown) | ✅ PASS | BUG-013 + BUG-023 preserved |
| 5 | Room / Dine-In order types → SC toggle shown when applicable | ✅ PASS | scApplicable rule honoured |

**Smoke result: 5/5 PASS.** Owner explicitly confirmed.

---

## 2. What Was Verified

- `CollectPaymentPanel.jsx` (BUG-028 Round 4 — REOPENED) honours the backend `auto_service_charge` flag when computing the initial SC toggle state.
- `OrderEntry.jsx` (BUG-028 Round 5) honours the same flag on the place-flow path.
- Adjustments-panel SC toggle remains gated by `scApplicable` (dineIn / room only).
- No regression on the BUG-006 / BUG-013 / BUG-023 chain.

---

## 3. What Was Intentionally NOT Changed

- `orderTransform.js` SC math (BUG-006 chain — AD-101 / AD-105 / AD-302 / AD-401 / AD-402).
- `buildBillPrintPayload` `scApplicable` gate (BUG-023 preserved).
- Backend / any API / any payload shape.
- `/app/memory/final/*`.
- `/app/memory/BUG_TEMPLATE.md`.

---

## 4. Closure Checklist

- [x] Implementation complete — `BUG_IMPLEMENTATION_SUMMARY_028.md` + `_REWORK.md`.
- [x] QA passed — `BUG_QA_REPORT_028.md`.
- [x] Owner preprod smoke — 5/5 PASS (this document).
- [x] No code changes during smoke step.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-028 row in `BUG_TEMPLATE.md` from "Open — Intake Created" to Closed. **This is a docs-code mismatch correction.**

---

## 5. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-028 implementation is complete, QA-verified, and owner-smoke-confirmed on preprod. Tracker row currently shows "Open — Intake Created" (legacy drift); awaiting tracker-keeper flip to Closed.

---

*End of BUG-028 Smoke Sign-off. Bug closed.*
