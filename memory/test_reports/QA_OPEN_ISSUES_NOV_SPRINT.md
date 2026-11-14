# QA OPEN ISSUES — Nov Sprint 2026-11-08

**Total items QA'd:** 18 (29 test cases)
**Result:** 29/29 PASS — 0 BLOCKERS, 0 MAJORS, 2 MINORS, 10 NOTEs
**This document:** OPEN issues only (requiring owner decision or follow-up action)

---

## MINOR Issues (2) — Owner Decision Required

### F-004: CR-513 — Stale roundoff fallback leak (MINOR)

**Source:** CR-513 (discount_percentage + roundoff in bill print payload)
**What:** If a user starts a payment with roundoff (e.g. ₹0.50), cancels, then re-pays without roundoff — `overrides.roundoff` is undefined on the second attempt. The builder falls through to `order.roundUp` (backend-stored value), which may hold the stale roundoff from the first attempt. Result: stale roundoff leaks into the new print payload.
**Likelihood:** LOW — requires cancel + re-pay with different roundoff scenario.
**Location:** `orderTransform.js` L2181 — IIFE fallback chain.
**Options:**
- **A: Ship as-is** — edge case, LOW probability in production
- **B: File follow-up BUG** — add a guard to clear `order.roundUp` when overrides are present but roundoff is explicitly 0

---

### F-005: BUG-658 — `line_total` not zeroed for comp items in printer payload (MINOR)

**Source:** BUG-658 Root Cause 2 (from investigation report)
**What:** `buildBillPrintPayload` zeros `price`, `food_amount`, `unit_price`, `gst_tax_amount` for comp items, but `line_total` retains the original full price value. The integer `complementary` field also stays `0` instead of being set to `1`. If the printer agent template reads `line_total` instead of `food_amount`, the printed receipt line may show full price for comp items.
**Location:** `orderTransform.js` L1877 — comp item spread block.
**Options:**
- **A: Fix** — add `line_total: 0, complementary: 1` to the comp item spread (1 line)
- **B: Leave** — depends on what the printer template actually reads. If it reads `food_amount` (which IS zeroed), this is cosmetic.

---

## OPEN NOTEs Requiring Owner Action (0)

**Both F-003 and F-007 have been CLOSED — verified with live browser testing on cafe103:**
- **F-003 (CR-489):** Lock toast "Order Locked — Bill printed — editing requires permission." confirmed on order #021109 (C3). owner@cafe103.com does NOT have `order_edit_access` permission → lock fires correctly.
- **F-007 (CR-490):** Daily Report page loads for owner@cafe103.com who has `show_daily_report` but NOT `report`. Permission split works.

---

## CLOSED NOTEs (informational, no action needed)

| F# | Item | Note |
|---|---|---|
| F-001 | BUG-659 | P5 paths (dashboard reprint) still broken — known, Option A tracked separately |
| F-002 | CR-483 | "Received Amount" only visible when `reconcile_amount` setting ON — by design |
| F-006 | CR-488 | Credit Print Bill uses P6 pattern — auto-benefits from BUG-659 fallbacks |
| F-008 | CR-479 | CustomerModal placeholder inconsistency new vs edit mode — cosmetic |
| F-009 | BUG-643 | pointer-events hack around Radix — works, monitor on upgrades |
| F-010 | CR-480 | Hourly chart skips items with null cancel_time — graceful handling |
| F-011 | CR-491 | 29 demo files deleted, webpack compile confirms no lingering imports |
