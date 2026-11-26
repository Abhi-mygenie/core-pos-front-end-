# CR-528 — Implementation Plan (Gate 3)

**ID:** CR-528
**Gate:** 3 — Implementation Plan (line-by-line)
**Role:** PLANNING
**Date:** 2026-11-17
**Risk:** MEDIUM (audit report, no financial computation)
**IA verified at HEAD:** YES (same session, AuditLogMockup.jsx = 152 lines)
**File:** `frontend/src/pages/reports-module/AuditLogMockup.jsx`

---

## 1. Scope Lock

**Files WILL change:**
- `frontend/src/pages/reports-module/AuditLogMockup.jsx` (152 lines → ~215 lines)

**Files WILL NOT touch:**
- `insightsService.js`, `insightsCache.js`, `InsightsCacheContext.jsx`
- `reportExporter.js`, `App.js`, any transform, any other report page

---

## 2. Exact Edits (8 edits, execution order)

### E1 — L15: Import 3 new Lucide icons

```
CURRENT (L15):
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, ShieldAlert, AlertTriangle, RefreshCw } from 'lucide-react';

REPLACE WITH:
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, ShieldAlert, AlertTriangle, RefreshCw, XCircle, Ban, Pencil } from 'lucide-react'; // CR-528: +XCircle, Ban, Pencil
```

**What changes:** Add `XCircle` (item cancel icon), `Ban` (order cancel icon), `Pencil` (order edit icon). 1 line changed.

---

### E2 — After L20: Add TYPE_MAP constant

```
INSERT AFTER L20 (after fmtINR):

// CR-528: event type → display label + badge colours
const AUDIT_TYPE_MAP = {
  make_unpaid:              { label: 'Make Unpaid',               bg: 'bg-red-100',    text: 'text-red-700' },
  payment_method_change:    { label: 'Payment Change',            bg: 'bg-amber-100',  text: 'text-amber-700' },
  item_cancel_after_print:  { label: 'Item Cancel (Post-Print)',  bg: 'bg-orange-100', text: 'text-orange-700' },
  order_cancel_after_print: { label: 'Order Cancel (Post-Print)', bg: 'bg-rose-100',   text: 'text-rose-700' },
  order_edit_after_print:   { label: 'Order Edit (Post-Print)',   bg: 'bg-blue-100',   text: 'text-blue-700' },
};
const fmtTime = (dt) => dt ? dt.split(' ').pop()?.slice(0, 5) || dt : '—'; // CR-528: "22:26:16" → "22:26"
```

**What changes:** New constant for type→badge mapping (used in E7 table rows) + time formatter. ~9 lines inserted.

---

### E3 — L71-78: Extend analytics useMemo with 3 new event arrays + counts

```
CURRENT (L71-78):
  const analytics = useMemo(() => {
    if (!rawData) return null;
    const audits = rawData.audits || {};
    const orders = audits.orders || [];
    const makeUnpaid = orders.filter(o => o.type === 'make_unpaid');
    const payChange = orders.filter(o => o.type === 'payment_method_change');
    return { orders, makeUnpaid, payChange, total: audits.total || orders.length, makeUnpaidCount: audits.make_unpaid_count || makeUnpaid.length, payChangeCount: audits.payment_method_change_count || payChange.length };
  }, [rawData]);

REPLACE WITH:
  // CR-528: extended analytics with 3 new post-print event types
  const analytics = useMemo(() => {
    if (!rawData) return null;
    const audits = rawData.audits || {};
    const orders = audits.orders || [];
    const makeUnpaid = orders.filter(o => o.type === 'make_unpaid');
    const payChange = orders.filter(o => o.type === 'payment_method_change');
    const itemCancelAP = orders.filter(o => o.type === 'item_cancel_after_print'); // CR-528
    const orderCancelAP = orders.filter(o => o.type === 'order_cancel_after_print'); // CR-528
    const orderEditAP = orders.filter(o => o.type === 'order_edit_after_print'); // CR-528
    return {
      orders, makeUnpaid, payChange, itemCancelAP, orderCancelAP, orderEditAP,
      total: audits.total || orders.length,
      makeUnpaidCount: audits.make_unpaid_count || makeUnpaid.length,
      payChangeCount: audits.payment_method_change_count || payChange.length,
      itemCancelCount: audits.item_cancel_after_print_count || itemCancelAP.length, // CR-528
      orderCancelCount: audits.order_cancel_after_print_count || orderCancelAP.length, // CR-528
      orderEditCount: audits.order_edit_after_print_count || orderEditAP.length, // CR-528
    };
  }, [rawData]);
```

**What changes:** 3 new filter arrays + 3 new count fields. 8→17 lines (net +9).

---

