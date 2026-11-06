# Impact Analysis — P0 Batch (BUG-583, CR-483, CR-484, CR-489, CR-490)

**Gate:** 2 — Impact Analysis
**Role:** PLANNING (stage = impact_analysis)
**Date:** 2026-11-06
**Source:** Investigation report `P0_UNBLOCK_INVESTIGATION_REPORT_2026_11_06.md` + 3 backend handovers

---

# BUG-583 — Bill printed → green border on OrderCard + TableCard

## Code Reality: PARTIAL
- `orderTransform.js:310` already maps `billPrinted: api.print_bill_status === 'Yes'`
- `getStatusColor()` in `colors.js:51` drives border color on both cards — does NOT check `billPrinted`
- Neither `OrderCard.jsx` nor `TableCard.jsx` reference `billPrinted` for visual rendering

## Conflict Pre-Check
- **OrderCard.jsx** (R5 hotspot): last modified by CR-482 (P10), CR-433 (border colors), BUG-573 (variant parser). Our change is on the outer border `style` at L456 — **parallel-safe** (different property, same line → needs care).
- **TableCard.jsx**: last modified by CR-433 (border color at L282). Same pattern — **parallel-safe**.
- **orderTransform.js** (R5): last modified by CR-482 (L310 area is untouched by CR-482). **No conflict.**
- **colors.js**: last modified by CR-433. **No conflict** (additive function).

## Data Flow Trace
```
API: employee-orders-list → orders[i].bill_print ("Yes"/"No")
  ↓
Transform: orderTransform.js:310 → billPrinted: api.print_bill_status === 'Yes'
  ↓ ← BREAK POINT: reads `print_bill_status` but backend now ships `bill_print`
State: order.billPrinted (always false because wrong field name)
  ↓
Component: OrderCard.jsx:456 / TableCard.jsx:282 — border uses getStatusColor(fOrderStatus)
  ↓ ← BREAK POINT: getStatusColor has no billPrinted override path
UI: border color = status-only, never green-for-printed
```

## Risk Classification: LOW-MEDIUM
- Border color override only — no financial, payment, or order logic
- Touches R5 hotspot (OrderCard.jsx) → cannot Fast Lane

## Affected Files + Lines

| # | File | Line(s) | Change Description |
|---|------|---------|-------------------|
| E-1 | `orderTransform.js` | L310 | Read `api.bill_print` instead of (or in addition to) `api.print_bill_status` |
| E-2 | `OrderCard.jsx` | L456 | Border style: if `billPrinted` → solid green `#329937`, else existing `getStatusColor()` |
| E-3 | `TableCard.jsx` | L282 | Border style: if `table.billPrinted` → solid green `#329937`, else existing `getStatusColor()` |

## Downstream Consumers
- `billPrinted` is already in the order model — no new state needed
- Socket `update-order` event carries `bill_print` → existing listener will pick up changes after E-1
- No report, print, or payment logic reads `billPrinted`

## Owner Decisions
- All ODs closed per intake. No new decisions needed.
- OD-583-02 (backend field) → **RESOLVED**: use `bill_print` (handover confirmed)

## Verification Matrix

| # | Check | Method | Automated? |
|---|-------|--------|:---:|
| V-1 | `billPrinted` maps from `bill_print` | Unit test: mock order with `bill_print: "Yes"` | YES |
| V-2 | OrderCard border green when `billPrinted=true` | Browser: find printed order, inspect border | NO |
| V-3 | TableCard border green when `billPrinted=true` | Browser: same order in table view | NO |
| V-4 | Non-printed order → existing status color | Browser: unpaid order, verify yellow/orange | NO |
| V-5 | Compile clean | `webpack` | YES |

---

# CR-483 — Received Amount field on all payment methods

## Code Reality: NONE (for received_amount / reconcile_amount)
- `CollectPaymentPanel.jsx`: Cash has "Cash Received" box (L3158-3176) — but this is for change calculation, NOT the new Received Amount concept
- `orderTransform.js`: no `received_amount` mapping exists
- `restaurantSettingsTransform.js`: no `reconcile_amount` mapping exists
- `profileTransform.js`: no `reconcileAmount` mapping exists
- Report pages: no `received_amount` column exists

