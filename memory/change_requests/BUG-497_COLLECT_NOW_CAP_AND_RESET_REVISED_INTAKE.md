# BUG-497 — Intake (REVISED 2026-10-06)

**ID:** BUG-497
**Date created:** 2026-10-06
**Revised:** 2026-10-06 — Extended to CheckInPage.jsx legacy; added Collect Now reset requirement (F9)
**Source:** OWNER-REPORTED + INV-LOGIN-BOOKING-PHASE_2026_10_06
**Severity:** P1 — HIGH
**Risk:** HIGH (data integrity — overpayment creates negative folio balance at checkout)
**Sprint:** oct_bug_batch
**Duplicate check:** DISTINCT
**Blast radius:** MEDIUM (2 files, 5 edit sites — was 1 file, 2 sites)
**Fast Lane eligible:** NO (financial, 2 files)

---

## ⚠️ REVISION NOTICE

**Scope extended from 1 file → 2 files:**
- Original plan covered CheckInForm.jsx only (Front Desk Beta)
- CheckInPage.jsx (Legacy) has the SAME problem at L847 + new reset requirement
- Owner stated: "if due balance change by changing discount this field will get reset"
  → This is a NEW behavior requirement not in original plan

**Previous plan (`plans/BUG-497_IMPLEMENTATION_PLAN.md`) is SUPERSEDED.**

---

## Description

### Problem A — CheckInForm.jsx: Collect Now has no max cap (original finding, unchanged)

`collect.amount` input (L225) has `min={0}` but no `max`. Staff can type any amount.
→ Server stores inflated "Paid so far" → negative balance at checkout.

### Problem B — CheckInPage.jsx: Advance Payment max is wrong (NEW scope)

`form.advancePayment` input (L847): `max={form.orderAmount}` = ₹9,000 (room rent)
Should be: `Math.max(0, selected?.charge?.balance_due − roomDiscountRs)`

Example: room ₹9,000, booking advance ₹1,000, balance_due ₹9,620, no check-in discount
- Current max: ₹9,000 (room rent — wrong, ignores GST and booking advance)
- Correct max: ₹9,620 (balance_due from LR — what guest still owes)
  If staff enters ₹9,620 + the ₹1,000 booking advance = ₹10,620 → overcollected by ₹1,000

### Problem C — Both pages: Collect Now does NOT reset when discount changes (NEW requirement)

Owner stated: "if due balance change by changing discount this field will get reset"

Current: Entering a discount does not affect Collect Now / Advance Payment value.
Staff may have entered ₹5,000 in Collect Now, then applies a discount → balance drops to ₹3,000
→ Collect Now stays at ₹5,000 (overcollects by ₹2,000) → negative checkout balance.

Required: when `ciRoomDiscountAmt` or `ciRoomDiscountType` changes → reset Collect Now to empty.

---

## Owner Decisions

**OD-497-01 (original — max = balance_due):** KEPT
`max = Math.max(0, balance_due − roomDiscountRs)`
- CheckInForm: `balance_due = c.balance_due`
- CheckInPage: `balance_due = Number(selected?.charge?.balance_due || 0)`

**OD-497-02 (NEW — reset on discount change):** LOCKED 2026-10-06
When discount input changes (either amount or type) → Collect Now field resets to empty string ''
Owner verbatim: "if due balance change by changing discount this field will get reset"

---

## Fix Scope (Gate 3 plan will follow)

| # | File | Site | Change |
|---|------|------|--------|
| E1 | CheckInForm.jsx | L225 collect input | Add `max={Math.max(0, Number(c.balance_due\|\|0) - roomDiscountRs)}` |
| E2 | CheckInForm.jsx | L51-54 missing[] | Add `collectAmt > cap && 'collect exceeds balance'` guard |
| E3 | CheckInForm.jsx | discount onChange | Add `setCollect(k => ({...k, amount: ''}))` when discount type or amount changes |
| E4 | CheckInPage.jsx | L847 advance input max | Change `max={form.orderAmount}` → `max={Math.max(0, Number(selected?.charge?.balance_due\|\|0) - roomDiscountRs)}` |
| E5 | CheckInPage.jsx | discount input onChange (L903) | Add `setField('advancePayment', '')` when discount changes |

**Files WILL NOT touch:** FolioCheckoutPanel.jsx · pmsService.js · frontDeskService.js · any other file

---

## Evidence

- **INV report:** `investigations/INV-LOGIN-BOOKING-PHASE_2026_10_06.md` §F7/F8/F9
- **Code trace:**
  - CheckInForm.jsx L225: `<input type="number" min={0} value={collect.amount} onChange=...>` — no max
  - CheckInPage.jsx L847: `max={form.orderAmount || 0}` = room rent, not balance_due
  - CheckInForm.jsx L193-220 (discount inputs): no setCollect reset on change
  - CheckInPage.jsx L903: discount onChange `setCiRoomDiscountAmt(e.target.value)` — no advancePayment reset
- **Confidence:** HIGH

---

## Verification Matrix

| # | Check | How |
|---|-------|-----|
| V1 | CheckInForm Collect Now max = balance_due − discount | DevTools: max attr on checkin-collect-amount = correct value |
| V2 | Typing > max clamps to max | Enter 99999 → clamps |
| V3 | CheckInPage Advance max = balance_due − discount | DevTools: max attr on ci-advance = correct value |
| V4 | Collect Now resets when discount entered | Type discount → Collect Now clears |
| V5 | Collect Now resets when discount type changed | Switch % ↔ ₹ → Collect Now clears |
| V6 | Empty Collect Now = 0 downstream | Number('' || 0) = 0 — safe |
| V7 | Compile: 0 new warnings | tail frontend.out.log |

---

## Post-Code Checklist

```
- [ ] registry.json: BUG-497 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx — BUG-497 2026-10-06
- [ ] Code markers: // BUG-497 in every modified block
- [ ] Compile: 0 new warnings
```

---

## Conflict Check

| File | Other active items | Safe? |
|------|------------------|-------|
| CheckInForm.jsx | BUG-496 (L69-76, L199) | ✅ non-overlapping |
| CheckInPage.jsx | BUG-496 (L271-280, L301), BUG-500 (L254-259, L924) | ✅ different lines |

**Status:** GATE_1_INTAKE_REVISED → Gate 2 + Gate 3 needed before Gate 4 GO
