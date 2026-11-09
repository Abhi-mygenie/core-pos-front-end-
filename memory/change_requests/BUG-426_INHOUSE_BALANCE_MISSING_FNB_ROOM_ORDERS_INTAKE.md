# BUG-426 — In-House Balance Column Missing Transferred F&B and Room Orders

**ID:** BUG-426
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (investigation 2026-09-16, ss1 screenshot)
**Confidence:** CONFIRMED (code-traced)

---

## Description

The In-House Guests page (`/pms/in-house`) Balance column shows only the **room-only outstanding balance** (room price + GST − advance − received). It completely excludes:
1. Transferred F&B orders (orders from other tables posted to the room)
2. Room-native food orders (items ordered directly at the room)

**Example (test gst, r1):**
- Currently shows: ₹950 (room balance only)
- Should show: ₹1,624 = ₹950 (room) + ₹418 (transferred F&B) + ₹256 (room orders with item GST)

The Outstanding Balance KPI at the top is also wrong because it sums the incorrect `row.balance` values.

---

## Classification

- **Type:** BUG
- **Severity:** P1 — HIGH (In-House page is the primary front-desk dashboard; wrong balance misleads staff on actual guest outstanding)
- **Risk:** HIGH (financial display; informs checkout and collection decisions)
- **Duplicate check:** DISTINCT — BUG-421 (IMPLEMENTED) fixed room-only balance; this extends it to include F&B
- **Related:** BUG-421 (IMPLEMENTED — Step 3 already fetches SINGLE_ORDER_NEW), BUG-423, BUG-427
- **Fast Lane:** NOT eligible (HIGH financial, new extraction logic)

---

## Evidence

- Screenshot: ss1 (2026-09-16) — "test gst" Balance = ₹950; should be ₹1,624
- Code: `pmsService.js` Step 3 (L96-110) reads only `raw.room_info` — never touches `raw.associated_order_list` or `raw.orderDetails`
- Confirmed: checkout drawer (ss3/ss4) shows correct ₹1,624 from same API data
- Investigation: `/app/memory/investigations/INVESTIGATION_2026_09_16_BALANCE_GST_GAPS.md`
- Source: OWNER-REPORTED | Confidence: CONFIRMED

---

## Code Reality

**PARTIAL** — BUG-421 Step 3 fetches the raw order response. The fix point is ALREADY there: Step 3 reads `raw.room_info` correctly but ignores `raw.associated_order_list` and `raw.orderDetails` which are in the same response.

---

## Blast Radius

- `src/api/services/pmsService.js` — Step 3 block only (~15 new lines inside existing try block)
- `InHouseGuestsPage.jsx` — no change needed (reads `row.balance`, which Step 3 will set correctly)
- Estimated scope: SMALL (1 file)
- Hotspot: NONE

---

## ⚠ Known Configuration Limitation

`pmsService.js` has no access to React context. Two settings that suppress food item GST in the checkout (`restaurant.tax.gstStatus`, `restaurant.settings.roomGstApplicable`) are not accessible here. For GST-enabled restaurants this is correct. For restaurants with `roomGstApplicable = false`, food item GST may be over-counted. Document as known limitation in code.

Owner confirmed: proceed with this known limitation.

---

## Owner Decisions

| ID | Question | Answer |
|----|----------|--------|
| OD-426-01 | Include transferred F&B + room orders with item GST in In-House balance? | ✅ YES |
| OD-426-02 | Config caveat (roomGstApplicable not accessible in service) accepted? | ✅ YES — document as known limitation |

---

## Next

Gate 2 — Impact Analysis