## Conflict Pre-Check
- **CollectPaymentPanel.jsx** (R5 hotspot): many active items (BUG-209, BUG-298, CR-483 is new). **Must serialize** with any other CPP changes.
- **orderTransform.js** (R5 hotspot): heavily trafficked. E-edits are additive payload keys. **Parallel-safe** with BUG-583 (different area).
- **restaurantSettingsTransform.js**: last modified by BUG-289. **No conflict** (additive).
- **profileTransform.js**: last modified by CR-482 (L373 area). **No conflict** (additive, different section).
- **Report pages**: OrderReportBetaPage.jsx, OrderSummaryPage.jsx. **No conflict** (additive columns).

## Data Flow Trace — Write Path (Collect Bill)
```
UI: CollectPaymentPanel → user enters Received Amount
  ↓
Handler: handlePayment() → paymentData.receivedAmount = <value>
  ↓
Transform: orderTransform.collectBillExisting → adds `received_amount` to payload
  ↓
API: POST /api/v2/vendoremployee/order/order-bill-payment → { received_amount: N }
  ↓
Backend: saves to orders.received_amount (2 decimal)
```

## Data Flow Trace — Write Path (Prepaid)
```
UI: CollectPaymentPanel (prepaid) → user enters Received Amount
  ↓
Transform: orderTransform.placeOrder → adds `received_amount` to data
  ↓
API: POST /api/v2/vendoremployee/order/place-order → { received_amount: N }
```

## Data Flow Trace — Read Path (Reports)
```
API: daily-order-report-details-combined → daily_reports[d].report[i].received_amount
  ↓
Transform: no mapping yet → needs receivedAmount field
  ↓
UI: OrderReportBetaPage columns → new "Received Amount" column
```

## Data Flow Trace — Settings
```
API: GET settings-list → data.basic.reconcile_amount ("Yes"/"No")
  ↓
Transform: restaurantSettingsTransform → reconcileAmount: toBool(basic.reconcile_amount)
  ↓
State: restaurantSettings.reconcileAmount
  ↓
UI: CollectPaymentPanel → if reconcileAmount → show Received Amount input
```

## Risk Classification: CRITICAL
- Financial field, payment payload, report totals
- Touches R5 hotspots (CPP + orderTransform)

## Affected Files + Lines

| # | File | Change Description |
|---|------|-------------------|
| E-1 | `restaurantSettingsTransform.js` | Map `reconcile_amount` → `reconcileAmount` (read) + reverse (write) |
| E-2 | `profileTransform.js` | Map `reconcile_amount` from login profile to `restaurant.settings.reconcileAmount` |
| E-3 | `CollectPaymentPanel.jsx` | Add Received Amount input for ALL payment methods (when `reconcileAmount=true`). Default = grand total. Validate ± limit. |
| E-4 | `orderTransform.js` — `collectBillExisting` | Add `received_amount` key to payment payload (from paymentData) |
| E-5 | `orderTransform.js` — `placeOrder` (prepaid) | Add `received_amount` key to placement payload |
| E-6 | `orderTransform.js` — `fromAPI.order` | Map `api.received_amount` → `order.receivedAmount` + `api.reconcile_amount` → `order.reconcileAmount` |
| E-7 | `OrderReportBetaPage.jsx` | Add "Received Amount" + "Reconciliation Amt" columns; compute diff = received − bill |
| E-8 | Report Excel/PDF export | Include new columns in download |
| E-9 | `RestaurantSettingsPage.jsx` | Add Reconcile Amount toggle in settings UI |

## Downstream Consumers
- `received_amount` does NOT replace `order_amount`, `payment_amount`, or `grant_amount`
- No revenue summaries, grand totals, CRM payloads, exports, print templates or socket fields change
- Fallback rule: `const receivedAmount = api.received_amount ?? api.order_amount;` (preserve real zero)
- ± limit (owner: default 3% per restaurant) — FE enforces; backend accepts any value

## Owner Decisions
- All ODs closed (rounds 1-5). No new decisions needed.
- **One clarification at Gate 3:** The ± 3% limit is not a backend setting — FE must either hardcode default 3% or add a new restaurant setting field. Recommend: FE-enforced default 3%, configurable in Settings page.

## Verification Matrix

