# BUG-422 — Implementation Plan: Old Modal balance_payment Missing GST (CORRECTED)

> **CORRECTION NOTE (2026-09-16):** Earlier version of this plan had the analysis reversed.
> Correct finding: New CheckInPage formula is RIGHT. Old modal formula is WRONG.
> See investigation session 2026-09-16 for full walk-through.

**Code Reality:** CONFIRMED BUG in old modal only. `RoomCheckInModal.jsx` L363-367 computes `balance_payment = room - advance` (no GST). New CheckInPage `pmsService.js` L193 already stores `balance_payment = room + gst - advance` (correct).
**Conflict Pre-Check:** BUG-410 (IMPLEMENTED) added `computeRoomGst` import + `gstTax` computation inside `handleSubmit` only. This plan adds a component-level `gstTax` useMemo and wires it into `balancePayment`. No conflict — additive change.
**Risk:** CRITICAL — `balance_payment` is sent to backend on check-in. Affects folio, night audit, reconciliation.
**Fast Lane:** NOT eligible (CRITICAL financial field, R6).

---

## Owner Decision Confirmed

| ID | Question | Answer |
|----|----------|--------|
| OD-422-01 | Should balance_payment include GST? | **YES — ₹920 is the correct amount (room ₹1,000 + GST ₹50 − advance ₹130). Old modal was missing GST. Fix old modal to match new CheckInPage.** |

---

## Impact Analysis

### Current state

| Path | File | `balance_payment` stored | Correct? |
|------|------|--------------------------|----------|
| New CheckInPage | `pmsService.js` L193 | `orderAmount + gstTax − advance` = ₹1,050 | ✅ Correct — no change |
| Old modal | `RoomCheckInModal.jsx` L363–367 | `room − advance` = ₹1,000 | ❌ Missing GST — **THIS IS THE BUG** |

### Why this matters
Guests checked in via the old modal (dashboard room card) get `balance_payment = ₹1,000` stored. Staff and backend see ₹50 less than the real balance. Night audit, folio display, and reconciliation all read from this stored value.

### Field availability for fix
`computeRoomGst` is already imported at L13. Required inputs are all available as component-level state:
- `roomGstApplicable` — L295
- `roomGstSlabs` — L296
- `roomPrice` — state variable
- `nights` — state variable (L328)

The existing `gstTax` at L705 is computed **inside `handleSubmit` only** — not accessible to the `balancePayment` useMemo at L363. Fix: add a dedicated component-level `gstTax` useMemo.

---

## Implementation Plan

### Edit E1 — Add component-level `gstTax` useMemo in RoomCheckInModal

| Field | Value |
|-------|-------|
| File | `src/components/modals/RoomCheckInModal.jsx` |
| Location | After `roomGstSlabs` declaration (~L296), before `balancePayment` useMemo (~L363) |
| Action | Add new useMemo that computes `gstTax` from available state |

```js
// BUG-422: component-level gstTax so balancePayment can include it
const gstTax = useMemo(() => {
  const { gstTotal } = computeRoomGst(
    roomGstApplicable,
    roomGstSlabs,
    Number(roomPrice) || 0,
    nights,
    1
  );
  return gstTotal;
}, [roomGstApplicable, roomGstSlabs, roomPrice, nights]);
```

### Edit E2 — Fix `balancePayment` useMemo to include GST

| Field | Value |
|-------|-------|
| File | `src/components/modals/RoomCheckInModal.jsx` |
| Line | L363–367 |
| Current | `return (o - a).toFixed(2)` |
| New | `return (o + gstTax - a).toFixed(2)` — add `gstTax` to deps array |

```js
// BUG-422: include accommodation GST in balance_payment (same formula as new CheckInPage)
const balancePayment = useMemo(() => {
  const o = Number(roomPrice) || 0;
  const a = Number(advancePayment) || 0;
  return (o + gstTax - a).toFixed(2);
}, [roomPrice, advancePayment, gstTax]);
```

### Edit E3 — New CheckInPage: NO CHANGE
`pmsService.js` L193 formula `balance_payment = orderAmount + gstTax - advance` is already correct. No edit.

---

## Verification Matrix

| # | Check | Method |
|---|-------|--------|
| 1 | Old modal: room ₹1,000, GST ₹50, advance ₹130 → network payload `balance_payment = 920` | DevTools Network |
| 2 | Old modal: `gst_tax = 50` still sent separately (BUG-410 unchanged) | Network tab |
| 3 | Old modal: room ₹1,000, no advance → `balance_payment = 1050` | Network tab |
| 4 | New CheckInPage: balance_payment unchanged (still includes GST) | Network tab |
| 5 | Folio (BUG-423 in place): shows correct balance regardless | Browser |
| 6 | No compile error | webpack |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-422 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: `components/modals/RoomCheckInModal.jsx` + BUG-422
- [ ] Code marker: `// BUG-422` in E1 and E2
- [ ] Compile: 0 new warnings

---

```
Planning complete: BUG-422 (CORRECTED plan)
Stage: Impact Analysis + Implementation Plan
Code reality: CONFIRMED BUG in old modal (L363-367 missing GST)
Risk: CRITICAL (financial field — full gate cycle required, owner approval needed)
Files WILL change: src/components/modals/RoomCheckInModal.jsx (E1: +1 useMemo, E2: formula fix)
Files WILL NOT touch: pmsService.js (new CheckInPage already correct), GuestFolioPage.jsx, all others
Owner decisions: OD-422-01 confirmed — balance_payment MUST include GST
Next: Gate 4 GO (CRITICAL) / Implementation
```
