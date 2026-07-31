# BUG-132 — Settlement Report Not Working as Expected

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** Bug
**Area:** Settlement / Insights
**Priority:** P1 (functionality — report not working)
**Sprint:** POS 4.0

---

## 1. Symptom

The Settlement report is not working as expected. Owner indicates there is an existing CR related to it as well.

---

## 2. Screenshot Evidence

Owner-provided screenshot shows the Settlement panel with:
- Date: 12/06/2026
- All 5 KPI cards at ₹0 (Opening Balance, Cash Collected, Settled, Remaining, Pilferage)
- Waiter table: "No settlement data for today."
- 13 inactive waiters listed
- TOTAL row: all ₹0

This may be correct if no settlement activity occurred on that date, OR it may indicate the API is not returning data correctly. Investigation needed.

---

## 3. Owner Clarification (received 2026-06-12)

**Surface:** Dashboard Settlement panel (slide-over, CR-015).

**Specific symptom — business logic broken:**
- `Settled` shows equal to `Total Funds` — should NOT be equal unless everything is actually settled
- `Remaining` shows equal to `Pilferage` — these should be independent values
- `Expected` and `Actual Balance` show the same value — Expected should be calculated, Actual entered manually

**Root cause area:** The math formulas in `settlementTransform.js` and/or `SettlementPanel.jsx` are computing KPI values incorrectly. The relationships between Opening Balance, Cash Collected, Total Funds, Settled, Expected, Remaining, Actual Balance, and Pilferage are broken.

## 4. Related Prior Work

- **CR-015** (Settlement Module) — CLOSED, owner verified 2026-06-09. 5 APIs wired, 5 KPI cards, per-waiter table, 3 modals.
- **CR-016** (Settlement History / Insights) — CLOSED, owner verified 2026-06-09. Date-range settlement history under Insights.

---

## 5. Investigation Scope → FORMULA AUDIT COMPLETE (2026-06-12)

### Architecture: 5 KPI cards + per-waiter table + TOTAL row

**KPI cards (L196-201) — ALL read directly from API fields, NO FE computation:**
| Card | FE field | API field |
|------|----------|-----------|
| Opening Balance | `totals.openingBalance` | `total_opening_balance` |
| Cash Collected | `totals.cashCollected` | `total_today_collection` |
| Settled | `totals.settled` | `total_today_settlement` |
| Remaining | `totals.remaining` | `total_balance_to_settle` |
| Pilferage | `totals.pilferage` | `total_pilferage` |
| **Total Funds** | **MISSING KPI CARD** | `total_total_funds` available but no card renders it |

### Issues Found (6 formula bugs)

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| **F-1** | **Missing "Total Funds" KPI card** | HIGH | Owner confirmed 6 cards needed. `totals.totalFunds` exists in transform but no KPI card. |
| **F-2** | **Per-waiter Pilferage column shows FE-computed ₹0, NOT API pilferage** | HIGH | L279 renders `pilf = actual !== undefined ? expected - actual : 0`. When user hasn't entered actual balance → `pilf = 0` regardless of `w.pilferage` from API. Backend pilferage is used in `expected` formula (L249) but never displayed directly. **Table always shows ₹0 pilferage until user types an actual balance.** |
| **F-3** | **"Expected" formula may double-subtract pilferage** | MEDIUM | L249: `expected = w.totalFunds - w.settled - w.pilferage`. If backend `total_funds` is already net-of-pilferage, this double-subtracts. Need clarity: is `total_funds` BEFORE or AFTER pilferage? |
| **F-4** | **KPI Remaining vs TOTAL-row Expected use different formulas** | MEDIUM | KPI "Remaining" = `total_balance_to_settle` (API direct). TOTAL row "Expected" = `totalFunds - settled - pilferage` (FE computed L354). Should be same number. |
| **F-5** | **Settled sub-text division by zero** | LOW | L199: `settled / totalFunds * 100` → NaN when totalFunds=0. |
| **F-6** | **Transform fallback reads from ambiguous level** | MEDIUM | L33-35: `day.totals || data.totals`. If API has BOTH, per-day might differ from aggregate. |

### Correct Business Logic (proposed)

| Field | Correct Formula |
|-------|----------------|
| Opening Balance | API direct |
| Cash Collected | API direct |
| **Total Funds** | **Opening Balance + Cash Collected** (or API `total_total_funds`) |
| Settled | API direct |
| **Remaining** | **Total Funds − Settled** |
| **Expected (per-waiter)** | **w.totalFunds − w.settled** (pilferage is a RESULT, not an input to Expected) |
| **Pilferage (display)** | API `w.pilferage` for read-only display; FE `expected − actual` only for settle action |

---

## 5. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING (investigation deferred) |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*BUG-132 Intake — 2026-06-12*
