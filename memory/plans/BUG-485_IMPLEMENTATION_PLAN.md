# BUG-485 — Implementation Plan

**ID:** BUG-485
**Gate:** 3 — IMPLEMENTATION PLAN
**Date:** 2026-10-05
**Risk:** MEDIUM
**Scope lock:**
- Files WILL change: `pages/reports-module/DashboardMockup.jsx`
- Files will NOT touch: `reportExporter.js`, `insightsService.js`, any other file

---

## Edit E-1 — Add import line

**File:** `src/pages/reports-module/DashboardMockup.jsx`
**After line 4** (after `import { useInsightsCache } from '../../contexts/InsightsCacheContext';`)

**Insert:**
```javascript
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter'; // BUG-485
```

---

## Edit E-2 — Add buildExportPayload() + handleDownloadAction()

**File:** `src/pages/reports-module/DashboardMockup.jsx`
**After line 169** (after the `paymentColoredMix` useMemo — before the `return (` statement)

**Insert:**
```javascript
  // BUG-485: build export payload for PDF/Excel (mirrors SalesMockup pattern)
  const buildExportPayload = () => {
    if (!tiles) return null;
    return {
      title: 'Dashboard Report',
      subtitle: 'Insights summary',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo },
      generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Net Sales',          value: sales.totalRevenue,          tone: 'good',    format: 'inr' },
        { label: 'Paid Orders',         value: sales.paidOrderCount,        tone: 'primary', format: 'text' },
        { label: 'Top Channel',         value: `${channels.topChannel} (${channels.topChannelPct}%)`, tone: 'primary', format: 'text' },
        { label: 'Repeat Customers',    value: `${customers.repeatPct}%`,   tone: 'primary', format: 'text' },
        { label: 'Direct Discount',     value: discounts.directDiscount,    tone: 'bad',     format: 'inr' },
        { label: 'Coupon Discount',     value: discounts.couponDiscount,    tone: 'bad',     format: 'inr' },
        { label: 'Loyalty Discount',    value: discounts.loyaltyDiscount,   tone: 'bad',     format: 'inr' },
        { label: 'Comp Items Total',    value: discounts.compItemTotal,     tone: 'bad',     format: 'inr' },
        { label: 'Total Leakage',       value: discounts.totalLeakage,      tone: 'bad',     format: 'inr' },
        { label: 'Credit Outstanding',  value: payments.creditOutstanding,  tone: 'bad',     format: 'inr' },
        { label: 'Avg Prep Time',       value: kitchen.avgPrep,             tone: 'primary', format: 'text' },
        { label: 'Avg Serve Time',      value: kitchen.avgServe,            tone: 'primary', format: 'text' },
        { label: 'Audit Flags',         value: audits.total,                tone: audits.total > 0 ? 'bad' : 'primary', format: 'text' },
      ],
      sheets: [
        {
          name: 'By Channel',
          subtitle: `${channels.mix.length} channels`,
          columns: [
            { key: 'name',    label: 'Channel',  format: 'text',    align: 'left',  width: 150 },
            { key: 'count',   label: 'Orders',   format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue',  format: 'inr',     align: 'right', width: 120 },
            { key: 'value',   label: 'Share %',  format: 'text',    align: 'right', width: 80 },
          ],
          rows: channels.mix,
          totals: null,
        },
        {
          name: 'By Payment',
          subtitle: `${payments.mix.length} methods`,
          columns: [
            { key: 'name',    label: 'Method',   format: 'text',    align: 'left',  width: 150 },
            { key: 'count',   label: 'Orders',   format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue',  format: 'inr',     align: 'right', width: 120 },
            { key: 'value',   label: 'Share %',  format: 'text',    align: 'right', width: 80 },
          ],
          rows: payments.mix,
          totals: null,
        },
        {
          name: 'Top Items',
          subtitle: `${topItems.items.length} items`,
          columns: [
            { key: 'name',    label: 'Item',     format: 'text',    align: 'left',  width: 200 },
            { key: 'qty',     label: 'Qty',      format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue',  format: 'inr',     align: 'right', width: 120 },
          ],
          rows: topItems.items,
          totals: null,
        },
        {
          name: 'Discounts',
          subtitle: 'Discount & offer summary',
          columns: [
            { key: 'label', label: 'Type',   format: 'text', align: 'left',  width: 200 },
            { key: 'value', label: 'Amount', format: 'inr',  align: 'right', width: 120 },
          ],
          rows: [
            { label: 'Direct Discount',  value: discounts.directDiscount },
            { label: 'Coupon Discount',  value: discounts.couponDiscount },
            { label: 'Loyalty Discount', value: discounts.loyaltyDiscount },
            { label: 'Comp Items',       value: discounts.compItemTotal },
            { label: 'Total Leakage',    value: discounts.totalLeakage },
          ],
          totals: null,
        },
      ],
    };
  };

  const handleDownloadAction = (action) => { // BUG-485
    let pdfWin = null;
    if (action === 'pdf') pdfWin = openReportWindow();
    try {
      const payload = buildExportPayload();
      if (!payload) return;
      if (action === 'excel') exportReportAsExcel(payload);
      else if (action === 'pdf') exportReportAsPDF(pdfWin, payload);
    } catch (e) { console.error('dashboard export failed:', e); if (pdfWin && !pdfWin.closed) pdfWin.close(); }
  };
```

