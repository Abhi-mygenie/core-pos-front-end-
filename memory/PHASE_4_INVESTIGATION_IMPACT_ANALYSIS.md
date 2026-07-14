# Phase 4 — Investigation Items: Impact Analysis

**Created:** 2026-06-12
**Gate:** 2 (Impact Analysis)
**Items:** BUG-130 (Channel Visibility), BUG-132 (Settlement Report), BUG-133 (Check In Item in Reports)

---

## BUG-130: Channel Visibility — Restaurant Settings Not Reflected in POS

### Data Flow Traced (3 layers)

```
LAYER 1: Profile API (/api/v1/vendoremployee/profile)
  └→ profileTransform.js L135-139 maps raw fields to features:
       dineIn:   toBoolean(api.dine_in)
       delivery: toBoolean(api.delivery)
       takeaway: toBoolean(api.take_away)
       room:     toBoolean(api.room)
  └→ Stored in RestaurantContext → restaurant.features

LAYER 2: Dashboard (DashboardPage.jsx)
  └→ channelData (L855-880): each channel has `enabled: features.dineIn !== false` etc.
  └→ Rendering filter (L1682-1689): THREE gates must pass for a channel to show:
       Gate A: `c.enabled` (from profile API features — Layer 1)
       Gate B: `!hiddenChannels.includes(c.id)` (per-session column hide action)
       Gate C: `channelVisibility.enabled && channelVisibility.channels.includes(c.id)` (localStorage override)
  └→ channelVisibility read from localStorage key `mygenie_channel_visibility` (L249-258)

LAYER 3: StatusConfigPage (settings page)
  └→ availableChannels (L149-153): filtered by `features.dineIn !== false` etc.
       → Only channels enabled at API level show as toggle-able cards
  └→ channelConfig saved to localStorage key `mygenie_channel_visibility` (L502)
  └→ Override ON/OFF toggle (L1156+): when OFF, channels = all; when ON, channels = selected subset
```

### Identified Issues

| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| **I-1** | **Restaurant Settings API vs Profile API disconnect.** Restaurant Settings page (`CR-019`) writes to `POST update-settings` API. Profile API (`/api/v1/vendoremployee/profile`) is a DIFFERENT endpoint that reads from the restaurant's base config. If the settings API updates channel flags but the profile API doesn't reflect them, Layer 1 features will be stale. | **HIGH** | Likely **backend** issue — two APIs reading from different sources or cache. FE reads from profile only. |
| **I-2** | **Profile API caching.** Profile is loaded ONCE at boot (LoadingPage Tier 1). If restaurant settings are changed AFTER boot, `restaurant.features` won't update until next login. No live-refresh mechanism. | **MEDIUM** | FE architecture — profile loaded once, not refreshed. `useRefreshAllData` hook skips profile ("session-sensitive"). |
| **I-3** | **localStorage stale after settings change.** If admin enables TakeAway in Restaurant Settings, the localStorage `mygenie_channel_visibility` on other devices still has old config (may have TakeAway=OFF). The override is per-device, not synced. | **LOW** | By design — localStorage is per-user local override. But the `availableChannels` filter (L149-153) should prevent toggling channels that aren't API-enabled. |
| **I-4** | **DEBUG-B11 logs still in production.** `profileTransform.js` L119-134 has `console.log('[DEBUG-B11]...')` calls that were supposed to be removed post-validation (per CR-020 notes). | **LOW** | Cleanup debt — cosmetic but noisy in production console. |

### Affected Files
| File | Role | Lines of Interest |
|------|------|-------------------|
| `api/transforms/profileTransform.js` | Maps API → features | L119-139 |
| `pages/DashboardPage.jsx` | Consumes features, renders channels | L249-258, L855-880, L1682-1689 |
| `pages/StatusConfigPage.jsx` | Filters available channels, writes localStorage | L149-153, L502 |
| `components/dashboard/ChannelColumnsLayout.jsx` | Renders channel columns | Consumer of channelData |
| `components/layout/Header.jsx` | Channel visibility reference | Minor |

### Investigation Conclusion
**Primary suspect is I-1 (backend).** FE correctly reads `features` from profile API and gates channels at all 3 layers. If Restaurant Settings API changes don't propagate to the profile API response, FE will never see them. **Recommend: curl-probe the profile API before and after a settings change** to confirm whether the profile response updates.

**Secondary suspect is I-2 (no live-refresh).** Even if backend propagates correctly, FE only reads profile at boot. A settings change mid-session requires re-login to take effect.

### Recommended Next Steps
1. **Curl-probe verification** (owner can do this): Change a channel in Restaurant Settings → immediately call profile API → check if `dine_in`/`take_away`/`delivery`/`room` reflect the change.
2. If profile API DOES update → I-2 is the culprit → FE needs a profile refresh after settings save (1-line fix in `RestaurantSettingsPage.jsx` post-save callback).
3. If profile API DOES NOT update → I-1 is the culprit → backend team must fix settings→profile propagation. FE cannot work around this.
4. I-4 (DEBUG-B11 cleanup) — can be done in any phase, zero risk.

---

## BUG-132: Settlement Report Not Working as Expected

