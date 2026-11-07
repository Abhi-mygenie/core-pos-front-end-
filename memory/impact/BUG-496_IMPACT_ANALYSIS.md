# BUG-496 — Gate 2 Impact Analysis

**Date:** 2026-10-06
**Role:** PLANNING (Gate 2 only)
**Risk:** HIGH (financial — wrong discount cap affects room discount at check-in)
**Code Reality:** PARTIAL — BUG-495 formula exists at both sites; needs replacement

---

## Conflict Pre-Check

| File | Last touched | By | Lines we'll touch | Safe? |
|------|-------------|-----|-------------------|-------|
| `CheckInForm.jsx` | 2026-10-06 | BUG-495 IMPL | L69-76 maxPct | ✅ — replacing BUG-495 formula |
| `CheckInPage.jsx` | 2026-10-06 | BUG-495 + BUG-492 IMPL | L271-280 maxPct, L301 gstBase | ✅ — replacing BUG-495 formula |

No conflicts with BUG-497 (touches L225/L847/L903) or BUG-500 (touches L254-259/L924-930). All non-overlapping lines.

---

## Data Flow Trace

### CheckInForm.jsx — Front Desk Beta

```
row.charge (LR data)
  ├── c.booking_charge  = 9,000   ← room rent
  ├── c.advance_payment = 1,000   ← booking advance (CORRECT source)
  ├── c.sgst            = 810
  ├── c.cgst            = 810
  └── c.balance_due     = 9,620

maxPct (L69-76) — CURRENT (BUG-495):
  gstRate      = (810 + 810) / 9000 = 0.18
  gstOnAdvance = 1000 × 0.18 = 180
  maxPct       = floor((9000 - 1000 - 180) / 9000 × 100) = floor(86.89) = 86

maxPct — CORRECT (OD-496-01 revised):
  maxPct = floor(Math.max(0, 9000 - 1000) / 9000 × 100) = floor(88.89) = 88

roomDiscountRs cap (L59-67) — CURRENT:
  cap = c.balance_due = 9,620  ← TOO HIGH
  For Amount mode: allows ₹9,620 discount on ₹9,000 room (more than room rent!)

roomDiscountRs cap — CORRECT:
  cap = Math.max(0, bc - advance) = 9000 - 1000 = 8,000
  For Percent: Math.min(floor(bc × pct / 100), 8000)
  For Amount:  Math.min(floor(raw), 8000)

Discount Amount input max (L199) — CURRENT:
  max={c.balance_due} = 9,620  ← too high (>room rent)

Discount Amount input max — CORRECT:
  max={Math.max(0, bc - advance)} = 8,000
```

**SCOPE ADDITION vs intake:** `roomDiscountRs` (L59-67) cap must also change from `c.balance_due` to `Math.max(0, bc - advance)`. The intake only noted maxPct. Adding as E1b — same file, no risk increase.

### CheckInPage.jsx — Legacy

```
form.orderAmount    = a.amount = r.amount_after_tax = 9,000  ← room rent
form.advancePayment = ''  ← collect-NOW field (starts EMPTY, NOT booking advance!)

selected            = the chosen arrival row (set in selectArrival at L173)
selected.charge     = LR charge object
  ├── .advance_payment = 1,000   ← BOOKING advance (correct source)
  └── .balance_due     = 9,620

maxPct (L271-280) — CURRENT (BUG-495):
  bc      = form.orderAmount = 9,000
  advance = form.advancePayment = 0  ← WRONG! collect-now starts empty
  gstOnAdvance = computeRoomGst(slabs, 0 × nights, nights, 1) = 0
  maxPct = floor((9000 - 0 - 0) / 9000 × 100) = 100  ← 100% — entire room free!

maxPct — CORRECT:
  bookingAdv = Number(selected?.charge?.advance_payment || 0) = 1,000
  maxPct = floor(Math.max(0, 9000 - 1000) / 9000 × 100) = 88

gstBase at submit (L301) — CURRENT:
  const gstBase = Number(form.orderAmount)  ← full price, ignores discount
  Sends GST on full ₹9,000 even if discount applied

gstBase — CORRECT:
  const gstBase = Math.max(0, Number(form.orderAmount) - roomDiscountRs)
  Sends GST on discounted price (e.g. ₹1,000 after 88% discount → 5% slab = ₹50)

roomDiscountRs cap (L263-270) — CURRENT:
  cap = effectiveBalanceDue (owned by BUG-500, will be fixed there)
  After BUG-500 fix, effectiveBalanceDue will correctly reflect ~8,054 (discounted + GST)
  This gives a reasonable cap naturally — no separate change needed here
  → Leave roomDiscountRs cap as-is (delegates to effectiveBalanceDue)
```

