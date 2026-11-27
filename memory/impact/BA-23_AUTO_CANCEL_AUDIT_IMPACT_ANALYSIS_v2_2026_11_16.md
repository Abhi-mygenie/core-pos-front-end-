# BA-23 — Auto-Cancel + Audit Event — Impact Analysis (REVISED v2) — 2026-11-16

**Role:** PLANNING (Gate 2 — Impact Analysis)
**Supersedes:** BA-23 section in `plans/BATCH-A_CR-493_B5_B6_IMPLEMENTATION_PLAN_2026_11_16.md` §3 and `impact/CR-524_IMPACT_ANALYSIS.md` BA-23 references.
**Risk:** HIGH (report totals, audit events, financial data accuracy)
**Code Reality:** NONE — no `cancel_source` mapped anywhere in FE; no auto-cancel audit event exists
**Owner decisions:** ALL LOCKED (2026-11-16 session)

---

## 1. Problem — proved with real data

### Probe evidence: Order #021537 (CAFE 103, 2026-11-15)

**What happened:**
1. Order placed with 1× Gravy (₹200 + ₹10 tax = ₹210)
2. Cashier cancelled the item using cancel-food-item with reason "Guest Changed the order"
3. Backend auto-cancelled the entire order (last item removed)

**What Insights API returned (readback `25_readback_insights_items.json`):**

| Row | Order | Item | Scope | Reason | By | Amount |
|---|---|---|---|---|---|---|
| 1 | #021537 | Gravy | **order** | "Guest Changed the order" | Owner | ₹210 |
| 2 | #021537 | Gravy | **item** | "Guest Changed the order" | Owner | ₹200 |

**Same Gravy counted twice.** ₹210 as order cancel + ₹200 as item cancel = ₹410 total loss shown. Real loss = ₹210.

**Summary from R1 probe (`71_cancels_R1.json`):**
```
cancelled_order_count: 5    ← includes auto-cancelled orders
order_scope_count: 5
item_scope_count: 1
total_qty: 10               ← inflated (real: ~6)
total_loss: 2090            ← inflated
```

**`cancel_source` field: NOT PRESENT** in any API response today.

---

## 2. Owner decisions (2026-11-16, all LOCKED)

| Decision | Value |
|---|---|
| Insights/Cancellation report | **Option C**: hide `auto_last_item` and `merge` from order cancel counts entirely |
| Reason on auto-cancelled order | **Comma-separated** from ALL items' reasons (not just last) |
| Order Edit Audit | **New audit event** `all_items_cancelled` for item-by-item wipeout pattern |
| Backfill | **YES** — backend must backfill historical orders |

---

## 3. Affected endpoints and data flow

### 3a. `POST /api/v2/vendoremployee/report/insights-cancellations`

**Today:** Returns `items[]` with `scope: "order"` for auto-cancelled orders. These inflate `summary.cancelled_order_count`.

**After BA-23:** Each item gets `cancel_source` field. FE filters:
- `cancel_source: "manual"` → count in order totals ✅
- `cancel_source: "auto_last_item"` → **hide from order counts** ❌
- `cancel_source: "merge"` → **hide entirely** ❌

**FE reads:** `summary.cancelled_order_count` — today backend computes this. Two options:
- **Option F1:** Backend fixes the count (excludes auto/merge server-side) → FE just reads
- **Option F2:** Backend returns `cancel_source` per item, FE recomputes counts client-side

**Recommended: F1** (backend fixes counts) — but FE should be ready to filter client-side as fallback.

### 3b. `POST /api/v2/vendoremployee/report/cancel-order-list`

**Today:** Returns all cancelled orders including auto-cancelled ones with `cancellation_reason: null`.

**After BA-23:**
- Auto-cancelled orders get `cancel_source: "auto_last_item"` + comma-separated reasons
- FE can filter these out of the list OR show them tagged differently

### 3c. `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits`

**Today:** Only `make_unpaid` and `payment_method_change` events.

