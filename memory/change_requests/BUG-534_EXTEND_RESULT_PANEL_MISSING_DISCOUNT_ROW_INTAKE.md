# BUG-534 — Intake

## ExtendStayForm Result Panel Missing "Check-in Discount" Row After Extension

**Date:** 2026-10-10
**Type:** BUG / FE_DISPLAY_GAP
**Priority:** P1
**Risk:** HIGH (cashier sees unexplained ₹1,050 gap between Total and Balance — could cause confusion at handoff)
**Area:** PMS / Front Desk / ExtendStayForm result panel
**Sprint:** oct_bug_batch
**Registered by:** INVESTIGATION role (INV-EXTEND-STAY-POST-EXTENSION-BUGS_2026_10_10.md)
**Related:** BUG-533 (extended enrichedRow hoist — provides `row.roomDiscountAmount`), BUG-535 (same session, folio bug)

---

## Duplicate Check

**DISTINCT.**
- BUG-533: Fixed pre-confirm "Current bill" display — added two-row display with discount. Separate panel.
- BUG-534: Post-confirm result panel (after "Confirm" is clicked). Different JSX block, different data source (`result.charge` not `row.charge`).
- BUG-535: Different file (FolioCheckoutPanel), different calculation bug.

---

## Symptom (from screenshot)

After clicking "Confirm" on the Extend Stay form:
- Result panel shows: Booking charge ₹13,400 → SGST ₹335 → CGST ₹335 → **Total (incl. GST) ₹14,070** → Paid so far ₹2,000 → **Balance due ₹11,020**
- **No "Check-in discount" row** is shown
- The numbers are arithmetically inconsistent: ₹14,070 − ₹2,000 = ₹12,070 ≠ ₹11,020
- The ₹1,050 difference (discount ₹1,000 + GST saving ₹50) is invisible to the cashier

## Expected

Result panel shows:
```
Booking charge        ₹13,400
Check-in discount    −₹1,000    ← MISSING
SGST                   ₹335
CGST                   ₹335
Total (incl. GST)    ₹14,070    (per contract: rc.total_with_gst = rack total)
────────────────────────────
Paid so far           ₹2,000
Balance due          ₹11,020    (per contract: rc.balance_due = server authority)
```

---

## Code Reality Check

**NONE — fix not applied.**

```
ExtendStayForm.jsx result panel (lines ~77-82):
  rc.booking_charge  → ₹13,400   PRESENT
  rc.sgst            → ₹335      PRESENT
  rc.cgst            → ₹335      PRESENT
  rc.total_with_gst  → ₹14,070   PRESENT
  rc.advance_payment → ₹2,000    PRESENT
  rc.balance_due     → ₹11,020   PRESENT
  Check-in discount row          ABSENT  ← fix needed
```

---

## Root Cause

The result panel JSX has no "Check-in discount" row. The backend's `result.charge` contract:
- `rc.total_with_gst` = rack total (no discount applied here — correct per contract)
- `rc.balance_due` = server authority (discount already net — correct per contract)

`row.roomDiscountAmount = ₹1,000` IS available via `enrichedRow` (BUG-533 hoists it). Insert display row using this value.

**IMPORTANT:** Do NOT subtract `room_discount_amount` from `rc.balance_due` — the balance is already correct from the server.

---

## Fix (FE only — independent)

Insert between "Booking charge" and "SGST" in result panel:
```jsx
{(row.roomDiscountAmount ?? 0) > 0 && (
  <>
    <span className="text-[#767676]">Check-in discount</span>
    <span className="text-right text-[#329937]" data-testid="extend-bill-discount">
      −{fmtINR(row.roomDiscountAmount)}
    </span>
  </>
)}
```

---

## Evidence

- Source: OWNER-REPORTED (screenshots 2026-10-10) + AGENT-CONFIRMED (code trace)
- Contract doc: `extend_stay_charge_fe.md` (owner-uploaded)
- Screenshot: result panel shows no discount row despite ₹1,050 gap
- Confidence: HIGH

---

## Blast Radius

| File | R5? | Change |
|------|-----|--------|
| `src/components/pms/frontdesk/ExtendStayForm.jsx` | NO | +2 JSX lines in result panel |

**Scope:** SMALL (1 file, 2 lines, NOT R5)
**Fast Lane eligible:** YES (1 file, ≤10 lines, NOT R5, display-only, not financial payload, not hotspot)
**Owner must approve Fast Lane.**

---

## Gate Status

- Gate 1: COMPLETE (this document)
- Gate 2: PENDING (or skip via Fast Lane with owner approval)
- Gate 3: PENDING
- Gate 4 GO: NOT given

---

## Next

Fast Lane eligible — owner to confirm. Or "Gate 2 GO BUG-534" for full gate.
