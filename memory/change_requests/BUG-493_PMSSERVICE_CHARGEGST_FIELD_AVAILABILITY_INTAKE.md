# BUG-493 — pmsService: chargeGst always 0 → BALANCE column missing GST for all in-house orders

**ID:** BUG-493
**Type:** BUG — CONFIRMED (curl-probe completed 2026-10-06)
**Date:** 2026-10-06
**Registered by:** Intake agent (session 2026-10-06)
**Status:** GATE_1_INTAKE
**Sprint:** oct_bug_batch
**Risk:** MEDIUM
**Severity:** P1 (upgraded from P2 — affects ALL in-house orders, not just edge cases)
**Related:** BUG-491 Sub-A (parent — introduced the `chargeGst` formula)

---

## Description

`pmsService.getInHouseGuests()` computes the BALANCE column using:
```javascript
const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
```

**`row.charge` is NEVER set in `getInHouseGuests()`.**

`row` is created by `roomListTransform.transformRoomListToRows()` (Step 1) which has no `charge` field. Step 2 (local-reservations enrichment) sets `row.checkinDate`, `row.bookingCheckin`, `row.checkoutDate`, `row.balance`, `row.channel` — but NOT `row.charge`. Step 3 (folio enrichment) similarly never sets `row.charge`.

Result: `row.charge` = always `undefined` → `chargeGst = 0 + 0 = 0` for ALL in-house orders.

The BALANCE column shows `ri.balance_payment` (from single-order-new room_info) WITHOUT adding the GST component. For every non-fully-discounted order, BALANCE is understated by the GST amount.

---

## Probe Evidence — 2026-10-06

**API:** `GET /api/v2/vendoremployee/aiosell/local-reservations` (RID 69, The Goan Kitchen)
**Full evidence:** `/app/memory/evidence/INV-492-CHECKOUT-DISPLAY/BUG493_probe_summary.json`

### Key finding: `charge.sgst` / `charge.cgst` ARE available at reservation level in LR

```json
Reservation charge object (from local-reservations API):
  { "booking_charge": 1050, "sgst": 26.25, "cgst": 26.25, "balance_due": 1002.5, ... }
```

### BALANCE column error confirmed for 3 in-house orders

| Order | Scenario | ri.balance_payment | chargeGst (current) | BALANCE now | Expected | Gap |
|-------|----------|--------------------|---------------------|-------------|----------|-----|
| 1232903 | No discount | ₹950 | 0 (bug) | **₹950** | ₹1,002.50 | −₹52.50 |
| 1232965 | ₹200 discount | ₹750 | 0 (bug) | **₹750** | ₹802.50 | −₹52.50 |
| 1232972 (#000324) | 100% discount (ri.bp=0) | ₹0 | 0 (bug) | **₹0** | ₹75 (with fix) | Owner says ₹0 is correct → **OD needed** |

**Note on order 1232972:** `ri.balance_payment = 0` because `room_price − discount − advance = 1500 − 1000 − 500 = 0`. The discount (₹1,000) zeroed out the room balance but does NOT cover the GST (₹75). With the fix, BALANCE would show ₹75. Owner confirmed ₹0 is currently shown and accepted as correct → **Owner Decision required (OD-493-01)**.

### Root cause confirmed

`frontDeskTransform.fromFrontDeskSnapshot` passes `charge` at reservation level. `pmsService.getInHouseGuests()` enriches rows from `match.res` but never copies `match.res.charge` to `row.charge`. One missing line.

---

## Duplicate Check

- BUG-491 Sub-A: RELATED PARENT — this bug is in the chargeGst line Sub-A introduced
- BUG-426: DISTINCT — that fixed the balance formula for F&B + room orders; this is the GST component
- **Duplicate check: DISTINCT — Related: BUG-491 Sub-A**

---

## Code Reality

**PARTIAL** — the buggy formula is active (`chargeGst = row.charge?.sgst ?? 0 + ...`). Fix is 1 line in Step 2. OQ-493-01 ANSWERED: `charge.sgst`/`cgst` present in LR response.

---

## Severity (revised P2 → P1)

**P1 — HIGH** (revised from P2)
- Affects ALL in-house orders, not just partial-discount edge cases
- BALANCE column understates GST for non-fully-discounted orders (₹52.50 gap on ₹1,050 room)
- Financial display error visible to cashiers in the In-House Guests table
- No workaround — column always shows wrong value

---

## Risk Classification

**MEDIUM**
- One file (pmsService.js), ~1 line addition in Step 2
- No formula change — just makes existing `row.charge?.sgst` readable
- Edge case: 100%-discounted orders may show GST as outstanding (OD-493-01)
- Fast Lane: NOT eligible (financial display, owner decision needed)

---

## Fix

**Step 2 in `pmsService.getInHouseGuests()` (lines 58-68):**

```javascript
rows.forEach(row => {
  const match = lookup[row.parentOrderId];
  if (match) {
    row.checkinDate    = match.room.checked_in_at  ?? null;
    row.bookingCheckin = match.res.checkin          ?? null;
    row.checkoutDate   = match.res.checkout         ?? null;
    row.balance        = match.res.amount_after_tax != null
                        ? Number(match.res.amount_after_tax) : null;
    row.channel        = match.res.channel          ?? null;
    row.charge         = match.res.charge           ?? null;  // ← BUG-493: add this line
  }
});
```

After this fix, Step 3's `chargeGst = row.charge?.sgst + row.charge?.cgst` correctly reads SGST + CGST.

**1 line, 1 file, not a hotspot.**

---

## Owner Decision Required

**OD-493-01: For orders where the room discount zeroes out `ri.balance_payment` (balance_payment = 0), but GST is still technically owed — should BALANCE column show ₹0 or the GST amount (e.g., ₹75)?**

Context:
- Order 1232972: room ₹1,500, discount ₹1,000, advance ₹500 → `balance_payment = 0`
- GST (SGST+CGST) = ₹75 — not covered by the discount
- Current (buggy): BALANCE = ₹0 (owner confirmed as "correct")
- After fix: BALANCE = ₹75 (GST portion still owed)

Options:
- **A**: Show ₹75 (mathematically correct — the ₹75 GST was not discounted)
- **B**: Show ₹0 (practical — when discount covers the room price minus advance, GST is also waived)

**OD-493-01 LOCKED = Option B (2026-10-06):** When the room discount zeroes out `balance_payment`, BALANCE column shows ₹0. GST is considered waived when the room balance reaches zero.

Fix implication: After adding `row.charge = match.res.charge ?? null`, the formula must guard `bp === 0`:
```javascript
const roomBalance = bp != null
  ? (bp === 0 ? 0 : Math.max(0, bp + chargeGst))   // OD-493-01 Option B: bp=0 → show ₹0
  : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0));
```

**All ODs LOCKED. Gate 2 can proceed.**

---

## Evidence

- **Curl probe:** local-reservations 3 in-house orders + single-order-new for 1232972
- **Evidence file:** `evidence/INV-492-CHECKOUT-DISPLAY/BUG493_probe_summary.json`
- **Evidence file:** `evidence/INV-492-CHECKOUT-DISPLAY/LR_inhouse_probe_RID69.txt`
- **Source:** AGENT-DISCOVERED + probe-CONFIRMED
- **Confidence:** HIGH

---

## Blast Radius

| File | Change |
|------|--------|
| `src/api/services/pmsService.js` | L~68: add `row.charge = match.res.charge ?? null` |

- **1 file, not a hotspot**
- **Blast radius: SMALL**

---

## Next

OD-493-01 needed from owner → Planning Gate 2 → 1-line fix.
