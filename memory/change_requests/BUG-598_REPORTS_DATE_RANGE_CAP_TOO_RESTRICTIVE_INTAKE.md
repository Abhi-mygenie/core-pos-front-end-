# BUG-598 — Reports Date Range Caps Too Restrictive (8 Pages: 60d / 365d → 730d)

**Registered:** 2026-10-19
**Type:** BUG
**Severity:** P1 — MEDIUM
**Risk:** LOW
**Area:** Reports / Analytics
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE
**Related:** BUG-353 (BACKEND_BLOCKED — ORDER_REPORT_BETA_COMBINED server-side cap, different issue),
             BATCH_REPORTS_FE_FIX_001 Item #6 (GATE_1 — same scope, no dedicated ID, stalled)

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
- **(A — recommended):** Lift Sub-batch A (4 backend-agg pages) immediately via Fast Lane.
  File backend brief for Sub-batch B pages; lift them once backend team confirms
  the endpoints handle 730-day ranges without timeout.
- **(B):** Lift all 8 now. Accept risk that Sub-batch B pages may time out or return
  incomplete data on very wide ranges.

**OD-598-02 (Sub-batch A only):** Should a soft warning appear for very wide ranges
(e.g. > 180 days) even after lifting the cap?
- **(A):** No warning. Owner selects any range up to 730 days freely.
- **(B — recommended):** Show a grey info note (not a blocking error) for ranges
  > 180 days: "Wide ranges may take a few seconds to load."

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: Ready — awaiting "BUG-598 Gate 2 GO" (or Fast Lane approval for Sub-batch A)
  Recommended fast path: **"BUG-598 Sub-batch A Fast Lane GO"** → 4 files, 1 line each,
  ~10 min implementation.
- Gate 3: Not started
- Gate 4 GO: Not given
