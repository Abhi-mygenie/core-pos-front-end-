# CR-546 — Impact Analysis (Gate 2) — Discount After Bill Print: Audit Event

**ID:** CR-546
**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-17
**Risk:** HIGH (audit/compliance, fraud detection)
**Code Reality:** NONE — no code exists for `discount_apply_after_print` or `discount_remove_after_print`
**Conflict Pre-Check:** CLEAN (see §4)

---

## 1. What's Needed — Backend Delivery

Backend must detect when a discount is applied or removed on an order **after the bill was already printed**.

### New event types in `insights-dashboard` → `audits.orders[]`:

#### a) `discount_apply_after_print`
```json
{
  "type": "discount_apply_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:15:00"
}
```

#### b) `discount_remove_after_print`
```json
{
  "type": "discount_remove_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:20:00"
}
```

### New KPI counts:
| Field | Type |
|-------|------|
| `discount_apply_after_print_count` | integer |
| `discount_remove_after_print_count` | integer |

### Detection logic:
For each order where `bill_printed_at IS NOT NULL`:
- If a discount was applied WHERE `discount_applied_at > bill_printed_at` → emit `discount_apply_after_print`
- If a discount was removed WHERE `discount_removed_at > bill_printed_at` → emit `discount_remove_after_print`

### `total` update:
`total` should sum all event counts (currently 5 from CR-528 + 1 from CR-544 + 2 from this = 8 total types).

**Backend brief:** `backend_briefs/BACKEND_BRIEF_CR-546_2026_11_17.md`

---

## 2. Current Code — AuditLogMockup.jsx (208 lines after CR-528)

### AUDIT_TYPE_MAP (L23-29):
5 entries.
**Gap:** No `discount_apply_after_print` or `discount_remove_after_print` entries.

### Analytics memo (L82-100):
5 event filters + 5 counts.
**Gap:** No discount-after-print filters or counts.

### KPI strip (L151-158):
6 cards in `grid-cols-3 lg:grid-cols-6`.
**Gap:** No discount-after-print KPI cards.

### Table (L164-193):
10 columns with type-aware rendering.
**Gap:** No `discount_amount`, `discount_type`, `discount_value` columns. Would render as generic fallback.

### Export (L102-126):
6 KPIs + 11 columns.
**Gap:** No discount-after-print KPIs or columns.

---

## 3. FE Edit Plan — All Changes in AuditLogMockup.jsx Only

### E1 — AUDIT_TYPE_MAP (after L29): Add 2 entries
```javascript
discount_apply_after_print:  { label: 'Discount Applied (Post-Print)',  bg: 'bg-emerald-100', text: 'text-emerald-700' }, // CR-546
discount_remove_after_print: { label: 'Discount Removed (Post-Print)', bg: 'bg-pink-100',    text: 'text-pink-700' },    // CR-546
```
+2 lines.

### E2 — Analytics memo (L88-98): Add 2 filters + 2 counts
```javascript
const discountApplyAP = orders.filter(o => o.type === 'discount_apply_after_print');   // CR-546
const discountRemoveAP = orders.filter(o => o.type === 'discount_remove_after_print'); // CR-546
// In return:
discountApplyAP, discountRemoveAP,
discountApplyCount: audits.discount_apply_after_print_count || discountApplyAP.length,     // CR-546
discountRemoveCount: audits.discount_remove_after_print_count || discountRemoveAP.length,  // CR-546
```
+6 lines.

### E3 — KPI strip: Add 2 cards
Emerald-themed for "Discount Applied (Post-Print)" and pink-themed for "Discount Removed (Post-Print)".
Grid: may need `grid-cols-4 lg:grid-cols-8` to accommodate all cards.
+8 lines.

### E4 — Table: Discount-specific column rendering
Discount-after-print rows show:
- `discount_amount` formatted as ₹ in a column (reuse Amount or add sub-column)
- `discount_type` + `discount_value` (e.g., "10%" or "₹50 flat")
- `bill_printed_at` in existing column
- `discount_time` in Event Time column

Since `AUDIT_TYPE_MAP` handles badge rendering automatically and `bill_printed_at` + event time columns already exist, minimal new logic needed.
+3 lines (discount display logic).

### E5 — Export: Add 2 KPIs + columns
```javascript
{ label: 'Discount Applied After Print', value: analytics.discountApplyCount, format: 'text' },   // CR-546
{ label: 'Discount Removed After Print', value: analytics.discountRemoveCount, format: 'text' },  // CR-546
// Columns:
{ key: 'discount_amount', label: 'Discount ₹', format: 'inr', align: 'right', width: 100 },
{ key: 'discount_type', label: 'Discount Type', format: 'text', align: 'left', width: 100 },
```
+5 lines.

### E6 — Import: Add icons
Add `Tag` (apply) and `TagOff` or reuse from lucide-react.
+1 line (import update).

---

## 4. Conflict Pre-Check

