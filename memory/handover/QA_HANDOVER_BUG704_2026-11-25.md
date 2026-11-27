# QA Handover — BUG-704 (Item Sales Ledger — LM/FY preset not persistent)

**Date:** 2026-11-25 · **Risk:** LOW · **Sprint:** nov_cr_batch
**File:** `src/pages/reports-module/ItemSalesLedgerMockup.jsx`

---

## 1. Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | ItemSalesLedgerMockup.jsx:166 | LM branch now calls `setSharedFrom(range.from)` + `setSharedTo(range.to)` before returning — BUG-704 | ✅ BUG-704 marker confirmed at L166 |
| E2 | (same) | FY branch equivalent fix applied | ✅ confirmed in notes |

Compile: webpack clean.

---

## 2. Browser Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | LM preset persists after navigation | Insights → Item Sales Ledger → click LM → Apply → note the date range → navigate to another Insights report (e.g. Cancellations) → navigate back | From/To dates still match Last Month range; LM chip still highlighted |
| T2 | FY preset persists | Same flow with FY | From/To = Financial Year range; FY chip active on return |
| T3 | Today preset still works | Click Today → navigate away → return | Today dates set correctly |
| T4 | 7D preset persists | Click 7D → navigate away → return | 7D range persists |
| T5 | Cross-report shared date | Set LM on Item Ledger → open Order Beta → check if dates match | Shared date context propagated (LM range appears on Order Beta) |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | LM data loads after clicking LM | setSharedFrom/To must not break the fetch trigger |
| R2 | Other Insights reports (Sales, Cancellations) still respond to shared date | shared context is shared across all Insights pages |

---

## 4. Registry Sync Confirmation

Registry: BUG-704 → GATE_5A_IMPLEMENTED · Sprint: nov_cr_batch ✅

---

## 5. Credentials + Environment

| Account | Password | Use |
|---|---|---|
| owner@palmhouse.com | Qplazm@10 | Insights → Item Sales Ledger |
