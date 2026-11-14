# BUG-427 — Folio Total Balance Due Excludes Room Orders (Post-GST)

**ID:** BUG-427
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (investigation 2026-09-16, ss2 screenshot)
**Confidence:** CONFIRMED (code-traced)

---

## Description

The Guest Folio page (`/pms/folio/:id`) has two related gaps:

1. **F&B Posted tile (RHS)** shows only transferred orders (₹418). Room-native orders (₹256 post-GST) are not reflected in this tile.

2. **Total Balance Due** = `roomBalance + fnbTotal` = ₹950 + ₹418 = ₹1,368. Room Orders (₹256 post-GST) are completely absent from the final payable amount. Should be ₹1,624.

3. **Room Orders section total** (BUG-424, LHS) shows ₹228 (pre-tax) instead of ₹256 (post-tax). The ₹28 food item GST is computed per-item in the transform (`gstAmount` field) but never added to the section total. This sub-gap is resolved by the same fix.

**Example (test gst, order #000069):**

| | Current | Correct |
|-|---------|---------|
| F&B Posted tile | ₹418 (transferred only) | ₹674 (₹418 + ₹256) |
| Total Balance Due | ₹1,368 | ₹1,624 |
| Room Orders Total | ₹228 (pre-tax) | ₹256 (post-GST) |

---

## Classification

- **Type:** BUG
- **Severity:** P1 — HIGH (Total Balance Due on the primary billing document is wrong — understated by ₹256)
- **Risk:** CRITICAL (Total Balance Due directly drives what staff charges the guest at checkout)
- **Duplicate check:** DISTINCT from BUG-423 (fixed room balance formula) and BUG-424 (added room orders section). This is a gap in the aggregation/totalling logic introduced by BUG-424 scope not including F&B total.
- **Related:** BUG-424 (IMPLEMENTED — added roomOrders to folioTransform), BUG-423 (IMPLEMENTED — roomBalance formula), investigation 2026-09-16
- **Fast Lane:** NOT eligible (CRITICAL financial, Total Balance Due)

---

## Evidence

- Screenshot: ss2 (2026-09-16) — folio shows F&B Posted ₹418, Total Balance Due ₹1,368
- Screenshot: ss3/ss4 — checkout shows Grand Total ₹1,624 (correct reference)
- Code: `GuestFolioPage.jsx` L133: `fnbTotal = associatedOrders.reduce(...)` — roomOrders absent
- Code: `GuestFolioPage.jsx` L390: `roomBalance + fnbTotal` — roomOrders absent from Total Balance Due
- Code: `GuestFolioPage.jsx` L350: Room Orders Total uses `r.amount` (pre-tax) not post-GST
- Code: `folioTransform.js` L122-124: `amount` = pre-tax, `gstAmount` computed but NOT in `amount`
- Investigation: `/app/memory/investigations/INVESTIGATION_2026_09_16_BALANCE_GST_GAPS.md`
- Source: OWNER-REPORTED | Confidence: CONFIRMED

---

## Code Reality

**PARTIAL** — BUG-424 added `roomOrders` to `folioTransform` and displayed the section. But:
- `gstAmount` per item is computed but never used in the section total
- `roomOrders` never feeds into `fnbTotal` or `Total Balance Due`

---

## Blast Radius

- `src/api/transforms/folioTransform.js` — add `totalAmount = amt + gstAmt` field per roomOrder item (~1 line)
- `src/pages/pms/GuestFolioPage.jsx` — 3 line changes:
  - Room Orders section total: use `totalAmount` instead of `amount`
  - `fnbTotal` or a new combined total that includes room orders
  - `Total Balance Due`: add room orders post-GST total
- Estimated scope: SMALL (2 files, ~5 lines)
- Hotspot: NONE

---

## Owner Decisions

| ID | Question | Answer |
|----|----------|--------|
| OD-427-01 | Total Balance Due = room + transferred F&B + room orders (post-GST)? | ✅ YES — ₹1,624 confirmed |
| OD-427-02 | Room Orders section total to use post-GST; row display stays pre-tax with expand? | ✅ YES |
| OD-427-03 | F&B Posted tile to include room orders total (post-GST)? | ✅ YES — part of same fix |

---

## Next

Gate 2 — Impact Analysis
