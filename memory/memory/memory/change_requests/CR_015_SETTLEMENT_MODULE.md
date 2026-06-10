# CR-015 — Settlement Module (Day-Closing / Cash Settlement)

**Status:** REGISTERED
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Related:** BUG-105 (Settlement module — OWNER SCOPE NEEDED, now scoped via this CR)

---

## 1. Problem Statement (Owner Verbatim)

> Build a settlement module. Basically, it's a day-closing module where the opening balance can be given, closing balance can be given — I mean calculated. We can settle the cash which has come.

---

## 2. Summary

A **day-closing settlement module** for cashiers/waiters to:
- Record **opening balance** (cash float given at start of day)
- View **closing balance** (carried from previous day)
- See **cash collected** during the day
- Calculate **current balance to settle**
- Perform **settlement** (partial or full) per waiter
- Perform **self-settlement** (logged-in user settles their own cash)
- Track **pilferage** (discrepancy between expected and actual cash)

---

## 3. Backend APIs (Confirmed on Preprod)

### 3.1 Get Settlement Report
```bash
curl --location 'https://preprod.mygenie.online/api/v1/vendoremployee/waiter/get-settlement-report' \
--header 'Content-Type: application/json; charset=UTF-8' \
--header 'X-localization: en' \
--header 'Authorization: Bearer <token>' \
--data '{
    "date_from": "06-06-2026",
    "date_to": "06-06-2026"
}'
```

### 3.2 Get Waiter List
```bash
curl --location 'https://preprod.mygenie.online/api/v1/vendoremployee/waiter/get-waiter-list' \
--header 'Content-Type: application/json; charset=UTF-8' \
--header 'X-localization: en' \
--header 'Authorization: Bearer <token>'
```

### 3.3 Set Opening Balance
```bash
curl --location 'https://preprod.mygenie.online/api/v1/vendoremployee/waiter/opening-balance' \
--header 'Content-Type: application/json; charset=UTF-8' \
--header 'X-localization: en' \
--header 'Authorization: Bearer <token>' \
--data '{
    "openings": [
        {
            "waiter_id": 3061,
            "date": "2026-06-06",
            "last_day_pending": 0,
            "today_given": 100
        }
    ]
}'
```

### 3.4 Settle (Per Waiter — Partial or Full)
```bash
curl --location 'https://preprod.mygenie.online/api/v1/vendoremployee/waiter/settlement' \
--header 'Content-Type: application/json; charset=UTF-8' \
--header 'X-localization: en' \
--header 'Authorization: Bearer <token>' \
--data '{
    "date": "2026-06-06",
    "waiter_id": 3061,
    "amount": 100,
    "settlement_type": "partial",
    "pilferage": -3833.0
}'
```

### 3.5 Self-Settlement (Logged-in User)
```bash
curl --location 'https://preprod.mygenie.online/api/v1/vendoremployee/waiter/self-settlement' \
--header 'Content-Type: application/json; charset=UTF-8' \
--header 'X-localization: en' \
--header 'Authorization: Bearer <token>' \
--data '{
    "date": "2026-06-06"
}'
```

---

## 4. Key Mapping (Owner-Provided)

### Total Level (Restaurant Summary)

| UI Label | API Field |
|---|---|
| Opening Balance | `total_opening_balance` |
| Closing Balance | `last_day_pending` |
| Current Balance | `total_balance_to_settle` |
| Cash Collected | `total_today_settlement` |

### Waiter Level (Per-Waiter Row)

| UI Label | API Field |
|---|---|
| Opening Balance | `opening_balance` |
| Closing Balance | `last_day_pending` |
| Cash Collected | `today_settlement` |

---

## 5. Scope

### In Scope
- New page/route for Settlement module (e.g., `/settlement`)
- Sidebar entry
- Date picker (single day, defaults to today)
- **Summary strip** — total opening balance, closing balance, current balance, cash collected
- **Waiter table** — per-waiter rows with opening balance, closing balance, cash collected, actions
- **Opening balance entry** — input per waiter, submit via `opening-balance` API
- **Settle action** — per waiter, partial or full, with pilferage field, via `settlement` API
- **Self-settlement** — quick action for logged-in user via `self-settlement` API
- New service file (`settlementService.js`)

### To Discover
- UI design (will be designed during implementation — owner to review)
- Permission gating (which roles can access settlement?)
- Print/export of settlement report
- Settlement history view

---

## 6. Open Questions

| # | Question |
|---|---|
| Q-015-1 | What roles should have access to the settlement module? (Owner only? Manager? All?) |
| Q-015-2 | Should there be a "print settlement report" feature? |
| Q-015-3 | Is pilferage always calculated as `(expected - actual)` or is it a manual input? |
| Q-015-4 | What are the valid values for `settlement_type`? ("partial", "full" — any others?) |
| Q-015-5 | Should the module show settlement history (past days)? |
| Q-015-6 | Is there a "close day" final action that locks the day? |

---

## 7. Files to Create

| File | Role |
|---|---|
| **NEW** `settlementService.js` | API calls — get-settlement-report, get-waiter-list, opening-balance, settlement, self-settlement |
| **NEW** `SettlementPage.jsx` | Main settlement page component |
| `Sidebar.jsx` | Add settlement entry |
| `App.js` | Add route |

---

## 8. Next Steps

1. Discovery: curl the APIs on preprod to understand full response shapes
2. Design settlement UI (summary + waiter table + actions)
3. Build service + page
4. Wire to sidebar + route
5. Owner review + iterate
