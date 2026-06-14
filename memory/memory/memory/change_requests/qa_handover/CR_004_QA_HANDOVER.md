# CR-004 QA Handover: Room Orders Report — PMS-Style View (Phase 1: Read-Only) — PARTIAL / PARKED

## QA Handover Status
- ready_for_qa_validation_partial

## User Validation Status
- user_validated (for Phases 4.1 – 4.5)

## Parking Note
CR-004 has been **parked early at the user's explicit request (Option A)**
after the read-only viewing scope was validated. The export integration
(Phase 4.6) and the final cross-page smoke pass (Phase 4.7) are **deferred**
and are NOT to be tested as part of this QA round.

QA scope below covers **only Phases 4.1 – 4.5**.

## Source Documents
- CR Doc Path: `/app/memory/change_requests/CR_004_room_orders_pms_view.md`
- Impact Analysis Doc Path: `/app/memory/change_requests/impact_analysis/CR_004_IMPACT_ANALYSIS.md`
- Implementation Plan / Handover Doc Path: `/app/memory/handover/CR_004_IMPLEMENTATION_HANDOVER.md`
- Implementation Summary Doc Path: `/app/memory/change_requests/implementation_summaries/CR_004_IMPLEMENTATION_SUMMARY.md`
- Sequencing Index: `/app/memory/handover/IMPLEMENTATION_SEQUENCE_INDEX.md`

## What Was Implemented
A new read-only Room Orders report at `/reports/rooms`, with PMS-style
one-row-per-room grouping, lazy per-room detail fetch on row mount, session
cache, summary bar with transient spinners, simple status filter
(`In-house` / `All`), date picker, and a room warning badge for RM parents
without `room_info`. The "Outstanding" total uses the locked formula:

```
outstanding = parent.order_amount
            + Σ associated_order_list[].order_amount
            + max(0, roomInfo.balancePayment)
```

## Files Changed
| File Path | Purpose |
| --- | --- |
| `/app/frontend/src/App.js` | New `/reports/rooms` route |
| `/app/frontend/src/components/layout/Sidebar.jsx` | New "Room Orders" sidebar child under Reports |
| `/app/frontend/src/api/transforms/orderTransform.js` | Additive transform — `room_info`, `associated_order_list[]`, `balancePayment`, `checkInDate`, `guestName` |
| `/app/frontend/src/api/services/reportService.js` | New `getSingleOrderRoom()` service method |
| `/app/frontend/src/pages/RoomOrdersReportPage.jsx` (NEW) | Room Orders page shell — list fetch, grouping, filters, summary bar, expand/collapse |
| `/app/frontend/src/components/reports/RoomRowCard.jsx` (NEW) | Per-room row — lazy detail fetch on mount, expanded view, warning badge, retry UI |

## Behavior To Validate In QA
| Area | Expected Behavior |
| --- | --- |
| Route load | `/reports/rooms` loads successfully; sidebar "Room Orders" entry highlights |
| Sidebar permission | Inherits from `report` permission — no extra permission gating |
| Day list fetch | Page calls `order-logs-report` for the selected business day on mount and on date change |
| RM grouping | One row per RM parent order id; same room number with different parent ids → separate rows |
| SRM-only grouping | SRM rooms with no RM parent grouped by `parent_order_id` and shown as their own rows |
| Room number display (RM) | Comes from `location.tableName` — NOT `location.display` |
| Lazy detail fetch | Each row fires `get-single-order-new` exactly once on mount; collapse + re-expand uses cache |
| Row loading state | Spinner / skeleton shown until detail resolves |
| Row error state | Failed row shows retry without breaking page or other rows |
| Warning badge | RM parent without `room_info` shows the warning badge; SRM-only groups do NOT show rent/advance/balance badge |
| Date filter | Changing date refetches list; cached row details for the new date are independent |
| Status filter | `In-house` (default) and `All` pills both work and update visible row counts |
| Summary bar | Shows transient inline spinner while rows still resolving; updates incrementally as each row completes (`resolvedTick`) |
| Outstanding total | Matches locked formula `parent.order_amount + Σ associated.order_amount + max(0, roomInfo.balancePayment)` |
| Generic associated label | UI says "Associated order" (generic) — not channel-specific |
| Scan & Order SRM | Behaves identically to any other SRM associated order |

