# BUG-617 — Insights Reports Empty Data (salesData.X vs salesData.data.X path mismatch)

**ID:** BUG-617  **Type:** BUG  **Registered:** 2026-10-26  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Area:** Reports / Analytics
**Source:** AGENT-DISCOVERED (investigation of BUG-616 uncovered wider issue)
**Confidence:** CONFIRMED (code-traced, BUG-194 fix pattern already proven in PaymentsMockup)

---

## Description

6 Insights report pages read `salesData.summary`, `salesData.channels`, `salesData.daily`, etc. directly — but `fetchInsightsSales` returns `{ data: resp.data?.data, orderCount: 0 }`, so the actual data lives at `salesData.data.summary`, `salesData.data.channels`, etc. These pages get `undefined` and fall back to empty `{}` or `[]`.

`PaymentsMockup.jsx` already has the fix (BUG-194): reads `salesData.data?.summary || salesData.summary || {}`. The other 6 pages were never patched.

---

## Evidence

- **BUG-194** (CLOSED, QA PASS): Fixed the exact same issue in PaymentsMockup. Same root cause, same fix pattern.
- **Code trace:**
  - `insightsService.js` L611: `return { data: resp.data?.data, orderCount: 0 }` — wraps response
  - `ChannelPivotMockup.jsx` L129: `salesData.summary || {}` — reads undefined
  - `PaymentsMockup.jsx` L216: `salesData.data?.summary || salesData.summary || {}` — **already fixed**

---

## Duplicate Check

**RELATED to BUG-194** (same root cause, same fix pattern). BUG-194 only fixed PaymentsMockup. These 6 pages have the same bug but were never patched. NOT duplicate — different files, distinct scope.

---

## Code Reality

**PARTIAL** — PaymentsMockup has the fix. 6 other pages don't.

---

## Blast Radius

**MEDIUM** — 6 files, ~2-3 lines each.

**Affected pages:**

| Page | Reads directly | Fields affected |
|---|---|---|
| `ChannelPivotMockup.jsx` | L129, L133, L141 | `.summary`, `.channels`, `.payments` |
| `SalesMockup.jsx` | L177, L178, L191, L192, L193 | `.summary`, `.daily`, `.channels`, `.payments`, `.hourly` |
| `DailySalesMockup.jsx` | L128, L129 | `.summary`, `.daily` |
| `HourlySalesMockup.jsx` | L118, L120 | `.summary`, `.hourly` |
| `DayOfWeekMockup.jsx` | L114, L117 | `.summary`, `.daily` |
| `RoundOffMockup.jsx` | L69, L70 | `.summary` (inline) |

**Fix per file:** Apply BUG-194 pattern:
```js
// Before:
const s = salesData.summary || {};
// After:
const s = salesData.data?.summary || salesData.summary || {};
```

---

## Open Decisions

None — proven fix pattern from BUG-194.

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: Awaiting "Gate 2 GO" → Impact Analysis
