# BUG-630 — Implementation Plan (Gate 3)

**Date:** 2026-11-18
**Agent:** PLANNING
**Stage:** Gate 3 — Implementation Plan
**IA:** `memory/impact/BUG-630_IMPACT_ANALYSIS.md` (Gate 2 CLOSED)
**Risk:** MEDIUM (financial display — read-only report)
**IA verified at HEAD:** YES — all target lines confirmed this session

**Owner decisions locked:** OD-630-01..08 (all closed)
**Backend ask:** BB-14 (`net_sales` field) — filed, NOT YET DELIVERED

---

## 1. Scope Lock

### Files WILL change
| File | Edits |
|------|-------|
| `src/api/services/topFoodSalesService.js` | E1, E2, E3 |
| `src/pages/reports-module/ItemSalesLedgerMockup.jsx` | E4, E5, E6, E7, E8, E9, E10, E11 |

### Files WILL NOT touch
`CartPanel.jsx` · `OrderEntry.jsx` · `orderTransform.js` · `App.js` · any socket/context/auth file · any other report page

### Phased ship note
- **E1 partial:** `netSales = r.net_sales || 0` will show **0** until BB-14 is delivered (backend has not added `net_sales` yet).
- **E8/E9/E10 Tax + Total Sales KPIs** ship immediately — they use existing `gst/vat/service_charge` and `total_sales` fields already in the response.
- Recommend: ship all edits now. Net Sales KPI shows 0 until BB-14; Total Sales and Tax KPIs are correct immediately.

---

## 2. Exact Edits

---

### E1 — `topFoodSalesService.js` L28
**Fix: read `r.net_sales` (new BB-14 field); add `totalSales` from existing `r.total_sales`**

Current (L28):
```js
const netSales        = parseFloat(r.total_sales)         || 0;
```

Replace with:
```js
const netSales   = parseFloat(r.net_sales)   || 0;  // BUG-630: BB-14 field — Gross − Discount, pre-tax (0 until BE delivers)
const totalSales = parseFloat(r.total_sales) || 0;  // BUG-630: Total Billed = Net Sales + Tax
```

---

### E2 — `topFoodSalesService.js` L32
**Add `tax` derived field after `subTotal`**

Current (L32):
```js
  const subTotal        = grossRevenue - discount;                   // derived
```

Replace with:
```js
  const subTotal = grossRevenue - discount;                   // derived
  const tax      = gst + vat + serviceCharge;                 // BUG-630: derived — FE sum of existing API fields
```

---

### E3 — `topFoodSalesService.js` L51–52
**Expose `totalSales` and `tax` in the returned row object**

Current (L51–52):
```js
    netSales,
    pctOfTotal: 0,   // injected by component once grandTotal is known
```

Replace with:
```js
    netSales,
    totalSales,      // BUG-630: Total Billed (r.total_sales)
    tax,             // BUG-630: gst + vat + serviceCharge
    pctOfTotal: 0,   // injected by component once grandTotal is known
```

---

### E4 — `ItemSalesLedgerMockup.jsx` L383
**Update badge text (OD-630-07)**

Current (L383):
```jsx
            <span className="text-[11px] font-semibold bg-[#fff0eb] text-[#F26B33] border border-[#fed7bc] px-2.5 py-0.5 rounded-full">1 API call · any range</span>
```

Replace with:
```jsx
            <span className="text-[11px] font-semibold bg-[#fff0eb] text-[#F26B33] border border-[#fed7bc] px-2.5 py-0.5 rounded-full">Net Sales · Total Sales</span>{/* BUG-630 */}
```

---

### E5 — `ItemSalesLedgerMockup.jsx` L74–75
**Add `totalSales` column after `netSales` in COLUMNS (OD-630-06)**

Current (L74–75):
```js
  { key: 'netSales',      label: 'Net Sales',  align: 'right',  sortable: true,  numericExport: true  },
  { key: 'pctOfTotal',    label: '% of Total', align: 'right',  sortable: true,  numericExport: false },
```

Replace with:
```js
  { key: 'netSales',   label: 'Net Sales',   align: 'right', sortable: true, numericExport: true  },
  { key: 'totalSales', label: 'Total Sales', align: 'right', sortable: true, numericExport: true  }, // BUG-630 OD-630-06
  { key: 'pctOfTotal', label: '% of Total',  align: 'right', sortable: true, numericExport: false },
```

---

### E6 — `ItemSalesLedgerMockup.jsx` L78–82
**Add `totalSales` to DEFAULT_VISIBLE set**

