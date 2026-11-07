# BUG-616 — Pie Chart Tooltip Shows ₹0 Revenue (field name mismatch)

**ID:** BUG-616  **Type:** BUG  **Registered:** 2026-10-26  **Sprint:** nov_cr_batch
**Severity:** P2  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Area:** Reports / Analytics
**Source:** OWNER-REPORTED (screenshot — Channel & Payment Analysis tooltip shows "₹0 · 2389 orders")
**Confidence:** CONFIRMED (code-traced, root cause identified)

---

## Description

Pie chart tooltips in Insights report pages show **₹0** for revenue even though the chart slices render correctly with real data. The tooltip reads `d.revenue` but the pie data maps `revenue` → `value` for Recharts — so `d.revenue` is always `undefined` → `fmtINR(undefined)` → `₹0`.

---

## Evidence

- **Screenshot:** Owner provided — Channel & Payment Analysis page, Dine-In slice tooltip: "₹0 · 2389 orders · 88.3% of total". Pie slices render correctly (88%/12%) because `dataKey="value"` works.
- **Code trace:**
  - `ChannelPivotMockup.jsx` L258: `Pie data={...map(c => ({ name: c.channel, value: c.revenue, ... }))}`  — `revenue` mapped as `value`
  - `ChannelPivotMockup.jsx` L56: `{fmtINR(d.revenue)}` — reads `d.revenue` which doesn't exist, it's `d.value`

---

## Duplicate Check

**DISTINCT.** BUG-194 was about data access path (`salesData.data?.X`). This is about tooltip field name mismatch in the pie chart data mapping. Different root cause, different fix.

---

## Code Reality

**PARTIAL** — Charts render correctly (slices use `dataKey="value"`). Only tooltips are wrong.

---

## Blast Radius

**SMALL** — Tooltip components in affected pages. ~1 line fix per tooltip.

**Affected pages:**

| Page | Line | Reads `d.revenue` from pie data mapped as `value` |
|---|---|---|
| `ChannelPivotMockup.jsx` | L56 | PivotTooltip: `fmtINR(d.revenue)` — both channel + payment donuts |
| `SalesMockup.jsx` | L62, L86 | Two tooltips: channel donut + payment donut |

**Fix:** Change `d.revenue` → `d.value` in each tooltip. ~3 line changes across 2 files.

---

## Open Decisions

None — straightforward field name fix.

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: Awaiting "Gate 2 GO" → Impact Analysis