---

## Affected Lines — Final Edit Map

### CheckInForm.jsx

| Edit | Line | Current | Change | Risk |
|------|------|---------|--------|------|
| E1 | L69-76 | BUG-495 maxPct formula using gstOnAdvance | `floor(Math.max(0, bc-advance)/bc×100)` | HIGH |
| E1b | L59-67 | `roomDiscountRs` cap = `c.balance_due` (9620, too high) | cap = `Math.max(0, bc - advance)` (8000) | HIGH |
| E2 | L199 | `max={c.balance_due}` (9620 for Amount mode) | `max={Math.max(0, bc - advance)}` (8000) | MEDIUM |

**3 edits, 1 file.**

### CheckInPage.jsx

| Edit | Line | Current | Change | Risk |
|------|------|---------|--------|------|
| E3 | L271-280 | BUG-495 maxPct using `form.advancePayment` (=0) | `floor(Math.max(0, bc-bookingAdv)/bc×100)` where `bookingAdv = Number(selected?.charge?.advance_payment\|\|0)` | HIGH |
| E4 | L301 | `const gstBase = Number(form.orderAmount)` | `const gstBase = Math.max(0, Number(form.orderAmount) - roomDiscountRs)` | HIGH |

**2 edits, 1 file. Total: 5 edits across 2 files.**

---

## Downstream Consumers

| Consumer | Impact after fix |
|----------|-----------------|
| `maxPct` → `discountOverMax` (L77/L281) | Recalculates correctly — no change to logic |
| `maxPct` → discount input `max` attr (L199/L900) | Correct cap shown in browser |
| `roomDiscountRs` → `roomDiscount` in payload (L90/L368) | Correct ₹ sent to backend |
| `roomDiscountRs` → balance display (L176/L909) | Correct balance shown |
| `gstBase` → `gstTax` in pmsCheckIn payload (L354) | Correct GST sent to backend |

---

## New Variable (CheckInPage only)

```js
// Add inside maxPct useMemo (L272), AFTER selectArrival sets `selected`:
const bookingAdv = Number(selected?.charge?.advance_payment || 0);
```

`selected` is already in scope (useState at L34, set in selectArrival at L173). No new state.

---

## Walk-in Edge Case

- CheckInForm: `c.advance_payment = 0` → `maxPct = floor(bc/bc × 100) = 100%` ✓ (full discount allowed)
- CheckInPage: `selected = { bookingType:'WalkIn' }` → `selected?.charge?.advance_payment = undefined` → `bookingAdv = 0` → `maxPct = 100%` ✓

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| `selected` is null before arrival selected | `selected?.charge?.advance_payment || 0` → safe, returns 0 |
| Walk-in `selected.charge` is undefined | `|| 0` fallback → maxPct = 100% (correct for walk-in) |
| `bc = 0` edge case | Guard: `if (!bc) return 100` unchanged |
| `advance > bc` edge case | `Math.max(0, bc - advance)` → 0, maxPct = 0% (no discount possible — correct) |
| Removing sgst/cgst from maxPct deps | No longer read in function body — lint clean |

---

## Owner Decisions

All locked. OD-496-01 RE-LOCKED 2026-10-06. No new decisions needed.

---

**Gate 2 complete. Ready for Gate 3 (Implementation Plan) on owner GO.**
**Files WILL change:** `CheckInForm.jsx` · `CheckInPage.jsx`
**Files WILL NOT touch:** CheckInPage.jsx effectiveBalanceDue (→ BUG-500) · CollectPaymentPanel.jsx · pmsService.js · frontDeskService.js · FolioCheckoutPanel.jsx