| # | Check | Method | Automated? |
|---|-------|--------|:---:|
| V-1 | Settings: reconcileAmount toggle works | Browser: Settings page | NO |
| V-2 | CPP: Received Amount input visible on Cash when enabled | Browser: collect payment | NO |
| V-3 | CPP: Received Amount input visible on UPI/Card | Browser: switch method | NO |
| V-4 | CPP: Received Amount defaults to grand total | Browser: open CPP | NO |
| V-5 | CPP: Received Amount absent when setting=No | Browser: disable toggle | NO |
| V-6 | Payload: `received_amount` sent in collect-bill | Network tab | NO |
| V-7 | Payload: `received_amount` sent in prepaid place-order | Network tab | NO |
| V-8 | Report: Received Amount column shows in Orders (Beta) | Browser: reports | NO |
| V-9 | Report: Reconciliation Amount (diff) computed | Browser: check column | NO |
| V-10 | ± limit: alert when exceeding 3% | Browser: enter extreme value | NO |
| V-11 | Compile clean | `webpack` | YES |

---

# CR-484 — Card payments — bank charges (MDR)

## Code Reality: NONE
## Status: SUBSUMED into CR-483 (owner 2026-11-05, OD-483-09 LOCKED)

CR-484 is fully covered by CR-483's "Received Amount on ALL payment methods" — including Card. The Received Amount field allows cashier to enter the actual received amount (bill + MDR or bill − shortpay). No separate implementation needed.

**No independent Impact Analysis required.** CR-484 implementation = CR-483 implementation. Track via CR-483.

---

# CR-489 — Configurable lock — order edit only by permitted employee after bill print

## Code Reality: PARTIAL
- `OrderEntry.jsx:352-360` has 8 existing permission flags (`order_cancel`, `food`, `transfer_table`, etc.)
- `hasPermission()` reads from `AuthContext.permissions[]` array (stored in sessionStorage)
- `profileTransform.js:80` maps `permissions: api.role || []` — this is the permissions array from login
- BUG-470 `edit_order` gate exists but is separate from this CR
- No `order_edit_access` mapping exists anywhere in FE

## Conflict Pre-Check
- **OrderEntry.jsx** (R5 hotspot): last modified by CR-482 (P1-P10). Our change adds a new gating layer around L352 area. **Parallel-safe** (additive check, no line overlap with CR-482 edits).
- **OrderCard.jsx** (R5): may need edit-button gating. **Parallel-safe** with BUG-583 (different concern).
- **profileTransform.js**: CR-482 touched L373 (keyboard setting). Our edit is at L80 area or new section. **No conflict.**
- **restaurantSettingsTransform.js**: same as CR-483 — additive. **No conflict.**
- **Sidebar.jsx / Settings page**: additive toggle. **No conflict.**

## Data Flow Trace — Permission Path
```
API: GET all-role-list → role_modules.frontend[].role_pass_value = "order_edit_access"
  ↓
Role Assignment: POST role-update → modules: [..., "order_edit_access"]
  ↓
Login: GET login → role array includes "order_edit_access" (if assigned)
  ↓
Transform: profileTransform.js:80 → permissions: api.role (array of strings)
  ↓
State: AuthContext.permissions[] → includes "order_edit_access"
  ↓
Hook: hasPermission('order_edit_access') → true/false
```

## Data Flow Trace — Setting Path
```
API: GET settings-list → data.basic.order_edit_access ("Yes"/"No")
  ↓
Transform: restaurantSettingsTransform → orderEditAccess: toBool(basic.order_edit_access)
  ↓
State: restaurantSettings.orderEditAccess
```

## Data Flow Trace — Print Detection Path (from BUG-583)
```
API: employee-orders-list → orders[i].bill_print ("Yes"/"No")
  ↓
Transform: orderTransform.js:310 → billPrinted (after BUG-583 fix)
  ↓
State: order.billPrinted
```

## Combined Gate Logic
```javascript
// CR-489: Order edit lock after bill print
const isEditLocked = restaurantSettings.orderEditAccess  // setting ON
                  && order.billPrinted                    // bill was printed
                  && !hasPermission('order_edit_access'); // user lacks right

// If isEditLocked:
//   - Block: add/remove/cancel item, qty, price, notes, discount, shift, merge,
//            food transfer, customer change, reprint KOT, cancel order
//   - Allow: Collect Payment (excl. discount/coupon inside CPP), Reprint Bill
```