**After BA-23:** New event type `all_items_cancelled`:
```json
{
  "type": "all_items_cancelled",
  "order_id": "021537",
  "amount": 210.00,
  "by": "Owner",
  "item_count": 1,
  "reasons": "Guest Changed the order",
  "items": [
    { "food_name": "Gravy", "reason": "Guest Changed the order", "amount": 200, "by": "Owner" }
  ]
}
```

### 3d. Order Beta (`POST /api/v2/vendoremployee/report/combined`)

**Today:** Cancelled tab shows all cancelled orders. KPI shows `Cancelled: N` count.

**After BA-23:** `cancel_source` on each order. FE can distinguish manual vs auto.

---

## 4. Affected FE files — line-by-line

### 4a. CancellationsMockup.jsx (main cancellation report)

| Line | Current | Change needed |
|---|---|---|
| L252-282 | `cancelledItems` transform — maps each item | **Add:** `cancelSource: i.cancel_source \|\| 'manual'` |
| L296 | `reason: r.reason \|\| 'No reason provided'` | **No change** — once backend fills reasons, this fallback is never hit for auto-cancelled |
| L322 | `cancelledOrderCount: s.cancelled_order_count \|\| ...` | **If F1:** no change (backend fixes). **If F2:** recompute: `cancelledItems.filter(i => i.scope === 'order' && i.cancelSource === 'manual').length` |
| L340-341 | Hourly chart counts `scope === 'order'` cancels | **Filter:** skip `cancelSource !== 'manual'` from order counts |
| L414-415 | Scope tab filter: `scope === 'order'` / `scope === 'item'` | **Filter:** order tab excludes `auto_last_item` + `merge` |
| L622-637 | Scope tabs UI — Order tab count | **Count:** exclude `auto_last_item` from order count |

### 4b. AuditLogMockup.jsx (Order Edit Audit page)

| Line | Current | Change needed |
|---|---|---|
| L74-77 | `analytics` useMemo — filters `make_unpaid` + `payment_method_change` | **Add:** filter for `all_items_cancelled` type |
| L77 | Returns `{ orders, makeUnpaid, payChange, total, ... }` | **Add:** `allItemsCancelled` array + `allItemsCancelledCount` |
| L115-125 | KPI cards — 3 cards (Total, Make Unpaid, Payment Change) | **Add:** 4th KPI card "Items Wiped" (or "All Items Cancelled") |
| L130-135 | Audit Trail table — Type badge `make_unpaid` / `payment_method_change` | **Add:** new badge for `all_items_cancelled` |
| L130 | Table columns: Order ID, Type, Amount, By, Previous Method, Current Method | **Add:** conditional "Reasons" column for `all_items_cancelled` rows (shows comma-separated) |

### 4c. insightsService.js (dashboard transform)

| Line | Current | Change needed |
|---|---|---|
| L722-727 | `audits:` transform — maps `make_unpaid_count`, `payment_method_change_count` | **Add:** `allItemsCancelledCount: data.audits?.all_items_cancelled_count \|\| 0` |

### 4d. OrderReportBetaPage.jsx (Order Beta)

| Line | Current | Change needed |
|---|---|---|
| L601-604 | KPIs: Total Orders, Paid, Unpaid, Cancelled | **Option A:** no change (backend fixes count). **Option B:** filter `cancelSource !== 'manual'` from cancelled count |
| L125-127 | `cancelled` tab filter: `pm === 'cancel'` | **Add:** optionally show `cancel_source` tag on each row |
| L743-746 | Cancel reason display on cancelled rows | Shows `cancellation_reason` — will now show comma-separated for auto-cancelled |

### 4e. DashboardMockup.jsx (main dashboard audit tile)

| Line | Current | Change needed |
|---|---|---|
| L689-727 | Audit tile — shows total, madeUnpaid, paymentMethodChanged | **Add:** `allItemsCancelled` count in the tile |

---

## 5. Files WILL change

