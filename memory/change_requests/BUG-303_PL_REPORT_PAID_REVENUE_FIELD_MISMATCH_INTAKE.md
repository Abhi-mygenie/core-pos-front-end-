# BUG-303 Intake — P&L Report "Paid Revenue" KPI Always Shows ₹0
**ID:** BUG-303
**Type:** Bug
**Registered:** 2026-08-11
**Registered by:** INTAKE Agent (Role 1)
**Sprint:** POS 5.1 backlog
**Source:** AGENT-DISCOVERED (Investigation session 2026-08-11)

---

## Duplicate Check
- BUG-258 (P&L calendar broken) — **DISTINCT** (calendar/date UX, not field mapping)
- BUG-259 (P&L charts hidden) — **DISTINCT**
- BUG-260 (P&L future dates) — **DISTINCT**
- BUG-261 (P&L preset pills) — **DISTINCT**
- CR-094 (P&L Report — new screen) — **RELATED** (same file, different issue)
- **Result: DISTINCT**

---

## Description

On the P&L Report screen (`/profit-loss`) the **"Paid Revenue" KPI card always displays ₹0.00** regardless of the actual value in the API response. All other KPI cards (Total Sales, Expenses, Net P&L) display correctly.

---

## Root Cause (CONFIRMED — code traced)

**File:** `src/pages/reports-module/PLReportPage.jsx`
**Line:** 83

```javascript
// CURRENT (WRONG)
paidRevenue: parseFloat(s.paid_revenue) || 0,
//                      ^^^^^^^^^^^^ undefined — API returns 'total_paid_revenue'

// API actual response shape (confirmed by curl probe 2026-08-11):
// { "total_paid_revenue": "1234.56", ... }
//    ^^^^^^^^^^^^^^^^ different key!
```

The frontend reads `s.paid_revenue` but the backend sends `s.total_paid_revenue`. The field is `undefined` → `parseFloat(undefined)` = `NaN` → `|| 0` = `0`.

All other summary fields are correct:
| Field | API key | Frontend reads | Status |
|---|---|---|---|
| Total Sales | `total_sales` | `s.total_sales` | ✅ correct |
| **Paid Revenue** | `total_paid_revenue` | `s.paid_revenue` | ❌ **WRONG** |
| Total Expenses | `total_expenses` | `s.total_expenses` | ✅ correct |
| Total Purchase | `total_purchase` | `s.total_purchase` | ✅ correct |
| Net P&L | `total_profit_loss` | `s.total_profit_loss ?? s.profit_loss` | ✅ correct |

---

## Additional Finding — API returns single-date row (P2, separate concern)

Live probe also found the P&L API returns only 1 row (today's date, all zeros) regardless of date range for cafe103. Likely cause: cafe103 has no expense/purchase module configured → backend returns empty data. **This is a data/backend issue — separate from RC1.**

---

## Severity & Risk

| Field | Value |
|---|---|
| **Severity** | **P2** — wrong KPI display, workaround = check other fields or download PDF |
| **Risk** | **LOW** — display-only field, no financial computation changed |
| **Area** | Reports → P&L Report |
| **Fast Lane eligible** | **YES** — 1 file, 1 line, LOW risk, non-financial, not a hotspot file |

---

## Evidence

- **Investigation report:** `/app/memory/investigation/INVESTIGATION_REPORT_THREE_BUGS_2026_08_11.md`
- **API response evidence:** `/app/memory/evidence/PLN_API_response.json`
- **Code trace:** `PLReportPage.jsx:83` — `s.paid_revenue` vs API `total_paid_revenue`
- **Confidence:** HIGH — code + live API curl confirmed

---

## Code Reality Check

**Status: FULL** — bug is present in current codebase at `PLReportPage.jsx:83`

```bash
grep -n "paid_revenue" src/pages/reports-module/PLReportPage.jsx
# 83:      paidRevenue: parseFloat(s.paid_revenue) || 0,   ← WRONG key
# 95:      revenue: parseFloat(r.sales || r.paid_revenue) || 0,   ← report row (OK — API row uses paid_revenue)
# 108:     paidRevenue: parseFloat(r.paid_revenue) || 0,   ← report row (OK — API row uses paid_revenue)
```

Note: lines 95 and 108 are for individual report ROWS (where API uses `paid_revenue`). Only line 83 is for the SUMMARY object (where API uses `total_paid_revenue`).

---

## Blast Radius

- **Files affected:** 1 (`PLReportPage.jsx`)
- **Lines to change:** 1
- **Hotspot file:** NO
- **Scope:** SMALL

---

## Proposed Fix (for Planning Agent)

**File:** `src/pages/reports-module/PLReportPage.jsx:83`
```javascript
// BEFORE
paidRevenue: parseFloat(s.paid_revenue) || 0,
// AFTER (use null-coalesce to handle both old and new key)
paidRevenue: parseFloat(s.total_paid_revenue ?? s.paid_revenue) || 0,
```

---

## Next Step

Planning skip eligible (Fast Lane) — owner approval needed.
Area: Reports | Priority: P2 | Risk: LOW | Sprint: POS 5.1
