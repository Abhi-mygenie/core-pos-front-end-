# BUG-352 — OrderTable: Amount Column Too Narrow, Overlaps Change Button

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 3)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 |
| Risk | LOW |
| Side | Frontend |
| Root cause | LAYOUT_BUG |
| Duplicate check | DISTINCT |
| Code reality | NONE (bug exists, no fix) |
| Blast radius | SMALL (1 file, ~2 lines) |
| Fast Lane eligible | YES (1 file, ≤2 lines, LOW risk — needs owner GO) |

## Description

For larger amounts (₹270, ₹1,400 etc.) the amount text in the order table overflows its `w-24` (96px) column and visually overlaps the adjacent "Change" action button, making the button hard to click.

## Root Cause

`OrderTable.jsx:143` (base columns) and `:157` (columnsWithPayment):
```js
{ id: 'amount', label: 'Amount', sortable: true, width: 'w-24', align: 'right' }
```
96px is insufficient for 5–6 digit INR amounts with the rupee symbol.

Note: line 214 already has `w-28` in one variant (Actions columns block) — the base `w-24` was not updated to match.

## Proposed Fix

Change `width: 'w-24'` → `width: 'w-32'` on the `amount` column at lines 143 and 157 in `OrderTable.jsx`.

## Evidence

- File: `src/components/reports/OrderTable.jsx` lines 143, 157
- Steps: Place or view an order ≥₹270 → amount text bleeds into Change button
- Confidence: HIGH (code + visual)

## Owner Decisions Needed

None — cosmetic width increase only.
