# QA Handover — CR-524 Punch Time + Duration — 2026-11-16

## 1. Verification Matrix (from plan)

| # | Edit | File | Verification | Self-Test |
|---|---|---|---|---|
| T-1 | Transform: `punchTime` mapped from `created_at` | CancellationsMockup.jsx L282 | Field present in transform | ✅ L282 verified |
| T-2 | Transform: `cancellationDuration` computed with null guard | CancellationsMockup.jsx L284-288 | Duration = max(0, round((end-start)/60000)), null when either missing | ✅ L284-288 verified |
| T-3 | Export column: Punch Time | CancellationsMockup.jsx L413 | Column in export payload | ✅ L413 verified |
| T-4 | Export column: Duration (min) | CancellationsMockup.jsx L414 | Column in export payload | ✅ L414 verified |
| T-5 | Table header: Punch Time + Duration (min) | CancellationsMockup.jsx L944-945 | Two new `<th>` in table head | ✅ L944-945 verified |
| T-6 | Table cells: Punch Time formatted + Duration displayed | CancellationsMockup.jsx L980-981 | Punch Time = localeString, Duration = integer or "—" | ✅ L980-981 verified |
| T-7 | colSpan updated for empty state | CancellationsMockup.jsx L986 | 10 → 12 | ✅ L986 verified |

Compile: ✅ webpack compiled with 1 pre-existing warning (allDays — not CR-524)

## 2. Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| TC-1 | Cancellation report loads with new columns | Open Cancellations report → All tab | "Punch Time" and "Duration (min)" columns visible in the table |
| TC-2 | Punch Time displays formatted | Check any row with `created_at` in API | Shows "DD Mon, HH:MM AM/PM" format |
| TC-3 | Duration displays correctly | Check row where both timestamps present | Shows integer minutes (e.g. "5") |
| TC-4 | Null punch time → shows dash | Check row where `created_at` is null (historical split) | Shows "—" for both Punch Time and Duration |
| TC-5 | Zero/negative duration guarded | Edge case: cancel_time_full <= created_at | Shows "0" (Math.max guard) |
| TC-6 | Export includes new columns | Download as Excel | "Punch Time" and "Duration (min)" columns in export |
| TC-7 | Order tab filter still works | Switch to Order tab | Rows filtered, new columns still visible |
| TC-8 | Item tab filter still works | Switch to Item tab | Same |

## 3. Regression

| # | What to verify | Why |
|---|---|---|
| R-1 | Existing columns unchanged (Date, Time, Amount, Stage, etc.) | Additive change — must not shift existing data |
| R-2 | Hourly chart still renders | Same data source, no formula change |
| R-3 | KPI cards unchanged | No summary logic touched |
| R-4 | Audit tab unchanged | Different table, not modified |

## 4. Registry Sync
Registry synced: YES
Items: CR-524
EXIT GATE: 5/5 PASS

## 5. Credentials
Use cafe103 or any restaurant with cancellation data:
- owner@cafe103.com / Qplazm@10 (RID 644)
- Backend verified on RID 672 (44 items, 41 valid durations, 3 null)
