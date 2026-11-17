# CR-544 — Impact Analysis (Gate 2) — Cancel After Making Unpaid: Audit Event

**ID:** CR-544
**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-17
**Risk:** HIGH (audit/compliance, fraud detection — two-step fraud chain)
**Code Reality:** NONE — no code exists for `cancel_after_unpaid` event type
**Conflict Pre-Check:** CLEAN (see §4)

---

## 1. What's Needed — Backend Delivery

Backend must detect the two-step fraud chain: order marked unpaid → then items/order cancelled.

### New event type in `insights-dashboard` → `audits.orders[]`:

```json
{
  "type": "cancel_after_unpaid",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 200.00,
  "by": "Counter",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "cancel_time": "2026-11-16T14:35:00",
  "scope": "item",
  "gap_minutes": 5
}
```

### New KPI count:
| Field | Type |
|-------|------|
| `cancel_after_unpaid_count` | integer |

### Detection logic:
For each order where a `make_unpaid` event exists (`made_unpaid_at`):
- For each cancellation (item or order) on that order WHERE `cancel_at > made_unpaid_at`
- Emit `cancel_after_unpaid` event with both timestamps + gap

**Backend brief:** `backend_briefs/BACKEND_BRIEF_BATCH-C_2026_11_16_v2.md` ASK 4

---

## 2. Current Code — AuditLogMockup.jsx (208 lines after CR-528)

### AUDIT_TYPE_MAP (L23-29):
5 entries: `make_unpaid`, `payment_method_change`, `item_cancel_after_print`, `order_cancel_after_print`, `order_edit_after_print`
**Gap:** No `cancel_after_unpaid` entry.

### Analytics memo (L82-100):
5 event filters + 5 counts
**Gap:** No `cancel_after_unpaid` filter or count.

### KPI strip (L151-158):
6 cards in `grid-cols-3 lg:grid-cols-6`
**Gap:** No "Cancel After Unpaid" KPI card.

### Table (L164-193):
10 columns. Type-aware rendering via `AUDIT_TYPE_MAP`.
**Gap:** `cancel_after_unpaid` would render as generic fallback (grey badge, no type-specific columns). Missing: `scope`, `made_unpaid_at`, `gap_minutes` columns.

### Export (L102-126):
6 KPIs + 11 columns
**Gap:** No cancel_after_unpaid KPI or type-specific columns in export.

---

## 3. FE Edit Plan — All Changes in AuditLogMockup.jsx Only

### E1 — AUDIT_TYPE_MAP (after L29): Add 1 entry
```javascript
cancel_after_unpaid: { label: 'Cancel After Unpaid', bg: 'bg-purple-100', text: 'text-purple-700' },
```
+1 line.

### E2 — Analytics memo (L88-98): Add filter + count
```javascript
const cancelAfterUnpaid = orders.filter(o => o.type === 'cancel_after_unpaid'); // CR-544
// In return:
cancelAfterUnpaid,
cancelAfterUnpaidCount: audits.cancel_after_unpaid_count || cancelAfterUnpaid.length, // CR-544
```
+3 lines.

### E3 — KPI strip: Add 1 card
Purple-themed card for "Cancel After Unpaid" with count.
Grid: `lg:grid-cols-6` may become `lg:grid-cols-7` or stay as responsive wrap.
+4 lines.

### E4 — Table: Type-specific columns
`cancel_after_unpaid` rows show:
- `food_name` in Item column (or "Full Order" when `scope === 'order'`)
- `made_unpaid_at` in a column (reuse "Bill Printed" or add new)
- `cancel_time` in Event Time column
- `gap_minutes` optionally displayed

Since AUDIT_TYPE_MAP handles badge rendering automatically, minimal row changes needed. `food_name` and `cancel_time` columns already exist in the table.
+2 lines (scope display logic).