Current (L78–82):
```js
const DEFAULT_VISIBLE = new Set([
  'rank', 'foodItem', 'categoryName', 'stationName', 'totalQuantity',
  'variationPrice', 'addonPrice',   // visible by default — endpoint computes these in total_sales
  'netSales',
]);
```

Replace with:
```js
const DEFAULT_VISIBLE = new Set([
  'rank', 'foodItem', 'categoryName', 'stationName', 'totalQuantity',
  'variationPrice', 'addonPrice',
  'netSales',
  'totalSales',  // BUG-630 OD-630-06
]);
```

---

### E7 — `ItemSalesLedgerMockup.jsx` L272–278
**Update kpis aggregation — remove `gross`, add `tax` + `totalSales` (OD-630-08)**

Current (L272–278):
```js
    return {
      uniqueItems:  src.length,
      totalQty:     src.reduce((s, r) => s + r.totalQuantity, 0),
      gross:        src.reduce((s, r) => s + r.grossRevenue, 0),
      discount:     src.reduce((s, r) => s + r.discount, 0),
      netSales:     src.reduce((s, r) => s + r.netSales, 0),
    };
```

Replace with:
```js
    return {
      uniqueItems:  src.length,
      totalQty:     src.reduce((s, r) => s + r.totalQuantity, 0),
      discount:     src.reduce((s, r) => s + r.discount, 0),
      netSales:     src.reduce((s, r) => s + r.netSales, 0),
      tax:          src.reduce((s, r) => s + r.tax, 0),         // BUG-630
      totalSales:   src.reduce((s, r) => s + r.totalSales, 0),  // BUG-630
    };
```

---

### E8 — `ItemSalesLedgerMockup.jsx` L465
**Update KPI strip grid: 5 cols → 6 cols**

Current (L465):
```jsx
          <div className="grid grid-cols-5 gap-3 pb-4">
```

Replace with:
```jsx
          <div className="grid grid-cols-6 gap-3 pb-4">{/* BUG-630: added Tax + Total Sales, removed Gross Revenue */}
```

---

### E9 — `ItemSalesLedgerMockup.jsx` L469–471
**KPI array: remove Gross Revenue, fix Net Sales subtitle, add Tax + Total Sales**

Current (L469–471):
```jsx
              { label: 'Gross Revenue', value: kpis.gross,       sub: 'before disc',   icon: Receipt,      fmt: 'inr',   testId: 'kpi-gross'                     },
              { label: 'Discount',      value: kpis.discount,    sub: 'applied',       icon: Percent,      fmt: 'inr',   testId: 'kpi-discount'                  },
              { label: 'Net Sales',     value: kpis.netSales,    sub: 'after disc+GST',icon: IndianRupee,  fmt: 'inr',   testId: 'kpi-net-sales', accent: true    },
```

Replace with:
```jsx
              { label: 'Discount',     value: kpis.discount,   sub: 'applied',      icon: Percent,      fmt: 'inr', testId: 'kpi-discount'                }, // BUG-630: Gross Revenue removed OD-630-08
              { label: 'Net Sales',    value: kpis.netSales,   sub: 'before taxes', icon: IndianRupee,  fmt: 'inr', testId: 'kpi-net-sales', accent: true  }, // BUG-630 OD-630-01
              { label: 'Tax',          value: kpis.tax,        sub: 'GST + SC',     icon: Receipt,      fmt: 'inr', testId: 'kpi-tax'                      }, // BUG-630 OD-630-05
              { label: 'Total Sales',  value: kpis.totalSales, sub: 'incl. tax',    icon: IndianRupee,  fmt: 'inr', testId: 'kpi-total-sales'              }, // BUG-630 OD-630-04
```

---

### E10 — `ItemSalesLedgerMockup.jsx` L315–321 (export kpis)
**Remove Gross Revenue from export, add Tax + Total Sales**

Current (L315–321):
```js
      kpis: [
        { label: 'Unique Items',  value: allRows.length,                                    format: 'text'    },
        { label: 'Total Qty',     value: allRows.reduce((s,r)=>s+r.totalQuantity,0),        format: 'text'    },
        { label: 'Gross Revenue', value: allRows.reduce((s,r)=>s+r.grossRevenue,0),         format: 'inr'     },
        { label: 'Discount',      value: allRows.reduce((s,r)=>s+r.discount,0),              format: 'inr'     },
        { label: 'Net Sales',     value: grandTotal,                                        format: 'inr', tone: 'primary' },
      ],
```

