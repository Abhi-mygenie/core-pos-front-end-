# BUG-497 — Intake

**ID:** BUG-497
**Date:** 2026-10-06
**Source:** OWNER-REPORTED (screenshot, INV-497 Point 2)
**Severity:** P1 — MEDIUM
**Risk:** MEDIUM (data integrity — overpayment creates negative balance at checkout)
**Sprint:** oct_bug_batch
**Duplicate check:** DISTINCT
**Blast radius:** SMALL (1 file, 1-2 lines)
**Fast Lane eligible:** NO (data integrity risk, financial implication)

---

## Description

The "Collect Now" input in `CheckInForm.jsx` (Arrivals panel check-in) has `min={0}` but no `max` attribute and no validation against the current balance due.

Screenshot: Balance due = ₹335 (after ₹4,650 discount), but Collect Now input shows ₹5,000 accepted.

Overpaying at check-in means the server stores an inflated "Paid so far", resulting in a negative balance at checkout (hotel would owe the guest a refund).

---

## Owner Decisions

No OD needed. Clear validation gap — max = balance_due.

---

## Evidence

- **Screenshot:** Collect Now = ₹5,000 on ₹335 balance
- **Code trace:** `CheckInForm.jsx` L225 — no `max`, no `missing[]` check for collect > balance
- **Confidence:** HIGH

---

## Fix Scope

| # | File | Site | Change |
|---|------|------|--------|
| E1 | CheckInForm.jsx | L225 collect input | Add `max={Math.max(0, Number(c.balance_due||0) - roomDiscountRs)}` |
| E2 | CheckInForm.jsx | L51-54 missing[] | Add `collectAmt > Math.max(0, Number(c.balance_due||0) - roomDiscountRs) && 'collect exceeds balance'` |

**SMALL scope — 2 lines, 1 file.**

Next: **Gate 2 GO → PLANNING (Impact Analysis)**
