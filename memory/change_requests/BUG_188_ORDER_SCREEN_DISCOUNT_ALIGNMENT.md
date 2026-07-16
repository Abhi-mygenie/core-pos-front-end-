# BUG-188: Order Screen — Discount Section Alignment Issue

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT
**Risk:** LOW
**Severity:** P2
**Classification:** FE_BUG (CSS layout)

## Description
In Order screen ADJUSTMENTS section, discount amount (₹52) and remove button overlap with the scrollbar.

## Investigation Findings

**Code trace:**
- Discount section is in `CartPanel.jsx` ADJUSTMENTS area
- The discount value + remove button container lacks proper `flex-shrink-0` or `overflow-hidden`
- Causes overlap when scrollbar is present

## Fix Required
- **FE ONLY** — CSS fix on discount row container
- ~5 lines, 1 file. Fast Lane eligible.

## Files
- `CartPanel.jsx` — discount row in ADJUSTMENTS section
