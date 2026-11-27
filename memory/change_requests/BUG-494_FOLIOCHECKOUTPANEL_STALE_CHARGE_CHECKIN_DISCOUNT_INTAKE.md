# BUG-494 — FolioCheckoutPanel Bill: Stale LR charge fields when check-in discount applied

**ID:** BUG-494
**Type:** BUG (3 sub-issues, 1 OD locked)
**Date:** 2026-10-06
**Registered by:** Intake agent (session 2026-10-06)
**Status:** GATE_1_INTAKE
**Sprint:** oct_bug_batch
**Risk:** CRITICAL
**Severity:** P1
**Related:** BUG-492 Sub-A (RELATED — same file, live-session discount; BUG-494 = stored check-in discount), BUG-493 (RELATED — same root: LR charge stale), BUG-491 Sub-A (RELATED — introduced chargeGst formula)

---

## Description

`FolioCheckoutPanel` (Bill panel) uses `row.charge.*` from the LR API for three display values:
1. **Room balance line** — uses `c.balance_due` (LR)
2. **SGST / CGST lines** — uses `c.sgst` / `c.cgst` (LR)
3. **Checkout button amount** — via `roomInfo.remainingRoomBalance = charge.balance_due` (BUG-492 Sub-A fix, also LR)

The LR API computes all three on the **full booking_charge**, and **never updates them after a check-in discount is applied**.

Result: a guest with a large check-in discount (e.g., 89% on order #000325) sees **₹1,716** on the Checkout button when the correct amount is **₹0** (advance covered the discounted room, per OD-INV492B-01 Option B locked below).

---

## Sub-issues

### Sub-A — Room balance line shows pre-discount value

**Root cause:** `c = row.charge`, `c.balance_due = 1716` (= booking_charge + SGST_full + CGST_full − advance). Check-in discount not deducted.

**Correct:** `order.roomInfo.balancePayment = 0` (folio, already available after getFolio loads).

**Evidence:** `charge.balance_due = 1716`, `ri.balance_payment = 0`, order #000325 (1232973).

---

### Sub-B — SGST / CGST lines show GST on full price

**Root cause:** `c.sgst = 48`, `c.cgst = 48` — computed by backend on full `booking_charge = 1920` at booking time. LR API never recomputes these after check-in discounts.

**Owner rule:** GST = on discounted price. 100% discount → GST = 0.

**Correct for order #000325:**
- Discounted price = 1920 − 1620 = **₹300**
- GST slab (< ₹9,000 = 5%): SGST = ₹7.50, CGST = ₹7.50
- Must be computed frontend-side via `computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice, nights, 1)`

No server field provides "GST on discounted price" — `ri.gst_tax` is absent from folio.

---

### Sub-C — Checkout button total wrong (stale after BUG-492 Sub-A)

**Root cause:** BUG-492 Sub-A fix (L339) uses `charge.balance_due` as base and subtracts only the **live-session** discount (`roomDiscountInfoRs`). The **stored check-in discount** in `order.roomInfo.discountAmount` (= 1620) is not accounted for.

**Current code (BUG-492 Sub-A fix):**
```javascript
balance_due: Math.max(0, Number(row.charge?.balance_due || 0) - roomDiscountInfoRs)
// = Math.max(0, 1716 - 0) = 1716  ← WRONG
```

**Correct:** base = `order.roomInfo.balancePayment + gst_on_discounted_price` (per OD-INV492B-01 Option B below).

---

## Owner Decision

### OD-INV492B-01 — LOCKED = Option B (owner, 2026-10-06)

**Question:** When `balance_payment = 0` (advance covered discounted room price), should the Checkout total show ₹0 or the GST component (e.g., ₹15)?

Context: guest paid ₹300 advance; room after 89% discount = ₹300; advance exactly covers discounted room. GST on ₹300 = ₹15 technically owed, but advance treated as inclusive.

**Owner decision: Option B — treat advance as covering GST as well. Show ₹0.**

Formula locked: `balance_payment = 0 → Checkout = 0`. Consistent with OD-493-01 Option B (BALANCE column).

### OD-494-01 — OPEN: SGST / CGST display lines when balance_payment = 0

When `balance_payment = 0` (advance fully settled), should the Bill LEFT panel SGST / CGST lines show:
- **Option A:** GST on discounted price (₹7.50 / ₹7.50) — informational accuracy, even though collected within advance
- **Option B:** ₹0 / ₹0 — since nothing is owed, simplify the display

*For 100% discount (discounted_price = 0): both options = ₹0.*

---

## Duplicate Check

- **BUG-492 Sub-A:** RELATED PARENT — fixed live-session discount. BUG-494 is for stored check-in discount. DISTINCT.
- **BUG-360:** RELATED HISTORICAL — "stale balance_payment ignores remaining_room_balance". That was a different stale-data issue (mid-stay payments). GATE_5B_QA_PASS. DISTINCT.
- **BUG-418:** RELATED — GST not shown in old Bill display. Folded into CR-385 M6. DISTINCT from this.
- **Duplicate check: DISTINCT — Related: BUG-492 Sub-A, BUG-493, BUG-491 Sub-A**

---

## Code Reality

**PARTIAL** — `handlePaid` (FolioCheckoutPanel L266) already reads `order.roomInfo?.balancePayment` for the discount cap. BUT the three display sites (Room balance, SGST/CGST lines, Checkout button) still use stale `charge.*` values.

```bash
grep -n "c\.balance_due\|c\.sgst\|c\.cgst\|charge\.balance_due\|roomInfoFromCharge" \
  src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# → L150: c.balance_due (Room balance)
# → L161: c.sgst (SGST line)
# → L162: c.cgst (CGST line)
# → L339: charge.balance_due override (BUG-492 Sub-A, stale base)
```

No fix exists for these three sites.

---

## Severity

**P1 — HIGH** (upgraded from P2 consideration)
- Cashier sees Checkout = ₹1,716 for a guest whose folio balance is ₹0
- Risk of incorrectly charging the guest ₹1,716 instead of ₹0
- GST lines showing ₹48 instead of ₹7.50 — tax record inaccuracy
- In-house BALANCE column (₹0, fixed by BUG-493) and Bill panel (₹1,716) are **inconsistent for the same order**

---

## Risk Classification

**CRITICAL**
- Room billing financial display → drives cashier collection
- GST lines affect tax recording
- Modifies `roomInfo` prop passed to `CollectPaymentPanel` (R5-adjacent)
- Fast Lane: NOT eligible

---

## Evidence

- **Screenshots:** owner-provided 2026-10-06 (order #000325 showing ₹1,716)
- **Probe:** `evidence/INV-492B-CHECKIN-DISCOUNT/probe_000325_2026_10_06.json`
- **Investigation:** `investigations/INV-492B-CHECKIN-DISCOUNT_INVESTIGATION_2026_10_06.md`
- **Source:** OWNER-REPORTED + probe-CONFIRMED
- **Confidence:** HIGH

---

## Blast Radius

| File | Sub | Change |
|------|-----|--------|
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | A+B+C | ~6 lines: Room balance base, SGST/CGST compute, Checkout base |

- **1 file, not a hotspot** (CollectPaymentPanel IS R5 but NOT modified)
- **Blast radius: SMALL**
- `computeRoomGst` import needed (new import)
- `roomGstApplicable` + `roomGstSlabs` from existing `useRestaurant`/`useSettings` context (already imported in component)

---

## Next

OD-494-01 needed from owner → Planning Gate 2 → Gate 3 → Gate 4 GO → Implementation.
Same sprint (oct_bug_batch).
