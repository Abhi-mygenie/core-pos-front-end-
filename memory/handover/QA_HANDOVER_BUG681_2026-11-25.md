# QA Handover — BUG-681 (coverage.status → coverage.type — Remove button never rendered)

**Date:** 2026-11-25 · **Risk:** LOW · **Sprint:** nov_cr_batch
**File:** `src/components/credit/CreditCustomerDetailSheet.jsx`

---

## 1. Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | CreditCustomerDetailSheet.jsx:174 | `coverage.type === 'open'` (was `coverage.status`) | ✅ BUG-681 marker confirmed at L174 |
| E2 | CreditCustomerDetailSheet.jsx:184 | `coverage.type === 'partial'` (was `coverage.status`) | ✅ BUG-681 marker confirmed at L184 |

Compile: webpack clean.

---

## 2. Browser Test Cases

**Requires:** A credit customer with at least one Open (unpaid) credit row on Palmhouse.

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Remove button visible on Open rows | Credit Management → open a customer with Open credit → check Actions column | "Remove" button visible next to Open credit rows (was always hidden before fix) |
| T2 | Remove button absent on Partial rows | Same customer → Partial bucket rows | "—" shown, no Remove button |
| T3 | Remove button absent on Covered rows | Same customer → Covered bucket rows | "—" shown, no Remove button |
| T4 | Remove dialog opens | Click Remove on Open row | Confirmation dialog shows order # and ₹ amount |
| T5 | Requires clear_payment permission | testwait (HAS clear_payment) sees Remove | Remove visible for testwait on Open rows |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Credit totals still display correctly | Only button rendering changed, not data fetch |
| R2 | Mark as Paid flow unaffected | Separate handler, not touched |

---

## 4. Registry Sync Confirmation

Registry: BUG-681 → GATE_5A_IMPLEMENTED · Sprint: nov_cr_batch ✅

---

## 5. Credentials + Environment

| Account | Password | Use |
|---|---|---|
| owner@palmhouse.com | Qplazm@10 | Credit Management — view credit rows |
| testwait@thepalmhouse.com | Qplazm@10 | Verify Remove visible for user with clear_payment |

**Note:** Need a customer with an open/unpaid credit entry on Palmhouse. If none exist, place an order and mark it unpaid via Mark Unpaid in Order Beta, then check Credit Management.