### Architecture Traced (2 surfaces)

```
SURFACE A: Settlement Panel (dashboard slide-over — CR-015)
  └→ SettlementPanel.jsx L54-66
  └→ Calls: settlementService.getSettlementReport(dateStr, dateStr) — single day
  └→ Transform: fromAPI.settlementReport() (settlementTransform.js)
  └→ Shows: KPI cards (Opening/CashCollected/Settled/Remaining/Pilferage)
            + per-waiter table + actions (Settle, Opening Balance, Self-Settle, Close Day)
  └→ Date: single day picker, default=today

SURFACE B: Settlement History Report (Insights module — CR-016)
  └→ SettlementReportMockup.jsx L108-130
  └→ Calls: getSettlementForRange(apiFrom, apiTo) — date range
  └→ Transform: fromAPI.settlementRange() (settlementReportTransform.js)
  └→ Shows: Summary table (one row per day), drill-down per-waiter detail,
            KPI strip across range, Excel/PDF export
  └→ Date: range picker, default=today-to-today
```

### Identified Issues

| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| **I-1** | **"No settlement data for today" when data exists.** Screenshot shows all ₹0 KPIs + "No settlement data for today" + 13 inactive waiters. This could mean: (a) API returns empty/zero for the selected date, OR (b) API returns data but the transform/filter strips all waiters as "inactive". | **HIGH** | Need to check: `getSettlementReport` raw response vs transformed output. The `activeWaiters` filter (L89) only shows waiters with `cashCollected > 0 OR openingBalance > 0` — if all are zero, table shows empty. |
| **I-2** | **Date format mismatch.** `settlementService.getSettlementReport` sends `date_from`/`date_to`. The panel calls `formatDateForAPI(d)` (L57). If the format doesn't match what backend expects, data won't return. | **MEDIUM** | Need to verify `formatDateForAPI` output format vs backend expectation. |
| **I-3** | **Insights Settlement vs Panel Settlement confusion.** Two different surfaces with the same name. Owner may be reporting an issue on one or both. The Insights report (SettlementReportMockup) is a separate screen under `/reports-module/settlement` with different data pipeline (range query + per-day aggregation + active-day filtering). | **MEDIUM** | Need owner clarification: which surface is broken? Panel (dashboard slide-over) or Insights report (full-page)? Or both? |
| **I-4** | **Related CR-015/CR-016 open items.** CR-015 noted: `POST /waiter/cash-transfer` returns 404 (backend hasn't built it). CR-016 had post-smoke fix: "hide zero-activity days + inactive waiters." | **LOW** | Known — transfer is a placeholder. Zero-activity filtering is already implemented. |

### Affected Files
| File | Role |
|------|------|
| `components/panels/SettlementPanel.jsx` (497 lines) | Dashboard panel surface |
| `pages/reports-module/SettlementReportMockup.jsx` | Insights report surface |
| `api/services/settlementService.js` | API calls |
| `api/services/settlementReportService.js` | Insights API wrapper |
| `api/transforms/settlementTransform.js` | Panel data transform |
| `api/transforms/settlementReportTransform.js` (87 lines) | Insights data transform |

### Investigation Conclusion
**Root cause is in the KPI formula computation.** Owner confirmed specific symptom: `Settled === Total Funds` (wrong), `Remaining === Pilferage` (should be independent), `Expected === Actual Balance` (Expected is calculated, Actual is manual input). The business logic formulas in `settlementTransform.js` or `SettlementPanel.jsx` are broken. Need to trace each formula and compare with expected:
- Total Funds = Opening Balance + Cash Collected
- Expected = Total Funds − Settled
- Remaining = Expected − Actual Balance
- Pilferage = Expected − Actual Balance (only on close)

### Recommended Next Steps
1. **Trace formulas** in `settlementTransform.js` `fromAPI.settlementReport()` + `fromAPI.waiter()` — map each API field to each KPI.
2. **Curl-probe** the `get-settlement-report` API for a date with known activity — compare raw values vs transformed output.
3. **Fix the formulas** — likely a field mapping error (e.g., reading wrong API field for "Settled" vs "Total Funds").

---

## BUG-133: "Check In" Item Appearing in Reports

### Defence Layer Audit

| Layer | File | Filter | Status |
|-------|------|--------|--------|
| **Products list (menu)** | `productTransform.js` L47-48 | `.filter(p => p.foodFor === 'Normal')` + `.filter(p => p.productName.toLowerCase() !== 'check in')` | ✅ DEFENDED — "Check In" excluded from menu context |
| **Category list** | `categoryTransform.js` L37 | `.filter((cat) => cat.categoryName.toLowerCase() !== 'check in')` | ✅ DEFENDED — "Check In" category hidden |
| **Order items (running orders)** | `orderTransform.js` L278-280 | `isCheckIn` detected → `isCheckInMarker: true`, price/unitPrice zeroed | ✅ DEFENDED — zeroed but still in items array |
| **Bill print payload** | `orderTransform.js` L1763 | `.filter(d => (d.food_details?.name || '').toLowerCase() !== 'check in')` | ✅ DEFENDED — excluded from print |
| **Item Sales / Item Ledger** | `insightsService.js` L125-540 | **❌ NO FILTER** — iterates `order_details_table[]` items, aggregates by `food_id`. "Check In" lines included if they exist in order data. | 🔴 UNDEFENDED |
| **Order Ledger** | `orderLedgerService.js` | **❌ NO FILTER** — processes `order_details_table[]` items. "Check In" lines included in order detail drill-down and per-order item aggregation. | 🔴 UNDEFENDED |
| **Audit Report (AllOrdersReportPage)** | `reportTransform.js` | **❌ NO FILTER** — `getSingleOrderNew` + `orderLogsReportRow` process items without "check in" exclusion. Side-sheet drill shows all items. | 🔴 UNDEFENDED |
| **Room Orders Report** | `roomOrdersService.js` | **❌ NO FILTER** — processes room order items. "Check In" explicitly relevant to room orders (it IS the check-in marker). | 🟡 PARTIALLY DEFENDED (orderTransform zeroes price, but item still appears in list) |
| **Food Court Report** | `foodCourtService.js` | **❌ NO FILTER** — station-wise item breakdown includes all items. | 🔴 UNDEFENDED |
| **Dashboard order cards** | Uses `orderTransform` | ✅ DEFENDED — `isCheckInMarker` zeroes financials; cards show name but ₹0 |
| **Credit statements** | `creditStatementGenerator.js` | **❌ NO FILTER** — if a credit order contains a "Check In" item, it appears in the statement | 🔴 UNDEFENDED |

### Identification Method
The "Check In" item can be identified by:
- **`food_details.name`** (or `fd.name`) = `"Check In"` (case-insensitive) — most reliable
- **`food_for`** = `"Check In"` (not `"Normal"`) — productTransform already uses this as first filter
- **`food_id`** — specific per restaurant, not universal

The existing `orderTransform.js` uses `food_details.name` match. The `productTransform.js` uses both `foodFor` and `productName` match. **Recommend: use `food_details.name` string match in report services (consistent with orderTransform pattern).**

### Financial Impact
If "Check In" items have non-zero `price`/`unit_price` in order data, they would inflate:
- Revenue totals in Item Sales / Item Ledger
- Tax calculations in Order Ledger audit
- Item counts in Food Court station breakdown
- Order totals in Audit Report detail

However, `orderTransform.js` L280-285 already zeroes price for running order items. The question is whether the **raw order-logs-report API** also has non-zero prices for "Check In" lines, or whether backend zeroes them. **Needs verification via curl-probe on a room order.**

### Affected Files (for eventual fix)
| File | Lines to Add Filter | Pattern |
|------|-------------------|---------|
| `api/services/insightsService.js` | After L130 (item loop start) | `if ((fd.name || '').toLowerCase() === 'check in') continue;` |
| `api/services/orderLedgerService.js` | In item iteration | Same pattern |
| `api/transforms/reportTransform.js` | In `orderLogsReportRow` items processing | Same pattern |
| `api/services/foodCourtService.js` | In item iteration | Same pattern |
| `api/services/roomOrdersService.js` | In item iteration | Same pattern, but may want to keep for room context (owner decision) |

### Similar Markers to Investigate
| Marker | Purpose | Seen In |
|--------|---------|---------|
| `"Check In"` | Room check-in marker | Confirmed in multiple places |
| Other `food_for !== 'Normal'` items? | Unknown | Need to query: are there other non-Normal food_for values that leak into orders? |

### Investigation Conclusion
**Clear gap identified:** 5 report services/transforms have NO "Check In" filter. The fix is mechanical — one `continue` statement per service at the top of the item iteration loop. ~5 lines of code across 5 files.

### Recommended Next Steps
1. "Check In" excluded **everywhere, no exceptions** (including Room Orders Report) — owner decision locked.
2. Filter pattern: `(name || '').trim().toLowerCase() === 'check in'` — handles all cases, trims whitespace.
3. **Implementation:** Single-line filter in 6 files (5 report services + roomOrdersService). Can bundle with any phase.
4. Existing defences in `orderTransform.js` and `productTransform.js` should also be updated to use `.trim()` for consistency.

---

## Summary: Phase 4 Items Prioritized for Next Steps

| Item | Root Cause | FE Fixable? | Blocking? | Next Action |
|------|-----------|-------------|-----------|-------------|
| **BUG-130** | Likely backend (settings → profile propagation) OR FE (no profile refresh after settings change) | Partially — I-2 is FE; I-1 is backend | Need curl verification | **Owner curl-probe** or agent curl-probe on preprod |
| **BUG-132** | Business logic formulas broken (Settled=TotalFunds, Remaining=Pilferage, Expected=ActualBalance) | **Yes** — formula fix in settlementTransform.js | Yes — formulas are wrong | **Trace formulas → fix computation** |
| **BUG-133** | Clear — 6 report services missing "Check In" filter | **Yes** — mechanical fix, ~6 lines | No | **Ready for Gate 3** — all owner decisions locked (everywhere, trim+lowercase) |

---

*Phase 4 Impact Analysis — 2026-06-12. Gate 2 complete for all 3 items.*
