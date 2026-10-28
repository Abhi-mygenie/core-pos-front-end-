# BUG-626 — getStatusBadge Missing Upi/Card/Room Mapping (~148 Rows Show Raw Strings)

**ID:** BUG-626  **Type:** BUG  **Registered:** 2026-10-28  **Sprint:** nov_cr_batch
**Severity:** P2  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** QA-FOUND (QA batch 2026-10-28, testing agent iteration_10)
**Related:** BUG-354

## Description
`OrderReportBetaPage.jsx:getStatusBadge()` maps `payment_type` → badge. BUG-354 added TAB/prepaid/postpaid, but paid orders where `payment_type` is `Upi`, `Card`, or `Room` still fall through to the grey fallback and show the raw string instead of a "Paid" badge.

Observed on Palm House (Oct 20-28): ~100 Upi rows, ~44 Card rows, ~4 Room rows — all showing raw text in the Status column.

## Evidence
- `OrderReportBetaPage.jsx:48-58`: map has 7 entries but no Upi/Card/Room
- Fallback: `map[pt] || { label: pt || '—', cls: 'bg-zinc-100 text-zinc-600' }` renders raw string
- ~148 affected rows on Palm House alone
- Confidence: CONFIRMED (QA browser observation on live data)

## Blast Radius
SMALL — 1 file, ~3 lines added to existing map. Same pattern as BUG-354.

## Fix Scope
Add to getStatusBadge map:
```js
Upi: { label: 'Paid', cls: 'bg-blue-100 text-blue-800' },
Card: { label: 'Paid', cls: 'bg-blue-100 text-blue-800' },
Room: { label: 'Room', cls: 'bg-purple-100 text-purple-800' },
```
