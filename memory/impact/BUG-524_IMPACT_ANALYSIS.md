# BUG-524 — Room Discount Alert Clamped (Folio Checkout)
## Impact Analysis (Gate 2)

**Date:** 2026-10-09
**Code Reality:** NONE — fix not yet applied
**Conflict Pre-Check:** BUG-516..522 touch `FolioCheckoutPanel.jsx` at GATE_5A_IMPLEMENTED — different lines (RoomDiscountControls L54+L74 not touched by those bugs). Parallel-safe.
**Risk:** MEDIUM — UI validation alert, no financial calculation change

---

## 1. Root Cause

`RoomDiscountControls` (sub-component inside `FolioCheckoutPanel.jsx`) has two bugs:

**Bug A — L74 onChange clamps the value:**
```js
// Current L74
onChange={e => setRoomDiscount(
  Math.min(
    Math.max(0, parseFloat(e.target.value) || 0),
    roomDiscountType === 'Percent' ? maxPct : (maxCheckoutDiscount ?? ...)
  )
)}
```
→ `roomDiscount` is clamped ≤ `maxPct` immediately → can never exceed it → `discountOverMax` always false → alert never shows.

**Bug B — L54 discountOverMax only checks Percent mode:**
```js
// Current L54
const discountOverMax = roomDiscountType === 'Percent' && Number(roomDiscount) > maxPct;
```
→ Amount mode never triggers alert (even if typing above maxCheckoutDiscount).

**Reference behavior (CheckInForm.jsx L246-247 + L86-88 — confirmed as desired pattern):**
```js
// CheckInForm: raw value stored, NO clamping
onChange={e => { setCiRoomDiscountAmt(e.target.value); }}

// discountOverMax covers both modes
const discountOverMax =
  (ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct) ||
  (ciRoomDiscountType === 'Amount'  && parseFloat(ciRoomDiscountAmt) > maxFlat);
```

---

## 2. Data Flow Trace

```
User types "20" in Percent discount input (maxPct = 17)
  → onChange fires with e.target.value = "20"
  → Math.min(20, 17) = 17  ← clamped immediately
  → setRoomDiscount(17)
  → roomDiscount = 17
  → discountOverMax = (17 > 17) = FALSE
  → alert NOT rendered ✗

Fix: remove clamp → setRoomDiscount(20)
  → discountOverMax = (20 > 17) = TRUE
  → alert renders ✓
  → handlePaid guard (L278) also blocks submission ✓
```

---

## 3. Affected Files

**WILL CHANGE:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
  - L54: Extend `discountOverMax` to Amount mode (mirror CheckInForm BUG-507 pattern)
  - L74: Remove `Math.min` clamp from `onChange` (store raw value like CheckInForm)

**WILL NOT TOUCH:**
- `CheckInForm.jsx` — already correct (BUG-507 fixed this there)
- `CheckInPage.jsx` — no change
- `CollectPaymentPanel.jsx` (R5) — no change
- `handlePaid` / payment logic — no change (L278 guard already present: `if (discountOverMax) { setPayError(...); return; }`)

---

## 4. Lines to change

| Edit | File | Line | Current | New |
|---|---|---|---|---|
| E1 | FolioCheckoutPanel.jsx | 54 | `Percent only check` | `(Percent && > maxPct) \|\| (Amount && > maxCheckoutDiscount ?? baseBalance ?? 0)` |
| E2 | FolioCheckoutPanel.jsx | 74 | `Math.min(Math.max(0, v), clamp)` | `Math.max(0, parseFloat(e.target.value) \|\| 0)` |

Note: E2 removes the full clamp expression. The HTML `max` attribute on the input (L71) still provides native browser validation hint. The `discountOverMax` check (E1) + `handlePaid` guard (L278) prevent submission.

---

## 5. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| User types extreme value, submits without reading alert | LOW | `handlePaid` L278 already blocks: `if (discountOverMax) { setPayError(...); return; }` |
| Amount mode alert shows on valid amounts | LOW | Condition: `Amount && roomDiscount > maxCheckoutDiscount ?? baseBalance ?? 0` — same math as existing max cap |
| Regression on BUG-516..522 (different lines in same file) | LOW | Those edits are at L258-317 (handlePaid) and L42-52 (maxPct) — no overlap |

---

## 6. Owner Decisions

None. Owner confirmed: "there should be alert like check in form." Behavior to mirror is unambiguous (CheckInForm L246-247 + L86-88).

---

## 7. Verification

| # | What to verify | Method |
|---|---|---|
| V1 | Percent: type above maxPct → alert appears, stays visible | Browser: Folio checkout → type 99% → alert shows |
| V2 | Percent: submit while above maxPct → blocked with payError | Browser: type 99% → click Checkout → error message shown |
| V3 | Amount: type above maxCheckoutDiscount → alert appears | Browser: Amount mode → type 99999 → alert shows |
| V4 | Percent: type within max → no alert | Browser: type 10% (within 17%) → no alert |
| V5 | Amount: type within max → no alert | Browser: Amount mode → type 100 → no alert |
| V6 | webpack 0 new warnings | `tail frontend.out.log` |

---

Code Reality: NONE
Conflict: PARALLEL-SAFE (BUG-516..522 at different lines in same file)
Owner decisions: NONE
Next: Gate 3 Implementation Plan
