# SESSION HANDOVER — 2026-09-24 — INVESTIGATION (BUG-408 re-validation + report-page double offset)

**Role:** INVESTIGATION (ALPHA v0.7) · **Code changed:** NONE · **Registry changed:** NONE · **Branch:** `21implement` @ `a4c9196f`
**Summary:** BUG-408 is still NOT fixed on preprod (room Cash/Card/UPI split never reconciles; contract unchanged; `room_checkin_revenue` actually sums to `Room Checkout`; night-audit disagrees with daily-sales). P&L + Consumption report pages are offset twice because they add `ml-64/ml-16` on top of an in-flow 280 px sidebar.

## Reports
- `/app/memory/BUG-408_INVESTIGATION_REPORT_2026_09_24.md` — 6/10 steps, BACKEND_ASK, 5 gaps G1–G5
- `/app/memory/INV_LAYOUT_DOUBLE_OFFSET_INVESTIGATION_REPORT_2026_09_24.md` — 4/10 steps, FE_BUG, 2 files (`PLReportPage.jsx:171`, `ConsumptionReportPage.jsx:196`)

## Evidence
- `/app/memory/evidence/BUG-408/probes_2026_09_24/` (tokens masked)
- `/app/memory/evidence/INV-LAYOUT-DOUBLE-OFFSET-2026-09-24/owner_screenshot_pl_report.png`

## Owner decisions pending
1. BUG-408: forward G1–G4 to backend (append to `backend_briefs/BACKEND_BRIEF_BUG408_ROOM_REVENUE_SPLIT_2026_09_15.md`)? Hide "Check-In Revenue" card until G2 semantics confirmed?
2. Layout: register as one BUG (2 files, LOW/MEDIUM) → Fast Lane per file or Gate 2/3?

## Environment notes
- preprod `/loading` boot fails for owner@palmhouse.com on "kitchen stations" (BAR, 10 s timeout) — blocks browser QA on the pod until backend recovers.
- `daily-sales-revenue-report` returned HTTP 525 once (09-24 single-day) — transient.
- No curl attachment was received from the owner despite "attached is curl".
