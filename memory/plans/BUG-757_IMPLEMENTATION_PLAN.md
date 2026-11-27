# BUG-757 — Gate 3 Implementation Plan
## RoomCheckInModal: Nights Not Auto-Calculated When Checkout Date Changed

**ID:** BUG-757
**Date:** 2026-11-27
**Role:** PLANNING — Gate 3 (Implementation Plan)
**Based on IA:** `impact/BUG-757_IMPACT_ANALYSIS.md`
**OD locked:** OD-757-01 = **Option A** (keep `manualCheckout = true` after checkout date change)
**Awaiting:** Gate 4 GO

---

## 1. Entry Verification

Anchors verified at HEAD:

| Edit | File | Line | Current content | Match? |
|------|------|------|----------------|--------|
| E1 | `RoomCheckInModal.jsx` | 1347 | `onChange={(e) => { setManualCheckout(true); setCheckoutDate(e.target.value); if (e.target.value) clearErr('checkout'); }}` | ✅ |
| E2 | `RoomCheckInModal.jsx` | 1314 | `onChange={(e) => { setCheckinDate(e.target.value); if (e.target.value) clearErr('checkin'); }}` | ✅ |
| (scope) | `RoomCheckInModal.jsx` | 328–332 | `nights`, `manualCheckout`, `checkoutDate`, `checkinDate` all as state vars in scope | ✅ |

---

## 2. OD-757-01 = Option A — Implications for Plan

**Option A: keep `manualCheckout = true` after checkout date change.**

This means: once the cashier picks a checkout date, that date is **locked**. The auto-sync effect (`nights → checkout`) is permanently blocked. Two edits are required for a consistent experience:

| Edit | Trigger | Action |
|------|---------|--------|
| **E1** | User changes checkout date | Update `nights` to reflect `checkoutDate − checkinDate` |
| **E2** | User changes checkin date (after checkout was locked) | Re-derive `nights` from `checkoutDate − new checkinDate` (checkout stays fixed per Option A) |

**E2 is required by Option A** — if checkin changes after checkout is locked, nights must re-sync to stay accurate with the fixed checkout date. Without E2, changing checkin would leave nights stale.

---

## 3. Scope Lock

**Files WILL change:**
- `src/components/modals/RoomCheckInModal.jsx` — 2 edits (E1 at L1347, E2 at L1314)

**Files WILL NOT touch:**
- `src/pages/pms/CheckInPage.jsx` (uses correct `formNights` useMemo — not affected)
- `src/pages/pms/CheckInForm.jsx`
- Any service, context, or transform file

---

## 4. Edits

### E1 — `RoomCheckInModal.jsx` line 1347 (checkout date `onChange`)

**Current:**
```javascript
                        onChange={(e) => { setManualCheckout(true); setCheckoutDate(e.target.value); if (e.target.value) clearErr('checkout'); }}
```

**New:**
```javascript
                        onChange={(e) => {
                          setManualCheckout(true); // OD-757-01=A: checkout date locks after manual edit
                          setCheckoutDate(e.target.value);
                          if (e.target.value && checkinDate) { // BUG-757 E1: sync nights to date diff
                            const n = Math.max(1, Math.round(
                              (new Date(e.target.value + 'T00:00:00') - new Date(checkinDate + 'T00:00:00')) / 86400000
                            ));
                            setNights(n);
                          }
                          if (e.target.value) clearErr('checkout');
                        }}
```

**Why:** When the cashier picks a checkout date, `nights` must update to reflect the actual stay duration. Currently it stays at 1 regardless, causing a wrong nights display, wrong GST calculation, and a wrong `balancePayment` submitted to the backend.

---

### E2 — `RoomCheckInModal.jsx` line 1314 (checkin date `onChange`)

**Current:**
```javascript
                      onChange={(e) => { setCheckinDate(e.target.value); if (e.target.value) clearErr('checkin'); }}
```

