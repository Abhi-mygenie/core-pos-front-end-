# NEXT AGENT — S-ROOM Gate ④ Fix + Implementation Handover (2026-06-06)

**Created:** 2026-06-06 (session close)
**Branch:** `5-june`
**Preview URL:** https://restaurant-pos-ui-3.preview.emergentagent.com
**Test accounts:**
- owner@welcomeresort.com / Qplazm@10 (rooms with advance + lodging + food)
- owner@palmhouse.com / Qplazm@10 (transfer-to-room only, no lodging collection)
- owner@cafe103.com / Qplazm@10 (no rooms — empty state)

---

## 0. WHAT WAS DONE THIS SESSION

### CR-011-ROOM Registered + Gate ①–④ Delivered
- CR registered in CR_REGISTRY.md + CR_011_SCREEN_FREEZE_LOG.md
- Gate ① mockup (seed data) delivered
- Gate ② owner sign-off ("lock it") with KPI pill correction: room-only revenue
- Gate ④ live API wired — but has 3 issues that need fixing before Gate ⑤

### 3 Open Issues (must fix before Gate ⑤)

**ISSUE 1: Header inconsistent with S5/S6 pattern**

Current Room Orders header deviates from the established S5/S7 pattern:

| Element | S5/S7 (correct) | Room Orders (wrong) |
|---|---|---|
| Title | `text-2xl font-semibold` + `fontFamily: Cabinet Grotesk` | `text-xl` — no custom font |
| Date range | Bordered container `border border-zinc-200 bg-white rounded-lg px-3 py-2` with CalendarIcon + `FROM` label + input + `—` + `TO` label + input | Separate naked inputs with text "to" — no container |
| Apply button | Green `#329937` bg + Check icon, always visible (disabled when clean) | Only appears when dirty, different styling |
| Presets | Grouped inside `bg-zinc-100 rounded-lg` container, white active with `shadow-sm` | Individual black pills `bg-zinc-900` active |
| Download | Outlined `border border-[#F26B33] text-[#F26B33]` + ChevronDown | Solid orange `bg-[#F26B33] text-white` — no chevron |

**Fix:** Copy header JSX from `SalesMockup.jsx` lines 336-392 (cleanest S7 reference).

**ISSUE 2: ReportLoadingShield used incorrectly**

```js
// Current (wrong):
<ReportLoadingShield isLoading={isLoading && !hasLoadedOnce} error={error} onRetry={() => {}} screenLabel="Room Orders">

// Correct (match S7):
<ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
```

Problems:
- `hasLoadedOnce` not passed — shield can never distinguish first-load vs re-fetch
- `screenLabel` prop doesn't exist on the component
- `onRetry` is empty function — should wire to actual refetch

**ISSUE 3: N+1 per-row API calls — replace with single-call approach**

Current: `getRoomOrdersForRange` fetches `order-logs-report` (1 call) → then each row fires `getSingleOrderRoom` (N calls) = N+1 total.

**Owner-approved fix: eliminate all per-row calls.** The single `order-logs-report` response already contains everything:

### Data Available in order-logs-report (verified)

| Need | Source in API response | Field path |
|---|---|---|
| Room price | `orderWrapper.room_info.room_price` on RM wrappers | ✅ Present |
| Advance payment | `orderWrapper.room_info.advance_payment` | ✅ Present |
| Balance payment | `orderWrapper.room_info.balance_payment` | ✅ Present |
| Receive balance | `orderWrapper.room_info.receive_balance` | ✅ Present |
| Discount | `orderWrapper.room_info.discount_amount` | ✅ Present |
| Guest name | `orderWrapper.room_info.name3` (fallback: `orders_table.user_name`) | ✅ Present |
| Check-in date | `orderWrapper.room_info.checkin_date` | ✅ Present |
| Check-out date | `orderWrapper.room_info.checkout_date` | ✅ Present |
| Room number | `orderWrapper.room_info.room_no` | ✅ Present |
| Associated orders | SRM rows in SAME response, `parent_order_id` = RM parent's `id` | ✅ Present |
| Order amount | `orders_table.order_amount` | ✅ Present |
| fOrderStatus | `orders_table.f_order_status` | ✅ Present |

**Key finding:** `transferToRoom` orders ARE SRM rows. Backend sets BOTH `order_in='SRM'` + `payment_method='transferToRoom'`. Confirmed via code comment at `reportTransform.js:322`.

### Implementation Plan for Issue 3

**In `roomOrdersService.js`** — rewrite `getRoomOrdersForRange`:

```
Step 1: POST order-logs-report (from_date, to_date) → get raw wrappers
Step 2: Pre-scan raw wrappers BEFORE transform:
  - For each wrapper where orders_table.order_in === 'RM':
      roomInfoMap[orders_table.id] = wrapper.room_info (parse all fields)
  - For each wrapper where orders_table.order_in === 'SRM':
      associatedMap[orders_table.parent_order_id].push(wrapper.orders_table)

Step 3: Run standard transform: reportListFromAPI.orderLogsReport(raw, null)
Step 4: Filter to RM rows + business-day range
Step 5: Attach roomInfo + associatedOrders from maps to each RM row
Step 6: Return fully-populated rows — ZERO per-row API calls
```

