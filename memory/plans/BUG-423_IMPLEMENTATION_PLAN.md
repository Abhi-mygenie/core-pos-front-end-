# BUG-423 — Implementation Plan: Folio Room Balance Excludes GST

**Code Reality:** CONFIRMED bug. `GuestFolioPage.jsx` L100 reads stored `remainingRoomBalance || balancePayment` — which may not include GST for old-modal guests.
**Conflict Pre-Check:** CR-364 (IMPLEMENTED) owns GuestFolioPage. BUG-401 (IMPLEMENTED) fixed checkout payload — does NOT read `roomBalance` from GuestFolioPage. No overlap. This plan is ADDITIVE to CR-364.
**Risk:** CRITICAL — Room Balance is the primary billing figure on the folio; drives Total Balance Due; displayed to guest and staff.
**Fast Lane:** NOT eligible (CRITICAL financial field, R6 — full gate cycle required).

---

## Owner Decisions Resolved

| ID | Question | Answer |
|----|----------|--------|
| OD-423-01 | Always compute room_balance = room_price + gst_tax - advance - amount_received? | **YES — always compute fresh, ignore stored balance_payment** |
| OD-423-02 | Total Balance Due = Room Balance + F&B Posted? | **YES** |
| (Q4/Q5) | Checkout Grand Total includes GST? ₹1000 + ₹50 - ₹130 = ₹920? | **YES — ₹920 is correct** |

---

## Impact Analysis

### Current behaviour
`GuestFolioPage.jsx` L100:
```js
const roomBalance = folio ? (folio.remainingRoomBalance || folio.balancePayment) : 0;
```
- `folio.remainingRoomBalance` = `rps.remaining_room_balance` — populated only if `room_payment_summary` sub-object exists in API response
- `folio.balancePayment` = `ri.balance_payment` — stored at check-in time

For **old modal guests**: `balance_payment = room - advance` (no GST). Folio shows ₹870 instead of ₹920.
For **new CheckInPage guests** (before BUG-422 fix): `balance_payment = room + gst - advance` = ₹920 → coincidentally correct but fragile and inconsistent.

After BUG-422 fix: new CheckInPage will also store `balance_payment = room - advance`. Without BUG-423, folio for ALL guests would then show ₹870 instead of ₹920.

**BUG-423 is the definitive fix:** compute from constituent fields regardless of stored value.

### Correct formula (OD-423-01)
```
roomBalance = max(0, room_price + gst_tax - advance_payment - receive_balance)
```

### Field availability in folioTransform.fromAPI() — all present, no change needed
| Formula field | folio object field | Source in raw API |
|--------------|-------------------|-------------------|
| room_price | `folio.roomPrice` | `num(ri.room_price)` |
| gst_tax | `folio.gstTax` | `num(ri.gst_tax)` |
| advance_payment | `folio.advancePayment` | `num(ri.advance_payment)` |
| receive_balance | `folio.receiveBalance` | `num(ri.receive_balance)` |

**No new API call. No transform change. Single-line formula change in GuestFolioPage.jsx.**

### Impact on Total Balance Due
L312: `{fmtINR(roomBalance + fnbTotal)}` already uses `roomBalance`. Once L100 is fixed, Total Balance Due is automatically correct. No additional edit.

### Impact on PmsCheckoutDrawer
PmsCheckoutDrawer fetches its own data independently — does NOT read `roomBalance` from GuestFolioPage state. The checkout Grand Total calculation is separate. **Out of scope.**

### Side observation: PmsCheckoutDrawer double-counts F&B — RETRACTED
Owner confirmed (2026-09-16): "Transferred Orders" = order #000065 and "Room Orders" = order #000063 — two genuinely separate orders, different dishes, same amount by coincidence. Grand Total ₹1,214 = ₹1,000 + ₹107 + ₹107 is correct for F&B. **False flag — no new intake needed.**

### New highlighted issues (found during investigation — owner to register via intake agent)

**G1 — Room Orders section missing on folio LHS**
The folio page has no "Room Orders" section. Only transferred orders are shown under "F&B Posted to Room". Room-native orders (items ordered directly at the room table) exist in `raw.items[]` from `SINGLE_ORDER_NEW` but are not mapped or displayed.
- Design: New card on LHS with item name, qty, rate, date, total per item + Room Orders Total
- Row click: expand inline to show item breakdown (owner confirmed)
- Data source: `raw.items[]` filtered to exclude check-in marker items
- **Status: Pending intake registration**

