# CR-011 S5 — Audit Drift Investigation Feature: End-to-End Implementation Plan

**Date:** 2026-06-03
**Owner directive:** Add an "Investigate" button on each AMBER row in the Audit tab that dynamically shows which specific orders are responsible for that item's tax drift.
**Scope:** S5 Item Sales Hybrid — service layer + UI component
**Status:** PLANNING — no code changes yet
**Prerequisite:** Owner approval of this plan
**Parent:** CR-011-AUDIT-01

---

## 1. BUSINESS RULE SUMMARY

### 1.1 Current State

The Audit tab shows AMBER rows with aggregated drift (e.g., "Iced Latte Coffee | Δ -₹30 | Expected ₹1088 vs Actual ₹1058"). The user can see WHAT item has drift but NOT WHICH ORDERS caused it. To investigate, the user must ask an agent to run a manual script against the raw API data.

### 1.2 Target State

Each AMBER row on the Audit tab gets an **"Investigate"** button. Clicking it expands/opens a panel showing the exact order lines responsible for that item's drift:

| Order | Date | Employee | Payment | Table | Qty | Subtotal | Expected Tax | Actual Tax | Drift |
|-------|------|----------|---------|-------|-----|----------|-------------|------------|-------|
| #013489 | Apr 20 | Counter02 | card | 101 | 1 | ₹200 | ₹10.00 | ₹0.00 | -₹10.00 |

This is the same investigation the agent ran manually — but now available on-demand in the UI.

---

## 2. WHY NO EXTRA API CALL IS NEEDED

The data already exists in memory. Here's the current flow:

```
API fetch (order-logs-report)
    ↓
insightsService.js — loops through every order → every line
    ↓ (for each sold line)
    Computes: itemTotal, discount, subtotal, tax, expected tax
    Aggregates: per food_id sums into qtySold, taxSold, subtotalSold, etc.
    ↓ (DISCARDS per-line detail for sold bucket after aggregation)
    Returns: aggregated rows[] only
```

The fix: during the aggregation loop, when a sold line has `|actual_tax - expected_tax| > tolerance`, **save that line's order details** into a `driftLines[]` array on that item — same pattern already used for `drill.orderLines` (S3 side-sheet).

```
API fetch (same, no change)
    ↓
insightsService.js — loops through every order → every line
    ↓ (for each sold line)
    Computes: same as before
    NEW: if |drift| > 0.02, push { orderId, date, employee, payment, table, qty, subtotal, expected, actual, drift } into item.driftLines[]
    Aggregates: same as before
    Returns: aggregated rows[] + driftLines[] per item
```

Zero extra API calls. Zero performance impact (drift lines are rare — typically 1-5 per item, only on AMBER items).

---

## 3. NEW FE BUSINESS RULES TO REGISTER

Per Protocol §8:

| Rule ID | Name | Explains |
|---------|------|----------|
| **FE-58** | Drift investigation: retain per-line order details for drift lines | During aggregation, when a sold/pending line has abs(actual_tax - expected_tax) > tolerance (₹0.02), save the order details (orderId, date, employee, payment, table, qty, subtotal, expectedTax, actualTax, drift) into a `driftLines[]` array on that food_id's aggregated row. Same pattern as `drill.orderLines` for S3. |
| **FE-59** | Audit tab Investigate button: expand drift lines on click | Each AMBER row on the Audit tab shows an "Investigate" button. Clicking it reveals the `driftLines[]` for that item in an inline expandable table. No extra API call — data is already in memory from the aggregation pass. |

**Owner pre-approval status:** Owner directed this in chat (2026-06-03). Verbatim: *"In audit tab i need order details which are responsible for drift, will detailed note this kind of investigation to run dynamically when user clicks on we need to have button to run this investigation"*. Rules should be registered as `approved=true`.

---

## 4. FILES TO CHANGE (scope lock)

### 4.1 Service Layer

| File | Change |
|------|--------|
| `insightsService.js` (`getItemSalesAggregated`) | In the per-line aggregation loop, after computing `drift = actual_tax - expected_tax`, if `abs(drift) > 0.02`: push `{ orderId, orderDate, employeeName, paymentMethod, tableName, qty, unitPrice, addon, variation, discount, subtotal, expectedTax, actualTax, drift, taxRate, taxCalc }` into `item.driftLines[]`. Initialize `driftLines: []` in both the `new item` and `existing item` branches. Pass through to the returned rows. Same approach for all 4 buckets (sold, cancelled, comp, pending) — tag each drift line with its bucket. |

### 4.2 UI Component

