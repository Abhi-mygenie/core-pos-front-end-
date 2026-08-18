# QA HANDOVER — 2026-06-15 — CR-049 + BUG-096 + BUG-092 + CR-048

## 1. Credentials + Environment

| Account | Password | RID | Use For |
|---------|----------|-----|---------|
| owner@cafe103.com | Qplazm@10 | 644 | No rooms, postpaid, GST |
| owner@welcomeresort.com | Qplazm@10 | 474 | Rooms, settlement, check-in items |
| owner@palmhouse.com | Qplazm@10 | 541 | Rooms, mixed, discount+round-off |

**Preview URL:** https://mygenie-pos-front.preview.emergentagent.com
**Login API:** POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login

---

## 2. CR-049 — Insights Backend Aggregation Migration

### What Changed
- 4 new backend endpoints wired (replacing FE client-side aggregation)
- All Insights pages now fetch pre-computed data from backend instead of downloading raw orders
- Cache (CR-044) wired via `fetchOrReuse` — navigate between pages without re-fetching

### Files Changed
| # | File | Change |
|---|------|--------|
| 1 | `api/constants.js` | +4 endpoint constants (INSIGHTS_DASHBOARD/SALES/ITEMS/CANCELLATIONS) |
| 2 | `api/services/insightsService.js` | +4 cached fetch functions, +2 transform functions, old functions kept for audit |
| 3 | `pages/reports-module/DashboardMockup.jsx` | Switched to `fetchInsightsDashboard` + `transformDashboardResponse` |
| 4 | `pages/reports-module/SalesMockup.jsx` | Switched to `fetchInsightsSales`, removed FE aggregation |
| 5 | `pages/reports-module/PaymentsMockup.jsx` | Switched to `fetchInsightsSales` (payments section) |
| 6 | `pages/reports-module/ItemSalesHybridMockup.jsx` | Switched to `fetchInsightsItems`, audit tab lazy-fetches old data on click |
| 7 | `pages/reports-module/CancellationsMockup.jsx` | Switched to `fetchInsightsCancellations` |

### Test Cases — Phase 1: Dashboard

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| T-049-01 | Dashboard loads with data | Login cafe103 → Insights → Dashboard → set 7D range → Apply | All 10 tiles render with numbers (revenue, channels, payments, cancellations, discounts, kitchen, customers, audit) | BLOCKER |
| T-049-02 | Dashboard 3-month range | Set Mar 15 - Jun 15 → Apply | Page loads within ~10s (was impossible before). All tiles render. | BLOCKER |
| T-049-03 | Dashboard 1-year range | Set Jun 15 2025 - Jun 15 2026 → Apply | Page loads (may take 30-40s). Revenue tile shows total. | MAJOR |
| T-049-04 | Revenue tile accuracy | Compare Dashboard revenue vs Order Ledger total for same date range | Numbers should be close (known backend gaps may cause small diff for TAB orders) | MAJOR |
| T-049-05 | Channel mix renders | Check pie chart / breakdown shows Dine-In, Takeaway, etc. | At least 1 channel with orders visible | MAJOR |
| T-049-06 | Empty date range | Set future dates (e.g., Dec 2026) | Dashboard shows zeros / empty state, no crash | MINOR |

### Test Cases — Phase 1b: Sales + Payments

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| T-049-07 | Sales page loads | Insights → Sales → 7D range | Daily chart renders, summary strip shows revenue/orders/tax/discount | BLOCKER |
| T-049-08 | Sales daily breakdown | Check daily bars/rows | Each day has revenue and order count | MAJOR |
| T-049-09 | Sales channel breakdown | Check channel section | Shows channel names + revenue | MAJOR |
| T-049-10 | Sales hourly heatmap | Check hourly section | Shows hours with order activity | MINOR |
| T-049-11 | Payments page loads | Insights → Payments → 7D range | Payment method breakdown renders (Cash, Card, UPI, etc.) | BLOCKER |
| T-049-12 | Payments pie/donut chart | Check payment method distribution | Percentages visible, colors assigned | MAJOR |
| T-049-13 | Payments daily trend | Note: daily per-method split simplified (total only, not per-method bars) | Daily total renders. Per-method daily = future scope. | MINOR |

