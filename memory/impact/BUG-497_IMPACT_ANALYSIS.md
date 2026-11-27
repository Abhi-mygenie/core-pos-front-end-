# BUG-497 — Gate 2 Impact Analysis

**Date:** 2026-10-06
**Role:** PLANNING (Gate 2 only)
**Risk:** HIGH (financial — overpayment at check-in creates negative checkout balance)
**Code Reality:** PARTIAL — `min={0}` present at both sites; `max` and reset behaviour missing

---

## Conflict Pre-Check

| File | Last touched | By | Lines we'll touch | Safe? |
|------|-------------|-----|-------------------|-------|
| `CheckInForm.jsx` | 2026-10-06 | BUG-495/492 IMPL | L187-203 (discount onChange), L225 (Collect Now) | ✅ non-overlapping with BUG-496 (L59-76, L199) |
| `CheckInPage.jsx` | 2026-10-06 | BUG-495/492 IMPL | L847 (advance input), L903 (discount onChange) | ✅ non-overlapping with BUG-496 (L271-280, L301) and BUG-500 (L254-259, L924-930) |

---

## Data Flow Trace

### CheckInForm.jsx — Collect Now

```
c.balance_due  = 9,620   ← booking balance (already deducts booking advance)
roomDiscountRs = 0..8000 ← live discount in ₹

Collect Now cap — CURRENT (L225):
  <input min={0} value={collect.amount} .../>  ← NO max
  Staff enters ₹12,000 → server stores Paid = 12,000
  Checkout balance = total(10,620) - paid(12,000) - booking_adv(1000) = -2,380 ← NEGATIVE!

Collect Now cap — CORRECT:
  max = Math.max(0, c.balance_due - roomDiscountRs)
      = Math.max(0, 9,620 - roomDiscountRs)
  At 0% discount:  max = 9,620
  At 88% discount: max = Math.max(0, 9620 - 7920) = 1,700
  (Note: at exact max discount where balance = 50, max collect-now = 50)

Collect Now reset — CURRENT (L187, L202):
  Discount type toggle: `setCiRoomDiscountType(t); setCiRoomDiscountAmt('')` — does NOT reset collect
  Discount amount onChange: `setCiRoomDiscountAmt(e.target.value)` — does NOT reset collect
  Staff enters Collect = 5,000 → then enters 88% discount → balance drops to ~1,700
  Collect still shows 5,000 → server overcollects by 3,300 ← WRONG

Collect Now reset — CORRECT:
  Discount type onClick: add `setCollect(k => ({ ...k, amount: '' }))`
  Discount amount onChange: add `setCollect(k => ({ ...k, amount: '' }))`

missing[] validation (L53):
  CURRENT: no check for collect > balance
  CORRECT: add `collectAmt > Math.max(0, Number(c.balance_due||0) - roomDiscountRs) && 'collect exceeds balance'`
```

### CheckInPage.jsx — Advance Payment (collect-now equivalent)

```
selected?.charge?.balance_due = 9,620  ← booking balance from LR
roomDiscountRs = 0..8000 (capped by effectiveBalanceDue via BUG-500)
form.advancePayment = ''  ← user enters collect-now amount

Advance Payment cap — CURRENT (L847):
  max={form.orderAmount || 0}  = 9,000  ← room rent only!
  Problem 1: ignores GST (total = 10,620, staff may legitimately collect up to 9,620)
  Problem 2: ignores discount (after 88% discount balance = ~134, max shown = 9,000 still)

CORRECT:
  max = Math.max(0, Number(selected?.charge?.balance_due || 0) - roomDiscountRs)
  = Math.max(0, 9,620 - roomDiscountRs)

formValid check (L283):
  CURRENT: `Number(form.advancePayment || 0) <= Number(form.orderAmount)` ← orderAmount as cap
  CORRECT: `Number(form.advancePayment || 0) <= Math.max(0, Number(selected?.charge?.balance_due || 0) - roomDiscountRs)`

Advance Payment reset — CURRENT (L903):
  onChange: `setCiRoomDiscountAmt(e.target.value)` — no reset
  CORRECT: add `setField('advancePayment', '')`

  Discount type toggle (L887-891):
  onClick: `setCiRoomDiscountType(t); setCiRoomDiscountAmt('')` — no reset
  CORRECT: add `setField('advancePayment', '')`
```

---

## Affected Lines — Final Edit Map

### CheckInForm.jsx

