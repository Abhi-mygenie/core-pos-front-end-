# CR-015 — Implementation Plan (Gate 3)

**Status:** COMPLETE
**Date:** 2026-06-08
**Prerequisite:** Mockup approved by owner at `/settlement/preview`

---

## 1. Scope Lock

### Files to CREATE (3 new)

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/pages/SettlementPage.jsx` | Production page — refactored from SettlementMockup.jsx with real API wiring | ~520 |
| `src/api/services/settlementService.js` | 5 API service functions | ~55 |
| `src/api/transforms/settlementTransform.js` | Response transforms (report, waiter list) + request builders (opening, settle) | ~90 |

### Files to MODIFY (2 existing)

| File | Change | Lines |
|------|--------|-------|
| `App.js` | Add `/settlement` route (ProtectedRoute), remove `/settlement/preview` route | ~3 lines |
| `Sidebar.jsx` | Add settlement entry to `sidebarMenuItems` array | ~5 lines |

### Files to DELETE (1)

| File | Reason |
|------|--------|
| `src/pages/SettlementMockup.jsx` | Replaced by production SettlementPage.jsx |

### Files NOT Touched

| File | Reason |
|------|--------|
| All order-taking files | Zero touch |
| All menu management files | Zero touch |
| All report/insights files | Zero touch |
| All context files | Zero touch — settlement has no shared state |

---

## 2. Service Layer — `settlementService.js`

```js
// 5 API functions — all under /api/v1/vendoremployee/waiter/

getSettlementReport(dateFrom, dateTo)
  → POST /waiter/get-settlement-report
  → body: { date_from: "MM-DD-YYYY", date_to: "MM-DD-YYYY" }

getWaiterList()
  → GET /waiter/get-waiter-list

setOpeningBalance(openings)
  → POST /waiter/opening-balance
  → body: { openings: [{ waiter_id, date, last_day_pending, today_given }] }

settleWaiter(date, waiterId, amount, type, pilferage)
  → POST /waiter/settlement
  → body: { date, waiter_id, amount, settlement_type, pilferage }

selfSettle(date)
  → POST /waiter/self-settlement
  → body: { date }
```

---

## 3. Transform Layer — `settlementTransform.js`

### fromAPI

```
settlementReport(response)
  → { totals: { openingBalance, cashCollected, settled, remaining, pilferage, ... },
      waiters: [{ waiterId, name, openingBalance, cashCollected, totalFunds,
                  settled, expected, pilferage, balanceToSettle, tipsByMode, ... }],
      settlementStatus }

waiterList(response)
  → [{ id, name }]
```

### toAPI

```
openingBalancePayload(entries)
  → { openings: [{ waiter_id, date, last_day_pending, today_given }] }

settlementPayload(date, waiterId, amount, type, pilferage)
  → { date, waiter_id, amount, settlement_type, pilferage }

selfSettlementPayload(date)
  → { date }
```

### Helpers

```
formatDateForAPI(date) → "MM-DD-YYYY"
formatDateISO(date) → "YYYY-MM-DD"
```

---

## 4. Page Component — `SettlementPage.jsx`

### Props: None (standalone page — gets data from API)

### State
```
date: Date              — selected date (default: today)
report: Object          — { totals, waiters, settlementStatus } from API
waiterList: Array       — full waiter list for transfer dropdown
loading: boolean
expandedRow: number|null
settleModal: Object|null
openingModal: boolean
transferModal: Object|null
actualBalances: Object  — { waiterId: number } for actual balance inputs
saving: boolean         — during settle/opening save
```

### Data Flow
```
Page mounts → fetchReport(today) + fetchWaiterList()
  → report state populated
  → table renders from report.waiters
  
Date change → fetchReport(newDate)
  
Set Opening Balance → modal → submit → setOpeningBalance API → refresh report

Settle waiter → modal → submit → settleWaiter API → refresh report

Self-Settle → selfSettle API → refresh report

Transfer → modal (disabled) → shows backend-blocked banner

Close Day → confirm dialog → (API TBD or stattlement_status based)
```

### Layout (matches mockup)
```
<div flex h-screen>
  <Sidebar />
  <main flex-1 flex-col overflow-hidden>
    <header>  Title | Date Picker | Refresh | Close Day  </header>
    <div overflow-auto>
      KPI Strip (5 cards)
      Action Buttons (Opening Balance | Self-Settle)
      Waiter Table (9 columns, table-fixed, colgroup)
        - Expandable rows (Revenue, Tips, Cash Drawer)
        - Inactive waiters collapsed
        - TOTAL row
    </div>
  </main>
  Modals: Settle | Opening Balance | Transfer (disabled)
