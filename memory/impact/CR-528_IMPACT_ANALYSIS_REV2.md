# CR-528 — Impact Analysis Rev 2 (Gate 2) — Backend Unblocked

**ID:** CR-528
**Gate:** 2 — Impact Analysis (revised — backend v2 contract delivered)
**Role:** PLANNING
**Date:** 2026-11-16
**Risk:** HIGH (audit/compliance report)
**Code Reality:** PARTIAL — page exists with 2 event types. 3 new event types now available from backend.
**Conflict Pre-Check:** CLEAN (see §4)
**Supersedes:** `impact/CR-528_IMPACT_ANALYSIS.md` (written when backend-blocked)

---

## 1. What Changed — Backend Delivery

v2 contract **FULLY SATISFIED** (validation: `backend_replies/CR-528_V2_INSIGHTS_DASHBOARD_REPLY_VALIDATION_2026_11_16.md`). The existing `POST insights-dashboard` → `data.audits` now returns:

| New Field | Type | Description |
|-----------|------|-------------|
| `item_cancel_after_print_count` | int | Count of item cancels after bill print |
| `order_cancel_after_print_count` | int | Count of order cancels after bill print |
| `order_edit_after_print_count` | int | Count of order edits after bill print |
| `total` | int | Now sums all 5 counts (was 2) |

3 new event types in `orders[]`: `item_cancel_after_print`, `order_cancel_after_print`, `order_edit_after_print` — each with type-specific fields (`food_name`, `cancel_time`, `edit_time`, `prev_amount`, `bill_printed_at`).

**No new API endpoint. No new service call. Same `fetchInsightsDashboard` function.**

---

## 2. Current Code (AuditLogMockup.jsx — 152 lines)

### Analytics memo (L71-78):
```javascript
const analytics = useMemo(() => {
  if (!rawData) return null;
  const audits = rawData.audits || {};
  const orders = audits.orders || [];
  const makeUnpaid = orders.filter(o => o.type === 'make_unpaid');
  const payChange = orders.filter(o => o.type === 'payment_method_change');
  return { orders, makeUnpaid, payChange, total: audits.total || orders.length,
    makeUnpaidCount: audits.make_unpaid_count || makeUnpaid.length,
    payChangeCount: audits.payment_method_change_count || payChange.length };
}, [rawData]);
```
**Gap:** Only extracts 2 event types. 3 new types in `orders[]` are ignored. 3 new `*_count` fields unread.

### KPI strip (L114-118):
```
3 cards: Total Audit Events | Make Unpaid | Payment Method Change
```
**Gap:** Missing 3 KPI cards for new event types.

### Table (L119-139):
```
Columns: Order ID | Type | Amount | By | Previous Method | Current Method
Type badge: make_unpaid (red) | payment_method_change (amber)
```
**Gap:** No rendering for new types. Missing columns: `food_name`, `bill_printed_at`, `cancel_time`/`edit_time`, `prev_amount`.

### Export (L80-89):
```
3 KPIs + 6 columns in Audit Log sheet
```
**Gap:** Missing new KPIs and new columns in export.

### Page subtitle (L101):
```
"Make-unpaid events + payment method changes"
```
**Gap:** Doesn't mention new event types.

---

## 3. Fix Plan — All Changes in AuditLogMockup.jsx Only

### E1 — Analytics memo (L71-78): Add 3 new event type filters + counts

```
CURRENT → REPLACE WITH:
  const itemCancelAfterPrint = orders.filter(o => o.type === 'item_cancel_after_print');
  const orderCancelAfterPrint = orders.filter(o => o.type === 'order_cancel_after_print');
  const orderEditAfterPrint = orders.filter(o => o.type === 'order_edit_after_print');
  return {
    orders, makeUnpaid, payChange,
    itemCancelAfterPrint, orderCancelAfterPrint, orderEditAfterPrint,
    total: audits.total || orders.length,
    makeUnpaidCount: audits.make_unpaid_count || makeUnpaid.length,
    payChangeCount: audits.payment_method_change_count || payChange.length,
    itemCancelCount: audits.item_cancel_after_print_count || itemCancelAfterPrint.length,
    orderCancelCount: audits.order_cancel_after_print_count || orderCancelAfterPrint.length,
    orderEditCount: audits.order_edit_after_print_count || orderEditAfterPrint.length,
  };
```
~8 lines added.

### E2 — KPI strip (L114-118): Add 3 new KPI cards

