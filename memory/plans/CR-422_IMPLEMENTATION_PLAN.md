# CR-422 — Implementation Plan (Gate 3 — VERIFIED)
## Replace "30D" Preset with "LM" (Last Month) on 13 Report Pages

**Date:** 2026-10-18
**Stage:** Gate 3 — Implementation Plan (all lines verified by probe 2026-10-18)
**OD-422-01 LOCKED:** Button label = `'LM'`

---

## Scope Lock

**13 files WILL change** — all in `src/pages/reports-module/`
**Files WILL NOT touch:** any service, transform, context, App.js, or non-report file

---

## Last Month Logic (reference — identical for all files)

```js
// REMOVE rolling 30 days:
f = new Date(t.getTime() - 29 * 86400000);

// ADD calendar last month:
const now = new Date();
f = new Date(now.getFullYear(), now.getMonth() - 1, 1);  // 1st of last month
t = new Date(now.getFullYear(), now.getMonth(), 0);       // last day of last month
// JS handles year rollover: Jan → Dec of previous year automatically
```

---

## Verified Edit Table — All 13 Files

| # | File | Default state | Handler line | Button array line |
|---|---|---|---|---|
| 1 | `AuditLogMockup` | none | L57 | L103 |
| 2 | `CancelDetailMockup` | none | L59 | L110 |
| 3 | `CancellationsMockup` | none | L204 | L409 |
| 4 | `DailySalesMockup` | none | L96 | L230 |
| 5 | `DashboardMockup` | none | L120 | L360 |
| 6 | `DeliveryChargeMockup` | L37 → change to `'LM'` | L49 | L90 |
| 7 | `HourlySalesMockup` | none | L91 | L209 |
| 8 | `PrepServeTimeMockup` | none | L167 | L347 |
| 9 | `PurchaseReportPage` | L76 → change to `'LM'` | L37 (QUICK_RANGES obj) | L298 (auto — uses QUICK_RANGES) |
| 10 | `SalesMockup` | none | L147 | L338 |
| 11 | `SettlementReportMockup` | none | L154 | L382 |
| 12 | `TaxDetailMockup` | L47 → change to `'LM'` | L59 | L102 |
| 13 | `TipReportMockup` | L36 → change to `'LM'` | L43 | L70 |

---

## Pattern Groups (3 handler patterns — different edit per group)

---

### GROUP A — Inline single-line handler (5 files)
`AuditLogMockup` · `CancelDetailMockup` · `DeliveryChargeMockup` · `TaxDetailMockup` · `TipReportMockup`

All 5 have handler and button on separate lines. Handler is all on one line.

