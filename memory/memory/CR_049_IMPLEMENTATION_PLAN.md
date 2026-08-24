# CR-049 — Implementation Plan (Gate 3)

**ID:** CR-049
**Title:** Insights Module: Migrate FE Aggregation to Backend Aggregation Endpoints
**Priority:** P1
**Sprint:** POS 5.0
**Date:** 2026-06-15
**Impact Analysis:** `/app/memory/CR_049_IMPACT_ANALYSIS.md`
**Implementation:** Phase-wise. Each phase is independently shippable + smokeable.

---

## Scope Lock

**Files WILL change (per phase):**

| Phase | Files |
|-------|-------|
| Shared | `api/constants.js`, `api/services/insightsService.js` |
| Phase 1 | `pages/reports-module/DashboardMockup.jsx` |
| Phase 1b | `pages/reports-module/SalesMockup.jsx`, `pages/reports-module/PaymentsMockup.jsx` |
| Phase 2 | `pages/reports-module/ItemSalesHybridMockup.jsx`, `pages/reports-module/ItemDrillSheet.jsx` |
| Phase 3 | `pages/reports-module/CancellationsMockup.jsx` |

**Files will NOT touch:**
- `OrderLedgerMockup.jsx` — stays on `order-logs-report` (pagination = CR-050)
- `AllOrdersReportPage.jsx`, `RoomOrdersReportPage.jsx` — Audit Report, not Insights
- `PrepServeTimeMockup.jsx`, `FoodCourtMockup.jsx`, `RoomOrdersMockup.jsx` — no backend endpoint yet
- `SettlementReportMockup.jsx`, `EdgeStatesMockup.jsx` — own data sources
- `insightsCache.js`, `InsightsCacheContext.jsx` — cache layer unchanged (shape-agnostic)
- `orderPayloadStripper.js` — kept for non-migrated pages

---

## SHARED EDITS (before any phase)

### Edit S1: `api/constants.js` — Add 4 endpoint constants

**Line:** After line 100 (`ORDER_LOGS_REPORT`)
**Add:**
```js
// CR-049: Backend aggregation endpoints (Insights module migration)
INSIGHTS_DASHBOARD:     '/api/v2/vendoremployee/report/insights-dashboard',
INSIGHTS_SALES:         '/api/v2/vendoremployee/report/insights-sales',
INSIGHTS_ITEMS:         '/api/v2/vendoremployee/report/insights-items',
INSIGHTS_CANCELLATIONS: '/api/v2/vendoremployee/report/insights-cancellations',
```

### Edit S2: `api/services/insightsService.js` — Add 4 backend fetch functions

**Add at end of file** (before `export default`). Keep existing `getDashboardAggregated` and `getItemSalesAggregated` for transition.

```js
// CR-049: Backend aggregation fetch functions
export const fetchInsightsDashboard = async (fromDate, toDate) => {
  const resp = await api.post(API_ENDPOINTS.INSIGHTS_DASHBOARD, { from_date: fromDate, to_date: toDate });
  return resp.data?.data;
};

export const fetchInsightsSales = async (fromDate, toDate) => {
  const resp = await api.post(API_ENDPOINTS.INSIGHTS_SALES, { from_date: fromDate, to_date: toDate });
  return resp.data?.data;
};

export const fetchInsightsItems = async (fromDate, toDate) => {
  const resp = await api.post(API_ENDPOINTS.INSIGHTS_ITEMS, { from_date: fromDate, to_date: toDate });
  return resp.data?.data;
};

export const fetchInsightsCancellations = async (fromDate, toDate) => {
  const resp = await api.post(API_ENDPOINTS.INSIGHTS_CANCELLATIONS, { from_date: fromDate, to_date: toDate });
  return resp.data?.data;
};
```

### Edit S3: `api/services/insightsService.js` — Add transform functions

Transform backend response → FE component prop shapes. Keeps pages clean.