**New:**
```javascript
                      onChange={(e) => {
                        setCheckinDate(e.target.value);
                        if (e.target.value && manualCheckout && checkoutDate) { // BUG-757 E2: re-derive nights when checkout is locked (OD-757-01=A)
                          const n = Math.max(1, Math.round(
                            (new Date(checkoutDate + 'T00:00:00') - new Date(e.target.value + 'T00:00:00')) / 86400000
                          ));
                          setNights(n);
                        }
                        if (e.target.value) clearErr('checkin');
                      }}
```

**Why (Option A requirement):** When checkout is locked (`manualCheckout = true`) and the cashier changes the checkin date, the checkout date stays fixed but nights must re-compute to stay accurate. Without E2: cashier picks checkout = 11/30 (nights=3), then corrects checkin from 11/27 to 11/28 → nights stays 3 but should become 2. E2 fixes this case cleanly.

**Guard:** `manualCheckout && checkoutDate` ensures E2 only fires after the cashier has explicitly set a checkout date. If the cashier hasn't touched checkout yet, the auto-sync effect handles the normal `nights → checkout` direction.

---

## 5. Full State Machine After Fix

| User action | nights | checkoutDate | manualCheckout | auto-sync effect |
|------------|--------|-------------|----------------|-----------------|
| Form opens | 1 | today+1 | false | active |
| Types "3" in Nights | 3 | today+3 | false (reset by nights onChange) | active → updates checkout |
| Picks checkout 11/30 (**E1**) | **3** ← new | 11/30 | true | BLOCKED |
| Changes checkin to 11/28 (**E2**) | **2** ← new | 11/30 | true | BLOCKED (checkout locked) |
| Types "4" in Nights | 4 | 11/28+4=12/02 | false (reset) | active again |

---

## 6. Verification Matrix

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V1 | Pick checkout 3 days out → Nights shows 3 | Open Dashboard check-in, set checkout = checkin+3 | Nights = 3 |
| V2 | Balance shows correct amount | V1 continued | Balance = roomPrice × nights + GST(3-night) |
| V3 | Change checkin after picking checkout → Nights re-derives | After V1, change checkin to checkin+1 | Nights = 2 (checkout stays fixed at 11/30) |
| V4 | Type in Nights directly → checkout updates | Type "5" in Nights field | checkout = checkin+5; manualCheckout=false |
| V5 | Submit balancePayment matches display | Complete check-in; inspect network tab | `balancePayment` in payload = displayed balance |
| V6 | CheckInPage.jsx check-in unaffected | Use PMS direct check-in flow (not dashboard modal) | Unchanged behaviour |
| V7 | Compile clean | `yarn build` | 0 new warnings |

---

## 7. Post-Code Registry Checklist

```
[ ] registry.json: BUG-757 → status: GATE_5A_IMPLEMENTED, sprint_key: dec_sprint
[ ] BUG_TRACKER.md: row updated → GATE_5A_IMPLEMENTED
[ ] FILE_OWNERSHIP.md: RoomCheckInModal.jsx entry → BUG-757 + date
[ ] Code markers: // BUG-757 E1 and // BUG-757 E2 in RoomCheckInModal.jsx
[ ] Compile: webpack 0 new warnings
```

---

## 8. Risk Register

| Risk | Level | Note |
|------|-------|------|
| gstTax recalculates with every nights change | LOW | gstTax is a useMemo; React batches re-renders; no performance issue |
| Edge: checkout = checkin (0-day diff) | LOW | `Math.max(1, ...)` clamps to minimum 1 night |
| balancePayment overstated if nights wrong | NONE | With fix, nights is always correct after either edit |
| Conflict with CR-479 (PhoneInputField, L946-972) | NONE | Line-disjoint from L1314 and L1347 |
| Conflict with BUG-422 (gstTax/balancePayment useMemo, L366-383) | NONE | Line-disjoint; we're fixing the data that feeds those useMemos, not the useMemos themselves |

---

**Awaiting Gate 4 GO.**