Replace with:
```js
      kpis: [
        { label: 'Unique Items',  value: allRows.length,                                   format: 'text'              },
        { label: 'Total Qty',     value: allRows.reduce((s,r)=>s+r.totalQuantity,0),       format: 'text'              },
        { label: 'Discount',      value: allRows.reduce((s,r)=>s+r.discount,0),            format: 'inr'               }, // BUG-630: Gross Revenue removed
        { label: 'Net Sales',     value: grandTotal,                                       format: 'inr', tone: 'primary' },
        { label: 'Tax',           value: allRows.reduce((s,r)=>s+r.tax,0),                format: 'inr'               }, // BUG-630
        { label: 'Total Sales',   value: allRows.reduce((s,r)=>s+r.totalSales,0),         format: 'inr'               }, // BUG-630
      ],
```

---

### E11 — `ItemSalesLedgerMockup.jsx` L589 (column styling)
**Keep `netSales` orange styling; `totalSales` uses default styling — no change needed**

Verify: `${col.key === 'netSales' ? 'font-semibold text-[#F26B33]' : 'text-zinc-600'}` — `totalSales` will render as `text-zinc-600` (normal). ✅ No edit needed.

---

## 3. Execution Sequence

```
1. topFoodSalesService.js  → E1, E2, E3  (transform layer — do first)
2. ItemSalesLedgerMockup.jsx → E4         (badge)
3. ItemSalesLedgerMockup.jsx → E5, E6     (COLUMNS + DEFAULT_VISIBLE)
4. ItemSalesLedgerMockup.jsx → E7         (kpis aggregation)
5. ItemSalesLedgerMockup.jsx → E8, E9     (KPI strip grid + array)
6. ItemSalesLedgerMockup.jsx → E10        (export kpis)
7. Compile check → 0 new warnings
```

---

## 4. Verification Matrix

| # | Edit | File | Expected | How to verify |
|---|------|------|----------|--------------|
| V1 | E1 | topFoodSalesService.js | `netSales = 0` until BB-14 | Console: `rows[0].netSales` → 0 (no `r.net_sales` yet) |
| V2 | E1 | topFoodSalesService.js | `totalSales` = previous "Net Sales" value | Console: `rows[0].totalSales` → matches old ₹14,79,478 |
| V3 | E2 | topFoodSalesService.js | `tax = gst + vat + sc` per row | Console: `rows[0].tax` → matches ₹70,173 sum |
| V4 | E4 | ItemSalesLedgerMockup.jsx | Badge shows "Net Sales · Total Sales" | Browser: page header |
| V5 | E5+E6 | ItemSalesLedgerMockup.jsx | "Total Sales" column visible in table | Browser: column chooser + table |
| V6 | E7 | ItemSalesLedgerMockup.jsx | `kpis.tax` + `kpis.totalSales` populated | Browser: KPI strip shows Tax ₹70,173 + Total Sales ₹14,79,478 |
| V7 | E8+E9 | ItemSalesLedgerMockup.jsx | 6-card KPI strip (no Gross Revenue) | Browser: count KPI cards |
| V8 | E9 | ItemSalesLedgerMockup.jsx | Net Sales subtitle = "before taxes" | Browser: KPI card subtitle |
| V9 | E10 | ItemSalesLedgerMockup.jsx | Export includes Tax + Total Sales | Download CSV/PDF — check KPI summary |
| V10 | — | Both | webpack 0 new warnings | Terminal compile output |

---

## 5. Post-Code Registry Checklist (EXIT GATE)

```
□ 1. registry.json: BUG-630 → status: IMPLEMENTED, sprint_key: nov_cr_batch
□ 2. BUG_TRACKER.md: row updated → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: add topFoodSalesService.js + ItemSalesLedgerMockup.jsx with BUG-630 + date
□ 4. Code markers: // BUG-630 in every modified file (already in plan above)
□ 5. Compile: webpack 0 new warnings
```

---

## 6. Risk Register

| Risk | Level | Mitigation |
|------|-------|-----------|
| `r.net_sales` absent (BB-14 not delivered) | HIGH | Net Sales KPI shows 0 — expected. Gate delivery on BB-14 confirmation. |
| `kpis.gross` reference after removing from aggregation | LOW | No other component reads `kpis.gross` — search confirmed: only L469 uses it (being removed). |
| `grid-cols-5` → `grid-cols-6` responsive break on small screens | LOW | Existing KPI strip already 5 cols; 6 cols may compress on tablet — test at 768px |
| Export consumers reading "Gross Revenue" label | LOW | Export kpis are display-only, no downstream parsing |

---

## 7. Open (non-blocking)

- BB-14 delivery from Gyan — **FE is ready; Net Sales KPI activates on delivery**
- After BB-14: update `topFoodSalesService.js` L11 comment + L88 `grandTotal` comment to reflect correct sort field