```js
// CR-049: Transform backend insights-dashboard response → DashboardMockup tiles shape
export const transformDashboardResponse = (data) => ({
  sales: {
    totalRevenue: Math.round(data.revenue?.total || 0),
    paidOrderCount: data.revenue?.paid_order_count || 0,
    sparkline: (data.revenue?.by_hour || []).map(h => ({ hour: h.hour, value: h.revenue })),
  },
  channels: {
    mix: (data.channel_mix || []).map(c => ({ name: c.channel, value: c.revenue, orders: c.orders })),
    topChannel: (data.channel_mix || [])[0]?.channel || '',
    topChannelPct: 0, // derived client-side from mix
  },
  topItems: {
    items: (data.top_items || []).map(i => ({ name: i.name, qty: i.qty, revenue: i.revenue })),
    totalItemsSold: (data.top_items || []).reduce((s, i) => s + i.qty, 0),
  },
  payments: {
    mix: (data.payment_mix || []).map(p => ({ name: p.method, value: p.revenue, orders: p.orders })),
    creditOutstanding: Math.round(data.credit_outstanding || 0),
    creditSettled: Math.round(data.revenue?.tab_settlement_total || 0),
  },
  cancellations: {
    orderCount: data.cancellations?.order_scope_count || 0,
    itemCount: data.cancellations?.item_scope_count || 0,
    totalCount: data.cancellations?.total_count || 0,
    orderRevenue: Math.round(data.cancellations?.order_scope_loss || 0),
    itemRevenue: Math.round(data.cancellations?.item_scope_loss || 0),
    totalRevenue: Math.round(data.cancellations?.total_loss || 0),
    topReason: data.cancellations?.top_reason || '',
    topReasonCount: data.cancellations?.top_reason_count || 0,
  },
  discounts: {
    directDiscount: Math.round(data.discounts?.manual_discount || 0),
    couponDiscount: Math.round(data.discounts?.coupon_discount || 0),
    couponOrders: data.discounts?.coupon_order_count || 0,
    loyaltyDiscount: Math.round(data.discounts?.loyalty_discount || 0),
    compItemTotal: Math.round(data.discounts?.comp_item_total || 0),
    compItemCount: data.discounts?.comp_item_count || 0,
    totalLeakage: Math.round(data.discounts?.total_leakage || 0),
  },
  audits: {
    madeUnpaid: data.audits?.make_unpaid_count || 0,
    paymentMethodChanged: data.audits?.payment_method_change_count || 0,
    orders: data.audits?.orders || [],
    total: data.audits?.total || 0,
    riskScore: Math.min(5, Math.ceil((data.audits?.total || 0) / 3)),
  },
  kitchen: {
    avgPrep: formatMinutes(data.kitchen?.avg_prep_minutes),
    avgServe: formatMinutes(data.kitchen?.avg_serve_minutes),
    slaBreachCount: data.kitchen?.sla_breach_count || 0,
    hasPrepData: data.kitchen?.has_prep_data || false,
  },
  customers: {
    repeatPct: data.customers?.repeat_pct || 0,
    repeatCount: data.customers?.repeat_customers || 0,
    totalIdentified: data.customers?.unique_customers || 0,
    newCustomers: data.customers?.guest_count || 0,
    totalOrders: data.customers?.total_orders || 0,
  },
  meta: { totalOrders: data.revenue?.paid_order_count || 0, fromDate: '', toDate: '' },
});

// Helper: minutes (float) → "mm:ss" string
const formatMinutes = (mins) => {
  if (!mins || mins <= 0) return '00:00';
  const m = Math.floor(mins);
  const s = Math.round((mins - m) * 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
```

---

## PHASE 1: Dashboard → `insights-dashboard`

### Edit P1-1: `DashboardMockup.jsx` — Switch fetch function

**Current (line 4):**
```js
import { getDashboardAggregated } from '../../api/services/insightsService';
```
**New:**
```js
import { fetchInsightsDashboard, transformDashboardResponse } from '../../api/services/insightsService';
```

**Current (lines 80-81):** `useReportFetch` calls `getDashboardAggregated`
```js
const { data: tiles, ... } = useReportFetch(
  () => getDashboardAggregated(appliedFrom, appliedTo, schedules),
```
**New:**
```js
const { data: tiles, ... } = useReportFetch(
  async () => {
    const raw = await fetchInsightsDashboard(appliedFrom, appliedTo);
    return transformDashboardResponse(raw);
  },
```

**No other changes to DashboardMockup.** The `tiles` object shape is identical — all downstream tile rendering works unchanged.

### Phase 1 Verification

| # | Check | How |
|---|-------|-----|
| 1 | Webpack compiles | Auto |
| 2 | Dashboard loads, all 10 tiles render | Browser — compare vs old data |
| 3 | Revenue total matches | Curl `insights-dashboard` → compare `revenue.total` vs tile |
| 4 | Channel/Payment mix renders | Visual check |
| 5 | Cancellation/Discount tiles render | Visual check |

### Phase 1 Owner Smoke
- Open Dashboard → verify all tiles have data
- Compare key numbers (revenue, order count) vs Order Ledger report
- PASS → proceed to Phase 1b

---

## PHASE 1b: Sales + Payments → `insights-sales`