| Item | File | Conflict? |
|------|------|-----------|
| CR-528 (IMPLEMENTED) | AuditLogMockup.jsx | **NO** — all changes additive |
| CR-544 (INTAKE→IA) | AuditLogMockup.jsx — cancel after unpaid | **NO** — parallel additive, different type keys |
| CR-543 (INTAKE) | AuditLogMockup.jsx — late cancel | **NO** — parallel additive, different type keys |

**Result: CLEAN — no conflicts. All audit CRs are independent additive changes.**

---

## 5. Files Changed Summary

| File | Change | Lines | Risk |
|------|--------|-------|------|
| `AuditLogMockup.jsx` | E1-E6: type map, analytics, KPIs, table, export | ~25 | LOW (additive to existing pattern) |
| **Total** | **1 file** | **~25** | **LOW** |

**Files WILL NOT touch:** `insightsService.js`, `InsightsCacheContext.jsx`, `insightsCache.js`, `reportExporter.js`, `App.js`, any transform, any service

---

## 6. Owner Decisions

All locked (2026-11-17):
| # | Decision | Answer |
|---|----------|--------|
| OD-546-01 | What to track? | Both discount apply AND discount remove after print |
| OD-546-02 | Which clients? | ALL (platform-wide) |
| OD-546-03 | Priority? | P0 |

**No open questions.**

---

## 7. Verification Matrix (seeds QA)

| # | Check | Method | Expected |
|---|-------|--------|---------|
| V1 | 8 KPI cards render | Browser | +2 new: emerald "Discount Applied" + pink "Discount Removed" |
| V2 | KPI counts match backend | Network tab | `discount_apply_after_print_count` + `discount_remove_after_print_count` match cards |
| V3 | Apply rows show emerald badge | Browser table | "Discount Applied (Post-Print)" badge |
| V4 | Remove rows show pink badge | Browser table | "Discount Removed (Post-Print)" badge |
| V5 | `discount_amount` renders | Browser | ₹ value shown |
| V6 | `discount_type` renders | Browser | "percent" / "flat" / "preset" |
| V7 | `bill_printed_at` and `discount_time` render | Browser | Both timestamps visible |
| V8 | Old event types unchanged | Browser | Existing types render correctly |
| V9 | Excel export includes 2 new KPIs + columns | Download Excel | 8 KPIs + discount columns |
| V10 | `// CR-546` markers | grep | ≥4 hits |
| V11 | Webpack 0 new warnings | dev server | compiled |

---

## 8. Combined Audit Page Evolution

| Sprint | Event Types | KPI Cards | Table Columns |
|--------|------------|-----------|---------------|
| CR-011 (original) | 2: make_unpaid, payment_method_change | 3 | 6 |
| + CR-528 | 5: +item_cancel, order_cancel, order_edit after print | 6 | 10 |
| + CR-544 | 6: +cancel_after_unpaid | 7 | +3 (scope, made_unpaid_at, gap) |
| + CR-546 | 8: +discount_apply, discount_remove after print | 9 | +2 (discount_amount, discount_type) |
| + CR-543 | 9: +late_cancel | 10 | +2 (punch_time, duration) |

Final state: 9 event types, 10 KPI cards, ~17 columns. Grid: `grid-cols-5 lg:grid-cols-10` or responsive wrap.

---

## 9. Dependencies

| # | Dependency | Status |
|---|-----------|--------|
| D1 | Backend: `discount_apply_after_print` + `discount_remove_after_print` events | **BLOCKING** — brief filed |
| D2 | CR-528 implemented (page exists with 5 types) | ✅ SATISFIED |

---

```
Planning complete: CR-546
Stage: Impact Analysis (Gate 2)
Code reality: NONE
Risk: HIGH (fraud detection) / LOW (FE change scope)
Files WILL change: AuditLogMockup.jsx (~25 lines)
Files WILL NOT touch: insightsService.js, any transform, any other page
Owner decisions: ALL LOCKED (3/3)
Docs: impact/CR-546_IMPACT_ANALYSIS.md
Next: Gate 3 (Plan) once backend delivers
```

---

## 10. REVISED DESIGN DECISIONS (2026-11-17 Owner Review)

**Supersedes §3 E3 (KPI cards) naming.**

### Changes from original IA:
1. **Card renamed:** "Discount Changes After Print" → **"Leakage After Print"** (combined card)
2. **Card 3 now covers ALL post-print events**, not just discounts:
   - Item cancel after print (CR-528)
   - Order cancel after print (CR-528)
   - Discount applied after print (CR-546)
   - Discount removed after print (CR-546)
3. **₹ Money leakage** shown on card: sum of cancel amounts + discount amounts on post-print orders.
4. **Overlap Approach C:** Post-print events also appear in Card 1 (High Risk) if duration ≥ 5 min, or Card 2 (Leakage After Unpaid) if order was unpaid. Multi-category tags in drill-down.
5. **KPI bar "Post-Print Edits":** Count of all post-print events (cancels + discounts combined).

### Owner Decisions:
- All 3 ODs remain LOCKED (no changes from original IA)
- D7-D13 added in consolidated decisions doc

### Ref: `design/AUDIT_REPORT_DESIGN_DECISIONS_LOCKED_2026_11_17.md` (consolidated decisions)
