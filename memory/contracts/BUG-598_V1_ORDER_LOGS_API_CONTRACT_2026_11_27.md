# API Contract — BUG-598 V1 Order Logs Report — PROPOSED (Awaiting Frontend Acceptance)

**ID:** BUG-598
**Date:** 2026-11-27
**Author:** Gyan (backend)
**Status:** PROPOSED — frontend acceptance required before backend implements
**Source doc:** BUG-598_V1_ORDER_LOGS_PROPOSED_CONTRACT_2026_11_27.md (uploaded 2026-11-27)
**Frontend acceptance gate:** Abhishek sign-off required (OD-598-03 — pagination strategy)

---

## What This Contract Does

Introduces a new V1 version of the order-logs-report endpoint that:
1. Enforces mandatory pagination — eliminates the full-dump timeout that caused the 60-day cap
2. Returns `payment_summary` for the FULL date range (new) alongside `page_payment_summary` for the current page
3. Hard-enforces 730-day limit via HTTP 422
4. Keeps all V2-compatible order wrapper fields — no field renames inside `order[]` array

---

## Endpoint

| | V2 (current) | V1 (proposed) |
|--|---|---|
| Method | POST | POST |
| Path | `/api/v2/vendoremployee/report/order-logs-report` | `/api/v1/vendoremployee/report/order-logs-report` |
| Controller | `Api/V2/Vendoremployee/OrderReportController.php` | `Api/V1/Vendoremployee/OrderReportController.php` |
| Pagination | None — full dump | Mandatory — always paginated |
| Range limit | None (times out) | 730 calendar days (422 if exceeded) |

---

## Request Fields

| Field | Type | Rule | Notes |
|-------|------|------|-------|
| `from_date` | string | Required, YYYY-MM-DD | Start date |
| `to_date` | string | Required, YYYY-MM-DD, ≥ `from_date` | End date |
| `sort_by` | string | Required: `collect_bill` or `created_at` | |
| `page` | integer | Optional, default 1, min 1 | |
| `per_page` | integer | Optional, default 100, min 1, max 500 | |

---

## Response Fields

| Field | Type | Scope | Notes |
|-------|------|-------|-------|
| `success` | boolean | | |
| `restaurant_id` | integer | | |
| `filter` | object | | `sort_by`, `type`, `from_date`, `to_date`, `fixed_date` |
| `total_orders` | integer | Full range | Total matching orders before pagination |
| `page_orders` | integer | Current page | `order.length` |
| `payment_summary` | object | **Full date range** | NEW — replaces V2's page-only summary |
| `payment_summary.total_paid_amount` | number | Full range | |
| `payment_summary.partial_payment_total` | number | Full range | |
| `payment_summary.by_payment_method` | object | Full range | `{"cash": 60000, "upi": 20000, ...}` |
| `page_payment_summary` | object | **Current page only** | V2's old `payment_summary` behaviour, renamed |
| `page_payment_summary.total_paid_amount` | number | Page only | |
| `page_payment_summary.partial_payment_total` | number | Page only | |
| `page_payment_summary.by_payment_method` | object | Page only | |
| `order` | array | Current page | V2-compatible order wrappers — fields unchanged inside each wrapper |
| `pagination` | object | | `page`, `per_page`, `total_orders`, `total_pages` |

---

## Error Responses (HTTP 422)

| Trigger | Response |
|---------|----------|
| `from_date` or `to_date` missing/invalid | 422 |
| Range exceeds 730 calendar days | 422 |
| Invalid `sort_by` value | 422 |
| `page` < 1 or `per_page` outside 1–500 | 422 |

---

## Scope

**Covered by this contract:**
- Order Ledger page (`OrderLedgerMockup.jsx` → `orderLedgerService.js`)
- Room Orders page (`RoomOrdersMockup.jsx` → `roomOrdersService.js`)
- All Orders Report (`AllOrdersReportPage.jsx`)

**NOT covered (separate items):**
- Settlement Report — different endpoint
- `insights-dashboard` timeout (BUG-719/722) — different endpoint
- Daily Report beta — different endpoint
- Excel export — no new export endpoint in this contract

---

## Backward Compatibility

- V2 endpoint remains unchanged — existing APK callers, V2-only clients unaffected
- No automatic fallback V1 → V2
- Financial calculation rules (GST, VAT, discounts, partial payments) preserved exactly from V2

---

## Open Questions for Frontend Before Acceptance

### OD-598-03 — Pagination strategy (MUST DECIDE before backend implements) — OPEN

The V1 endpoint always paginates. Frontend currently loads ALL orders in one call and renders them in an in-memory table. Two strategies:

