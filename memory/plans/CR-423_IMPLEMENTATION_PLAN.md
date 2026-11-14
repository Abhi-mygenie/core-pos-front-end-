# CR-423 — Implementation Plan (Gate 3)

**Gate:** 3 (Implementation Plan)
**Item:** CR-423 — Fix Excel/PDF downloads on 3 remaining Insights report pages
**Code Reality:** PARTIAL — 34/40 pages working, 3 need fixes
**Conflict Pre-Check:** CLEAN
**Revised IA:** `impact/CR-423_IMPACT_ANALYSIS_REVISED.md`

---

## Edit Summary

| # | File | Edit | Lines | Priority |
|---|------|------|-------|:---:|
| E1a | `CancellationsMockup.jsx` | Add `reportExporter` import | ~L27 | P1 |
| E1b | `CancellationsMockup.jsx` | Enable Excel+PDF in DOWNLOAD_MENU | L168-169 | P1 |
| E1c | `CancellationsMockup.jsx` | Add `buildExportPayload()` function | after analytics | P1 |
| E1d | `CancellationsMockup.jsx` | Wire `handleDownloadAction()` + replace disabled buttons | ~L505 | P1 |
| E2a | `PLReportPage.jsx` | Add `reportExporter` import | top | P2 |
| E2b | `PLReportPage.jsx` | Add `buildExportPayload()` for Excel | after summary | P2 |
| E2c | `PLReportPage.jsx` | Add Excel download button next to PDF button | ~L208 | P2 |
| E3a | `OrderReportBetaPage.jsx` | Add `reportExporter` import for PDF | top | P2 |
| E3b | `OrderReportBetaPage.jsx` | Add `buildPdfPayload()` + `handlePdfExport()` | after fetchData | P2 |
| E3c | `OrderReportBetaPage.jsx` | Add PDF download button next to Excel button | ~L434 | P2 |

**Files WILL change:** `CancellationsMockup.jsx`, `PLReportPage.jsx`, `OrderReportBetaPage.jsx`
**Files will NOT touch:** `reportExporter.js`, any service/transform, any other report page

---

## E1: CancellationsMockup.jsx — Full Export Implementation

### E1a — Add reportExporter import (~L27)

**Current:** No reportExporter import.

**Add after existing imports:**
```jsx
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter'; // CR-423
```

### E1b — Enable Excel+PDF in DOWNLOAD_MENU (L168-169)

**Current:**
```jsx
{ id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: false, ... },
{ id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: false, ... },
```

**New:**
```jsx
{ id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, ... },  // CR-423
{ id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, ... },              // CR-423
```

### E1c — Add buildExportPayload() (after analytics useMemo, ~L370)

```jsx
  // CR-423: Build export payload for Excel + PDF download
  const buildExportPayload = () => {
    if (!analytics) return null;
    return {
      title: 'Cancellation Report', subtitle: 'Cancellations by date, stage, reason and employee',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Total Cancellations', value: analytics.totalQty, format: 'integer' },
        { label: 'Revenue Loss', value: analytics.totalLoss, format: 'inr' },
        { label: 'Order Cancels', value: `${analytics.cancelledOrderCount} orders (${fmtINR(analytics.orderLoss)})`, format: 'text' },
        { label: 'Item Cancels', value: `${analytics.itemQty} items (${fmtINR(analytics.itemLoss)})`, format: 'text' },
        { label: 'Before Serving', value: `${analytics.beforeCookingPct.toFixed(1)}%`, format: 'text' },
        { label: 'After Serving', value: `${analytics.afterServingPct.toFixed(1)}%`, format: 'text' },
      ],
      sheets: [
        {
          name: 'Cancellation Details', subtitle: `${cancelledItems.length} items`,
          columns: [
            { key: 'orderNumber', label: 'Order #', format: 'text', align: 'left', width: 90 },
            { key: 'orderDate', label: 'Date', format: 'text', align: 'left', width: 90 },
            { key: 'orderTime', label: 'Time', format: 'text', align: 'left', width: 60 },
            { key: 'foodName', label: 'Item', format: 'text', align: 'left', width: 160 },
            { key: 'qty', label: 'Qty', format: 'integer', align: 'right', width: 50 },
            { key: 'amount', label: 'Amount', format: 'inr', align: 'right', width: 90 },
            { key: 'stage', label: 'Stage', format: 'text', align: 'left', width: 100 },
            { key: 'scope', label: 'Scope', format: 'text', align: 'left', width: 60 },
            { key: 'reason', label: 'Reason', format: 'text', align: 'left', width: 120 },
            { key: 'cancelledBy', label: 'Cancelled By', format: 'text', align: 'left', width: 100 },
            { key: 'station', label: 'Station', format: 'text', align: 'left', width: 80 },
          ],
          rows: cancelledItems,
          totals: { label: 'TOTAL', qty: analytics.totalQty, amount: analytics.totalLoss },
        },
      ],
    };
  };
```

