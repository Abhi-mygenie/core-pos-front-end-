# BUG-598 — Reports Date Range Caps Too Restrictive (8 Pages: 60d / 365d → 730d)

**Registered:** 2026-10-19
**Type:** BUG
**Severity:** P1 — MEDIUM
**Risk:** LOW
**Area:** Reports / Analytics
**Sprint:** oct_cr_batch
**Status:** BACKEND_CONTRACT_RECEIVED — AWAITING PAGINATION STRATEGY DECISION (OD-598-03)
**Related:** BUG-353 (BACKEND_BLOCKED — ORDER_REPORT_BETA_COMBINED server-side cap, different issue),
             BATCH_REPORTS_FE_FIX_001 Item #6 (GATE_1 — same scope, no dedicated ID, stalled)
**Backend contract received:** 2026-11-27 (Gyan) — `BUG-598_V1_ORDER_LOGS_API_CONTRACT_2026_11_27.md`

---

## Symptom

Multiple report pages show a red "Max 60 days" or "Max 365 days" error when the
owner selects a date range longer than the hardcoded FE limit. Owner expects all
reports to support up to 2 years (730 days) of history.

Screenshot provided (2026-10-19): Sales report showing FROM 01/10/2025 TO 30/04/2026
= ~210 days → "Max 60 days" error. Apply button is inactive.

---

## Duplicate Check

**RELATED to BUG-353 — DISTINCT scope.**
- `BUG-353` (`BACKEND_BLOCKED`) tracks the ORDER_REPORT_BETA_COMBINED API endpoint
  returning empty/partial data beyond 31 days. That is a backend contract issue.
  This bug (BUG-598) tracks the **frontend date-picker validation cap** which
  blocks the user from even submitting a wider range on 8 different report pages.
  The two are independent: BUG-353 is about what the API returns; BUG-598 is about
  what the FE allows the user to select.

**RELATED to BATCH_REPORTS_FE_FIX_001 Item #6** — same fix scope, but that batch
item has no standalone ID, is stuck at GATE_1, and has had no planning activity
since 2026-10-17. Registering as BUG-598 to give it a trackable ID and unblock it.

---

## Code Reality Check

All 8 cap constants confirmed present at wrong values (grep 2026-10-19):

| File | Line | Constant | Current | Target |
|------|------|----------|:-------:|:------:|
| `SalesMockup.jsx` | 138 | `maxDays` | **60** | 730 |
| `PaymentsMockup.jsx` | 183 | `maxDays` | **60** | 730 |
| `OrderLedgerMockup.jsx` | 36 | `MAX_RANGE_DAYS` | **60** | 730 |
| `RoomOrdersMockup.jsx` | 54 | `MAX_RANGE_DAYS` | **60** | 730 |
| `DashboardMockup.jsx` | 74 | `MAX_RANGE_DAYS` | 365 | 730 |
| `ItemSalesHybridMockup.jsx` | 169 | `MAX_RANGE_DAYS` | 365 | 730 |
| `CancellationsMockup.jsx` | 192 | `MAX_RANGE_DAYS` | 365 | 730 |
| `SettlementReportMockup.jsx` | 31 | `MAX_RANGE_DAYS` | 365 | 730 |

**Code Reality: NONE** — fix not implemented on any of the 8 files.

---

## Sub-batches (backend-agg vs FE-agg)

### Sub-batch A — Backend-aggregated (safe to lift immediately, no backend changes)

These pages POST to backend insights endpoints that already accept wide date ranges.
Lifting the FE cap only removes the UI guard; the API call will succeed.

| Page | API call | Safe? |
|------|----------|:-----:|
| `SalesMockup.jsx` | `fetchInsightsSales` (INSIGHTS_SALES) | ✅ YES |
| `DashboardMockup.jsx` | `fetchInsightsDashboard` (INSIGHTS_DASHBOARD) | ✅ YES |
| `ItemSalesHybridMockup.jsx` | `fetchInsightsItems` (INSIGHTS_ITEMS) | ✅ YES |
| `CancellationsMockup.jsx` | `fetchInsightsCancellations` | ✅ YES |

### Sub-batch B — FE-aggregated or chunked (need backend confirmation before lifting)

These pages use chunked requests or local aggregation. Backend confirmation needed
that the underlying endpoints support wide ranges without timeouts.

| Page | Strategy | Needs confirm? |
|------|----------|:--------------:|
| `PaymentsMockup.jsx` | Chunked daily calls | ⚠ YES |
| `OrderLedgerMockup.jsx` | Chunked `order-logs-report` | ⚠ YES |
| `RoomOrdersMockup.jsx` | Chunked room orders | ⚠ YES |
| `SettlementReportMockup.jsx` | FE aggregation | ⚠ YES |

---

## Evidence

- **Source:** OWNER-REPORTED (2026-10-19) — screenshot + "i am still seeing it for
  2 months only" (referring to the 2-year range CR that was implemented elsewhere)
- **Confidence:** CONFIRMED — code traced; all 8 constants verified by grep
- **Screenshot:** provided in session (Sales report "Max 60 days" error)
- **Investigation report:** `investigations/INV-TRIPLE-OCT19_INVESTIGATION_REPORT_2026_10_19.md` §Issue 1