### Edit P1b-1: `SalesMockup.jsx` — Replace orderLedgerService with insightsSales

**Current (line 14):**
```js
import { getOrderLedgerForRange, getRevenueOrdersForRange, getTabSettlementsForRange, REVENUE_BASIS } from '../../api/services/orderLedgerService';
```
**New:**
```js
import { fetchInsightsSales } from '../../api/services/insightsService';
```

**Current (lines 151-172):** `fetchData` callback with 3 parallel fetches + FE aggregation
**New:** Single fetch + transform to existing state shape:
```js
const fetchData = useCallback(async () => {
  setIsLoading(true); setError(null);
  try {
    const sales = await fetchInsightsSales(appliedFrom, appliedTo);
    // Map backend response to existing component state
    setSummary(sales.summary);
    setDaily(sales.daily);
    setChannels(sales.channels);
    setPayments(sales.payments);
    setHourly(sales.hourly);
    setHasLoadedOnce(true);
  } catch (err) { setError(err); }
  finally { setIsLoading(false); }
}, [appliedFrom, appliedTo]);
```

**Note:** Exact field mapping depends on current state variable names in SalesMockup. May need thin transform layer if field names differ. Implementation agent to verify at edit time.

### Edit P1b-2: `PaymentsMockup.jsx` — Same pattern as Sales

Replace `orderLedgerService` imports with `fetchInsightsSales`. PaymentsMockup uses the `payments` section of the same response.

### Phase 1b Verification

| # | Check | How |
|---|-------|-----|
| 1 | Sales page loads, daily chart renders | Browser |
| 2 | Summary numbers match (revenue, tax, orders) | Compare vs Dashboard tile |
| 3 | Payments page loads, payment breakdown renders | Browser |
| 4 | Hourly chart renders | Browser |

### Phase 1b Owner Smoke
- Open Sales → verify daily chart, summary strip, channel/payment breakdown
- Open Payments → verify payment method breakdown
- PASS → proceed to Phase 2

---

## PHASE 2: Items → `insights-items` + Audit lazy fetch

### Edit P2-1: `ItemSalesHybridMockup.jsx` — Switch to backend items

**Current (line 25):**
```js
import { getItemSalesAggregated } from '../../api/services/insightsService';
```
**New:**
```js
import { fetchInsightsItems } from '../../api/services/insightsService';
import { getItemSalesAggregated } from '../../api/services/insightsService'; // CR-049: kept for Audit tab lazy fetch
```

**Current (lines 178-179):** `useReportFetch` calls `getItemSalesAggregated`
**New:** Fetch `insights-items` for main tabs. Lazy-fetch raw orders only when Audit tab clicked.

```js
// CR-049: Primary data from backend aggregation
const { data: backendResult, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
  async () => {
    const raw = await fetchInsightsItems(appliedFrom, appliedTo);
    return { rows: transformItemRows(raw.items), meta: raw.meta };
  },
  [appliedFrom, appliedTo, schedules],
  { enabled: datesValid }
);

// CR-049: Audit tab — lazy fetch raw orders only when audit tab is active
const [auditData, setAuditData] = useState(null);
const [auditLoading, setAuditLoading] = useState(false);
useEffect(() => {
  if (activeTab !== 'audit' || !SHOW_AUDIT_TAB || auditData) return;
  let cancelled = false;
  setAuditLoading(true);
  getItemSalesAggregated(appliedFrom, appliedTo, 'created_at', schedules)
    .then(result => { if (!cancelled) setAuditData(result); })
    .catch(err => console.error('[CR-049] Audit lazy fetch failed:', err))
    .finally(() => { if (!cancelled) setAuditLoading(false); });
  return () => { cancelled = true; };
}, [activeTab, appliedFrom, appliedTo, schedules, auditData]);

// CR-049: Use backend rows for all tabs, audit data for Audit tab
const apiRows = useMemo(() => {
  if (activeTab === 'audit' && auditData) return auditData.rows;
  return backendResult?.rows || [];
}, [activeTab, auditData, backendResult]);
```

**Audit tab rendering:** When `auditLoading` is true, show a spinner inside the Audit tab content area.

### Edit P2-2: Transform function for item rows

