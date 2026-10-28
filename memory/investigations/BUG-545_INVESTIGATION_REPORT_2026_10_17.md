# BUG-545 — Investigation Report
## "Remove Item Report section shows Coming Soon / no data"

**Date:** 2026-10-17
**Role:** INVESTIGATION
**Steps used:** 2/10
**Confidence:** HIGH

---

## 1. Summary

- **Root cause:** The "Remove Item Report" sidebar entry was **already removed by CR-415** on 2026-10-12.
- **Classification:** CLOSED_BY_CR
- **Confidence:** HIGH — code confirmed
- **FE fix needed:** NONE

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result |
|---|---|---|---|
| H1 | CR-415 removed the Coming Soon item-report entry | `grep "CR-415\|item-report" Sidebar.jsx` | CONFIRMED |
| H2 | A separate "Remove Item Report" section exists inside OrderReportBetaPage | `grep "Remove Item\|item_report" OrderReportBetaPage.jsx` | ELIMINATED — no such section |

---

## 3. Evidence

**Sidebar.jsx line 101:**
```js
// CR-415: item-report (Coming Soon) removed
```

**Context:** The `item-report` sidebar child was in the Daily Report group.
CR-415 (Sidebar Cleanup: Remove Coming Soon + Duplicate Modules) removed it as part of a batch — along with `operating-hours`, `cancellation-reasons` (Settings), `food-mapping` (Aggregator), and `pms-front-desk` legacy entry.

**Verification:** `COMING_SOON_ITEMS` set at Sidebar.jsx:54 is now empty `new Set([])`.

---

## 4. Recommendations

- **Classification:** CLOSED_BY_CR (resolved by CR-415)
- **FE fix:** NONE
- **Planning skip:** N/A — no work needed
- **Registry action:** Update BUG-545 → `CLOSED_BY_CR` with reference to CR-415

---

## 5. Retroactive candidates

None.
