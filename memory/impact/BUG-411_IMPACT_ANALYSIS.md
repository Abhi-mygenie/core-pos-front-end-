# Impact Analysis — BUG-411
## New CheckInPage: No Payment Method Picker for Advance

**Date:** 2026-09-15  **Agent:** PLANNING (ALPHA v0.7)  **Stage:** Gate 2
**Code Reality:** NONE — no paymentMethod state, no UI, no validation in CheckInPage
**Duplicate check:** DISTINCT
**Conflict pre-check:** CheckInPage.jsx last modified BUG-396/BUG-388/CR-380/CR-379 — all in separate sections (GST, ID docs, CRM). Zero edit-line conflicts.

---

## Risk Classification

**Risk: CRITICAL**  
Trigger: Financial + payment method classification — every advance collected is unclassified (payment_method=''). Affects revenue report `room_checkin_revenue` cash/card/UPI split. ALSO causes BUG-412 (folio shows wrong advance). Fix required before any room check-ins with advance.

---

## Data Flow Trace

```
CheckInPage handleConfirm
  → pmsCheckIn({ advancePayment: 500, paymentMethod: undefined })
      → pmsService L194: fd.append('payment_method', p.paymentMethod ?? '')   ← always ''
          → POST /pos/user-group-check-in   payment_method=''
              → Backend: cannot classify advance as Cash/Card/UPI
              → Backend: possibly stores advance_payment = room_price (BUG-412)
              → room_checkin_revenue.Room Cash/Card/UPI = wrong in Daily Report

FIX CHAIN:
  Add advancePaymentMethod state + UI picker in CheckInPage
  → pmsCheckIn({ paymentMethod: 'cash' })
  → fd.append('payment_method', 'cash')   ← pmsService already has this line
  → Backend correctly stores advance + payment method
  → BUG-412 resolves
```

**pmsService.js L194 already correct** — sends `payment_method` field. No pmsService change needed.

---

## Affected Files

### WILL CHANGE — `src/pages/pms/CheckInPage.jsx`

| Edit | Location | Current | Change |
|---|---|---|---|
| E1 | Line ~56 (after isCorpBooking state) | No payment method state | Add `const [advancePaymentMethod, setAdvancePaymentMethod] = useState('')` |
| E2 | Line ~63 (after roomGstSlabs) | No paymentMethodOptions | Add `const paymentMethodOptions = useMemo(...)` reading `restaurant?.paymentMethods` — same pattern as RoomCheckInModal:L366-373 |
| E3 | Line ~774 (advance input onChange) | `onChange={e => setField('advancePayment', e.target.value)}` | Add: when new value drops to 0, clear `advancePaymentMethod` |
| E4 | Line ~776 (after advance input) | Nothing | Add: when `Number(form.advancePayment) > 0` show Cash/Card/UPI radio pills (same RadioPillGroup pattern as old modal) |
| E5 | Line ~238 (formValid) | No payment method condition | Add: `&& (Number(form.advancePayment || 0) === 0 \|\| !!advancePaymentMethod)` |
| E6 | Line ~304 (handleConfirm pmsCheckIn call) | No paymentMethod param | Add: `paymentMethod: advancePaymentMethod` |
| E7 | selectArrival L~169 + selectWalkin L~210 | No method reset | Add `setAdvancePaymentMethod('')` in both reset blocks |

**~7 edit sites, ~30 lines total**

### WILL NOT TOUCH
- `pmsService.js` — `fd.append('payment_method', p.paymentMethod ?? '')` already correct
- `roomService.js` — separate flow, separate bug (BUG-410)
- Any transform, context, or other service

---

## Verification Matrix (seeds QA handover)

| # | Test | How to verify | Automated? |
|---|---|---|---|
| V1 | Enter advance ₹500 → Cash/Card/UPI picker appears | Browser: advance field | NO |
| V2 | Set advance to ₹0 → picker disappears | Browser: clear advance | NO |
| V3 | Advance ₹500 + no method → Confirm button disabled | Browser: formValid | NO |
| V4 | Advance ₹500 + Cash → Confirm enabled | Browser | NO |
| V5 | Submit: `payment_method: 'cash'` in network payload | DevTools Network tab | NO |
| V6 | Post check-in: folio Advance Paid = ₹500 (not ₹1000) | Folio page | NO |
| V7 | Advance = 0: `payment_method: ''` in payload (valid) | Network tab | NO |
| V8 | selectArrival/selectWalkin reset: method clears on new arrival select | Browser | NO |

---

## Owner Decisions: NONE — all details locked

Payment method options: Cash / Card / UPI from `restaurant.paymentMethods` (same as old modal). Required when advance > 0 (same rule as old modal BUG-027). No new decisions needed.

---

## Post-Code Registry Checklist (for Implementation agent)

- [ ] registry.json: BUG-411 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CheckInPage.jsx BUG-411
- [ ] Code marker: `// BUG-411` in every modified section
- [ ] webpack: 0 new warnings

*IA written 2026-09-15 · PLANNING agent (ALPHA v0.7)*
