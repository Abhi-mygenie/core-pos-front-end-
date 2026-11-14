# QA FINDINGS REGISTER — Nov Sprint Batch

**Created:** 2026-11-08
**Purpose:** Centralized log of ALL findings across QA batches — bugs, notes, edge cases, owner decisions needed.
**Updated by:** QA Agent after each batch.

---

## How to Use
- Every finding from every QA batch gets a row here (F-001, F-002, ...)
- Severity: BLOCKER / MAJOR / MINOR / NOTE
- Status: OPEN / OWNER_DECISION / DEFERRED / CLOSED
- This doc is the single source of truth for "what did QA find" across all batches

---

## Findings Log

| F# | Batch | Source ID | Severity | Finding | Status | Owner Decision |
|---|---|---|---|---|---|---|
| F-001 | 1 | BUG-659 | NOTE | P5 paths (dashboard reprint) still broken — `employee-orders-list` and socket events lack `discount_type` and `round_up`. BUG-659 E1+E2 fallbacks only fire on P6 paths (report reprints). Option A (pre-fetch from `get-single-order-new`) tracked separately. | DEFERRED | Already tracked as separate gate cycle |
| F-002 | 1 | CR-483 | NOTE | "Received Amount" field only visible when restaurant setting `reconcile_amount` = ON. Restaurants without this setting see no field. This is by design (OD-483-09). | CLOSED | By design — no action |
| F-003 | 1 | CR-489 | NOTE | E2E lock verified on cafe103: owner@cafe103.com lacks `order_edit_access` permission. Order #021109 (C3, bill_print=Yes) → clicked menu item → "Order Locked — Bill printed — editing requires permission." toast fired. Screenshot evidence captured. | CLOSED | Verified — lock works. No separate test role needed. |
| F-004 | 1 | CR-513 | MINOR | Edge case: If user starts a payment with roundoff (e.g. ₹0.50), cancels, then re-pays without roundoff — `overrides.roundoff` is undefined on second attempt → builder falls through to `order.roundUp` which may still hold the stale value (0.49/0.50) from the backend. Result: stale roundoff leaks into the new print payload. Likelihood: LOW (requires cancel + re-pay with different roundoff). | OPEN | Owner decides: ship or fix as follow-up |
| F-005 | 2 | BUG-658 | MINOR | Root Cause 2 from investigation NOT fixed: `buildBillPrintPayload` zeros `price`, `food_amount`, `gst_tax_amount` etc. for comp items but `line_total` retains original full price value. Integer `complementary` field stays 0 instead of being set. If printer template reads `line_total`, printed receipt may show full price for comp items. | OPEN | Owner decides: fix `line_total` zeroing or leave (printer-template-dependent) |
| F-006 | 2 | CR-488 | NOTE | Credit Management Print Bill button uses P6 pattern (fetches `get-single-order-new`) — automatically benefits from BUG-659 E1+E2 discount/roundoff fallbacks. No additional work needed. | CLOSED | No action |
| F-007 | 2 | CR-490 | NOTE | E2E verified on cafe103: owner@cafe103.com has `show_daily_report` but NOT `report`. Navigated to /reports/audit → Daily Report page loaded successfully with all tabs. API probe confirmed permissions: `report` absent, `show_daily_report` present. | CLOSED | Verified — permission split works. No separate test user needed. |
| F-008 | 3 | CR-479 | NOTE | CustomerModal has different placeholder in new vs edit mode. New: "Phone number" (BUG-638 fix). Edit: "10-digit mobile" for India, "Phone number" for intl. Cosmetic inconsistency. | CLOSED | Cosmetic — no action needed |
| F-009 | 3 | BUG-643 | NOTE | Fix uses `pointer-events: 'auto'` inline style override to work around Radix Sheet's `pointer-events:none` on body. Works correctly but fragile if Radix updates modal implementation. | CLOSED | Acceptable workaround — monitor on Radix upgrades |
| F-010 | 4 | CR-480 | NOTE | Hourly cancellation chart depends on `cancel_time` field from API. Items with null/empty cancel_time are gracefully skipped but won't appear in chart. Data completeness note. | CLOSED | By design — graceful handling |
| F-011 | 4 | CR-491 | NOTE | 29 demo files deleted. Webpack compiles clean confirming no lingering imports. Dynamic/lazy imports verified absent. | CLOSED | Verified via compile |

---

## Summary by Batch

| Batch | Date | Items | Pass/Fail | Blockers | Majors | Minors | Notes |
|---|---|---|---|---|---|---|---|
| 1 — CRITICAL | 2026-11-08 | CR-513, BUG-659, CR-483, CR-489 | 10/10 PASS | 0 | 0 | 1 | 3 |
| 2 — HIGH | 2026-11-08 | CR-482 re-QA (BUG-648/649/650/651), BUG-641, BUG-658, CR-490, CR-488 | 8/8 PASS | 0 | 0 | 1 | 3 |
| 3 — MEDIUM | 2026-11-08 | CR-479, BUG-636, BUG-637, BUG-638, BUG-642, BUG-643 | 7/7 PASS | 0 | 0 | 0 | 2 |
| 4 — LOW | 2026-11-08 | CR-480, CR-485, CR-491, BUG-629 | 4/4 PASS | 0 | 0 | 0 | 2 |
| REGRESSION | — | R1–R8 cross-item | — | — | — | — | — |

---

## Pending Owner Decisions

| F# | Question | Options | Deadline |
|---|---|---|---|
| F-004 | Ship CR-513 with stale-roundoff edge case, or file follow-up bug? | A: Ship as-is (LOW risk) / B: File BUG and fix before release | Before release |
| F-005 | Fix `line_total` zeroing for comp items in printer payload, or leave? | A: Fix (1 line in orderTransform.js) / B: Leave (printer-template-dependent) | Before release |