</div>
```

---

## 5. Sidebar Entry

Add to `sidebarMenuItems` in `Sidebar.jsx`:

```js
{
  id: "settlement",
  label: "Settlement",
  icon: Wallet,   // already imported
  path: "/settlement",
},
```

Position: after "Credit Management", before "Employees" (or per owner preference).

---

## 6. Route in App.js

```jsx
import SettlementPage from "./pages/SettlementPage";

<Route path="/settlement" element={<ProtectedRoute><SettlementPage /></ProtectedRoute>} />
```

Remove: `<Route path="/settlement/preview" element={<SettlementMockup />} />`

---

## 7. Key UX Details (from approved mockup)

| Element | Behavior |
|---------|----------|
| Date Picker | Single day, defaults to today. Triggers report re-fetch on change. |
| KPI Cards | 5 cards: Opening Balance, Cash Collected, Settled, Remaining, Pilferage |
| Waiter Table | `table-fixed` with colgroup percentages. 9 columns. |
| Row expand | Click row → toggle detail panel (Revenue, Tips by Mode, Cash Drawer) |
| Actual Balance | Input field per waiter (only when balance_to_settle > 0). Amber border. |
| Pilferage | Auto-calculated: Expected − Actual. Red if positive, green if negative. |
| Settle button | Opens modal. Amount pre-filled with balance_to_settle. Full/Partial toggle. |
| Transfer button | Opens modal with disabled fields + yellow backend-blocked banner. |
| Opening Balance | Modal lists all waiters. Shows yesterday carry. Input for cash given today. |
| Self-Settle | Calls self-settlement API for logged-in user. |
| Close Day | Green button. Confirmation dialog. Locks settlement for the day. |
| Inactive waiters | Collapsed row: "N inactive waiters (Name1, Name2, ...)" |
| TOTAL row | Sticky-ish bottom row with column-aligned totals. |

---

## 8. Date Format Handling

Backend expects `MM-DD-YYYY` for the report API but returns `YYYY-MM-DD` in responses. Transform layer handles both conversions.

---

## 9. Pilferage Calculation

```
Expected Balance = total_funds - today_settlement
Pilferage = Expected Balance - Actual Balance (user input)
```

When user enters Actual Balance, pilferage auto-updates in the row. On Settle, pilferage is sent in the API payload.

---

## 10. Implementation Sequence

| Step | Action | Verify |
|------|--------|--------|
| 1 | Create `settlementService.js` (5 API functions) | Curl-verify each endpoint |
| 2 | Create `settlementTransform.js` (fromAPI + toAPI) | Unit: output shapes match |
| 3 | Create `SettlementPage.jsx` (from mockup + real API wiring) | Compiles clean |
| 4 | Add sidebar entry in `Sidebar.jsx` | Entry visible |
| 5 | Add route in `App.js`, remove preview route | Navigation works |
| 6 | Delete `SettlementMockup.jsx` | Compiles clean |
| 7 | Test: load settlement page, verify data from API | Browser |
| 8 | Test: set opening balance for a waiter | API call succeeds |
| 9 | Test: settle a waiter (partial + full) | API call succeeds |
| 10 | Test: self-settle | API call succeeds |
| 11 | Test: date change refreshes data | Browser |
| 12 | Test: expanded row shows correct detail data | Browser |
| 13 | Test: transfer modal shows backend-blocked state | Browser |
| 14 | Run testing agent | Full QA |

---

## 11. Edge Cases

| Case | Handling |
|------|----------|
| No data for selected date | Show "No settlement data for this date" empty state |
| All waiters inactive (no collection) | Table shows only inactive row + TOTAL with zeros |
| Settle amount > balance | Validation: amount ≤ balance_to_settle |
| Negative balance_to_settle | Show in red, Settle button still available (settle to zero) |
| Self-settle when logged-in user not in waiter list | Toast error: "You are not registered as a waiter" |
| Date in future | Disable or show today-only (date picker constraint) |
| Close Day already done (stattlement_status check) | Disable Close Day button, show "Day Closed" badge in header |
| Opening balance already set | Show current values in modal, allow update |

---

## 12. Time Estimate

| Step | Estimate |
|------|----------|
| Service + Transform (Steps 1-2) | 15 min |
| SettlementPage from mockup + wiring (Step 3) | 40 min |
| Sidebar + Route (Steps 4-6) | 5 min |
| Testing + fixes (Steps 7-14) | 25 min |
| **Total** | **~85 min** |

---

## 13. Backend Escalation (flagged)

| Item | Status | Endpoint |
|------|--------|----------|
| Waiter-to-waiter cash transfer | ❌ **404 — NOT AVAILABLE** | `POST /waiter/cash-transfer` |
| Close Day action | ⚠️ TBD — may use `stattlement_status` or separate endpoint | Unknown |

UI provisions built for both. Will wire when backend ships.

---

*End of Implementation Plan — Gate 3 Complete. Stop here. Awaiting owner GO for Gate 4+5.*
