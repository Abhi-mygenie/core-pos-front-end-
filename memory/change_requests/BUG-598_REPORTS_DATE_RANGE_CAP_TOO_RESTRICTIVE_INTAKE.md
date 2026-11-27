# BUG-598 — Reports Date Range Caps Too Restrictive (8 Pages: 60d / 365d → 730d)

**Registered:** 2026-10-19
**Type:** BUG
**Severity:** P1 — MEDIUM
**Risk:** LOW
**Area:** Reports / Analytics
**Sprint:** oct_cr_batch
**Status:** BACKEND_REVISED_CONTRACT_RECEIVED — FRONTEND_SCOPING_REQUIRED (snapshot architecture)
**Backend contract v1 received:** 2026-11-27 (Gyan) — 3 gaps filed
**Backend revised contract v2 received:** 2026-11-27 (Gyan) — all 3 gaps answered
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

**OD-598-03 — Pagination strategy — RESOLVED 2026-11-27 v2**
> **Moot.** Snapshot mechanism makes all-page fetching safe by design. Sequential full-fetch (Option A) is still the implementation approach but snapshot guarantees consistency across all pages. No owner decision needed.

**OD-598-04 — Room Orders filtering — RESOLVED 2026-11-27 v2**
> **Backend chose Option A.** New `report_scope` param added: `all_orders` or `room_orders`.
> When `room_orders`: backend filters RM parents server-side before pagination. `room_info` and SRM associations embedded per parent. No cross-page missing rows.
> `roomOrdersService.js` no longer needs to pre-scan all orders.
> **One open item (needs Gyan confirmation):** Exact "current frontend status mapping" for which RM parents to exclude (cancelled, merged) must be written down before implementation.

**OD-598-05 — Header totals display — RESOLVED 2026-11-27 v2**
> V1 `payment_summary` = full snapshot range (header row). `page_payment_summary` = current page (page subtotal). Display spec confirmed.

**OD-598-06 — Snapshot consistency — RESOLVED 2026-11-27 v2 (more complex than asked)**
> **Backend chose full immutable snapshot mechanism** (not Option C acknowledge-and-document).
> Two-phase: POST → HTTP 202 + `snapshot_id` → poll until `status=ready` → fetch pages with `snapshot_id`.
> Snapshot frozen at `captured_at`, retained 30 min from `ready_at`, expires with 410.
> New fields: `snapshot_id`, `status`, `captured_at`, `ready_at`, `expires_at`.
> **Frontend impact: significant new architecture.** No existing polling pattern in codebase. Must be scoped before Gate 4 GO.
> **3 questions still open (need Gyan answers before scoping):**
> - Typical snapshot preparation time for 30d / 60d / 730d ranges?
> - Recommended polling interval (Retry-After header value)?
> - Is 30-min TTL enough for 730-day export sessions?

**OD-598-07 — Room-only totals — RESOLVED 2026-11-27 v2**
> **Backend chose Option A.** New objects: `room_summary` (full snapshot) + `page_room_summary` (current page). Both null when `report_scope=all_orders`.
> 11 fields each: `total_rooms`, `resolved_count`, `unresolved_count`, `total_room_revenue`, `total_room_collected`, `total_room_outstanding`, `folio_total`, `folio_paid`, `folio_outstanding`, `folio_discount`, `folio_transfers`.
> Backend says these must match `computeFinancials()` in `RoomOrdersMockup.jsx:61`.
> **One open item:** Parity validation required — sample V1 response must be tested against `computeFinancials()` output for same data before frontend accepts.

---

## Backend Contract v2 Received (2026-11-27)

Full contract: `contracts/BUG-598_V1_ORDER_LOGS_API_CONTRACT_2026_11_27.md`

**v2 additions vs v1:**
- `report_scope` param: `all_orders` | `room_orders`
- Immutable snapshot mechanism: `snapshot_id`, two-phase HTTP 202 → poll → pages
- `room_summary` + `page_room_summary` objects (11 fields, room_orders scope only)
- Snapshot lifecycle: `captured_at`, `ready_at`, `expires_at` (30-min TTL)
- V2 unchanged — backward compatible
- **Status: REVISED PROPOSED — not yet implemented. Frontend scoping required.**

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: **PARTIAL** — Sub-batch A impact analysis ready; Sub-batch B needs snapshot scoping
- Gate 3: Not started
- Gate 4 GO: Not given
- **Sub-batch A Fast Lane:** Still eligible (4 files × 1 line, LOW risk) — can proceed independently of V1
- **Sub-batch B:** All 3 gaps answered. Blocked on: (a) snapshot polling scoping, (b) RM status mapping confirmation, (c) `room_summary` parity validation, (d) V1 live on preprod
