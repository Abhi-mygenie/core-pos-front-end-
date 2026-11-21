# BUG-744 — Impact Analysis (Gate 2)

**Item:** BUG-744 — Order screen: prefilled customer shows CRM suggestions without focus
**Role:** PLANNING (Gate 2 — Impact Analysis). No app code changed.
**Date:** 2026-11-21 · **Risk:** MEDIUM (R5 hotspot, display-only) · **Code Reality:** CONFIRMED
**Intake:** `bugs/BUG-744_ORDER_CUSTOMER_SUGGESTION_WITHOUT_FOCUS_INTAKE.md`

## 1. Code Reality (verified)
`CartPanel.jsx`:
- Customer state `customerName`/`customerPhone` (L943-944); `isCustomerSelected` (L952, starts `false`); `filteredByName`/`filteredCustomers` (L950-951).
- **Sync effect L972-979:** when the `customer` prop is present, sets `isCustomerSelected = !!(customer.id || (customer.name && customer.phone))`. → **A customer loaded from an existing order IS treated as selected** and suppressed. So the bug is NOT the order-load path.
- **Name effect L1001-1016 / Phone effect L983-998:** when `!isCustomerSelected`, call `searchCustomers()` and `setShow*Suggestions(filtered.length>0)` — visibility set purely on match, **no focus flag**.
- **Visibility close paths:** only `selectCustomer` (L1040-1041), blank-out in `handleName/PhoneChange` (L1053-1057/1068-1072), and **outside mousedown** (L1019-1034). `onBlur={handleFieldBlur}` (L1180/1225) does **NOT** close the dropdown. `onFocus` (L1181) / phone `onChange` (L1223) open it.

## 2. Root Cause
Two compounding gaps for the **manual-entry** path (cashier types name + phone, not picked from dropdown, no order-loaded customer):
1. **Manual entry never flips `isCustomerSelected` true** — unlike the credit block (CollectPaymentPanel) there is no auto-select when the phone reaches a valid length. So the self-matching CRM record keeps both effects "eligible" indefinitely.
2. **Dropdown visibility is not tied to focus** — blurring the field does not close it (`onBlur` only runs `handleFieldBlur`). The overlay stays painted until an outside mousedown. Re-renders with the same value keep it shown.

Net: after typing a name/phone that matches an existing CRM record, the "saurav / 9990004354" dropdown lingers under both fields with the field no longer focused.

## 3. Data flow
`type name/phone → handleName/PhoneChange sets state → effect L1001/L983 searchCustomers → setShow*Suggestions(true)` … nothing resets it on blur. (No API payload involved — pure client display.)

## 4. Fix direction (for Gate 3 — not built)
Port the BUG-660 pattern to CartPanel (single file):
- Close suggestions on blur: add an `onBlur` that `setTimeout(() => setShow*Suggestions(false), ~150)` (timeout lets `onMouseDown` selection fire first), OR gate visibility on a `nameFocused`/`phoneFocused` flag.
- Optionally treat a manually-entered valid-phone CRM match as selected (mirror credit-block `lookupCustomer` auto-select) so the self-match stops re-opening.
- Do NOT change payloads or `selectCustomer`/`onCustomerChange` contract.

## 5. Affected files
- `frontend/src/components/order-entry/CartPanel.jsx` (R5) — effects L983-1016 + name/phone field `onBlur` (L1180, L1225). **1 file.**
- **Out of scope / NOTE:** CollectPaymentPanel credit block already fixed by BUG-660; its name effect (L664-683) lacks the `wasUserTyped` guard but is gated by `tabIsCustomerSelected` — fold a matching guard there ONLY if the owner reports the credit block too (kept separate from BUG-745 to avoid shared-file coupling).

## 6. Conflict pre-check
No open item on `CartPanel.jsx` (recent CartPanel work shipped). BUG-744 touches CartPanel only; **BUG-745 touches CollectPaymentPanel only → no shared-file lock between the two.**

## 7. Risk register
| Risk | L | I | Mitigation |
|---|---|---|---|
| Blur-close hides dropdown before a click selects | Med | Med | 150ms timeout (proven BUG-038/coupon pattern L1694) or use `onMouseDown` (already used) |
| Auto-select-on-valid-phone changes manual-entry UX | Low | Low | Optional; keep minimal = blur-close only if owner prefers |

## 8. Handover
```
Gate 2 complete: BUG-744
Code reality: CONFIRMED · Risk: MEDIUM · 1 file (CartPanel.jsx)
RC: manual entry never sets isCustomerSelected + dropdown visibility not tied to focus (onBlur doesn't close)
No owner decision required (behaviour obvious). Next: PLANNING Gate 3 (port BUG-660 blur/focus pattern).
No app code changed.
```
