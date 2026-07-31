# CR-015 — Intake Document (Gate 1)

**Status:** COMPLETE
**Priority:** P1
**Sprint:** POS 4.0
**Date:** 2026-06-08
**Reporter:** Owner
**Related:** BUG-105

---

## 1. Problem Statement (Owner Verbatim)

> Build a settlement module. Basically, it's a day-closing module where the opening balance can be given, closing balance can be given — I mean calculated. We can settle the cash which has come. Settlement is done only for cash collection of that day.

---

## 2. Summary

| Aspect | Detail |
|---|---|
| **Current state** | No settlement page exists. BUG-105 was "OWNER SCOPE NEEDED" — now scoped via this CR. |
| **Target** | Full settlement module: KPI strip, per-waiter table, opening balance, settle (partial/full), self-settle, pilferage (auto-calc), close day, waiter-to-waiter transfer (placeholder). |
| **Layout** | Sidebar + main content (Audit Report pattern) — NOT full-width |
| **Backend APIs** | 5 already on preprod (get-settlement-report, get-waiter-list, opening-balance, settlement, self-settlement). Transfer API missing — flagged for backend. |

---

## 3. Scope

### In Scope
- New route `/settlement` (protected)
- Sidebar entry
- Date picker (single day, defaults to today)
- **KPI strip:** Opening Balance, Cash Collected, Settled, Remaining, Pilferage
- **Waiter table:** per-waiter rows with Opening, Cash Collected, Total Funds, Settled, Expected, Actual Balance (input), Pilferage (auto-calc), Action (Settle + Transfer)
- **Expandable rows:** Revenue breakdown, Tips by mode, Cash Drawer details
- **Opening Balance modal:** set cash float per waiter
- **Settle modal:** amount input (pre-filled), Full/Partial toggle, auto-pilferage, confirm
- **Transfer modal:** UI placeholder with backend-blocked banner, waiter dropdown, amount — all disabled
- **Self-Settlement button**
- **Close Day button**
- Inactive waiters collapsed at bottom
- TOTAL row
- New service file (`settlementService.js`)
- New transform file (`settlementTransform.js`)

### Out of Scope (deferred)
- Access/permission gating (owner: "we will do later")
- Print/export settlement report
- Settlement history (past days)
- Transfer API wiring (backend must ship `/waiter/cash-transfer` first)

---

## 4. Backend APIs (5 confirmed + 1 flagged)

| # | Endpoint | Method | Status |
|---|----------|--------|--------|
| 1 | `/waiter/get-settlement-report` | POST | ✅ Live |
| 2 | `/waiter/get-waiter-list` | GET | ✅ Live |
| 3 | `/waiter/opening-balance` | POST | ✅ Live |
| 4 | `/waiter/settlement` | POST | ✅ Live |
| 5 | `/waiter/self-settlement` | POST | ✅ Live |
| 6 | `/waiter/cash-transfer` | POST | ❌ **FLAGGED — does not exist. Backend team must build.** |

---

## 5. Backend Escalation — Cash Transfer API

**Requested endpoint:** `POST /api/v1/vendoremployee/waiter/cash-transfer`

**Payload:**
```json
{
  "from_waiter_id": 3081,
  "to_waiter_id": 3061,
  "amount": 5000,
  "date": "2026-06-09"
}
```

**Use case:** Shift change — Waiter A hands cash drawer to Waiter B. Should debit from source `total_funds` and credit to target, with audit trail.

**Probed endpoints (all 404):** `/cash-transfer`, `/transfer`, `/fund-transfer`, `/cash-handover`, `/shift-handover`

**UI provision:** Transfer button + modal built in mockup with disabled state + yellow "API Pending" banner.
