# BUG-113 — Partial Payment UI Stuck — Auto-Fill Locks Cash/Card/UPI Amount Fields

**Status:** INTAKE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** CollectPaymentPanel.jsx (likely)

---

## 1. Problem Statement (Owner Verbatim)

> In partial payment, when we are doing a partial payment for cash, card and UPI, the UI gets stuck. Auto-filling is happening for the amount, and we are not able to refill that amount. That needs to be checked.

---

## 2. Symptom

When selecting **Partial Payment** mode (Cash + Card + UPI split), the amount input fields auto-fill with a value and the user **cannot clear or re-enter** a different amount. The UI effectively locks the input — typing is ignored or overwritten by the auto-fill logic.

---

## 3. Expected Behavior

User should be able to:
1. See the total amount pre-filled or distributed across payment methods
2. **Clear** any individual field (Cash / Card / UPI)
3. **Type a custom amount** for each payment method
4. Remaining balance auto-calculates into the last field (or shows as "remaining")

---

## 4. Likely Affected Files

| File | Role |
|---|---|
| `CollectPaymentPanel.jsx` | Payment mode selection, partial payment inputs, amount state management |
| Possibly `CartPanel.jsx` | If partial payment UI is embedded in cart |

---

## 5. Suspected Root Cause (To Investigate)

- Auto-fill logic (e.g., `onChange` or `useEffect`) may be overwriting user input on every render
- Controlled input with a derived/computed value that resets on state change
- Race condition between user keystroke and auto-balance recalculation

---

## 6. Open Questions

| # | Question |
|---|---|
| Q-113-1 | Which payment methods are involved? (Cash + Card, Cash + UPI, all three?) |
| Q-113-2 | Does this happen on fresh orders only, or also on existing (postpaid) orders? |
| Q-113-3 | Is the total amount correct but just uneditable, or is the calculation also wrong? |

---

## 7. Next Steps

1. Code investigation of partial payment input handling in `CollectPaymentPanel.jsx`
2. Reproduce the stuck state
3. Identify the auto-fill/overwrite logic
4. Fix input control to allow user override