### E4 — L82-83: Update export subtitle + add 3 new KPIs to export

```
CURRENT (L82-83):
    return { title: 'Order Edit Audit', subtitle: 'Make-unpaid and payment method changes', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [{ label: 'Total Audits', value: analytics.total, format: 'text' }, { label: 'Make Unpaid', value: analytics.makeUnpaidCount, format: 'text' }, { label: 'Payment Changes', value: analytics.payChangeCount, format: 'text' }],

REPLACE WITH:
    return { title: 'Order Edit Audit', subtitle: 'Audit trail: payment changes, post-print edits and cancellations', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '', // CR-528: updated subtitle
      kpis: [
        { label: 'Total Audits', value: analytics.total, format: 'text' },
        { label: 'Make Unpaid', value: analytics.makeUnpaidCount, format: 'text' },
        { label: 'Payment Changes', value: analytics.payChangeCount, format: 'text' },
        { label: 'Item Cancel After Print', value: analytics.itemCancelCount, format: 'text' }, // CR-528
        { label: 'Order Cancel After Print', value: analytics.orderCancelCount, format: 'text' }, // CR-528
        { label: 'Order Edit After Print', value: analytics.orderEditCount, format: 'text' }, // CR-528
      ],
```

**What changes:** Subtitle updated. 3 new KPI entries in export. 2→8 lines.

---

### E5 — L84-88: Add new columns to export sheet

```
CURRENT (L84-88):
      sheets: [{ name: 'Audit Log', columns: [
        { key: 'order_id', label: 'Order', format: 'text', align: 'left', width: 80 }, { key: 'type', label: 'Type', format: 'text', align: 'left', width: 140 },
        { key: 'amount', label: 'Amount', format: 'inr', align: 'right', width: 100 }, { key: 'by', label: 'By', format: 'text', align: 'left', width: 100 },
        { key: 'prev_method', label: 'Previous', format: 'text', align: 'left', width: 100 }, { key: 'curr_method', label: 'Current', format: 'text', align: 'left', width: 100 },
      ], rows: analytics.orders }] };

REPLACE WITH:
      sheets: [{ name: 'Audit Log', columns: [
        { key: 'order_id', label: 'Order', format: 'text', align: 'left', width: 80 },
        { key: 'type', label: 'Type', format: 'text', align: 'left', width: 160 },
        { key: 'food_name', label: 'Item', format: 'text', align: 'left', width: 120 }, // CR-528
        { key: 'amount', label: 'Amount', format: 'inr', align: 'right', width: 100 },
        { key: 'prev_amount', label: 'Prev Amount', format: 'inr', align: 'right', width: 100 }, // CR-528
        { key: 'by', label: 'By', format: 'text', align: 'left', width: 100 },
        { key: 'bill_printed_at', label: 'Bill Printed', format: 'text', align: 'left', width: 140 }, // CR-528
        { key: 'cancel_time', label: 'Cancel Time', format: 'text', align: 'left', width: 140 }, // CR-528
        { key: 'edit_time', label: 'Edit Time', format: 'text', align: 'left', width: 140 }, // CR-528
        { key: 'prev_method', label: 'Previous Method', format: 'text', align: 'left', width: 100 },
        { key: 'curr_method', label: 'Current Method', format: 'text', align: 'left', width: 100 },
      ], rows: analytics.orders }] };
```

**What changes:** 5 new columns (food_name, prev_amount, bill_printed_at, cancel_time, edit_time). Type width 140→160. 5→12 lines.

---

### E6 — L101: Update page subtitle text

```
CURRENT (L101):
                <p className="text-[11px] text-zinc-500 mt-0.5">Make-unpaid events + payment method changes{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>

REPLACE WITH:
                <p className="text-[11px] text-zinc-500 mt-0.5">Audit trail: payment changes, post-print edits and cancellations{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>
```

**What changes:** Subtitle text. 1 line, text-only change.

---

### E7 — L114-118: Expand KPI strip from 3 to 6 cards

