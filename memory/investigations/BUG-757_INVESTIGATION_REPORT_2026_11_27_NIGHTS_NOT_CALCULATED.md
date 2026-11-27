# BUG-757 — Investigation Report: Nights Not Auto-Calculated in Room Check-In from Dashboard

**ID:** BUG-757
**Date:** 2026-11-27
**Role:** INVESTIGATION (Role 6)
**Steps used:** 8/10
**Confidence:** HIGH

---

## 1. Summary

| Field | Value |
|-------|-------|
| **Root cause** | `RoomCheckInModal` has `nights` as an independent state variable (default 1). The checkout date `onChange` handler updates `checkoutDate` state and sets `manualCheckout=true`, but **never calls `setNights()`**. The auto-sync effect that derives checkout from nights is then permanently blocked (`if (manualCheckout) return`). The displayed nights stays at 1 regardless of what checkout date is chosen. |
| **Classification** | FE_BUG / CODE_ERROR |
| **Confidence** | HIGH |
| **Files** | `RoomCheckInModal.jsx` lines 330-335, 452-464, 1328, 1347 |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result |
|---|-----------|------|--------|
| H1 | The checkout date change does not update `nights` state | Code trace line 1347 onChange | **CONFIRMED** — `setNights` never called |
| H2 | A useMemo re-derives `nights` from checkout | Search for formNights/useMemo in RoomCheckInModal | ELIMINATED — no such useMemo exists in RoomCheckInModal |
| H3 | The submit payload uses correct nights (date-computed) | Code trace line 724 | PARTIAL — submit gstTax uses stayNights (correct), but submitted `balancePayment` uses state (wrong) |

---

## 3. Data Flow Trace

```
RoomCheckInModal opens from Dashboard:
  nights        = useState(1)                   ← independent state
  checkoutDate  = useState(addDays(today, 1))   ← independent state
  manualCheckout = useState(false)

Auto-sync effect [L452-464]:
  → If manualCheckout → SKIP                    ← blocks reverse sync
  → Otherwise: checkoutDate = addDays(checkinDate, nights)
     (derives checkout FROM nights, not the reverse)

User enters Check-out Date 11/30/2026 [L1347]:
  onChange = {
    setManualCheckout(true),     ← blocks the auto-sync effect
    setCheckoutDate("2026-11-30"),
    clearErr('checkout')
    ← setNights() NEVER called   ← BREAK POINT
  }

State after user picks 11/30:
  nights        = 1              ← WRONG (unchanged)
  checkoutDate  = 2026-11-30    ← correct
  manualCheckout = true

UI display:
  Nights input: value={nights} = 1              ← displays WRONG
  Balance:  = roomPrice + gstTax(nights=1) - advance
            = 1000 + ~50 - 0 = ~1050            ← WRONG (should be 3-night based)
  Checkout: 11/30/2026                          ← correct

SUBMIT payload [L724-760]:
  stayNights = Math.max(1, round((checkoutDate - checkinDate)/86400000)) = 3  ← correct
  gstTax (local) = computeRoomGst(..., stayNights=3) = 3-night GST          ← correct
  BUT:
  balancePayment = STATE value = roomPrice + gstTax(nights=1) - advance      ← WRONG
  ← balancePayment sent to API uses 1-night GST, not 3-night GST
```

**BREAK POINT:** `RoomCheckInModal.jsx` L1347 — checkout date `onChange` has `setManualCheckout(true)` and `setCheckoutDate(value)` but **does not call `setNights(newNightsFromDiff)`**.

---

## 4. Impact

| Item | Actual value | Displayed / submitted value |
|------|-------------|---------------------------|
| Nights display | 3 (11/27 → 11/30) | 1 ← WRONG |
| Balance display | ₹3000 + 3-night GST | ₹1000 + 1-night GST ← WRONG |
| Submitted `nights` | — | Derived from `stayNights` at submit = 3 ← CORRECT |
| Submitted `gstTax` | 3-night GST | 3-night GST (local const) ← CORRECT |
| Submitted `balancePayment` | 3-night balance | 1-night balance (from state) ← **WRONG** |
| Submitted `checkoutDate` | 11/30/2026 | 11/30/2026 ← correct |

**Financial impact:** The backend receives `balancePayment` = wrong (1-night room price + 1-night GST). The room check-in is booked with an under-stated balance. The cashier displays wrong balance to the guest.

---

## 5. Evidence

| Artifact | Detail |
|----------|--------|
| Screenshot (Check-in modal) | Check-in 11/27, Checkout 11/30, Nights=1, Balance=1000.00 |
| nights state initialisation | `RoomCheckInModal.jsx` L330: `const [nights, setNights] = useState(1)` |
| Checkout onChange (missing setNights) | `RoomCheckInModal.jsx` L1347 |
| Auto-sync effect blocked | `RoomCheckInModal.jsx` L455: `if (manualCheckout) return` |
| Nights input display | `RoomCheckInModal.jsx` L1327: `value={nights}` |
| Submit stayNights | `RoomCheckInModal.jsx` L724: computed correctly |
| Submit balancePayment | `RoomCheckInModal.jsx` L749: `balancePayment` from state (1-night) |

Saved to: `/app/memory/evidence/BUG-757/`

---

## 6. Recommendations

**Classification:** FE_FIX

**Fix scope:** `RoomCheckInModal.jsx` — 1 line in checkout date `onChange` handler (L1347), NOT an R5 hotspot

Add `setNights(...)` when checkout date changes:

```javascript
// L1347 — current
onChange={(e) => { setManualCheckout(true); setCheckoutDate(e.target.value); if (e.target.value) clearErr('checkout'); }}

// Fixed — also update nights from date diff
onChange={(e) => {
  setManualCheckout(true);
  setCheckoutDate(e.target.value);
  if (e.target.value && checkinDate) {
    const n = Math.max(1, Math.round((new Date(e.target.value) - new Date(checkinDate)) / 86400000));
    setNights(n);
  }
  if (e.target.value) clearErr('checkout');
}}
```

**Risk:** LOW (state sync fix, no API change, no financial logic change — only corrects the sync direction)
**Planning skip eligible:** YES — 1 file, ≤5 lines, not R5 hotspot
**Owner approval required for planning skip:** YES

---

## 7. Retroactive Candidates

None — this is a new bug in `RoomCheckInModal.jsx`. The `CheckInPage.jsx` check-in flow is NOT affected (it uses `formNights` as a useMemo from date diff, which is the correct pattern).
