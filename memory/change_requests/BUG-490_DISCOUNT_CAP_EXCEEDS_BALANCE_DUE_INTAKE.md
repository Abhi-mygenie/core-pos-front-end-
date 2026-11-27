# BUG-490 — Room discount cap missing: can exceed balance due (advance already paid not respected)

**ID:** BUG-490
**Type:** BUG
**Date:** 2026-10-05
**Registered by:** Intake agent (session 2026-10-05)
**Status:** GATE_1_INTAKE
**Sprint:** oct_bug_batch
**Risk:** MEDIUM
**Severity:** P1
**Related:** BUG-489 (CheckInForm discount), CR-407 (CheckInPage + FolioCheckoutPanel discount)

---

## Description

On all three check-in / checkout discount entry points, the discount input has **no upper cap enforced against the guest's actual outstanding balance**. A cashier can enter a discount of ₹6,700 (or 100%) even when the guest has already paid ₹700 advance and only owes ₹6,335 — sending a discount larger than the balance due to the backend.

**Owner statement:** "it should not over the advance payment — if guest already paid advance ₹700 at time of booking, can't give discount 100% or ₹6,700."

---

## Evidence

- **Screenshot 1 (owner-provided, 2026-10-05):** Amount mode — ₹6,700 entered → badge −₹6,700. Balance due is ₹6,335 (advance ₹700 already paid). Discount exceeds outstanding balance by ₹365.
- **Screenshot 2 (owner-provided, 2026-10-05):** Percent mode — 100% entered → badge −₹6,700. Same problem.
- **Static trace:** grep confirms `max={undefined}` on Amount input in `CheckInForm.jsx` + `FolioCheckoutPanel.jsx`. `CheckInPage.jsx` uses `max={form?.orderAmount}` (booking_charge pre-GST) which also exceeds balance_due when advance > 0.
- **Source:** OWNER-REPORTED + AGENT-CONFIRMED (static trace)
- **Confidence:** CONFIRMED

---

## Duplicate Check

- Registry keyword search: "discount cap", "balance_due", "max discount", "over advance" — no existing entry
- CR-407 / BUG-489: introduced discount UI (no cap logic included) — **RELATED (parent)**, not duplicate
- BUG-427 (Folio balance display): different issue — balance display gap, not input validation
- **Duplicate check: DISTINCT — Related: CR-407, BUG-489**

---

## Code Reality

**NONE** — no cap logic in any of the three target files.

```
grep "Math.min|balance_due.*discount|discount.*balance_due" → 0 hits in all 3 files
```

---

## Root Cause

| File | Amount `max` | Percent `max` | `balance_due` available |
|------|-------------|---------------|------------------------|
| `CheckInForm.jsx` | **`undefined`** — no cap | `100` | ✅ `c.balance_due` (line 163) |
| `CheckInPage.jsx` | **`form?.orderAmount`** = booking_charge (₹6,700), still > balance_due (₹6,335) when advance > 0 | `100` | ❌ must compute: `orderAmount + gstTotal − advancePayment` |
| `FolioCheckoutPanel.jsx` | **`undefined`** — no cap | `100` | ✅ `c.balance_due` (line 137) |

**Additional gap (Percent mode):** `roomDiscountRs` useMemo in all three computes raw ₹ from booking_charge × pct/100. Result never capped at `balance_due`. So 100% → ₹6,700 even when only ₹6,335 is owed.

**Note — FolioCheckoutPanel B-E5 Percent path is already correct:** uses `balanceDue = order.roomInfo?.balancePayment ?? 0` as the percent base for the payload. But the input `max` and onChange are still uncapped for Amount mode.

---

## Severity

**P1 — HIGH**
- Cashier can accidentally (or intentionally) apply a discount larger than what the guest owes
- Backend may reject (422) or silently apply — either way the UI should prevent it
- No workaround visible to staff — UI shows no warning or cap
- Financial implication: over-discounting at check-in reduces room revenue beyond what was agreed

---

## Risk Classification

**MEDIUM**
- Input validation change only — no financial formula change
- `c.balance_due` and `c.advance_payment` are already present in all three components
- None of the 3 files is an R5 hotspot
- Fast Lane NOT eligible (3 files, each needs 2 line changes)

---

## Blast Radius

| File | Change |
|------|--------|
| `components/pms/frontdesk/CheckInForm.jsx` | `max` on input + `Math.min` cap in useMemo |
| `pages/pms/CheckInPage.jsx` | `max` on input + `Math.min` cap in useMemo (using `effectiveBalanceDue = orderAmount + gstTotal − advancePayment`) |
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | `max` on input in RoomSection + `Math.min` cap in onChange |

- **3 files, no hotspots**
- **Blast radius: SMALL–MEDIUM** (2 line changes per file, ~6 lines total)

---

## Fix Sketch (for Planning)

### CheckInForm.jsx
```javascript
// useMemo — cap result at balance_due (OD-490: balance_due = what guest owes)
const roomDiscountRs = useMemo(() => {
  const raw = parseFloat(ciRoomDiscountAmt) || 0;
  if (raw <= 0) return 0;
  const cap = Number(c.balance_due || 0);
  if (ciRoomDiscountType === 'Percent') {
    return Math.min(Math.floor(Number(c.booking_charge || 0) * raw / 100), cap);
  }
  return Math.min(Math.floor(raw), cap);
}, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge, c.balance_due]);

// input max
max={ciRoomDiscountType === 'Percent' ? 100 : Number(c.balance_due || 0) || undefined}
```

### CheckInPage.jsx
```javascript
// Add effectiveBalanceDue (after existing gstTotal computation)
const effectiveBalanceDue = useMemo(() =>
  Math.max(0, Number(form?.orderAmount || 0) + (gstTotal || 0) - Number(form?.advancePayment || 0)),
  [form?.orderAmount, form?.advancePayment, gstTotal]
);

// useMemo — cap at effectiveBalanceDue
return Math.min(Math.floor(raw or percent result), effectiveBalanceDue);

// input max
max={ciRoomDiscountType === 'Percent' ? 100 : effectiveBalanceDue || undefined}
```

### FolioCheckoutPanel.jsx
```javascript
// RoomSection — input max
max={roomDiscountType === 'Percent' ? 100 : Number(c.balance_due || 0) || undefined}

// onChange — cap Amount input at balance_due
onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), Number(c.balance_due || 0)))}
```

---

## Next

Planning Gate 2 → Gate 3 → Gate 4 GO → Implementation.
P1 — recommend same sprint as BUG-489 / CR-407 (oct_bug_batch).