| Edit | Line | Current | Change | Risk |
|------|------|---------|--------|------|
| E1 | L225 | `<input min={0} .../>` — no max | Add `max={Math.max(0, Number(c.balance_due\|\|0) - roomDiscountRs)}` | HIGH |
| E2 | L53 | `missing[]` — no collect>balance check | Add `collectAmt > Math.max(0, Number(c.balance_due\|\|0) - roomDiscountRs) && 'collect exceeds balance'` | MEDIUM |
| E3a | L187 | `setCiRoomDiscountType(t); setCiRoomDiscountAmt('')` | Add `setCollect(k => ({ ...k, amount: '' }))` | MEDIUM |
| E3b | L202 | `setCiRoomDiscountAmt(e.target.value)` | Add `setCollect(k => ({ ...k, amount: '' }))` | MEDIUM |

**4 edits, 1 file.**

### CheckInPage.jsx

| Edit | Line | Current | Change | Risk |
|------|------|---------|--------|------|
| E4 | L847 | `max={form.orderAmount \|\| 0}` | `max={Math.max(0, Number(selected?.charge?.balance_due\|\|0) - roomDiscountRs)}` | HIGH |
| E5 | L283 | `form.advancePayment <= form.orderAmount` | Replace with `<= Math.max(0, Number(selected?.charge?.balance_due\|\|0) - roomDiscountRs)` | HIGH |
| E6a | L887-891 | discount type toggle onClick | Add `setField('advancePayment', '')` | MEDIUM |
| E6b | L903 | discount amount onChange | Add `setField('advancePayment', '')` | MEDIUM |

**4 edits, 1 file. Total: 8 edits across 2 files.**

---

## Downstream Consumers

| Consumer | Impact after fix |
|----------|-----------------|
| `collect.amount` → `collectNow` in checkIn payload (L86) | Correct collect-now sent |
| `form.advancePayment` → `advancePayment` in pmsCheckIn payload (L349) | Correct collect-now sent |
| `formValid` (L283) → Confirm button disabled state | Disabled when collect > balance — correct |
| Balance display `c.balance_due - roomDiscountRs` (L176) | Unaffected — read-only display |

---

## Interaction with BUG-500

BUG-500 fixes `effectiveBalanceDue` in CheckInPage. BUG-497 E4/E5 use `selected?.charge?.balance_due` directly — better source:
- `selected?.charge?.balance_due` = server-computed balance (₹9,620) — stable
- `effectiveBalanceDue` (BUG-500) is client-computed — depends on correct GST

Using `selected?.charge?.balance_due - roomDiscountRs` is preferred. **No dependency on BUG-500.**

---

## Walk-in Edge Case + Open Decision

Walk-in: `selected = { bookingType:'WalkIn' }` → `selected?.charge?.balance_due = undefined` → `Math.max(0, 0 - 0) = 0`
→ Advance Payment max = 0 → staff CANNOT collect anything for walk-in! ← WRONG

**OD-497-03 (OPEN — must resolve before Gate 3):**
For walk-in guests (no prior booking, no `charge.*`), what is the max for Collect Now / Advance Payment?

- **Option A (recommended):** Use `effectiveBalanceDue` (from BUG-500 fix) as fallback when `selected?.charge?.balance_due` is absent
  - `max = Math.max(0, (selected?.charge?.balance_due ?? effectiveBalanceDue) - roomDiscountRs)`
  - For walk-in: effectiveBalanceDue = orderAmount + GST - 0 = room total (correct)
  - For booked arrival: selected?.charge?.balance_due = 9,620 (correct)
- **Option B:** No max for walk-in (staff enters freely)

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| `c.balance_due` undefined for walk-in (CheckInForm) | OD-497-03 fallback resolves |
| `selected?.charge?.balance_due` undefined for walk-in (CheckInPage) | OD-497-03 fallback resolves |
| Reset blanks a valid collect amount on discount type switch | Acceptable — prevents silent overcollection |
| formValid change blocks Confirm for valid amounts | Only blocks invalid (collect > balance) — correct |

---

## Owner Decisions

| ID | Question | Status |
|----|----------|--------|
| OD-497-01 | max = balance_due − discount | LOCKED |
| OD-497-02 | reset on discount change | LOCKED |
| **OD-497-03** | **Walk-in Collect Now max — Option A or B?** | **OPEN — needs answer before Gate 3** |

---

**Gate 2 complete. OD-497-03 needed before Gate 3.**
**Files WILL change:** `CheckInForm.jsx` · `CheckInPage.jsx`
**Files WILL NOT touch:** pmsService.js · frontDeskService.js · CollectPaymentPanel.jsx · FolioCheckoutPanel.jsx