---

## Edit E-3 — Wire onClick to PDF button

**File:** `src/pages/reports-module/DashboardMockup.jsx`

**Current (line ~292):**
```jsx
            <button 
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm ${isLoading ? 'opacity-50' : ''}`}
              data-testid="reports-export-pdf-btn"
            >
```

**After:**
```jsx
            <button 
              disabled={isLoading || !tiles}
              onClick={() => handleDownloadAction('pdf')}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm ${isLoading || !tiles ? 'opacity-50 cursor-not-allowed' : ''}`}
              data-testid="reports-export-pdf-btn"
            >
```

---

## Edit E-4 — Wire onClick to Excel button

**Current (line ~300):**
```jsx
            <button 
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm ${isLoading ? 'opacity-50' : ''}`}
              data-testid="reports-export-excel-btn"
            >
```

**After:**
```jsx
            <button 
              disabled={isLoading || !tiles}
              onClick={() => handleDownloadAction('excel')}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm ${isLoading || !tiles ? 'opacity-50 cursor-not-allowed' : ''}`}
              data-testid="reports-export-excel-btn"
            >
```

---

## Verification Matrix

| # | Edit | Check | Method | Auto? |
|---|------|-------|--------|:---:|
| V-1 | E-1 | `exportReportAsExcel` imported in DashboardMockup | grep | YES |
| V-2 | E-2 | `buildExportPayload` function exists | grep | YES |
| V-3 | E-2 | `handleDownloadAction` function exists | grep | YES |
| V-4 | E-3 | PDF button has `onClick` | grep | YES |
| V-5 | E-4 | Excel button has `onClick` | grep | YES |
| V-6 | E-3/E-4 | Buttons disabled when `!tiles` | Code confirm | YES |
| V-7 | All | yarn build exit 0, 0 new warnings | build | YES |
| V-8 | E-3 | Click PDF button with data loaded → opens print window | Browser | NO |
| V-9 | E-4 | Click Excel button with data loaded → downloads `.xls` file | Browser | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-485 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row BUG-485 updated
- [ ] FILE_OWNERSHIP.md: pages/reports-module/DashboardMockup.jsx — BUG-485 + date
- [ ] Code marker: // BUG-485 on import line + function bodies
- [ ] Compile check: yarn build exit 0
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| R1: PDF popup blocked by browser | `openReportWindow()` called synchronously inside click handler — same pattern as SalesMockup (working) |
| R2: `tiles` null when clicked | Guard: `disabled={isLoading \|\| !tiles}` + early return in `buildExportPayload` |
| R3: `restaurant` context missing | `|| ''` fallbacks on all restaurant fields |