| File | Change |
|------|--------|
| `ItemSalesHybridMockup.jsx` | (a) In `apiRows` mapping: pass through `driftLines` from service data. (b) On the Audit tab's AMBER section: add an "Investigate" button/icon on each AMBER row. (c) On click: toggle an inline expansion below the row showing a mini-table of drift lines (Order#, Date, Employee, Payment, Table, Qty, Subtotal, Expected, Actual, Drift). (d) Collapsed by default — user clicks to expand per item. |

### 4.3 Audit Manifest

| File | Change |
|------|--------|
| `auditManifest.js` | Register FE-58 and FE-59 with `approved=true`, `approvedDate='2026-06-03'`. |

### 4.4 No changes to `auditEngine.js`

The audit engine computes flags from aggregated data. The drift investigation is a UI-level drill-down into the already-computed data — it doesn't change how flags are computed.

---

## 5. UI INTERACTION SPEC

### 5.1 Default state
Each AMBER row in the Audit tab looks exactly as it does today:
> Iced Latte Coffee | Sold | ₹21,760 | ₹1,058 | ₹1,088 | -₹30.00 | 5% GST | Expected ₹1088... | **[Investigate]**

### 5.2 On click "Investigate"
Row expands inline to show a detail table:

```
▼ Iced Latte Coffee — 3 orders responsible for -₹30.00 drift
┌─────────┬────────────┬──────────┬─────────┬───────┬─────┬──────────┬──────────┬────────┬─────────┐
│ Order   │ Date       │ Employee │ Payment │ Table │ Qty │ Subtotal │ Expected │ Actual │ Drift   │
├─────────┼────────────┼──────────┼─────────┼───────┼─────┼──────────┼──────────┼────────┼─────────┤
│ #013489 │ 2026-04-20 │Counter02 │ card    │ 101   │  1  │ ₹200     │ ₹10.00   │ ₹0.00  │ -₹10.00 │
│ #013489 │ 2026-04-20 │Counter02 │ card    │ 101   │  1  │ ₹200     │ ₹10.00   │ ₹0.00  │ -₹10.00 │
│ #013489 │ 2026-04-20 │Counter02 │ card    │ 101   │  1  │ ₹200     │ ₹10.00   │ ₹0.00  │ -₹10.00 │
└─────────┴────────────┴──────────┴─────────┴───────┴─────┴──────────┴──────────┴────────┴─────────┘
```

### 5.3 Click again → collapse back to single row

### 5.4 Multiple rows can be expanded simultaneously

---

## 6. VERIFICATION MATRIX

| # | Check | How to verify |
|---|-------|--------------|
| V1 | Investigate button appears on every AMBER row | Visual check on Audit tab |
| V2 | Click expands correct drift lines | Palm House: Iced Latte Coffee should show 3 lines from #013489 |
| V3 | Drift amounts sum to item's total drift | 3 × -₹10.00 = -₹30.00 matches the Δ column |
| V4 | Works for all buckets (sold, cancelled, pending) | Check an AMBER on Cancelled tab if any |
| V5 | No extra API calls on investigate click | Network tab shows no new requests |
| V6 | Collapse/re-expand works | Toggle state preserved |
| V7 | Cross-restaurant: Lafetta shows 12 orders across 33 items | Login as owner@lafetta.com, verify |

---

## 7. ROLLOUT SEQUENCE (atomic)

1. Register FE-58 + FE-59 in `auditManifest.js`
2. Update `insightsService.js` — retain `driftLines[]` during aggregation
3. Update `ItemSalesHybridMockup.jsx` — pass through `driftLines`, add Investigate button + expandable row
4. Lint check
5. Verify on Palm House + Lafetta
6. Owner validates

---

## 8. RISK REGISTER

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | Memory: storing per-line drift data for all items | Drift lines are extremely rare (Palm House: 15 lines across 2,306 orders; Lafetta: 34 lines across 748 orders). Negligible memory overhead. |
| R2 | Large drift-line count for a single item | Cap at 50 drift lines per item (show "and X more..." for items with >50). Real-world max observed: 9 (Iced Latte Coffee, Palm House). |
| R3 | Performance of inline expand | No computation on click — data already in memory. Pure DOM toggle. |

---

## 9. OPEN QUESTIONS FOR OWNER

| # | Question | Default if no answer |
|---|----------|---------------------|
| Q1 | Should the Investigate button appear on all AMBER rows, or also on RED rows? | AMBER + RED (both have drift data) |
| Q2 | Inline expansion below the row, or a side-sheet like S3 drill? | Inline expansion (simpler, faster) |
| Q3 | Should the drift investigation also be included in the Excel/PDF export? | Not in v1 — add in future if needed |

---

*End of plan. Awaiting owner GO to proceed with implementation.*