```
CURRENT (L114-118):
                  <div className="grid grid-cols-3 gap-4" data-testid="s34-kpi-strip">
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4 text-amber-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Total Audit Events</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.total}</div></div>
                    <div className="bg-white border border-red-200 rounded-xl p-5 bg-red-50/30"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Make Unpaid</span></div><div className="text-2xl font-bold text-red-700">{analytics.makeUnpaidCount}</div></div>
                    <div className="bg-white border border-amber-200 rounded-xl p-5 bg-amber-50/30"><div className="flex items-center gap-2 mb-2"><RefreshCw className="w-4 h-4 text-amber-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Payment Method Change</span></div><div className="text-2xl font-bold text-amber-700">{analytics.payChangeCount}</div></div>
                  </div>

REPLACE WITH:
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-4" data-testid="s34-kpi-strip">
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4 text-amber-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Total Audits</span></div><div className="text-2xl font-bold text-zinc-950" data-testid="s34-kpi-total">{analytics.total}</div></div>
                    <div className="bg-white border border-red-200 rounded-xl p-5 bg-red-50/30"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Make Unpaid</span></div><div className="text-2xl font-bold text-red-700" data-testid="s34-kpi-unpaid">{analytics.makeUnpaidCount}</div></div>
                    <div className="bg-white border border-amber-200 rounded-xl p-5 bg-amber-50/30"><div className="flex items-center gap-2 mb-2"><RefreshCw className="w-4 h-4 text-amber-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Payment Change</span></div><div className="text-2xl font-bold text-amber-700" data-testid="s34-kpi-paychange">{analytics.payChangeCount}</div></div>
                    {/* CR-528: 3 new post-bill-print KPI cards */}
                    <div className="bg-white border border-orange-200 rounded-xl p-5 bg-orange-50/30"><div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-orange-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Item Cancel After Print</span></div><div className="text-2xl font-bold text-orange-700" data-testid="s34-kpi-item-cancel">{analytics.itemCancelCount}</div></div>
                    <div className="bg-white border border-rose-200 rounded-xl p-5 bg-rose-50/30"><div className="flex items-center gap-2 mb-2"><Ban className="w-4 h-4 text-rose-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Order Cancel After Print</span></div><div className="text-2xl font-bold text-rose-700" data-testid="s34-kpi-order-cancel">{analytics.orderCancelCount}</div></div>
                    <div className="bg-white border border-blue-200 rounded-xl p-5 bg-blue-50/30"><div className="flex items-center gap-2 mb-2"><Pencil className="w-4 h-4 text-blue-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Order Edit After Print</span></div><div className="text-2xl font-bold text-blue-700" data-testid="s34-kpi-order-edit">{analytics.orderEditCount}</div></div>
                  </div>
```

**What changes:** Grid 3→6 cols. 3 new KPI cards (orange/rose/blue). `data-testid` on each value. 5→9 lines.

---

### E8 — L121-138: Expand table header + rows for 5 event types

```
CURRENT (L121-138):
                    <table className="w-full"><thead className="bg-zinc-50"><tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Order ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Previous Method</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Current Method</th>
                    </tr></thead><tbody>
                      {analytics.orders.map((o, i) => (
                        <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s34-row-${i}`}>
                          <td className="px-6 py-3 text-sm font-mono text-zinc-800">#{o.order_id}</td>
                          <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${o.type === 'make_unpaid' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{o.type === 'make_unpaid' ? 'Make Unpaid' : 'Payment Change'}</span></td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-zinc-900">{fmtINR(o.amount)}</td>
                          <td className="px-4 py-3 text-sm text-zinc-600">{o.by || '—'}</td>
                          <td className="px-4 py-3 text-sm text-zinc-500">{o.prev_method || '—'}</td>
                          <td className="px-6 py-3 text-sm text-zinc-500">{o.curr_method || '—'}</td>
                        </tr>
                      ))}
                    </tbody></table>

REPLACE WITH:
                    {/* CR-528: table with 5 event types + type-specific columns */}
                    <div className="overflow-x-auto">
                    <table className="w-full"><thead className="bg-zinc-50"><tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Order</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Type</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Item</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Amount</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Prev Amt</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">By</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Bill Printed</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Event Time</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Prev Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Curr Method</th>
                    </tr></thead><tbody>
                      {analytics.orders.map((o, i) => {
                        const tm = AUDIT_TYPE_MAP[o.type] || { label: o.type, bg: 'bg-zinc-100', text: 'text-zinc-700' };
                        const isPostPrint = o.type?.includes('after_print');
                        return (
                        <tr key={i} className={`border-t border-zinc-50 hover:bg-zinc-50/50 ${isPostPrint ? 'bg-amber-50/20' : ''}`} data-testid={`s34-row-${i}`}>
                          <td className="px-4 py-3 text-sm font-mono text-zinc-800">#{o.order_id}</td>
                          <td className="px-3 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tm.bg} ${tm.text}`}>{tm.label}</span></td>
                          <td className="px-3 py-3 text-sm text-zinc-600">{o.food_name || '—'}</td>
                          <td className="px-3 py-3 text-sm text-right font-medium text-zinc-900">{fmtINR(o.amount)}</td>
                          <td className="px-3 py-3 text-sm text-right text-zinc-500">{o.prev_amount != null ? fmtINR(o.prev_amount) : '—'}</td>
                          <td className="px-3 py-3 text-sm text-zinc-600">{o.by || '—'}</td>
                          <td className="px-3 py-3 text-sm text-zinc-500 whitespace-nowrap">{o.bill_printed_at ? fmtTime(o.bill_printed_at) : '—'}</td>
                          <td className="px-3 py-3 text-sm text-zinc-500 whitespace-nowrap">{o.cancel_time ? fmtTime(o.cancel_time) : o.edit_time ? fmtTime(o.edit_time) : '—'}</td>
                          <td className="px-3 py-3 text-sm text-zinc-500">{o.prev_method || '—'}</td>
                          <td className="px-4 py-3 text-sm text-zinc-500">{o.curr_method || '—'}</td>
                        </tr>
                        );
                      })}
                    </tbody></table>
                    </div>