After existing 3 cards, add:
```jsx
{/* CR-528: post-bill-print KPIs */}
<div className="bg-white border border-orange-200 rounded-xl p-5 bg-orange-50/30">
  <div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-orange-600" />
  <span className="text-xs font-medium text-zinc-500 uppercase">Item Cancel After Print</span></div>
  <div className="text-2xl font-bold text-orange-700">{analytics.itemCancelCount}</div>
</div>
<div className="bg-white border border-rose-200 rounded-xl p-5 bg-rose-50/30">
  <div className="flex items-center gap-2 mb-2"><Ban className="w-4 h-4 text-rose-600" />
  <span className="text-xs font-medium text-zinc-500 uppercase">Order Cancel After Print</span></div>
  <div className="text-2xl font-bold text-rose-700">{analytics.orderCancelCount}</div>
</div>
<div className="bg-white border border-blue-200 rounded-xl p-5 bg-blue-50/30">
  <div className="flex items-center gap-2 mb-2"><Pencil className="w-4 h-4 text-blue-600" />
  <span className="text-xs font-medium text-zinc-500 uppercase">Order Edit After Print</span></div>
  <div className="text-2xl font-bold text-blue-700">{analytics.orderEditCount}</div>
</div>
```

Change grid from `grid-cols-3` to `grid-cols-3 lg:grid-cols-6` (6 KPI cards). ~18 lines added.

Import `XCircle`, `Ban`, `Pencil` from lucide-react (L15).

### E3 — Table columns (L121-128): Add new columns for event-specific fields

Replace fixed 6-column header with a type-aware layout:

```
Order ID | Type | Item/Detail | Amount | Prev Amount | By | Bill Printed | Time
```

New columns:
- **Item/Detail:** `food_name` for item cancel, `—` for others
- **Prev Amount:** `prev_amount` for order edit, `—` for others
- **Bill Printed:** `bill_printed_at` for all 3 new types, `—` for old types
- **Time:** `cancel_time` or `edit_time` for new types, `—` for old types

~10 lines changed in `<thead>`.

### E4 — Table rows (L129-138): Add type badge + type-specific cell rendering

Replace single badge logic with type→label+color map:

```javascript
const TYPE_MAP = {
  make_unpaid:              { label: 'Make Unpaid',              bg: 'bg-red-100',    text: 'text-red-700' },
  payment_method_change:    { label: 'Payment Change',           bg: 'bg-amber-100',  text: 'text-amber-700' },
  item_cancel_after_print:  { label: 'Item Cancel (Post-Print)', bg: 'bg-orange-100', text: 'text-orange-700' },
  order_cancel_after_print: { label: 'Order Cancel (Post-Print)',bg: 'bg-rose-100',   text: 'text-rose-700' },
  order_edit_after_print:   { label: 'Order Edit (Post-Print)',  bg: 'bg-blue-100',   text: 'text-blue-700' },
};
```

Row cells render type-specific data:
- `food_name` for item cancel, `—` for others
- `prev_amount` → `amount` for edits (shows delta)
- `bill_printed_at` for new types
- `cancel_time` or `edit_time` for new types
- `prev_method` / `curr_method` for payment change (existing)

~20 lines changed in `<tbody>`.

### E5 — Export payload (L80-89): Add new KPIs + columns

Add 3 new KPIs to export:
```javascript
{ label: 'Item Cancel After Print', value: analytics.itemCancelCount, format: 'text' },
{ label: 'Order Cancel After Print', value: analytics.orderCancelCount, format: 'text' },
{ label: 'Order Edit After Print', value: analytics.orderEditCount, format: 'text' },
```

Add new columns to Audit Log sheet:
```javascript
{ key: 'food_name', label: 'Item', format: 'text', align: 'left', width: 120 },
{ key: 'prev_amount', label: 'Prev Amount', format: 'inr', align: 'right', width: 100 },
{ key: 'bill_printed_at', label: 'Bill Printed', format: 'text', align: 'left', width: 140 },
{ key: 'event_time', label: 'Event Time', format: 'text', align: 'left', width: 140 },
```

~8 lines added.

### E6 — Page subtitle (L101): Update text

```
CURRENT: "Make-unpaid events + payment method changes"
REPLACE: "Audit trail: payment changes, post-print edits and cancellations"
```

1 line changed.

---

## 4. Conflict Pre-Check

| Item | File | Conflict? |
|------|------|-----------|
| CR-011 Phase 3 (CLOSED) | AuditLogMockup.jsx — created the page | **NO** — base code, all changes are additive |
| BUG-555 (IMPLEMENTED) | 40 report pages flex-wrap | **NO** — only touched header `className` (L97), not content |
| BUG-640 (IMPLEMENTED) | fmtISO utility extraction | **NO** — import already updated |
| CR-481 (IMPLEMENTED) | DATE_PRESETS | **NO** — preset logic only |