### E1d — Wire handleDownloadAction + replace disabled buttons (~L505)

**Current (L505-514):** Buttons are all hardcoded `disabled` with `cursor-not-allowed`.

**New:** Replace the `<ul>` block:
```jsx
<ul className="py-1">
  {DOWNLOAD_MENU.map((item) => (
    <li key={item.id}>
      <button
        disabled={!item.enabled}
        onClick={() => {
          if (!item.enabled) return;
          setShowDownloadMenu(false);
          // CR-423: handle download actions
          if (item.id === 'excel' || item.id === 'pdf') {
            let pdfWin = null;
            if (item.id === 'pdf') pdfWin = openReportWindow();
            try {
              const payload = buildExportPayload();
              if (!payload) return;
              if (item.id === 'excel') exportReportAsExcel(payload);
              else if (item.id === 'pdf') exportReportAsPDF(pdfWin, payload);
            } catch (err) { console.error('[CR-423] Export failed:', err); if (pdfWin) pdfWin.close(); }
          }
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-300 cursor-not-allowed'}`}
        data-testid={item.testId}
      >
        <item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} />
        <span className="text-sm font-medium">{item.label}</span>
      </button>
    </li>
  ))}
</ul>
```

---

## E2: PLReportPage.jsx — Add Excel Export

### E2a — Add reportExporter import

```jsx
import { exportReportAsExcel } from '../../utils/reportExporter'; // CR-423
```

### E2b — Add buildExportPayload for Excel (after summary useMemo)

```jsx
  // CR-423: Excel export payload
  const handleExportExcel = () => {
    if (!summary || !tableRows?.length) return;
    exportReportAsExcel({
      title: 'Profit & Loss Report', subtitle: `${appliedFrom} to ${appliedTo}`,
      restaurant: { name: '', address: '', id: '' },
      dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: '',
      kpis: [
        { label: 'Total Sales', value: summary.totalSales, format: 'inr' },
        { label: 'Paid Revenue', value: summary.paidRevenue, format: 'inr' },
        { label: 'Total Expenses', value: summary.totalExpenses, format: 'inr' },
        { label: 'Total Purchase', value: summary.totalPurchase, format: 'inr' },
        { label: 'Net P&L', value: summary.profitLoss, format: 'inr' },
      ],
      sheets: [{
        name: 'P&L Daily', subtitle: `${tableRows.length} days`,
        columns: [
          { key: 'date', label: 'Date', format: 'text', align: 'left', width: 100 },
          { key: 'sales', label: 'Sales', format: 'inr', align: 'right', width: 110 },
          { key: 'paidRevenue', label: 'Paid Revenue', format: 'inr', align: 'right', width: 110 },
          { key: 'expenses', label: 'Expenses', format: 'inr', align: 'right', width: 110 },
          { key: 'purchase', label: 'Purchase', format: 'inr', align: 'right', width: 110 },
          { key: 'profitLoss', label: 'Net P&L', format: 'inr', align: 'right', width: 110 },
        ],
        rows: tableRows,
        totals: { label: 'TOTAL', sales: summary.totalSales, paidRevenue: summary.paidRevenue, expenses: summary.totalExpenses, purchase: summary.totalPurchase, profitLoss: summary.profitLoss },
      }],
    });
  };
```

### E2c — Add Excel button next to PDF button (~L208)

**Current:**
```jsx
<Button onClick={handleExportPDF} ...> PDF </Button>
```

**New (add before PDF button):**
```jsx
<Button onClick={handleExportExcel} variant="outline" size="sm" className="text-xs gap-1" data-testid="pl-export-excel">
  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
