# BUG-271 — GST/VAT Wrong on Print from Dashboard/Order Page

**ID:** BUG-271
**Type:** BUG
**Created:** 2026-07-28
**Severity:** P1 (HIGH)
**Risk:** HIGH (financial R6)
**Module:** Order Transform — Print Payload Builder
**Duplicate Check:** DISTINCT (BUG-172 INTERIM is related — this is the resolution)
**Code Reality:** CONFIRMED — two distinct code paths for GST/VAT. Collect Bill path correct, Manual Print path approximates.
**Source:** OWNER-REPORTED (GST=59.3/VAT=21.7 wrong vs GST=20.5/VAT=60 correct from collect bill)
**Confidence:** CONFIRMED (code traced)

---

## Description

GST and VAT values are wrong when printing from dashboard/order page. Correct from collect bill page.

- **From collect bill (CORRECT):** GST=20.5, VAT=60
- **From dashboard/order page (WRONG):** GST=59.3, VAT=21.7

Root cause: Two distinct paths in `orderTransform.js` print payload builder:
1. **Collect Bill path** (L1805-1868): Per-item `gst_tax_amount` accumulation — CORRECT
2. **Manual Print path** (L1870-1915): Uses `order.amount - order.subtotalBeforeTax` as totalTax, then splits proportionally by item base price — WRONG when items have different tax rates

The proportional split at L1898-1914 gives incorrect GST/VAT ratio because it divides by `vatBase/totalBase` ratio which doesn't account for different tax rates per item.

## Evidence

- Owner-reported values: GST=59.3/VAT=21.7 (wrong) vs GST=20.5/VAT=60 (correct)
- Code: `orderTransform.js:1870-1915` — BUG-172 INTERIM comment at L1877 acknowledges this is approximate
- Code: `orderTransform.js:1805-1868` — Collect Bill path does per-item accumulation (correct)

## Blast Radius

- 1 file: `orderTransform.js` (manual print path L1870-1915)
- ~20 lines changed
- Hotspot: NO (print payload builder, not OrderEntry)
- Scope: MEDIUM (financial logic)

## Owner Decision Needed

Verify: Is the issue on PRINT only, or does the dashboard DISPLAY also show wrong GST/VAT?