**Result: CLEAN — no blocking conflicts. AuditLogMockup.jsx has no active items.**

---

## 5. Files Changed Summary

| File | Change | Lines | Risk |
|------|--------|-------|------|
| `AuditLogMockup.jsx` | E1-E6: analytics memo, KPI cards, table columns/rows, export, subtitle | ~65 | MEDIUM |
| **Total** | **1 file** | **~65** | **MEDIUM** |

**Files WILL NOT touch:** `insightsService.js`, `InsightsCacheContext.jsx`, `insightsCache.js`, `reportExporter.js`, `App.js`, any transform, any service

---

## 6. Data Contract Reference (from validated backend reply)

```json
{
  "data": {
    "audits": {
      "make_unpaid_count": 0,
      "payment_method_change_count": 0,
      "item_cancel_after_print_count": 5,      // NEW
      "order_cancel_after_print_count": 5,      // NEW
      "order_edit_after_print_count": 2,        // NEW
      "total": 12,                               // Now sums all 5
      "orders": [
        { "type": "order_cancel_after_print", "order_id": "000782", "amount": 20, "by": "Manager", "bill_printed_at": "2026-11-16 22:26:16", "cancel_time": "2026-11-16 22:26:22" },
        { "type": "item_cancel_after_print", "order_id": "000782", "food_name": "m", "amount": 10, "by": "Manager", "bill_printed_at": "2026-11-16 22:26:16", "cancel_time": "2026-11-16 22:26:21" },
        { "type": "order_edit_after_print", "order_id": "000782", "amount": 30, "prev_amount": 20, "by": "Manager", "bill_printed_at": "2026-11-16 22:26:16", "edit_time": "2026-11-16 22:26:19" }
      ]
    }
  }
}
```

---

## 7. Owner Decisions

No new decisions needed. Owner already decided (2026-11-14): "Inside Audit report." Backend contract and field names are LOCKED.

---

## 8. Verification Matrix (seeds QA)

| # | Check | Method | Expected |
|---|-------|--------|----------|
| V1 | 6 KPI cards render | Browser: load audit page | Total + Make Unpaid + Payment Change + Item Cancel + Order Cancel + Order Edit |
| V2 | KPI counts match backend | Network tab: compare `*_count` fields with card values | Exact match |
| V3 | New event types in table | Browser: table shows rows with new type badges | Orange/Rose/Blue badges |
| V4 | `food_name` renders for item cancel | Browser: item cancel row shows food name | "m" or actual item name |
| V5 | `prev_amount → amount` for order edit | Browser: edit row shows both amounts | "₹20 → ₹30" or similar |
| V6 | `bill_printed_at` renders for new types | Browser: new type rows show print time | Datetime string |
| V7 | `cancel_time`/`edit_time` renders | Browser: timestamp column shows event time | Datetime string |
| V8 | Old event types unchanged | Browser: make_unpaid and payment_change rows still render correctly | Red/Amber badges, prev/curr method |
| V9 | Excel export includes new KPIs + columns | Download Excel: check sheet | 6 KPIs + all columns present |
| V10 | `// CR-528` markers | grep | ≥5 hits |
| V11 | Webpack 0 new warnings | dev server | compiled |

---

## 9. Artifacts

| Artifact | Path |
|----------|------|
| Intake | `change_requests/23_CR-528_REPORT_ORDER_EDIT_CANCEL_AFTER_BILL_PRINT_INTAKE.md` |
| Previous IA (superseded) | `impact/CR-528_IMPACT_ANALYSIS.md` |
| v2 Contract | `contracts/BATCH-C_CR-528_API_CONTRACT_2026_11_16_v2.md` |
| Backend Reply Validation | `backend_replies/CR-528_V2_INSIGHTS_DASHBOARD_REPLY_VALIDATION_2026_11_16.md` |
| Impact Analysis Rev 2 (this doc) | `impact/CR-528_IMPACT_ANALYSIS_REV2.md` |

---

```
Planning complete: CR-528
Stage: Impact Analysis Rev 2 (Gate 2) — backend unblocked
Code reality: PARTIAL (page exists with 2 event types; 3 new types now available)
Risk: MEDIUM (single file, audit report, no financial computation)
Files WILL change: AuditLogMockup.jsx (~65 lines)
Files WILL NOT touch: insightsService.js, any transform, any other page
Owner decisions: NONE needed (all locked)
Docs: impact/CR-528_IMPACT_ANALYSIS_REV2.md
Next: Gate 3 (Implementation Plan) or Gate 4 GO
```
