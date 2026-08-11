# INV-001 — Addendum: 1-Year Range — FE Code Changes Required

**Document:** INV001_1YR_EXPANSION_PLAN.md
**Date:** 2026-07-10
**Agent:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7)
**Parent report:** INV001_INVESTIGATION_REPORT.md
**Scope:** Exact FE changes needed to enable 1-year range on backend-aggregated reports

---

## 1. What Changes and What Does Not

### Changes required
Only **date-picker guard constants** in 3 files. No API changes. No transform changes.
No financial logic. No hotspot files (R5). Risk: **LOW**.

### Does NOT change
- Any backend endpoint or API contract
- The `InsightsCacheContext` shared date state
- Any transform, service, or component logic
- The Settlement Report (already at 365 days — no action needed)

---

## 2. Exact File Changes

### Change 1 — `DashboardMockup.jsx`
**File:** `/app/frontend/src/pages/reports-module/DashboardMockup.jsx`
**Line:** 70
**Effect:** Lifts the date range cap for the Dashboard AND all sub-reports that inherit
from `InsightsCacheContext` (Sales, Daily Sales, Hourly Sales, Day of Week, Channel Pivot,
Gateway Recon, Round Off, Payments, Tax Slabs, Tax Calc, Tax Detail, Discount Report,
Coupon Usage, Staff Servers, Staff Cashiers, Cashier Settlement, Tip, Customers RFM,
Customers Mix, Delivery Charge, Room Transfers, Table Sales, Audit Log, KOT Variance).
That is **24 report screens** unlocked by this single change.

```diff
- const MAX_RANGE_DAYS = 62;
+ const MAX_RANGE_DAYS = 365;
```

**Secondary UI strings to update in the same file** (grep for "2 months"):
- Line ~279: `title="Coming soon — max range is 2 months"` → `"Expand range to select up to 1 year"`
- Any "Max 2 months" error label → `"Max 1 year"`

---

### Change 2 — `CancellationsMockup.jsx`
**File:** `/app/frontend/src/pages/reports-module/CancellationsMockup.jsx`
**Line:** 189
**Effect:** Lifts cap for the Cancellations screen and its sub-views
(Cancel Detail, Order Notes — they share dates via context when navigated from Cancellations).

```diff
- const MAX_RANGE_DAYS = 62;
+ const MAX_RANGE_DAYS = 365;
```

**Secondary UI strings to update in the same file:**
- Line ~381: `"Max 2 months"` → `"Max 1 year"`
- Line ~417: `title="Coming soon — max range is 2 months"` → update accordingly

**Timing confirmation:** `insights-cancellations` responds in **3,311ms** at 1-year,
265 KB response. This is the slowest backend endpoint — acceptable with a loading spinner.

---

### Change 3 — `ItemSalesHybridMockup.jsx` (main view only)
**File:** `/app/frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx`
**Line:** 166
**Effect:** Lifts cap for Item Report main view (backed by `insights-items` endpoint, 2,690ms at 1-year).

```diff
- const MAX_RANGE_DAYS = 62;
+ const MAX_RANGE_DAYS = 365;
```

**Secondary UI strings to update in the same file:**
- Line ~966: `title="Coming soon — max range is 2 months"` → update accordingly

---

## 3. Audit Tab Guard (same file, Change 3b)

The Item Report Audit tab uses `getItemSalesAggregated` which fetches raw order-logs
and aggregates in the browser. This must be guarded separately from the main view.

**After the `ORDER_LOGS_REPORT` fetch resolves in the Audit tab logic, add:**

```javascript
// INV-001: Volume guard — FE audit aggregation is unsafe above ~5000 orders.
// Main view is backend-aggregated (safe at 1-year). Audit tab retains 62-day guard.
if (orders.length > 5000) {
  setAuditWarning(
    'Audit analysis supports up to ~62 days for this restaurant\'s volume. ' +
    'Please reduce the date range for the Audit tab.'
  );
  return;
}
```

The exact location and state variable name will depend on how the Audit tab triggers
its fetch in `ItemSalesHybridMockup.jsx` — this needs a Planning agent to trace the
exact lines before Implementation.

**Alternatively (simpler):** Keep a separate `MAX_RANGE_DAYS_AUDIT = 62` constant and
disable the Audit tab's Apply button when range > 62 days, showing a tooltip:
`"Audit tab supports up to 62 days. Switch to Summary tab for 1-year view."`

---

## 4. Reports That Stay Capped (do not change)

| Report | File | Current cap | Reason to keep |
|--------|------|-------------|----------------|
| Order Ledger | `OrderLedgerMockup.jsx` | 60 days | N-per-day calls (92 hard cap in service). Needs `insights-tab-settlements` backend endpoint first. |
| Room Orders | `RoomOrdersMockup.jsx` | 60 days | Uses ORDER_LOGS_REPORT for "paid" filter — 1-year safe but no urgency; needs `insights-room-orders` backend endpoint to fully support high-volume |
| Prep/Serve Time | `PrepServeTimeMockup.jsx` | None (own picker, no MAX defined) | Chunked ORDER_LOGS_REPORT — safe for low-volume but risky for high-volume. Leave as-is until `insights-prep-serve` backend endpoint is ready. |
| Food Court | `FoodCourtMockup.jsx` | None | Same as PrepServe — chunked, leave as-is. |