| # | File | Scope | Risk |
|---|---|---|---|
| 1 | `pages/reports-module/CancellationsMockup.jsx` | Map `cancelSource`, filter order counts, filter scope tabs | MEDIUM |
| 2 | `pages/reports-module/AuditLogMockup.jsx` | New KPI card, new event type in trail, reasons column | MEDIUM |
| 3 | `api/services/insightsService.js` | Map `all_items_cancelled_count` in dashboard transform | LOW |
| 4 | `pages/reports-module/OrderReportBetaPage.jsx` | Display `cancel_source` tag on cancelled rows | LOW |
| 5 | `pages/reports-module/DashboardMockup.jsx` | Add count to audit tile | LOW |

## 6. Files WILL NOT touch

| File | Reason |
|---|---|
| `CancelOrderModal.jsx` | Cancel dialog unchanged — this is report-side only |
| `CancelFoodModal.jsx` | Same |
| `OrderEntry.jsx` | Cancel flow unchanged |
| `orderTransform.js` | Cancel payload unchanged |
| `reportService.js` | No new API call |
| `profileTransform.js` | No new setting |

---

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | Backend delivers `cancel_source` but doesn't fix `cancelled_order_count` in summary | MEDIUM | FE fallback: recompute counts client-side filtering by `cancelSource` |
| R-2 | Backfill incomplete — old orders still show `cancel_source: null` | MEDIUM | FE treats `null`/absent as `'manual'` (backward-compatible default) |
| R-3 | AuditLogMockup — new event type doesn't come in `insights-dashboard` response | LOW | FE shows 0 count; no crash. Conditional render |
| R-4 | Comma-separated reason is very long (10+ items cancelled) | LOW | CSS `text-ellipsis` + tooltip on hover in audit trail |

---

## 8. Verification matrix

| # | Check | Flow | Expected |
|---|---|---|---|
| V-1 | Insights: manually cancelled order | Cancel whole order from dashboard | `scope: "order"`, `cancel_source: "manual"`, counted in order totals |
| V-2 | Insights: last-item-cancelled order | Cancel items one by one until order auto-cancels | `scope: "order"`, `cancel_source: "auto_last_item"`, **NOT counted** in order totals |
| V-3 | Insights: merged order | Merge two orders | `scope: "order"`, `cancel_source: "merge"`, **NOT counted** anywhere |
| V-4 | CancellationsMockup: Order tab | Open Cancellations → Order tab | Shows only `manual` order cancels |
| V-5 | CancellationsMockup: KPI totals | Check Total Cancellations card | Excludes `auto_last_item` from order count |
| V-6 | AuditLogMockup: new event | Order where all items cancelled one by one | `all_items_cancelled` event in audit trail with comma-separated reasons |
| V-7 | AuditLogMockup: KPI | Check "Items Wiped" card | Count matches `all_items_cancelled` events |
| V-8 | OrderBeta: cancelled tab | Check cancelled orders list | `cancel_source` tag visible; auto-cancelled orders show comma-separated reason |
| V-9 | Backfill: historical orders | Check old date range | Previously "No reason provided" orders now have comma-separated reasons + `cancel_source: "auto_last_item"` |

---

## 9. Post-code registry checklist

- [ ] `registry.json`: CR-493 BA-23 → status updated
- [ ] `CR_REGISTRY.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: 5 files listed
- [ ] Code markers: `// CR-493 B6` / `// BA-23` on every modified line
- [ ] Compile: webpack 0 new warnings
- [ ] Tracker: BA-23 → DONE

---

```
Planning complete: BA-23 (CR-493 B6 revised)
Stage: Impact Analysis (Gate 2) — REVISED v2
Code reality: NONE (cancel_source not mapped, no audit event)
Risk: HIGH
Files WILL change: CancellationsMockup, AuditLogMockup, insightsService, OrderReportBetaPage, DashboardMockup
Files WILL NOT touch: CancelOrderModal, CancelFoodModal, OrderEntry, orderTransform, reportService, profileTransform
Owner decisions: ALL LOCKED (Option C + comma-separated + audit event + backfill)
Evidence: 25_readback_insights_items.json (double-count proved), 71_cancels_R1.json (inflated summary)
Next: Update contract + backend brief → Gate 3 implementation plan after backend delivers
```
