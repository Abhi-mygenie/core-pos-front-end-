# BUG-757 — Gate 2 Impact Analysis
## RoomCheckInModal: Nights Not Auto-Calculated When Checkout Date Changed

**ID:** BUG-757
**Date:** 2026-11-27
**Role:** PLANNING — Gate 2 (Impact Analysis only)
**Code Reality:** NONE — no existing fix
**Conflict pre-check:** `RoomCheckInModal.jsx` last touched CR-479 (2026-11-01, PhoneInputField). No open items.

---

## 1. Root Cause (from Investigation)

`RoomCheckInModal` has two independent state variables driving the booking period:
```javascript
const [nights, setNights] = useState(1);                      // L330
const [checkoutDate, setCheckoutDate] = useState(addDays(today,1));  // L332
```

The AUTO-SYNC effect runs in one direction only — from `nights` to `checkoutDate`:
```javascript
// L452-464: Auto-sync checkout FROM nights
useEffect(() => {
  if (manualCheckout) return;         // ← BLOCKS after user touches checkout
  setCheckoutDate(addDays(checkinDate, nights));  // nights → checkoutDate only
}, [nights, checkinDate, manualCheckout, checkoutDate]);
```

**Checkout date `onChange` handler — BREAK POINT (L1347):**
```javascript
// What it does:
onChange={(e) => {
  setManualCheckout(true);        ← blocks auto-sync permanently
  setCheckoutDate(e.target.value);
  if (e.target.value) clearErr('checkout');
  // ← setNights() NEVER called
}}

// What it should also do:
// const n = Math.max(1, Math.round((new Date(e.target.value) - new Date(checkinDate)) / 86400000));
// setNights(n);
```

**After user picks checkout = 11/30 (3-night stay):**

| State | Value | Correct? |
|-------|-------|----------|
| `nights` | 1 | ❌ WRONG |
| `checkoutDate` | 2026-11-30 | ✅ |
| `manualCheckout` | true | ✅ (expected) |

**Downstream impact of wrong `nights` state:**

| Computation | Uses | Result |
|------------|------|--------|
| Nights display (`value={nights}`) | `nights = 1` | Displays **1** ❌ |
| `gstTax` useMemo (L366-376) | `nights` | 1-night GST ❌ |
| `balancePayment` useMemo (L378-383) | `gstTax(nights=1)` | 1-night balance displayed ❌ |
| Submit `gstTax` (L725, local const) | `stayNights = 3` | 3-night GST ✅ |
| Submit `balancePayment` (L749) | STATE `balancePayment` (1-night) | 1-night balance submitted ❌ |

**Financial impact:** The backend receives `balancePayment` = 1-night room price + 1-night GST. The room is booked with an under-stated balance. Example: ₹1,000/night × 3 nights = ₹3,000+GST owed; system submits ₹1,000+GST.

**NOT affected:** `CheckInPage.jsx` uses the correct pattern:
```javascript
// CheckInPage.jsx L251-253: formNights correctly derived from date diff
const formNights = useMemo(() => {
  return Math.max(1, Math.round((new Date(form.checkout) - new Date(form.checkin)) / 86400000));
}, [form?.checkin, form?.checkout]);
```

---

## 2. Affected Files

| File | Change needed | Risk |
|------|--------------|------|
| `src/components/modals/RoomCheckInModal.jsx` | **WILL CHANGE** — L1347: add `setNights(n)` in checkout date `onChange` | MEDIUM (financial, PMS) |
| `src/pages/pms/CheckInPage.jsx` | **WILL NOT TOUCH** (uses correct `formNights` useMemo pattern) | |
| `src/pages/pms/CheckInForm.jsx` | **WILL NOT TOUCH** | |

---

## 3. Fix Direction

**File:** `RoomCheckInModal.jsx` — not in R5 hotspot list.

**Edit at L1347:** Add nights recalculation when checkout date changes:

```javascript
// Current (L1347):
onChange={(e) => { setManualCheckout(true); setCheckoutDate(e.target.value); if (e.target.value) clearErr('checkout'); }}

// Fix (L1347):
onChange={(e) => {
  setManualCheckout(true);
  setCheckoutDate(e.target.value);
  if (e.target.value && checkinDate) {
    const n = Math.max(1, Math.round(
      (new Date(e.target.value + 'T00:00:00') - new Date(checkinDate + 'T00:00:00')) / 86400000
    ));
    setNights(n);    // ← sync nights to match new checkout date
  }
  if (e.target.value) clearErr('checkout');
}}
```

The `+T00:00:00` suffix matches the existing `addDays` / `computeRoomGst` date parsing convention in this file (see L253 in CheckInPage: `new Date(form.checkout + 'T00:00:00')`).

**Scope:** 1 file (`RoomCheckInModal.jsx`), ~4 lines (expand onChange from 1 line to ~7 lines), no API contract change, no service change.

---

## 4. Owner Decisions

**OD-757-01 (OPEN):** When the user changes checkout date, should `manualCheckout` stay `true` (preventing the auto-sync effect from running) or be reset?

- **Option A (recommended):** Keep `setManualCheckout(true)` as-is. The user has explicitly chosen a checkout date — the auto-sync (which derives checkout from nights) should stay blocked. But now `nights` is also updated, so the display is correct.
- **Option B:** Reset `setManualCheckout(false)` after updating nights. This would re-enable auto-sync, so a subsequent checkin date change would re-derive checkout from the new nights value. Slightly safer but the same end state.

Agent recommends **Option A** — it matches the existing UX intent (checkout date + auto-computed nights, auto-sync blocked).

---

## 5. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Edge: checkout set to same date as checkin (0 nights) | LOW | `Math.max(1, ...)` clamps minimum to 1 night |
| gstTax recalculates with new nights on each keystroke | LOW | `gstTax` is a useMemo — React batches re-renders; no performance issue |
| manualCheckout=true blocks auto-sync permanently | NONE | Expected behaviour — user chose checkout date explicitly |
| Submit balancePayment now correct | POSITIVE | `balancePayment` useMemo will use correct nights GST after fix |

---

## 6. Verification Matrix

| # | Verification | Method |
|---|-------------|--------|
| V1 | Setting checkout to 3 days after checkin shows Nights=3 | Browser: open Dashboard check-in, pick checkout 3 days out |
| V2 | Balance shown = room price × 3 nights + GST | Browser: verify Balance field updates |
| V3 | Changing nights input directly still works (reverse sync) | Browser: type 5 in Nights → checkout updates to checkin+5 |
| V4 | CheckIn button submits correct balancePayment | Network tab: verify payload `balancePayment` matches displayed amount |
| V5 | CheckInPage.jsx check-in flow unaffected | Browser: check in via PMS direct flow |

---

## 7. Conflict Register

`RoomCheckInModal.jsx` last modifiers:
- **CR-479** (2026-11-01): PhoneInputField — edits at L20, L301, L946-972 — **line-disjoint** from L1347
- **BUG-422** (2026-09-16): gstTax useMemo + balancePayment — edits at L363-381 — **line-disjoint** from L1347

No conflicts.

**Gate 2 IA complete. Awaiting Gate 3 GO.**
