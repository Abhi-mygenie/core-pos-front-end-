# BUG-630 — Impact Analysis (Gate 2)

**Date:** 2026-11-18
**Agent:** PLANNING
**Stage:** Gate 2 — Impact Analysis
**Risk:** MEDIUM (financial display — read-only report, no write/billing/settlement logic)
**Code Reality:** NONE — fix does not exist anywhere in codebase
**Conflict Pre-Check:** `topFoodSalesService.js` last modifier CR-136 (2026-08-12) — no active conflict. `ItemSalesLedgerMockup.jsx` last modifier CR-136 (2026-08-12) — no active conflict.

---

## 1. Bug Statement

Item Sales Ledger KPI strip shows **Net Sales > Gross Revenue** — mathematically impossible.

**Root cause:** `topFoodSalesService.js` L28 reads `r.total_sales` for `netSales`.
Backend `total_sales` = `Gross − Discount + GST + VAT + SC` (Total Billed), not Net Sales (pre-tax).

**Live probe — woko.com (Oct 1 – Nov 18 2026, 51 items):**
```
Gross Revenue :  ₹14,39,944.00
Discount      :     ₹30,638.29
Net Sales     :  ₹14,09,305.71  ← CORRECT (Gross − Discount)
Tax (gst+vat+sc): ₹70,173.21
Total Sales   :  ₹14,79,478.92  ← what backend sends as total_sales (displayed as "Net Sales" today)

BUG: POS shows ₹14,79,478.92 as "Net Sales" — overstated by ₹70,173.21 (= tax amount)
Validation: net_sales + tax = total_sales → TRUE ✅
```

**Additional UI issues found (same fix session):**
- `"1 API call · any range"` badge on page header — dev artifact, must be removed
- `FROM` / `TO` text labels inside date range picker — must be removed

---

## 2. Definitions (locked by owner this session)

| Term | Formula | Source after fix |
|------|---------|-----------------|
| **Gross Revenue** | `item_price + variation_price + addon_price` | FE computed (unchanged) |
| **Discount** | `discount` | From API (unchanged) |
| **Net Sales** | `Gross Revenue − Discount` | New `r.net_sales` from backend (BB-14) |
| **Tax** | `gst + vat + service_charge` | FE sums 3 existing API fields (no backend change needed) |
| **Total Sales** | `Net Sales + Tax` | `r.total_sales` — keep sending, relabelled |

**Relationship:** `net_sales + tax = total_sales` ✅ confirmed on live data.

---

## 3. Data Flow Trace

```
API: POST top-food%20sales-report
  → response.food_sales_report[].total_sales  (string, includes tax)
  → topFoodSalesService.js L28: netSales = parseFloat(r.total_sales)   ← BREAK POINT
  → rows[].netSales
  → grandTotal = rows.reduce(r.netSales)
  → ItemSalesLedgerMockup.jsx L471: KPI "Net Sales" value = kpis.netSales
  → UI: "NET SALES ₹14,79,478.92"  (wrong — shows Total Sales)
```

---

## 4. Files WILL change

| File | Lines | Change |
|------|-------|--------|
| `src/api/services/topFoodSalesService.js` | L28, L31–32, L34–53 | 1. Remove `netSales = r.total_sales`. 2. Add `netSales = parseFloat(r.net_sales) || 0` (new BE field). 3. Add `tax = gst + vat + serviceCharge`. 4. Add `totalSales = parseFloat(r.total_sales) || 0`. 5. Expose `tax` + `totalSales` in returned row object. |
| `src/pages/reports-module/ItemSalesLedgerMockup.jsx` | Multiple | 1. Remove `"1 API call · any range"` badge. 2. Remove `FROM` / `TO` text labels in date picker. 3. KPI strip: add Tax KPI, add Total Sales KPI, fix Net Sales subtitle. 4. Update kpis aggregation to include `tax` + `totalSales`. 5. Update grandTotal comment/label (column still sorts by netSales). |

## 5. Files WILL NOT touch

- `CartPanel.jsx` · `OrderEntry.jsx` · any socket/context/auth file
- `orderTransform.js` · any other report page
- `App.js` · routes (no route change)

---

## 6. Backend dependency

| Ask | Field | Status |
|-----|-------|--------|
| BB-14 | `net_sales` per row in `food_sales_report[]` | Filed in `BACKEND_BRIEF_BATCH-B_2026_11_15.md` + tracker — **NOT SENT** |

**FE can ship** the UI-only changes (badge removal, FROM/TO removal, Total Sales relabel, Tax KPI using existing `gst+vat+sc`) **without waiting for BB-14**.
**Net Sales KPI correction** requires BB-14 (new backend field).

---

## 7. Owner Decisions — ALL LOCKED 2026-11-18

| OD | Question | Decision | Owner note |
|----|----------|----------|-----------|
| **OD-630-01** | Net Sales KPI subtitle | ✅ `"before taxes"` | Discount already deducted in Net Sales formula (Gross − Discount). "Before taxes" = after discount, before GST/VAT/SC. |
| **OD-630-02** | Gross Revenue subtitle | ✅ No change — keep `"before disc"` | Owner: "there is nothing before discount" — subtitle is correct as-is. |
| **OD-630-03** | Date picker FROM/TO labels | ✅ No change — keep as today | Owner: "same as today why change" — FROM/TO labels stay. Badge removal only. |
| **OD-630-04** | Total Sales KPI subtitle | ✅ `"incl. tax"` | As recommended. |
| **OD-630-05** | Tax KPI subtitle | ✅ `"GST + SC"` | As recommended. |
| **OD-630-06** | Add Total Sales as table column | ✅ Yes — both Net Sales + Total Sales columns visible | Owner: "yes". |
| **OD-630-07** | Page header badge content | ✅ Replace `"1 API call · any range"` → `"Net Sales · Total Sales"` | Owner 2026-11-18 |
| **OD-630-08** | Gross Revenue KPI card | ✅ **Remove** — not needed in the new KPI strip | Owner 2026-11-18 |

---

## 8. Verification Matrix (seeds QA)

| # | Edit | How to verify |
|---|------|--------------|
| V1 | Net Sales KPI value | Net Sales ≤ Gross Revenue on any date range |
| V2 | Tax KPI value | Tax = Net Sales KPI diff from Total Sales KPI |
| V3 | Total Sales KPI value | Matches previous "Net Sales" value (unchanged) |
| V4 | Badge removed | No `"1 API call · any range"` text on page |
| V5 | FROM/TO labels — no change (OD-630-03 locked: keep as today) | Date picker unchanged |
| V6 | Relationship check | Net Sales + Tax = Total Sales (browser console / network tab) |
| V7 | Total Sales column in table | Table has both Net Sales + Total Sales columns visible |

---

## 9. Risk Register

| Risk | Level | Mitigation |
|------|-------|-----------|
| `r.net_sales` absent (BB-14 not yet delivered) | HIGH | FE falls back to 0 — gate on BB-14 delivery before showing Net Sales KPI |
| grandTotal recalculation uses wrong base | MEDIUM | grandTotal must switch from `total_sales` to `net_sales` — verify sort still works |
| Tax KPI shows 0 for restaurants with no GST | LOW | Expected — 0 is correct for GST-off outlets |

---

## 10. Design Mockup

`/bug630-net-sales-mockup.html` — see attached. Shows before/after KPI strip with live woko.com figures.