</Button>
```
Also add `FileSpreadsheet` to the lucide-react import.

---

## E3: OrderReportBetaPage.jsx — Add PDF Export

### E3a — Add reportExporter import

```jsx
import { exportReportAsPDF, openReportWindow } from '../../utils/reportExporter'; // CR-423
```

### E3b — Add handlePdfExport (after handleExport Excel function)

```jsx
  // CR-423: PDF export
  const handlePdfExport = () => {
    if (!data?.daily_reports) return;
    const win = openReportWindow();
    try {
      const allRows = data.daily_reports.flatMap(day =>
        (day.orders || []).map(o => ({
          order: o.restaurant_order_id || '',
          time: o.time || '',
          platform: o.platform || '',
          type: o.order_type || '',
          waiter: o.waiter || '',
          items: o.total_items || 0,
          amount: o.total_amount || 0,
          gst: o.gst_amount || 0,
          service: o.service_charge || 0,
          payment: o.payment_type || '',
          status: o.status || '',
        }))
      );
      exportReportAsPDF(win, {
        title: 'Orders Report (Beta)', subtitle: `${appliedFrom} to ${appliedTo}`,
        restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
        dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
        kpis: [
          { label: 'Total Orders', value: stats.paidOrders + stats.unpaidOrders + stats.cancelOrders, format: 'integer' },
          { label: 'Paid Orders', value: stats.paidOrders, format: 'integer' },
          { label: 'Total Revenue', value: stats.totalRevenue, format: 'inr' },
        ],
        sheets: [{
          name: 'All Orders', subtitle: `${allRows.length} orders`,
          columns: [
            { key: 'order', label: 'Order #', format: 'text', align: 'left', width: 80 },
            { key: 'time', label: 'Time', format: 'text', align: 'left', width: 60 },
            { key: 'platform', label: 'Platform', format: 'text', align: 'left', width: 70 },
            { key: 'type', label: 'Type', format: 'text', align: 'left', width: 70 },
            { key: 'waiter', label: 'Waiter', format: 'text', align: 'left', width: 90 },
            { key: 'items', label: 'Items', format: 'integer', align: 'right', width: 50 },
            { key: 'amount', label: 'Amount', format: 'inr', align: 'right', width: 90 },
            { key: 'gst', label: 'GST', format: 'inr', align: 'right', width: 80 },
            { key: 'payment', label: 'Payment', format: 'text', align: 'left', width: 70 },
            { key: 'status', label: 'Status', format: 'text', align: 'left', width: 70 },
          ],
          rows: allRows,
        }],
      });
    } catch (err) { console.error('[CR-423] PDF export failed:', err); win?.close(); }
  };
```

### E3c — Add PDF button next to Excel button (~L434)

**Add after the Excel button:**
```jsx
<button onClick={handlePdfExport} disabled={!data}
  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-zinc-200 hover:bg-zinc-50"
  data-testid="order-report-export-pdf">
  <FileDown className="w-3.5 h-3.5" /> PDF
</button>
```
Also add `FileDown` to the lucide-react import.

---

## Verification Matrix

| # | File | Change | How to Verify |
|---|------|--------|--------------|
| V1 | CancellationsMockup | Excel downloads | Browser: Oct date range → Download → Excel → file opens with Summary + Detail sheets |
| V2 | CancellationsMockup | PDF downloads | Browser: Download → PDF → print preview window opens with formatted report |
| V3 | PLReportPage | Excel downloads | Browser: P&L → Excel button → file opens with daily rows + totals |
| V4 | PLReportPage | PDF still works | Browser: PDF button → same HTML print preview as before |
| V5 | OrderReportBetaPage | PDF downloads | Browser: Orders Beta → PDF button → print preview with all order rows |
| V6 | OrderReportBetaPage | Excel still works | Browser: Excel button → backend-generated XLSX downloads as before |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: CR-423 → IMPLEMENTED
- [ ] BUG_TRACKER.md / CR_REGISTRY.md: updated
- [ ] Code markers: // CR-423 in every modified section
- [ ] Compile: webpack 0 new warnings
```