**Option A — Sequential full-fetch (like Order Beta chunking):**
- Frontend fetches page 1, 2, 3... until `pagination.total_pages` exhausted, merges in memory
- Keeps existing in-memory table behaviour, no UI changes on OrderLedger/RoomOrders pages
- For 1,000 orders at `per_page=500` → 2 sequential calls
- Performance: 2-month range would still be ~20-30s total (sequential calls)
- Risk: very large ranges (730 days) could still be slow

**Option B — True server-side pagination:**
- UI shows page controls / infinite scroll
- `payment_summary` (full range) powers the header totals
- `page_payment_summary` powers the visible rows total
- Requires significant UI changes on OrderLedger and RoomOrders pages
- Best long-term architecture, fastest per-page response

> **Recommendation:** Option A for OrderLedger (keeps existing table, no UX change). Option B deferred to a future CR. Owner to decide.

### OD-598-04 — Room Orders filtering gap — BACKEND BRIEF FILED (2026-11-27)

`roomOrdersService.js` pre-scans ALL returned orders for `order_in === 'RM'/'SRM'`. With pagination, room orders on page 2+ are invisible until all pages fetched.

**Backend brief filed:** `backend_briefs/BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md` — Gap 1
- Option A (preferred): Add `order_in` filter param to V1 request
- Option B: Confirm fetch-all-pages is the intended approach

**Awaiting Gyan response.**

### OD-598-05 — Header totals display

Currently `OrderLedgerMockup` shows a "Grand Total" row that uses the `payment_summary` from V2 (page-only, displayed as if full-range). With V1:
- Header totals should use `payment_summary` (full range) ← correct
- Visible rows total at page bottom should use `page_payment_summary` ← correct

This is a display fix bundled with the V1 migration. Confirm display spec before coding.

### OD-598-06 — Snapshot consistency — BACKEND BRIEF FILED (2026-11-27)

Sequential page fetches can see inconsistent data if orders are created mid-fetch.

**Backend brief filed:** `backend_briefs/BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md` — Gap 2
- Option A: `snapshot_at` timestamp in request
- Option B: cursor-based pagination
- Option C (recommended fast path): acknowledge limitation, frontend adds info notice

**Awaiting Gyan response.**

### OD-598-07 — Room-only financial totals — BACKEND BRIEF FILED (2026-11-27)

`payment_summary` covers all orders. Room Orders header KPIs need room-only figures.

**Backend brief filed:** `backend_briefs/BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md` — Gap 3
- Option A: auto-resolved if OD-598-04 Option A chosen
- Option B: separate `room_payment_summary` field
- Option C: defer to Aug-2026 brief

**Fast path: OD-598-04 A + OD-598-06 C → both Order Ledger and Room Orders unblocked in one round-trip.**

---

## Frontend Files That Need Updating (once V1 is live and OD-598-03 decided)

| File | Change | Scope |
|------|--------|-------|
| `api/constants.js` | Add `ORDER_LOGS_REPORT_V1: '/api/v1/vendoremployee/report/order-logs-report'` | 1 line |
| `api/services/orderLedgerService.js` | Switch to V1, add pagination loop, use `payment_summary` for meta | MEDIUM |
| `api/services/roomOrdersService.js` | Switch to V1, handle pagination, resolve OD-598-04 | MEDIUM |
| `pages/AllOrdersReportPage.jsx` | Switch to V1, paginate | MEDIUM |
| `api/services/reportService.js` | Switch consumers of ORDER_LOGS_REPORT | LOW |
| `api/services/insightsService.js` | Switch (uses fetchOrReuse — adaptable) | LOW |
| `api/services/variationAddonService.js` | Switch | LOW |
| `api/services/prepServeService.js` | Switch | LOW |
| `api/services/foodCourtService.js` | Switch | LOW |
| `pages/reports-module/OrderLedgerMockup.jsx` | Lift cap 60 → 730, update header totals | LOW + DISPLAY |
| `pages/reports-module/RoomOrdersMockup.jsx` | Lift cap 60 → 730 | LOW |

---

## Gate Status

| Gate | Status |
|------|--------|
| Contract proposed by backend | ✅ 2026-11-27 |
| Frontend gaps brief filed (OD-598-04/06/07) | ✅ 2026-11-27 — `BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md` |
| Gyan answers on 3 gaps | ⏳ PENDING |
| Frontend acceptance (OD-598-03 + gap answers) | ⏳ BLOCKED on gap answers |
| Backend implementation | ⏳ BLOCKED on frontend acceptance |
| Frontend implementation | ⏳ BLOCKED on backend V1 live |
| BUG-598 Sub-batch B caps lifted | ⏳ BLOCKED on V1 live |
