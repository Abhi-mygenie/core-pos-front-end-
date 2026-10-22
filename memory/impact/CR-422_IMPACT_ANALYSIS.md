# CR-422 — Impact Analysis (Gate 2)
## Replace "Last 30 Days" (30D) Preset with "Last Month" (LM) on Report Pages

**Date:** 2026-10-18
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** CONFIRMED — 13 pages have `30D` preset, same pattern each
**Conflict Pre-Check:** All 13 target pages touched by BUG-555 (flex-wrap, D1-D40 changes to toolbar div). Our change is inside `handlePreset()` logic and button label array — different lines, zero overlap.

---

## Root Cause

13 report pages have a `30D` date preset button that computes:
```js
case '30D': f = new Date(t.getTime() - 29 * 86400000);  // rolling 30 days from today
```
Owner wants **true calendar Last Month** = 1st of previous month → last day of previous month.

Example: On 18 Oct 2026, `30D` gives Sep 18–Oct 18. `LM` should give Sep 1–Sep 30.

---

## Affected Pages (confirmed from code scan — 13 pages from investigation list):

`AuditLogMockup` · `CancelDetailMockup` · `CancellationsMockup` · `DailySalesMockup` ·
`DashboardMockup` · `DeliveryChargeMockup` · `HourlySalesMockup` · `PrepServeTimeMockup` ·
`PurchaseReportPage` · `SalesMockup` · `SettlementReportMockup` · `TaxDetailMockup` · `TipReportMockup`

All follow the same pattern. Verified in SalesMockup:
- `handlePreset()` at L143: `else if (p === '30D') f = new Date(t.getTime() - 29 * 86400000)`
- Button array at L338: `['Today', '7D', '30D', 'MTD']`

---

## Fix — 2 edits per page × 13 pages = 26 total edits (all identical pattern)

### Edit A — Replace `30D` case in `handlePreset()`:
```js
// REMOVE:
else if (p === '30D') f = new Date(t.getTime() - 29 * 86400000);

// ADD:
else if (p === 'LM') {
  const now = new Date();
  f = new Date(now.getFullYear(), now.getMonth() - 1, 1);    // 1st of last month
  t = new Date(now.getFullYear(), now.getMonth(), 0);         // last day of last month
}
```

### Edit B — Replace `'30D'` label in button array:
```js
// REMOVE: '30D'
// ADD: 'LM'
```

**Note:** `PurchaseReportPage` uses a different preset array format (object with `getFrom` lambda) — same logic, slightly different syntax. Must verify pattern before editing.

---

## Owner Decision: Button Label

What should the button read?
- `'LM'` — short, matches existing style (7D, MTD)
- `'Last Month'` — clearer but wider

**Recommended: `'LM'`** — consistent with existing preset button width/style. Owner to confirm.

---

## Risk Classification

| Criterion | Assessment |
|---|---|
| Financial logic? | NO — date filter only, no aggregation change |
| R5 hotspot? | NO — all in reports-module pages |
| Lines changed | ~2 per page × 13 = 26 lines |
| Files touched | 13 |
| Risk | LOW — UI date preset only, no API contract change |

**Risk: LOW**

---

## Batch Strategy
All 13 edits are identical pattern — implement in ONE session as a batch. Fast follow with BUG-353 (same type of work, same pages partially overlap).

---

## Verification
| # | Verify | Method |
|---|---|---|
| V-1 | `LM` button appears on all 13 pages | Browser: spot-check 3-4 pages |
| V-2 | Clicking LM sets date range to 1st→last of previous month | Browser: check applied dates |
| V-3 | `30D` button no longer present | Browser: button row shows 7D/LM/MTD |
| REG | Other presets (Today/7D/MTD) unchanged | Browser: verify they still work |

---

Planning complete: CR-422 | Gate 2 | Risk: LOW | 13 files
**OD-422-01 LOCKED:** Button label = `'LM'` (owner confirmed 2026-10-18)
Batch with: BUG-353 (same session)