**Add to `insightsService.js`:**
```js
// CR-049: Transform backend insights-items response → FE item row shape
export const transformItemRows = (items) => (items || []).map(i => ({
  productId: i.food_id,
  productName: i.name,
  categoryId: i.category_id,
  categoryName: i.category_name,
  station: i.station || '',
  qty: i.sold || 0,
  qtySold: i.sold || 0,
  qtyCancelled: i.cancelled || 0,
  qtyComplementary: i.complementary || 0,
  qtyPending: i.pending || 0,
  qtyCredit: i.credit || 0,
  totalRevenueSold: i.order_charges_distributed || 0,
  menuPrice: i.menu_price || 0,
  avgPriceSold: i.avg_price_sold || 0,
  hasPending: (i.pending || 0) > 0,
  hasCredit: (i.credit || 0) > 0,
  isComplimentary: (i.complementary || 0) > 0,
  drill: {
    variations: i.variations || [],
    addons: i.addons || [],
    orderLines: [],
    cancels: [],
    driftLines: [],
  },
}));
```

### Phase 2 Verification

| # | Check | How |
|---|-------|-----|
| 1 | Item Ledger loads, Sold tab renders | Browser |
| 2 | Item count matches backend (185 for cafe103 June) | Compare |
| 3 | Cancelled/Comp/Pending/Credit tabs render | Browser |
| 4 | Audit tab shows spinner → loads data → renders | Browser (preprod only) |
| 5 | Drill-down (ItemDrillSheet) opens with variations/addons | Browser |

### Phase 2 Owner Smoke
- Open Item Ledger → verify item list, switch tabs
- Click an item → drill sheet opens with variations/addons
- Click Audit tab → verify it loads (preprod only)
- PASS → proceed to Phase 3

---

## PHASE 3: Cancellations → `insights-cancellations`

### Edit P3-1: `CancellationsMockup.jsx` — Replace raw fetch + inline aggregation

**Current (lines 211-224):** `useReportFetch` calls `api.post(ORDER_LOGS_REPORT)` + strips + filters
**New:**
```js
const { data: cancelData, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
  async () => {
    const raw = await fetchInsightsCancellations(appliedFrom, appliedTo);
    return raw; // Backend returns pre-sectioned: summary, by_day, by_reason, by_stage, by_employee, items
  },
  [appliedFrom, appliedTo],
  { enabled: datesValid }
);
```

**Note:** The ~300 lines of inline cancel aggregation in CancellationsMockup become dead code. Keep commented or remove based on owner preference during cleanup phase.

**Downstream rendering:** Map `cancelData.summary`, `cancelData.by_reason`, etc. to existing component state variables. Implementation agent to trace exact variable names at edit time.

### Phase 3 Verification

| # | Check | How |
|---|-------|-----|
| 1 | Cancellations page loads | Browser |
| 2 | Summary numbers render | Compare vs Dashboard cancel tile |
| 3 | By-reason breakdown renders | Browser |
| 4 | By-employee breakdown renders | Browser |

### Phase 3 Owner Smoke
- Open Cancellations → verify summary, charts, tables
- PASS → proceed to Cleanup

---

## CLEANUP PHASE (after all phases pass smoke)

- Remove `getDashboardAggregated` from insightsService.js (~475 lines)
- Remove `getItemSalesAggregated` from insightsService.js (~560 lines) — **ONLY after Audit tab lazy fetch is confirmed working via pagination (CR-050)**
- Remove old imports from pages
- Remove dead inline aggregation from CancellationsMockup (~300 lines)
- Net: insightsService.js goes from 1078 lines → ~150 lines (4 fetch + 2 transform functions)

---

## Post-Code Registry Checklist (per phase)

- [ ] registry.json: CR-049 → status updated per phase
- [ ] FILE_OWNERSHIP.md: modified files listed
- [ ] Code markers: `// CR-049` in every modified file
- [ ] Webpack: 0 new warnings after each phase

---

## Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| Numbers differ from current FE computation | MEDIUM | Known backend gaps (6 items). Document in release notes. |
| DashboardMockup tile rendering breaks | LOW | Transform produces identical shape — verified field-by-field |
| SalesMockup/PaymentsMockup state shape mismatch | MEDIUM | Implementation agent verifies exact state variables before editing |
| Audit tab lazy fetch slow on large date ranges | LOW | Will improve with CR-050 pagination. Currently same speed as before migration. |
| Backend endpoint down/500 | LOW | `useReportFetch` has error handling + ghost data. Page shows error state. |

---

## Execution Order

```
SHARED edits (S1, S2, S3) → compile check
  → PHASE 1 (P1-1) → compile → smoke → owner PASS
    → PHASE 1b (P1b-1, P1b-2) → compile → smoke → owner PASS
      → PHASE 2 (P2-1, P2-2) → compile → smoke → owner PASS
        → PHASE 3 (P3-1) → compile → smoke → owner PASS
          → CLEANUP (remove old code) → compile → final smoke
```

Each phase is a stopping point. Owner smokes and approves before next phase begins.