## Risk Classification: CRITICAL
- Permissions, order editing, financial implications
- Touches R5 hotspots (OrderEntry, OrderCard)

## Affected Files + Lines

| # | File | Change Description |
|---|------|-------------------|
| E-1 | `restaurantSettingsTransform.js` | Map `order_edit_access` → `orderEditAccess` (read + write) |
| E-2 | `profileTransform.js` | Ensure `order_edit_access` is in permissions array from login (already works via `api.role` passthrough — **verify at Gate 3**) |
| E-3 | `OrderEntry.jsx` | New `isEditLocked` const combining setting + billPrinted + permission. Gate all order-mutation actions behind `!isEditLocked`. |
| E-4 | `OrderCard.jsx` | Gate edit/cancel/shift/merge action buttons: disable or hide when `isEditLocked` |
| E-5 | `TableCard.jsx` | Gate order-entry click when `isEditLocked` (or show message) |
| E-6 | `CollectPaymentPanel.jsx` | When `isEditLocked`: disable discount/coupon sections inside CPP. Allow payment itself. |
| E-7 | `RestaurantSettingsPage.jsx` | Add Order Edit Access toggle |
| E-8 | Employee Management UI | Show `order_edit_access` in role permission matrix |

**DEPENDENCY:** BUG-583 E-1 must land first (fixes `billPrinted` mapping).

## Downstream Consumers
- No API payload changes — this is pure FE gating
- Backend has no authorization check — FE is the enforcement layer (per handover)
- Existing `edit_order` (BUG-470) is SEPARATE — do not merge or conflict

## Owner Decisions
- All ODs closed (rounds 1-3). No new decisions needed.
- OD-489-03 CLOSED: key = `order_edit_access`
- OD-489-05 CLOSED: use `bill_print` (not `print_bill_status`)

## Verification Matrix

| # | Check | Method | Automated? |
|---|-------|--------|:---:|
| V-1 | Setting toggle saves/reads `order_edit_access` | Browser: Settings | NO |
| V-2 | Permission visible in role matrix | Browser: Employee Mgmt | NO |
| V-3 | Printed order + setting ON + user WITHOUT permission → edit locked | Browser: login as restricted user | NO |
| V-4 | Locked state: add item blocked | Browser: try to add | NO |
| V-5 | Locked state: Collect Payment allowed | Browser: tap Collect Payment | NO |
| V-6 | Locked state: discount inside CPP blocked | Browser: try discount | NO |
| V-7 | Locked state: Reprint Bill allowed | Browser: tap reprint | NO |
| V-8 | Printed order + user WITH permission → full edit | Browser: login as manager | NO |
| V-9 | Unprinted order → no lock (any user) | Browser: new order | NO |
| V-10 | Setting OFF → no lock (any user, any order) | Browser: disable toggle | NO |
| V-11 | Compile clean | `webpack` | YES |

---

# CR-490 — Report permission split — Daily Report only access

## Code Reality: NONE (for granular report permissions)
- `Sidebar.jsx:41-50`: `SIDEBAR_PERMISSIONS` maps both `reports` and `insights` to single `'report'` permission → all-or-nothing
- `Sidebar.jsx:358-368`: `visibleMenuItems.filter()` checks `hasPermission(perm)` — no per-item granularity
- `profileTransform.js:80`: permissions = `api.role` (string array) — will include `show_daily_report` automatically if role has it
- `App.js` routes: `<ProtectedRoute>` wraps all report pages — no per-report guard

## Conflict Pre-Check
- **Sidebar.jsx**: last modified by CR-415 (removed Coming Soon items) + BUG-555 (tablet). Our change is in `SIDEBAR_PERMISSIONS` and filter logic. **Parallel-safe** (additive).
- **App.js**: last modified by CR-385 (PMS routes). Our change adds route guards. **Parallel-safe**.
- **profileTransform.js**: same as CR-489. **No conflict.**

## Data Flow Trace
```
API: GET all-role-list → role_modules.frontend[] includes { role_pass_value: "show_daily_report" }
  ↓
Role Assignment: modules: [..., "show_daily_report"] (without "report")
  ↓
Login: permissions array includes "show_daily_report" but NOT "report"
  ↓
AuthContext: hasPermission('show_daily_report') = true, hasPermission('report') = false
  ↓
Sidebar filter: SIDEBAR_PERMISSIONS.reports = 'report' → false → hides entire Reports section
  ↓ ← BREAK POINT: user with only show_daily_report sees NO reports at all
```