```

**What changes:** 6 columns → 10 columns. Type badge uses AUDIT_TYPE_MAP. Post-print rows get subtle amber tint. food_name, prev_amount, bill_printed_at, cancel_time/edit_time cells. `overflow-x-auto` wrapper for horizontal scroll on narrow screens. 18→30 lines.

---

## 3. Execution Sequence

```
1. E1  — L15:  Import XCircle, Ban, Pencil
2. E2  — After L20: Insert AUDIT_TYPE_MAP + fmtTime constants
3. E3  — L71-78: Extend analytics useMemo
4. E4  — L82-83: Export subtitle + 3 new KPIs
5. E5  — L84-88: Export 5 new columns
6. E6  — L101: Page subtitle text
7. E7  — L114-118: KPI strip 3→6 cards
8. E8  — L121-138: Table header + rows 5 event types
```

Apply bottom-up (E8→E7→E6→E5→E4→E3→E2→E1) to avoid line-shift issues. Or apply top-down with awareness that each edit shifts subsequent line numbers.

**Webpack check after all edits applied.**

---

## 4. Verification Matrix

| # | Edit | Check | Method | Expected |
|---|------|-------|--------|----------|
| V1 | E1 | XCircle, Ban, Pencil imported | grep | 3 new icons in import |
| V2 | E2 | AUDIT_TYPE_MAP has 5 entries | code trace | 5 keys |
| V3 | E3 | analytics has itemCancelCount/orderCancelCount/orderEditCount | code trace | 3 new fields |
| V4 | E4 | Export has 6 KPIs | code trace | 6 entries in kpis array |
| V5 | E5 | Export has 11 columns | code trace | 11 column entries |
| V6 | E6 | Subtitle updated | grep | "post-print edits and cancellations" |
| V7 | E7 | 6 KPI cards render | Browser | Total + Unpaid + PayChange + ItemCancel + OrderCancel + OrderEdit |
| V8 | E7 | data-testid on each KPI value | grep | s34-kpi-total, s34-kpi-item-cancel, etc. |
| V9 | E8 | 10 column headers in table | Browser | Order, Type, Item, Amount, Prev Amt, By, Bill Printed, Event Time, Prev Method, Curr Method |
| V10 | E8 | Type badge uses AUDIT_TYPE_MAP colours | Browser | 5 different colours |
| V11 | E8 | Post-print rows have amber tint | Browser | bg-amber-50/20 on after_print rows |
| V12 | — | `// CR-528` markers | grep | ≥8 hits |
| V13 | — | Webpack 0 new warnings | dev server | compiled |
| V14 | — | Excel export includes all columns + KPIs | Download Excel | 6 KPIs + 11 columns |

---

## 5. Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: CR-528 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add AuditLogMockup.jsx
- [ ] Code markers: // CR-528 in every edit site
- [ ] Compile check: webpack 0 new warnings
```

---

## 6. Risk Register

| # | Risk | Mitigation |
|---|------|------------|
| R1 | 10-column table overflows on small screens | `overflow-x-auto` wrapper added (E8) |
| R2 | Unknown event type from future backend | AUDIT_TYPE_MAP fallback: `{ label: o.type, bg: 'bg-zinc-100', text: 'text-zinc-700' }` |
| R3 | prev_amount is null for non-edit events | Guarded: `o.prev_amount != null ? fmtINR(o.prev_amount) : '—'` |
| R4 | Export columns don't match new data | Rows are raw `analytics.orders` — backend fields flow through directly. Missing fields show as empty cells. |

---

```
Planning complete: CR-528
Stage: Implementation Plan (Gate 3)
Code reality: PARTIAL (page exists, 3 new event types to add)
Risk: MEDIUM
Edits: 8 (E1–E8) in 1 file, ~65 lines net added
Execution order: E1→E2→E3→E4→E5→E6→E7→E8
Verification matrix: 14 checks (12 automated, 2 browser)
Owner decisions: NONE needed (all locked)
Docs: plans/CR-528_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