## Regression Areas For QA
| Area | Why It Matters |
| --- | --- |
| `/reports/audit` page | Uses the original `getSingleOrderNew()` path; transform changes were additive but must not break audit detail sheet |
| `/reports/summary` page | Shares filters/components; verify nothing visually shifted |
| Audit Report detail side-sheet | Same transform layer — must still render correctly |
| Sidebar navigation | New child added — verify other Reports children still route correctly |
| Existing CSV/PDF exports on Audit Report | `ExportButtons.jsx` was NOT modified in CR-004 — verify no regression |
| `/reports/all` (CR-001) page | CR-001 was just parked — verify badges, filter chips, count, and exports still work |

## API / Socket / Payload Areas To Check
| Area | Expected Result |
| --- | --- |
| `POST /api/v2/vendoremployee/report/order-logs-report` | Called once per date change; payload unchanged from existing usage |
| `POST /api/v2/vendoremployee/get-single-order-new` | Called once per visible room row on mount; not called again on collapse/re-expand of the same row |
| `room_info` / `associated_order_list[]` passthrough | Present and consumed by `RoomRowCard` |
| Socket | None — no socket subscription added for this page |

## Order Types / Channels To Test
| Channel | Required Test |
| --- | --- |
| Dine-in | Should NOT appear on Room Orders page (only RM/SRM rooms surface) |
| Takeaway | Same — should not appear |
| Delivery | Same — should not appear |
| Room (RM) | Primary scope — appears as parent row, expands to associated orders |
| Scan & Order | If associated to a room, surfaces under that room as a generic "Associated order"; behaves like any SRM child |

## Printing / KOT / Bill Checks
- N/A — page is strictly read-only. No print/KOT/bill flow is invoked from
  this page.

## Reporting / Analytics Checks
- Verify the day-list `total_count` and the page's visible-row count are
  consistent after grouping (RM dedupe + SRM-only fallback).
- Verify Summary bar totals exactly match the sum across visible rows once
  all rows have resolved (`resolvedTick == visibleRowCount`).

## Known Issues / Deferred Items
- **DEFERRED — Phase 4.6 (Export Integration in `ExportButtons.jsx`):** Not
  implemented; do NOT QA exports for this page.
- **DEFERRED — Phase 4.7 (Final Smoke Pass):** Will be re-run when 4.6 lands.
- **DEFERRED — CR-004 Phase 2:** Cross-business-day in-house room handling.
- **PRE-EXISTING (unrelated to CR-004):**
  - `ProtectedRoute.test.jsx` test-suite breakage (missing
    `@testing-library/react`) — should not be treated as a CR-004 failure.
  - `LoadingPage.jsx` line 111 — ESLint missing-dependency warning.
  - `paymentService.CLEAR_BILL` latent bug.

## QA Instructions
- Validate ONLY the approved CR-004 Phase 1 scope (read-only viewing) listed
  above. Do NOT exercise export flows on this page.
- Check the regression areas listed above; pay particular attention to
  `/reports/audit` because it shares the transform layer.
- Do NOT treat unrelated pre-existing issues (test-suite breakage, lint
  warnings, `paymentService.CLEAR_BILL`) as failures of this CR.
- If QA fails, produce a QA failure report including:
  - exact reproduction steps,
  - affected file/flow,
  - whether the failure is within the parked Phases 4.1 – 4.5 scope or in a
    deferred area (4.6 / 4.7 / Phase 2).
- If QA passes, mark CR-004 as **partial-accepted (parked)** and route the
  next CR (CR-003) into the implementation pipeline.

## Next Agent
- Change Request QA Validation Agent (partial scope)