**Handler edit (same substring replace in all 5):**
```
REMOVE: else if (p === '30D') f = new Date(t.getTime()-29*86400000);
ADD:    else if (p === 'LM') { const now=new Date(); f=new Date(now.getFullYear(),now.getMonth()-1,1); t=new Date(now.getFullYear(),now.getMonth(),0); }
```
(variations in spacing — match exactly what's in each file)

**Button array edit (same for all 5 — just rename string):**
```
REMOVE: '30D'
ADD:    'LM'
```

---

### GROUP B — Multi-line if/else handler (5 files)
`CancellationsMockup` · `DailySalesMockup` · `HourlySalesMockup` · `SalesMockup` · `SettlementReportMockup`

**Handler edit — replace just the `else if ('30D')` line:**
```js
// REMOVE (varies slightly by file — match exact spacing):
else if (p === '30D') f = new Date(t.getTime() - 29 * 86400000);

// ADD:
else if (p === 'LM') {
  const now = new Date();
  f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  t = new Date(now.getFullYear(), now.getMonth(), 0);
}
```

**Button array edit (same — rename string):**
```
REMOVE: '30D'
ADD:    'LM'
```

---

### GROUP C — Switch/case handler (2 files)
`DashboardMockup` (L120) · `PrepServeTimeMockup` (L167)

**DashboardMockup L120 — replace case block:**
```js
// REMOVE:
      case '30D': {

// ADD:
      case 'LM': {
        const now = new Date();
        f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        t = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      }
```
(need to view the full case block to get exact end boundary)

**PrepServeTimeMockup L167 — replace case line:**
```js
// REMOVE:
      case '30D': { const d = new Date(now); d.setDate(d.getDate() - 29); f = f2(d); t = f2(now); break; }

// ADD:
      case 'LM': { const d = new Date(now); f = f2(new Date(d.getFullYear(), d.getMonth()-1, 1)); t = f2(new Date(d.getFullYear(), d.getMonth(), 0)); break; }
```

**Button array edit:** Replace `'30D'` with `'LM'` in the arrays at L360 and L347.

---

### GROUP D — QUICK_RANGES object array (1 file)
`PurchaseReportPage` (L37 for object, L76 for default state)

**L37 — replace object entry:**
```js
// REMOVE:
  { label: '30D',   getFrom: () => daysAgoISO(29), getTo: todayISO },

// ADD:
  { label: 'LM',
    getFrom: () => { const d=new Date(); return new Date(d.getFullYear(),d.getMonth()-1,1).toISOString().split('T')[0]; },
    getTo:   () => { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),0).toISOString().split('T')[0]; }
  },
```

**L298 button array — NO change needed.** Buttons render from `QUICK_RANGES.map(r => r.label)` — label changes automatically when object changes.

---

## Default State Changes (4 files)

| File | Line | Current | Change to |
|---|---|---|---|
| `DeliveryChargeMockup` | L37 | `useState('30D')` | `useState('LM')` |
| `TaxDetailMockup` | L47 | `useState('30D')` | `useState('LM')` |
| `TipReportMockup` | L36 | `useState('30D')` | `useState('LM')` |
| `PurchaseReportPage` | L76 | `useState('30D')` | `useState('LM')` |

---

## Implementation Sequence

Batch all 13 in one session. Recommended order:
1. Group A (5 files) — all in parallel (same edit pattern)
2. Group B (5 files) — all in parallel (same edit pattern)
3. Group C (2 files) — need full case block view first, then edit
4. Group D (1 file) — QUICK_RANGES object

---

## Entry Verification Checklist (Implementation agent must confirm before coding)

| File | Handler line check | Button line check |
|---|---|---|
| AuditLogMockup | L57 contains `'30D'` in inline handler | L103 contains `['Today','7D','30D','MTD']` |
| CancelDetailMockup | L59 contains `'30D'` in inline handler | L110 contains `['Today','7D','30D','MTD']` |
| CancellationsMockup | L204: `else if (p === '30D') f = ...` | L409: `['Today', '7D', '30D', 'MTD', 'FY']` |
| DailySalesMockup | L96: `else if (p === '30D') f = ...` | L230: `['Today', '7D', '30D', 'MTD']` |
| DashboardMockup | L120: `case '30D': {` | L360: `['Today', '7D', '30D', 'MTD', 'FY']` |
| DeliveryChargeMockup | L37: `useState('30D')` · L49: handler | L90: `['7D','30D','MTD']` |
| HourlySalesMockup | L91: `else if (p === '30D') f = ...` | L209: `['Today', '7D', '30D', 'MTD']` |
| PrepServeTimeMockup | L167: `case '30D': { ... break; }` | L347: `['Today', '7D', '30D', 'MTD']` |
| PurchaseReportPage | L37: QUICK_RANGES `'30D'` obj · L76: state | L298: QUICK_RANGES.map (auto) |
| SalesMockup | L147: `else if (p === '30D') f = ...` | L338: `['Today', '7D', '30D', 'MTD']` |
| SettlementReportMockup | L154: `else if (p === '30D') f = ...` | L382: `['Today', 'Yesterday', '7D', '30D', ...]` |
| TaxDetailMockup | L47: `useState('30D')` · L59: handler | L102: `['7D','30D','MTD']` |
| TipReportMockup | L36: `useState('30D')` · L43: handler | L70: `['7D','30D','MTD']` |

---

## Verification Matrix

| # | Verify | Method |
|---|---|---|
| V-1 | `LM` button replaces `30D` on all 13 pages | Browser: spot-check 4 pages |
| V-2 | Clicking LM → date range = 1st to last of previous calendar month | Browser: check date inputs after clicking LM |
| V-3 | DeliveryCharge / TaxDetail / Tip / Purchase pages load with LM as default (not 30D) | Browser: open each page, check initial preset active state |
| V-4 | January edge case: clicking LM in January → Dec 1–31 of previous year | Code trace: `new Date(y, -1, 0)` → Dec 31 ✅ |
| V-5 | Settlement page: `LM` appears in the large preset array alongside 90D/365D/YTD | Browser: SettlementReportMockup |
| REG | Today / 7D / MTD presets still work on all pages | Browser: verify at least 3 pages |
| REG | Compile: 0 new warnings | webpack |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-422 → GATE_5A_IMPLEMENTED
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: CR-422 entry listing all 13 files
- [ ] Code markers: // CR-422 on every modified handler line + button array line
- [ ] Compile: 0 new warnings
```

---

Planning complete: CR-422
Stage: Gate 3 — Implementation Plan (all lines probe-verified)
Risk: LOW
13 files · ~30 edits total · no hotspot files · no API change
Awaiting Gate 4 GO