### E5 — Export: Add KPI + columns
```javascript
{ label: 'Cancel After Unpaid', value: analytics.cancelAfterUnpaidCount, format: 'text' }, // CR-544
// Columns:
{ key: 'made_unpaid_at', label: 'Made Unpaid At', format: 'text', align: 'left', width: 140 },
{ key: 'scope', label: 'Scope', format: 'text', align: 'left', width: 80 },
{ key: 'gap_minutes', label: 'Gap (min)', format: 'text', align: 'right', width: 80 },
```
+5 lines.

### E6 — Import: Add icon
Add `ShieldX` or reuse existing icon for the KPI card.
+0 lines (reuse `Ban` or `AlertTriangle`).

---

## 4. Conflict Pre-Check

| Item | File | Conflict? |
|------|------|-----------|
| CR-528 (IMPLEMENTED) | AuditLogMockup.jsx — 5 event types | **NO** — all changes additive |
| CR-546 (INTAKE) | AuditLogMockup.jsx — discount after print | **NO** — parallel additive, different type keys |
| CR-543 (INTAKE) | AuditLogMockup.jsx — late cancel | **NO** — parallel additive, different type keys |

**Result: CLEAN — no conflicts. All 3 audit CRs are independent additive changes.**

---

## 5. Files Changed Summary

| File | Change | Lines | Risk |
|------|--------|-------|------|
| `AuditLogMockup.jsx` | E1-E6: type map, analytics, KPI, table, export | ~15 | LOW (additive to existing pattern) |
| **Total** | **1 file** | **~15** | **LOW** |

**Files WILL NOT touch:** `insightsService.js`, `InsightsCacheContext.jsx`, `insightsCache.js`, `reportExporter.js`, `App.js`, any transform, any service

---

## 6. Owner Decisions

| # | Question | Status |
|---|----------|--------|
| OD-544-01 | Time window for cancel-after-unpaid? | **LOCKED: No time limit** — any cancel after unpaid on same order, even days later |
| OD-544-02 | Include re-paid then cancelled? | **LOCKED: YES, flag ALL** — even if re-paid. Show `unpaid_count` (how many times made unpaid) + `order_status_at_cancel` |

---

## 7. Verification Matrix (seeds QA)

| # | Check | Method | Expected |
|---|-------|--------|---------|
| V1 | 7 KPI cards render (6 existing + 1 new) | Browser | Purple "Cancel After Unpaid" card visible |
| V2 | KPI count matches backend | Network tab | `cancel_after_unpaid_count` matches card value |
| V3 | Cancel-after-unpaid rows show purple badge | Browser table | "Cancel After Unpaid" badge in purple |
| V4 | `food_name` renders for item-scope cancel | Browser | Item name shown |
| V5 | `made_unpaid_at` and `cancel_time` both render | Browser | Both timestamps visible |
| V6 | Old event types unchanged | Browser | Existing 5 types render correctly |
| V7 | Excel export includes new KPI + columns | Download Excel | 7 KPIs + scope/made_unpaid_at/gap_minutes columns |
| V8 | `// CR-544` markers | grep | ≥3 hits |
| V9 | Webpack 0 new warnings | dev server | compiled |

---

## 8. Dependencies

| # | Dependency | Status |
|---|-----------|--------|
| D1 | Backend: `cancel_after_unpaid` events in insights-dashboard | **BLOCKING** — ASK 4 not delivered |
| D2 | CR-528 implemented (page exists with 5 types) | ✅ SATISFIED |
| D3 | OD-544-01, OD-544-02 | OPEN — need owner answers |

---

```
Planning complete: CR-544
Stage: Impact Analysis (Gate 2)
Code reality: NONE
Risk: HIGH (fraud detection) / LOW (FE change scope)
Files WILL change: AuditLogMockup.jsx (~15 lines)
Files WILL NOT touch: insightsService.js, any transform, any other page
Owner decisions: OD-544-01, OD-544-02 OPEN
Docs: impact/CR-544_IMPACT_ANALYSIS.md
Next: Owner answers ODs → Gate 3 (Plan) once backend delivers ASK 4
```
