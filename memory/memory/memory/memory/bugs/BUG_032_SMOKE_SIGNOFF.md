# BUG-032 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-032
> **Title:** Back-End Order ID Displayed Instead of Restaurant Order ID
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Related docs:**
> - Analysis: `/app/memory/bugs/BUG_ANALYSIS_032.md`
> - Implementation Plan: `/app/memory/bugs/BUG_IMPLEMENTATION_PLAN_032.md`
> - Implementation Summary: `/app/memory/bugs/BUG_IMPLEMENTATION_SUMMARY_032.md`
> - QA Report: `/app/memory/bugs/BUG_QA_REPORT_032.md`

---

## 1. Owner Smoke Results

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1 | OrderEntry header — order ID chip displays restaurant-facing order number (not backend numeric ID) | ✅ PASS | Owner confirmed |
| 2 | CollectPaymentPanel header — restaurant order number displayed; falls back gracefully if missing | ✅ PASS | — |
| 3 | Dashboard card (DineInCard / TakeawayCard) — order ID surface unchanged where applicable | ✅ PASS | Regression anchor clean |
| 4 | Print bill payload — backend `order_id` still used for the underlying call, but display always shows restaurant order number | ✅ PASS | Payload integrity preserved |
| 5 | Audit Report OrderTable — column unchanged | ✅ PASS | — |

**Smoke result: 5/5 PASS.** Owner explicitly confirmed.

---

## 2. What Was Verified

- `OrderEntry.jsx` (BUG-032 — Apr-2026) passes the restaurant-facing order number for header display.
- `CollectPaymentPanel.jsx` reads the restaurant-facing order number with a safe fallback.
- Underlying payload uses backend `order_id` unchanged (no API contract break).
- No regression on print path, dashboard cards, or Audit Report.

---

## 3. What Was Intentionally NOT Changed

- `orderTransform.js` payload builders / API contract.
- `buildBillPrintPayload` — backend `order_id` preserved in payload.
- Backend / any API.
- `/app/memory/final/*`.
- `/app/memory/BUG_TEMPLATE.md`.

---

## 4. Closure Checklist

- [x] Implementation complete — `BUG_IMPLEMENTATION_SUMMARY_032.md`.
- [x] QA passed — `BUG_QA_REPORT_032.md`.
- [x] Owner preprod smoke — 5/5 PASS (this document).
- [x] No code changes during smoke step.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-032 row in `BUG_TEMPLATE.md` from "Open — Intake Created" to Closed. **Docs-code mismatch correction.**

---

## 5. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-032 implementation is complete, QA-verified, and owner-smoke-confirmed on preprod. Tracker row currently shows "Open — Intake Created" (legacy drift); awaiting tracker-keeper flip to Closed.

---

*End of BUG-032 Smoke Sign-off. Bug closed.*
