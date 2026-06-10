# CR-015 — Impact Analysis (Gate 2)

**Status:** COMPLETE
**Date:** 2026-06-08

---

## 1. API Response Shapes (Live Verified — cafe103 rid=644)

### GET Settlement Report (`POST /waiter/get-settlement-report`)

**Request:** `{ "date_from": "MM-DD-YYYY", "date_to": "MM-DD-YYYY" }`

**Response structure:**
```
{
  success: true,
  totals: { 15 fields + stattlement_status },
  data: [{
    date: "YYYY-MM-DD",
    totals: { 14 fields },
    waiters: [{ 20 fields + tips_by_mode }]
  }]
}
```

**Totals (15 fields):**
| Field | Type | UI Label |
|-------|------|----------|
| total_opening_balance | number | Opening Balance |
| total_today_collection | number | Cash Collected |
| total_today_settlement | number | Settled |
| total_balance_to_settle | number | Remaining |
| total_pilferage | number | Pilferage |
| total_sale | number | Total Sale |
| total_paid | number | Total Paid |
| total_unpaid | number | Unpaid |
| total_today_delivery_charge | number | Delivery Charges |
| total_today_service_charge | number | Service Charges |
| total_today_tips | number | Tips |
| total_total_funds | number | Total Funds |
| total_today_given | number | Cash Given |
| last_day_pending | number | Previous Day Carry |
| stattlement_status | int | Day Status (1=open) |

**Waiter (20 fields):**
| Field | Type | Notes |
|-------|------|-------|
| waiter_id | int | PK |
| full_name | string | |
| restaurant_id | string | |
| date | string | YYYY-MM-DD |
| opening_balance | string | decimal as string |
| last_day_pending | string | yesterday carry |
| today_given | string | cash float given |
| today_collection | string | cash collected |
| today_delivery_charge | string | |
| today_tips | string | |
| today_service_charge | string | |
| total_sale | string | all payment modes |
| total_paid | string | cash paid |
| total_unpaid | string | |
| total_funds | string | opening + collection |
| cash_draw | string | actual drawer amount |
| today_settlement | string | already settled |
| pilferage | string | auto-calculated |
| balance_to_settle | string | remaining |
| tips_by_mode | object | {cash, TAB, card, upi, ROOM, Other} |

**Data stats:** cafe103 has 21 waiters, 13 appear in settlement report.

### GET Waiter List — `{ data: [{ id, name }] }` — 21 waiters
### Opening Balance — `{ openings: [{ waiter_id, date, last_day_pending, today_given }] }`
### Settlement — `{ date, waiter_id, amount, settlement_type: "partial"|"full", pilferage }`
### Self-Settlement — `{ date }`

---

## 2. Files to Create (4 new)

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/pages/SettlementPage.jsx` | Main page (from mockup, wired to real APIs) | ~500 |
| `src/api/services/settlementService.js` | 5 API functions | ~50 |
| `src/api/transforms/settlementTransform.js` | fromAPI (report + waiter list) + toAPI (opening, settle) | ~80 |
| `src/pages/SettlementMockup.jsx` | **DELETE** after production page built | — |

## 3. Files to Modify (2 existing)

| File | Change | Risk |
|------|--------|------|
| `App.js` | Add `/settlement` route (protected) + remove `/settlement/preview` | LOW |
| `Sidebar.jsx` | Add settlement sidebar entry | LOW |

## 4. Files NOT Touched

All order-taking, menu management, report, and dashboard files — zero touch.

---

## 5. Regression Risk

| Area | Risk |
|------|------|
| Dashboard / Order-taking | **ZERO** — new page, no shared state |
| Menu Management | **ZERO** — independent |
| Reports (Audit, Insights) | **ZERO** — independent |
| Sidebar | **LOW** — adding one entry |
| App.js routes | **LOW** — adding one route |