**Do NOT modify `reportTransform.js`** — intercept the raw wrappers upstream in the service.

**Remove all `getSingleOrderRoom` usage** from `RoomOrdersMockup.jsx`:
- Remove `detailCacheRef`, `resolvedTick`, `handleDetailResolved`
- Remove per-row `useEffect` fetch in `RoomRow` component
- All financial data comes pre-populated from the service
- Charts, KPIs, table render instantly (no progressive loading)

### Locked Financial Formulas (unchanged)

```
roomService  = settled ? max(0, orderAmount - balancePayment - associatedTotal) : orderAmount
food         = associatedTotal + roomService
total        = roomPrice + food
paid         = settled ? min(advance + orderAmount, total) : advance + receiveBalance
outstanding  = max(0, total - paid)
discount     = roomInfo.discountAmount only (no derivation)
```

### KPI Pill Rule (owner-locked Gate ②)

```
KPI pills = room-only revenue:
  Total Revenue    = Σ roomPrice
  Total Collected  = Σ min(advance + receiveBalance, roomPrice)
  Total Outstanding = Σ max(0, roomPrice - roomCollected)

Charts/table/summary bar = full folio (roomPrice + food)
```

---

## 1. FILES TO MODIFY

| File | Action | Details |
|---|---|---|
| `frontend/src/api/services/roomOrdersService.js` | **REWRITE** | Remove getSingleOrderRoom. Pre-scan raw wrappers for room_info + SRM grouping. Return fully-populated rows. |
| `frontend/src/pages/reports-module/RoomOrdersMockup.jsx` | **REWRITE** | Fix header (copy from S7), fix ReportLoadingShield usage, remove per-row detail fetch, all data comes pre-populated from service. |
| No other files need changes | — | Routes + sidebar already wired. |

---

## 2. ENV VARIABLES

| Variable | Value | Purpose |
|---|---|---|
| `REACT_APP_SHOW_AUDIT_TAB` | `true` | Audit tab visibility (preprod) |
| `REACT_APP_CRM_BASE_URL` | `https://react-python-crm-2.preview.emergentagent.com/api` | CRM endpoint |

---

## 3. TESTING PLAN

| Test | Account | Validates |
|---|---|---|
| Welcome Resort 7D | owner@welcomeresort.com | Advance + lodging + food pattern. KPI pills room-only. Charts + table full folio. |
| Welcome Resort 30D | owner@welcomeresort.com | Larger dataset loads instantly (no spinners). |
| Palm House 7D | owner@palmhouse.com | Transfer-only pattern. KPI pills ₹0 (no lodging). Food shows in charts/table. |
| Cafe103 | owner@cafe103.com | Empty state (no rooms). |
| Tab switching | Any | All/Settled/Unpaid filters correct. |
| Expand row | Welcome Resort | Room Billing + Associated Orders from pre-populated data. |
| Header visual | Any | Matches S7 Sales header exactly. |
| Loading shield | Any | First-load spinner, re-fetch ghosting + progress bar. |
| Export | Any | Excel/PDF with room data. |

---

## 4. DO NOT TOUCH

- Any FROZEN screen (S0–S9) in `CR_011_SCREEN_FREEZE_LOG.md`
- `auditManifest.js` — all 42 rules approved (S5)
- `REACT_APP_SHOW_AUDIT_TAB` env variable behavior
- `reportTransform.js` — do NOT modify the shared transform. Extract room_info upstream.
- Existing `/reports/rooms` page (RoomOrdersReportPage.jsx) — untouched
- S7/S8 revenue filter: `fOrderStatus === 6` (owner-locked)

---

## 5. REFERENCE FILES

| File | Purpose |
|---|---|
| `SalesMockup.jsx:336-392` | S7 header pattern — copy for consistency |
| `ReportLoadingShield.jsx` | Loading shield component — props: isLoading, hasLoadedOnce, error, onRetry |
| `reportTransform.js:820-1060` | `orderLogsReportRow` — wrapper shape: `{ orders_table, order_details_table, operations, room_info }` |
| `reportTransform.js:1072` | List transform: `orders.map(w => orderLogsReportRow(w, activeSrmIds))` |
| `orderTransform.js:373-407` | `room_info` field extraction — same fields exist on order-logs-report wrappers |
| `orderTransform.js:329-343` | `associated_order_list` mapping — for reference only (we use SRM rows instead) |
| `orderLedgerService.js:130-170` | S6 `getOrderLedgerForRange` — same API call pattern, same business-day filtering |
| `RoomRowCard.jsx` | Existing per-row component — financial formulas at line ~220 (locked, reuse formulas) |

---

*End of session. S-ROOM Gate ④ delivered with 3 open issues. Next agent fixes issues → Gate ⑤ owner validation → Gate ⑥ frozen.*