## Proposed Solution
Add `show_daily_report` as an alternative permission for the `reports` sidebar section:
```javascript
// SIDEBAR_PERMISSIONS change:
reports: ['report', 'show_daily_report'],  // either grants access

// Filter change:
const perm = SIDEBAR_PERMISSIONS[item.id];
if (Array.isArray(perm)) return perm.some(p => hasPermission(p));
return hasPermission(perm);
```

Then, inside the `reports` section children, filter which children are visible:
- User with `report` → all children visible (existing behavior)
- User with only `show_daily_report` → only "Sales Summary" (Daily Report screen) visible

Route guard: add per-report permission check on `/reports/*` routes in App.js.

## Risk Classification: HIGH
- Permissions, route access
- Not financial but security-sensitive

## Affected Files + Lines

| # | File | Change Description |
|---|------|-------------------|
| E-1 | `Sidebar.jsx` L41-50 | Update `SIDEBAR_PERMISSIONS.reports` to accept `show_daily_report` as alternative |
| E-2 | `Sidebar.jsx` L358-368 | Update filter logic to support array-of-permissions (any match) |
| E-3 | `Sidebar.jsx` children filter | When user has only `show_daily_report`: filter `reports` children to Daily Report items only |
| E-4 | `App.js` route guards | Add per-report permission check on report routes (redirect non-authorized to dashboard) |
| E-5 | Employee Management UI | Show `show_daily_report` in role permission matrix |

## Downstream Consumers
- No API changes — pure FE visibility gating
- Backend has no report authorization check (per handover)
- Existing `report` permission unchanged — full access for users who have it

## Owner Decisions
- All ODs closed. No new decisions needed.
- OD-490-01 CLOSED: one key `show_daily_report`
- OD-490-02 CLOSED: Daily Report screen only (all tabs). Day Closure out of scope.
- OD-490-03 CLOSED: route guard blocks direct URL access
- OD-490-04 CLOSED: key = `show_daily_report`

## Verification Matrix

| # | Check | Method | Automated? |
|---|-------|--------|:---:|
| V-1 | Permission visible in role matrix | Browser: Employee Mgmt | NO |
| V-2 | User with `show_daily_report` only → sees Daily Report in sidebar | Browser: login | NO |
| V-3 | User with `show_daily_report` only → Insights hidden | Browser: check sidebar | NO |
| V-4 | User with `show_daily_report` only → other report routes blocked via URL | Browser: type URL | NO |
| V-5 | User with `report` → full access unchanged | Browser: login as manager | NO |
| V-6 | User with both → full access | Browser: login | NO |
| V-7 | User with neither → no reports at all | Browser: login as cashier | NO |
| V-8 | Daily Report tabs all visible | Browser: open Daily Report | NO |
| V-9 | Excel/PDF export works from Daily Report | Browser: download | NO |
| V-10 | Compile clean | `webpack` | YES |

---

# Execution Order + Dependencies

```
1. BUG-583 (no deps — simplest, unblocks CR-489)
2. CR-489  (depends on BUG-583 E-1 for billPrinted fix)
3. CR-483  (independent — can parallel with CR-489 if different developer)
4. CR-484  (= CR-483, no separate work)
5. CR-490  (independent — can parallel with all above)
```

---

# Summary

| Item | Code Reality | Risk | Files | Estimated Edits |
|------|-------------|------|-------|----------------|
| BUG-583 | PARTIAL | LOW-MEDIUM | 3 (orderTransform, OrderCard R5, TableCard) | 3 |
| CR-483 | NONE | CRITICAL | 6+ (CPP R5, orderTransform R5, settings, profile, reports) | 9 |
| CR-484 | N/A | N/A | 0 (subsumed) | 0 |
| CR-489 | PARTIAL | CRITICAL | 7+ (OrderEntry R5, OrderCard R5, TableCard, CPP R5, settings, profile, employee UI) | 8 |
| CR-490 | NONE | HIGH | 4 (Sidebar, App.js, profile, employee UI) | 5 |

**Total: 4 items requiring implementation, ~25 edits across ~12 unique files.**

All owner decisions are closed. No new backend asks. Awaiting owner review → Gate 3 (Implementation Plan).