### Test Cases — Phase 2: Item Ledger

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| T-049-14 | Item Ledger loads | Insights → Item Ledger → 7D range | Item list renders with names, qty sold, revenue | BLOCKER |
| T-049-15 | Item count matches | Compare item count in UI vs curl `insights-items` response | Should match (e.g., 185 items for cafe103 2-week range) | MAJOR |
| T-049-16 | Sold tab | Click "Sold" tab | Shows items with qty > 0, sorted by revenue | MAJOR |
| T-049-17 | Cancelled tab | Click "Cancelled" tab | Shows items with cancelled > 0 | MAJOR |
| T-049-18 | Comp tab | Click "Comp" tab | Shows complementary items | MINOR |
| T-049-19 | Pending tab | Click "Pending" tab | Shows pending items | MINOR |
| T-049-20 | Credit tab | Click "Credit" tab | Shows credit/TAB items | MINOR |
| T-049-21 | Item drill-down | Click any item row → drill sheet opens | Shows variations and addons from backend. Order lines empty (expected — backend doesn't return line-level data). | MAJOR |
| T-049-22 | Audit tab (preprod only) | Click "Audit" tab (only visible if REACT_APP_SHOW_AUDIT_TAB=true) | Shows loading spinner → then loads audit data via old FE aggregation (lazy fetch). May take 5-15s. | MAJOR |
| T-049-23 | Audit tab date change | On Audit tab, change date range → Apply | Audit data resets + re-fetches for new range | MINOR |
| T-049-24 | 3-month Item Ledger | Set 3-month range | Loads within ~5s. Item list renders. | MAJOR |

### Test Cases — Phase 3: Cancellations

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| T-049-25 | Cancellations loads | Insights → Cancellations → 7D range | Summary numbers render (total qty, order/item scope, total loss) | BLOCKER |
| T-049-26 | By-stage breakdown | Check stage section | Shows "Before Cooking", "After Cooking", etc. with counts | MAJOR |
| T-049-27 | By-reason breakdown | Check reason section | Shows top cancel reasons with counts | MAJOR |
| T-049-28 | By-employee breakdown | Check employee section | Shows employee names with cancel counts | MAJOR |
| T-049-29 | Daily cancel chart | Check daily section | Shows daily cancel trend | MINOR |
| T-049-30 | Cancel table - scope filter | Toggle "All" / "Order" / "Item" scope tabs | Table filters correctly by scope | MAJOR |
| T-049-31 | 3-month Cancellations | Set 3-month range | Loads within ~3s. Data renders. | MAJOR |

### Test Cases — Cache (CR-044 integration)

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| T-049-32 | Cache hit on navigate back | Dashboard (7D) → Sales → back to Dashboard | Dashboard loads instantly (no network call in DevTools Network tab) | BLOCKER |
| T-049-33 | Cache per-endpoint | Dashboard (7D) → Sales (same range) | Sales makes its own call (different endpoint), but Dashboard is cached | MAJOR |
| T-049-34 | Cache invalidation on date change | Dashboard (7D) → change to 30D → Apply | New API call fires (different cache key) | MAJOR |
| T-049-35 | Cache cleared on logout | Load any report → logout → login | Fresh API calls on next visit (no stale data) | BLOCKER |
| T-049-36 | Cross-restaurant safety | Login cafe103 → load Dashboard → logout → login palmhouse → Dashboard | Shows Palm House data, not Cafe103 | BLOCKER |

### Test Cases — Performance

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| T-049-37 | Network tab: data size | Open DevTools Network → load Dashboard 3-month range | Response size ~3-5 KB (was 37+ MB before) | MAJOR |
| T-049-38 | Network tab: call count | Open DevTools Network → load Dashboard | 1 API call to insights-dashboard (was 6-36 parallel calls before) | MAJOR |
| T-049-39 | Page does not freeze | Load any Insights page with 3-month range | No browser freeze/hang. Page remains responsive during load. | BLOCKER |

### Known Limitations (not bugs)
- PaymentsMockup: daily per-method bar breakdown shows total only (per-method daily split = CR-050)
- Cancellations audit section: simplified (line-level financial audit needs raw data = future scope)
- Item Ledger: per-bucket financial fields (discount, subtotal, tax) show 0 for non-audit tabs (backend doesn't return per-bucket financials yet)
- Numbers may differ slightly from old FE computation due to 6 known backend gaps (B-1, B-2, A-1, A-3, A-4, A-6 documented in CR-049 Impact Analysis)

---

## 3. BUG-096 — Delete-Food Socket Handler

### What Changed
Added handler for `type: "delete-food"` socket event on `food_update_${rid}` channel. When backend emits delete-food, the product is removed from MenuContext in realtime.

### Files Changed
| # | File | Change |
|---|------|--------|
| 1 | `api/socket/socketEvents.js` | +`DELETE_FOOD: 'delete-food'` constant |
| 2 | `api/socket/socketHandlers.js` | +`else if (type === DELETE_FOOD)` → `actions.removeProduct(food_id)` |
| 3 | `contexts/MenuContext.jsx` | +`removeProduct(productId)` action (filters from state) |
| 4 | `api/socket/useSocketEvents.js` | Wired `removeProduct` into actions ref |

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| T-096-01 | Delete food realtime | Open POS on tab A. On tab B (or Menu Mgmt), delete a menu item. | Tab A: item disappears from order menu without refresh | BLOCKER |
| T-096-02 | Delete non-existent food | Backend emits delete-food with unknown food_id | No crash, no visible change. Console logs info message. | MINOR |
| T-096-03 | Item in active cart | Delete a food item that's already in an active cart | Item stays in cart (cart references by ID). Menu list removes it. Cart can still be checked out. | MAJOR |
| T-096-04 | Update food still works | Edit a menu item (name/price change) | Item updates in realtime (existing BUG-116 handler still works) | BLOCKER |

**How to test:** Requires triggering a `delete-food` socket event. Options:
- Delete item via Menu Management on preprod → backend emits socket
- Check browser console for `[SocketHandler] food-update: product X removed from MenuContext (delete-food)` log

---

## 4. BUG-092 — Phone Format + CRM on Room Check-In

### What Changed
Room Check-In now normalizes phone to 10-digit and calls CRM `lookupCustomer`/`createCustomer` before submitting, matching the order screen pattern. Sends `customer_id` in FormData.

### Files Changed
| # | File | Change |
|---|------|--------|
| 1 | `components/modals/RoomCheckInModal.jsx` | +import lookupCustomer/createCustomer, +phone normalization, +CRM call in handleSubmit |
| 2 | `api/services/roomService.js` | +`customer_id` field in FormData |

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| T-092-01 | Phone normalization | Login welcomeresort → Rooms → Check-In → type +919876543210 | Network tab: `phone` field = `9876543210` (10 digits, no +91) | BLOCKER |
| T-092-02 | CRM customer created | Check-in with a NEW phone number not in CRM | Network tab shows call to `/pos/customer-lookup` then `/pos/customers` (create). `customer_id` field present in check-in payload. | MAJOR |
| T-092-03 | CRM customer found | Check-in with phone number of an existing CRM customer | Network tab shows call to `/pos/customer-lookup` → found. `customer_id` from lookup used. No create call. | MAJOR |
| T-092-04 | CRM failure graceful | Disconnect network briefly during check-in (or CRM is down) | Check-in still succeeds. Console warns `[RoomCheckIn] BUG-092: CRM lookup/create failed`. `customer_id` = null in payload. | MAJOR |
| T-092-05 | CRM suggestion select | Type name → select from CRM dropdown → phone auto-fills as 10-digit | Phone field shows 10-digit number (not E.164) | MINOR |
| T-092-06 | Check-in still works end-to-end | Full check-in flow: name, phone, room, dates, advance | Room checks in successfully. Toast shows success. | BLOCKER |

**Test on:** welcomeresort (has rooms) or palmhouse (has rooms)

---

## 5. CR-048 — Dashboard Auto-Sync Watcher

### What Changed
File watcher (chokidar) monitors `registry.json` and auto-regenerates `__dev/data/bug_tracker.json` + `cr_registry.json`. Env-gated: only runs when `ENABLE_DASHBOARD_SYNC=true`.

### Files Changed
| # | File | Change |
|---|------|--------|
| 1 | `scripts/gen_dashboard_sync.js` (NEW) | Generator: registry.json → bug_tracker.json + cr_registry.json |
| 2 | `scripts/watch_registry.js` (NEW) | Chokidar watcher with 500ms debounce |
| 3 | `frontend/.env` | +`ENABLE_DASHBOARD_SYNC=true` |

### Test Cases

| # | Test | Steps | Expected | Severity |
|---|------|-------|----------|----------|
| T-048-01 | Generator produces valid JSON | `node /app/scripts/gen_dashboard_sync.js` | Outputs "Regenerated: X bugs, Y CRs". bug_tracker.json + cr_registry.json updated. | BLOCKER |
| T-048-02 | Bug counts match registry | `python3 -c "import json; r=json.load(open('/app/memory/control/registry.json')); bt=json.load(open('/app/frontend/public/__dev/data/bug_tracker.json')); print('Registry bugs:', len([i for i in r['items'] if i['id'].startswith('BUG') or i['id'].startswith('PROD')])); print('Generated bugs:', bt['summary']['total_tracked'])"` | Counts match | MAJOR |
| T-048-03 | Watcher auto-regenerates | Start watcher → edit registry.json (change any status) → wait 2s | bug_tracker.json timestamp updates. Console logs "Registry changed — regenerating..." | BLOCKER |
| T-048-04 | Env gate works | `ENABLE_DASHBOARD_SYNC=false node /app/scripts/watch_registry.js` | Prints "watcher disabled. Exiting." and exits immediately | MAJOR |
| T-048-05 | Dashboard loads generated data | Open `/__dev/` dashboard in browser | Bug Tracker tab and CR Registry tab render with data from generated JSONs | MAJOR |
| T-048-06 | Existing files untouched | After generator runs, verify `config.json`, `workflow_queue.json`, `closure_debt.json`, `access.json` | These files are NOT modified by the generator | MAJOR |

---

## 6. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R-01 | Order Ledger page still works | Not migrated — still uses `order-logs-report` directly |
| R-02 | Settlement Report still works | Uses own API — not part of CR-049 |
| R-03 | Audit Report (AllOrdersReportPage) still works | Uses `order-logs-report` directly — not part of CR-049 |
| R-04 | Room Orders Report still works | Uses `order-logs-report` directly — not part of CR-049 |
| R-05 | Login → Dashboard → POS order flow | Core POS flow unaffected by Insights changes |
| R-06 | Sidebar navigation to all Insights pages | All routes still work |
| R-07 | Export (Excel/PDF) on Sales page | Export still functional with new data source |
| R-08 | Food update socket (edit item) still works | BUG-096 added delete handler — verify existing update handler untouched |
| R-09 | Room check-in without phone | BUG-092 added CRM — verify check-in works when phone is empty |

---

## 7. Registry Sync Confirmation
  Registry synced: YES
  Items: CR-049, BUG-096, BUG-092, CR-048
  Sprint: pos_5_0
  EXIT GATE: ALL 5 PASSED