**G4 — PmsCheckoutDrawer ROOM balance excludes GST**
PmsCheckoutDrawer shows ROOM ₹1,000 (missing GST ₹50). Dashboard checkout shows correct ₹1,050. Root cause: fresh `SINGLE_ORDER_NEW` call returns `remaining_room_balance = 1000` (backend excludes GST); CollectPaymentPanel prefers this over `balance_payment`.
- Fix path: **Path A** (owner confirmed) — compute inside PmsCheckoutDrawer before passing to CollectPaymentPanel: override `roomInfo.roomPaymentSummary.remainingRoomBalance` with `roomPrice + gstTax − advance − receiveBalance`
- All required fields available in `detail.roomInfo` from `orderFromAPI.order(raw)`
- **Status: Pending intake registration — may fold into BUG-423 scope or separate CR per owner**

---

## Implementation Plan

### Edit E1 — Replace roomBalance derivation with live formula

| Field | Value |
|-------|-------|
| File | `src/pages/pms/GuestFolioPage.jsx` |
| Line | 100 |
| Current | `const roomBalance = folio ? (folio.remainingRoomBalance \|\| folio.balancePayment) : 0;` |
| New | See below |

```js
// BUG-423: compute room balance fresh from constituent fields (OD-423-01).
// Formula: room_price + gst_tax - advance_paid - amount_received
// Ignores stored balance_payment — it may be stale or exclude GST for old-modal check-ins.
// R6 note: this is a display formula only; no financial value is sent to backend here.
const roomBalance = folio
  ? Math.max(0,
      (folio.roomPrice      ?? 0) +
      (folio.gstTax         ?? 0) -
      (folio.advancePayment ?? 0) -
      (folio.receiveBalance ?? 0)
    )
  : 0;
```

**Net change:** 1 line replaced with 9 lines.

### Edit E2 — No change to Total Balance Due display
L312 `{fmtINR(roomBalance + fnbTotal)}` already uses `roomBalance` — automatically correct after E1. No edit needed.

---

## Verification Matrix

| # | Check | Method |
|---|-------|--------|
| 1 | Old-modal guest: room ₹1000, GST ₹50, advance ₹130 → Room Balance = ₹920 | Browser `/pms/folio/:id` |
| 2 | New-CheckInPage guest: same numbers → Room Balance = ₹920 | Browser |
| 3 | Guest with mid-stay payment received (receive_balance > 0) → balance decreases | Browser |
| 4 | Total Balance Due = Room Balance + F&B Posted (e.g. ₹920 + ₹107 = ₹1,027) | Browser |
| 5 | Zero advance guest → Room Balance = room_price + gst_tax | Browser |
| 6 | Folio screenshot match: owner's "dashboard" guest (no advance) → should show ₹1,050 = ₹1000 + ₹50 | Compare |
| 7 | No compile error | webpack |

---

## New Bug Flag (from investigation)
**PmsCheckoutDrawer F&B double-count** — Grand Total ₹1,214 shows order #000065 (₹107) under both "Transferred Orders" and "Room Orders". Expected: ₹1,107 = ₹1,000 + ₹107. Recommend new intake after BUG-423 ships.

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-423 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: `pages/pms/GuestFolioPage.jsx` + BUG-423
- [ ] Code marker: `// BUG-423` in formula block
- [ ] Compile: 0 new warnings

---

```
Planning complete: BUG-423
Stage: Impact Analysis + Implementation Plan
Code reality: CONFIRMED BUG (stale stored value, L100)
Risk: CRITICAL (financial display — primary billing document)
Files WILL change: src/pages/pms/GuestFolioPage.jsx (L100 → 9 lines)
Files WILL NOT touch: folioTransform.js, pmsService.js, PmsCheckoutDrawer.jsx, all others
Owner decisions: OD-423-01 and OD-423-02 resolved
Side-flag retracted: double-count was two genuine separate orders — confirmed by owner
New highlighted issues: G1 (Room Orders section missing on folio) + G4 (PmsCheckoutDrawer ROOM balance no GST) — pending intake registration by owner
Next: Gate 4 GO (CRITICAL — owner approval required) / Implementation
```