---

## Blast Radius

- **Files WILL change:** 4 (Sub-batch A) or 8 (Sub-batch A + B)
- **Files WILL NOT touch:** Any API service, transform, socket, financial logic
- **Change per file:** 1 line (constant value only)
- **Scope:** SMALL (8 files × 1 line each)
- **Hotspot (R5):** NO — all are report page components
- **Fast Lane eligible:** YES for Sub-batch A (4 files, 1 line each, LOW risk, no financial logic)
  Sub-batch B: eligible after backend confirmation

---

## Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | LOW |
| Financial touch? | NO |
| R5? | NO |
| Fast Lane eligible | YES (Sub-batch A — 4 files, 1 line each, owner approval needed) |

---

## Open Decisions

**OD-598-01:** Sub-batch B (4 FE-aggregated pages) — lift now or wait for backend confirm?
- **RESOLVED 2026-11-27** → Backend V1 contract received. Sub-batch B is now unblocked.
  `OrderLedgerMockup`, `RoomOrdersMockup`, `PaymentsMockup`, `SettlementReportMockup`
  can all lift to 730 days once V1 endpoint is live.
  Sub-batch A (4 backend-agg pages) can be lifted independently via Fast Lane now.

**OD-598-02:** Soft warning for wide ranges?
- **RESOLVED 2026-11-27** → No change needed. V1 backend enforces 730-day hard cap
  via HTTP 422. Frontend date pickers already show "Max N days" error. No extra warning needed.

**OD-598-03 — NEW (2026-11-27):** Pagination strategy for Sub-batch B pages — OPEN
> V1 endpoint always paginates. Frontend currently loads all orders in one call.
> - **Option A (recommended):** Sequential full-fetch — frontend loops pages until `total_pages` exhausted, merges in memory. No UI changes on OrderLedger/RoomOrders.
> - **Option B:** True server-side pagination — page controls in UI. `payment_summary` (full range) for header totals. Major UI rebuild.
> **Blocks:** Sub-batch B implementation planning.

**OD-598-04 — NEW (2026-11-27):** Room Orders filtering gap — BACKEND BRIEF FILED
> `roomOrdersService.js` pre-scans ALL orders for `order_in === 'RM'/'SRM'`. With pagination,
> page 2+ room orders are invisible until all pages fetched.
> **Backend brief:** `backend_briefs/BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md` Gap 1
> **Options offered:** A = `order_in` server-side filter (preferred) | B = confirm fetch-all approach
> **Blocks:** Room Orders V1 migration planning. Awaiting Gyan response.

**OD-598-05 — NEW (2026-11-27):** Header totals display on OrderLedger — OPEN
> V2 `payment_summary` = page only (displayed as full range = silent bug).
> V1 `payment_summary` = full range (correct). `page_payment_summary` = page only.
> Confirm display spec: header row uses `payment_summary`, visible rows total uses `page_payment_summary`.
> **Blocks:** OrderLedger display implementation.

**OD-598-06 — NEW (2026-11-27):** Snapshot consistency across page fetches — BACKEND BRIEF FILED
> Sequential page fetches can see inconsistent data if orders are created mid-fetch.
> **Backend brief:** `backend_briefs/BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md` Gap 2
> **Options offered:** A = `snapshot_at` timestamp | B = cursor pagination | C = acknowledge + FE notice (recommended fast path)
> **Blocks:** Order Ledger V1 migration planning. Awaiting Gyan response.

**OD-598-07 — NEW (2026-11-27):** Room-only financial totals — BACKEND BRIEF FILED
> `payment_summary` covers all orders. Room Orders header KPIs need room-only figures.
> **Backend brief:** `backend_briefs/BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md` Gap 3
> **Options offered:** A = auto-resolved if OD-598-04 Option A chosen | B = `room_payment_summary` field | C = defer to Aug-2026 brief
> **Blocks:** Room Orders header KPI display. Awaiting Gyan response.
> **Fast path:** OD-598-04 Option A + OD-598-06 Option C → unblocks both Order Ledger + Room Orders in one round-trip.

---

## Backend Contract Received (2026-11-27)

Full contract: `contracts/BUG-598_V1_ORDER_LOGS_API_CONTRACT_2026_11_27.md`

**Key points:**
- New endpoint: `POST /api/v1/vendoremployee/report/order-logs-report`
- Mandatory pagination (`page`, `per_page` default 100 max 500)
- 730-day hard limit enforced via HTTP 422
- `payment_summary` = full range (new, fixes silent accuracy bug)
- `page_payment_summary` = current page (renamed from V2's `payment_summary`)
- V2 unchanged — backward compatible
- **Status: PROPOSED — not yet implemented. Frontend acceptance is a gate.**

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: **PARTIAL** — Sub-batch A impact analysis ready; Sub-batch B blocked on OD-598-03/04/05
- Gate 3: Not started
- Gate 4 GO: Not given
- **Sub-batch A Fast Lane:** Still eligible (4 files × 1 line, LOW risk) — can proceed independently of V1
- **Sub-batch B:** Blocked until OD-598-03 decided + V1 live on preprod
