# BUG-035 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-035
> **Title:** Dynamic Price Feature Missing in New POS (parity gap with old POS)
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Related docs:**
> - Analysis: `/app/memory/bugs/BUG_ANALYSIS_035.md`
> - Implementation Plan: `/app/memory/bugs/BUG_IMPLEMENTATION_PLAN_035.md`
> - Implementation Summary: `/app/memory/bugs/BUG_IMPLEMENTATION_SUMMARY_035.md`
> - QA Report: `/app/memory/bugs/BUG_QA_REPORT_035.md`

---

## 1. Owner Smoke Results

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1 | Add a catalog item with base price = ₹1 (dynamic-price marker) → modal prompts cashier for runtime price | ✅ PASS | Owner confirmed |
| 2 | Enter custom price → item added to cart at the entered amount | ✅ PASS | — |
| 3 | Dynamic-price item with variants/add-ons — runtime price flows through ItemCustomizationModal | ✅ PASS | — |
| 4 | Quantity update on dynamic-price item — total recomputes with entered price | ✅ PASS | No regression |
| 5 | Regular items (base price > 1) — no modal; existing add-to-cart flow unchanged | ✅ PASS | Regression anchor clean |
| 6 | Print bill / Collect Bill — dynamic-price line items show correct amount | ✅ PASS | — |
| 7 | Old-POS parity confirmed by cashier | ✅ PASS | Feature gap closed |

**Smoke result: 7/7 PASS.** Owner explicitly confirmed.

---

## 2. What Was Verified

- `OrderEntry.jsx` (BUG-035, Apr-2026) detects `basePrice === 1` as a dynamic-price marker and opens the runtime price entry modal.
- `ItemCustomizationModal.jsx` (BUG-035 customisable variant) accepts inline runtime price for ₹1 items, resets on close, and propagates the override through to the cart-build path.
- Quantity recompute uses the entered price (no regression on the BUG-017 variant qty flow).
- Print payload and Collect Bill consume the runtime-entered price correctly.

---

## 3. What Was Intentionally NOT Changed

- `orderTransform.js` payload shape (only the `unit_price` source changes; structure preserved).
- Backend menu management (item authoring is upstream).
- Regular-price item flow.
- `/app/memory/final/*`.
- `/app/memory/BUG_TEMPLATE.md`.

---

## 4. Closure Checklist

- [x] Implementation complete — `BUG_IMPLEMENTATION_SUMMARY_035.md`.
- [x] QA passed — `BUG_QA_REPORT_035.md`.
- [x] Owner preprod smoke — 7/7 PASS (this document).
- [x] No code changes during smoke step.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-035 row in `BUG_TEMPLATE.md` from "Open — Intake Created" to Closed. **Docs-code mismatch correction.**

---

## 5. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-035 implementation is complete, QA-verified, and owner-smoke-confirmed on preprod. Tracker row currently shows "Open — Intake Created" (legacy drift); awaiting tracker-keeper flip to Closed.

---

*End of BUG-035 Smoke Sign-off. Bug closed.*