---

## 5. Full Impact Map — What Gets Unlocked

### After Change 1 (DashboardMockup): 24 screens
| Screen | Endpoint | 1-year time |
|--------|----------|-------------|
| Dashboard | insights-dashboard | 3,178ms |
| Sales | insights-sales | 2,864ms |
| Daily Sales | insights-sales | 2,864ms |
| Hourly Sales | insights-sales | 2,864ms |
| Day of Week | insights-sales | 2,864ms |
| Channel Pivot | insights-sales | 2,864ms |
| Gateway Recon | insights-sales | 2,864ms |
| Round Off | insights-sales | 2,864ms |
| Payments | insights-sales | 2,864ms |
| Tax Slabs | insights-tax | 2,302ms |
| Tax Calc | insights-tax | 2,302ms |
| Tax Detail | insights-tax | 2,302ms |
| Discount Report | insights-discounts | 2,757ms |
| Coupon Usage | insights-discounts | 2,757ms |
| Staff Servers | insights-staff | 1,949ms |
| Staff Cashiers | insights-staff | 1,949ms |
| Cashier Settlement | insights-staff | 1,949ms |
| Tip Report | insights-staff | 1,949ms |
| Customers RFM | insights-customers | 2,636ms |
| Customers Mix | insights-customers | 2,636ms |
| Delivery Charge | insights-locations | 1,241ms |
| Room Transfers | insights-locations | 1,241ms |
| Table Sales | insights-locations | 1,241ms |
| Audit Log | insights-dashboard | 3,178ms |
| KOT Variance | insights-items | 2,690ms |

### After Change 2 (CancellationsMockup): 3 screens
| Screen | Endpoint | 1-year time |
|--------|----------|-------------|
| Cancellations | insights-cancellations | 3,311ms |
| Cancel Detail | insights-cancellations | 3,311ms |
| Order Notes | insights-cancellations | 3,311ms |

### After Change 3 (ItemSalesHybridMockup): 1 screen (main view only)
| Screen | Endpoint | 1-year time |
|--------|----------|-------------|
| Item Report (Summary/Sales tabs) | insights-items | 2,690ms |

**Total screens unlocked: 28 out of 35 Insights report screens**

---

## 6. Rollout Recommendation

**Phase 1 (now — 3 constant changes, 1 day):**
Changes 1, 2, 3 above. Unlocks 28 screens.
Risk: LOW. Planning skip eligible with owner approval.

**Phase 2 (after backend delivers `insights-tab-settlements`):**
Lift `OrderLedgerMockup.jsx` MAX_RANGE_DAYS: 60 → 365.
Update `getTabSettlementsForRange` to call new endpoint.

**Phase 3 (after backend delivers `insights-prep-serve`, `insights-food-court`, `insights-room-orders`):**
Remove chunking logic from FE services. Simplify to single-call pattern.
No UI changes needed — screen layouts are already in place.

**Phase 4 (after backend delivers `insights-item-audit`):**
Remove FE audit aggregation. Remove volume guard. Full 1-year Audit tab.

---

## 7. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Backend times out for specific restaurant with massive data | Low | `insights-*` endpoints already proven at 1-year on preprod. If timeout occurs on specific restaurant, backend team adds pagination or streaming. |
| Cache in `InsightsCacheContext` holds large response in memory after 1-year query | Medium | Existing 5-minute TTL + cache-clear on logout already in place. Monitor heap usage after release. |
| User sets 365-day range then navigates across all 24 sub-reports | Low | Cache deduplicates — each endpoint called once per range, result reused across navigation. |
| InsightsCacheContext `sharedFrom/sharedTo` persists 1-year range in localStorage between sessions | Low | Worth checking if cache key includes date range — if so, stale cache won't serve wrong data. |

---

## 8. Probe Evidence

All measurements taken 2026-07-10, preprod, 18March restaurant.

| Range | Endpoint | Time | Size |
|-------|----------|------|------|
| 62 days | insights-dashboard | 1,249ms | 2.1 KB |
| 62 days | insights-sales | 1,112ms | 6.5 KB |
| 62 days | insights-items | 1,356ms | 21.7 KB |
| 62 days | insights-cancellations | 896ms | 3.3 KB |
| 62 days | insights-tax | 896ms | 3.4 KB |
| 62 days | insights-discounts | 1,304ms | 4.4 KB |
| 62 days | insights-staff | 817ms | 0.8 KB |
| 62 days | insights-customers | 1,377ms | 5.0 KB |
| 62 days | insights-locations | 689ms | 4.7 KB |
| **1 year** | **insights-dashboard** | **3,178ms** | **4.4 KB** |
| **1 year** | **insights-sales** | **2,864ms** | **35.3 KB** |
| **1 year** | **insights-items** | **2,690ms** | **107 KB** |
| **1 year** | **insights-cancellations** | **3,311ms** | **265 KB** |
| **1 year** | **insights-tax** | **2,302ms** | **18.5 KB** |
| **1 year** | **insights-discounts** | **2,757ms** | **24.7 KB** |
| **1 year** | **insights-staff** | **1,949ms** | **3.1 KB** |
| **1 year** | **insights-customers** | **2,636ms** | **26.0 KB** |
| **1 year** | **insights-locations** | **1,241ms** | **18.5 KB** |
