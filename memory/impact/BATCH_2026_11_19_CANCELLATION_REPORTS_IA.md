# Impact Analysis (Gate 2) — Cancellation Reports batch — 2026-11-19

**Role:** PLANNING (ROLE 2) · stage = impact_analysis (STOP after IA; no Implementation Plan, no code)
**Items:** BUG-713, CR-554, CR-555, CR-556 · **Priority:** P0 · **Release:** 2026-11-17 · **Assignee:** Abhishek · **Sprint:** nov_cr_batch
**Intake:** `change_requests/BATCH_INTAKE_2026_11_19_CR524_CANCELLATION_PARITY_RISKBADGE_FILTERS.md`
**Investigation:** `investigations/INV-CR524-BUG579-RISK-BADGE_2026_11_19.md`
**Live probe (this IA):** `evidence/CR-524/live_probe_IA_2026_11_19.json` (Cafe 103, 2026-10-01→11-19, 65 cancelled items)

---

## Code Reality
| Item | Reality | Detail |
|---|---|---|
| BUG-713 | **FULL** | Columns exist but off-screen. `CancellationsMockup.jsx` headers L944-946, cells L980-982, inside `overflow-x-auto` L930 (13 cols; Punch Time/Duration/Station are cols 11-13). |
| CR-554 | **NONE** | `CancelDetailMockup.jsx` columns = Item/Qty/Loss/Stage/Reason/By/Order/Date (L136-143). No Punch Time / Duration. |
| CR-555 | **NONE** (on cancel screens) | Risk-tier logic exists only in `AuditLogMockup.jsx` `getRiskTier` L68-74 (CR-543: doubt≥5, risk≥15, high_risk≥30 min). No badge on either cancellation screen. |
| CR-556 | **PARTIAL** | `CancelDetailMockup.jsx` has Stage + Reason dropdowns (`s28-filter-stage`, `s28-filter-reason`). `CancellationsMockup.jsx` has NO inline column filters. |

## Conflict Pre-Check
- Shared files: `CancellationsMockup.jsx`, `CancelDetailMockup.jsx`.
- Last modifiers of `CancellationsMockup.jsx`: BUG-707 (2026-11-19), CR-524 (2026-11-16), BUG-674 (2026-11-16) — all **GATE_5A_IMPLEMENTED** (not actively editing).
- **OPEN same-file item:** **BUG-708** (GATE_2_IA_AWAITING_OWNER) — staff cancel-note column on `CancellationsMockup.jsx`. Different column → parallel-safe, but **batch the CancellationsMockup edits** and sequence with BUG-708 to avoid churn.
- `CancelDetailMockup.jsx`: no other open items.

## Data Flow (shared — all three CRs)
`POST /api/v2/vendoremployee/report/insights-cancellations {from_date,to_date}` → `resp.data.data.items[]`.
Both screens consume it via `fetchInsightsCancellations` (`insightsService.js` L624): `CancellationsMockup.jsx` L242-244 (`useReportFetch`), `CancelDetailMockup.jsx` L67.

**Live-probe field availability (65/65 populated unless noted):** `created_at` (punch time) 100%, `item_punched_at` 100%, `cancel_time_full` (cancel time) 100%, `scope` (item 54 / order 11), `stage` (Before Serving / After Serving / Before Cooking), `cancel_type`, `reason`, `cancelled_by` 100%, `station`, `amount`/`value`, `qty`, `food_name`, `order_number`, `table_name`/`table_no`, `notes`, `cancel_item_note`, `punched_by`.
**Duration = FE calc** `created_at → cancel_time_full` (already implemented, null-guarded, `CancellationsMockup.jsx` L284-288). Sample durations: 6, 6, 24, 44, 37, 17, 10, 208 min → span all CR-543 tiers.
**GAP C note:** in this restaurant order-scope rows had **0** `stage="Unknown"` (0/11). "Unknown" is restaurant/data-dependent (backend classification) → stays under **BUG-579**, out of scope here. No backend brief needed for BUG-713/CR-554/555/556 — all data present client-side.

## Risk Classification
- **BUG-713:** LOW (pure column layout/order; no data or money path).
- **CR-554 / CR-555 / CR-556:** MEDIUM (report display, filters, non-financial; RISK table line 63). No billing/tax/settlement path.

---

## Per-item impact

### BUG-713 — Punch Time + Duration off-screen (GAP A)
- **Root cause:** 13-column `w-full` table inside `overflow-x-auto` (L930); Punch Time (11), Duration (12), Station (13) render past the viewport → invisible without horizontal scroll.
- **Affected:** `CancellationsMockup.jsx` table header/cell order L934-982. Single file.
- **Fix directions (Gate 3 — owner picks):** (a) move Punch Time + Duration left, adjacent to Date; (b) merge/trim low-value columns (e.g., Notes + Cancel Note); (c) sticky/pin last columns; (d) responsive-hide least-critical columns on narrow screens.
- **Downstream:** none (display). Coordinate with CR-554 (same overflow risk once detail screen gains columns).

### CR-554 — CancelDetail: add Punch Time + Duration
- **Change:** add 2 columns to `CancelDetailMockup.jsx` — Punch Time (format `created_at`) + Duration (min) (`created_at→cancel_time_full`, null-guarded). **Reuse CR-524 FE calc** verbatim (`CancellationsMockup.jsx` L284-288) to avoid drift.
- **Affected:** `CancelDetailMockup.jsx` (header row + body row + the per-row display mapping). Single file.
- **Downstream:** none. **Overflow watch:** adding columns here may reproduce BUG-713 → apply the same layout decision.

### CR-555 — Per-row risk badge (both screens)
- **Change:** render a doubt/risk/high-risk badge driven by FE duration, on both screens (next to Duration). Extract a **shared** `getRiskTier(durationMin)` util seeded from CR-543 thresholds (5/15/30) so Audit + Cancellation stay aligned (investigation alignment note).
- **Affected:** `CancellationsMockup.jsx` + `CancelDetailMockup.jsx` (+ recommended new `utils/riskTier.js`, and refactor `AuditLogMockup.getRiskTier` to import it — optional, reduces drift).
- **Depends on:** CR-554 (Duration must exist on the detail screen first).
- **Owner decisions:** confirm thresholds (default 5/15/30); badge labels + colors; behaviour for order-scope rows / missing duration (recommend: no badge when duration null).

### CR-556 — Extend column filters (both screens)
- **Change:** add filters for Stage, Scope, Reason, Cancelled By, Duration/risk-tier; wire into each screen's filtered row set. `CancellationsMockup.jsx` gains an inline filter bar (none today); `CancelDetailMockup.jsx` extends its 2 existing dropdowns.
- **Affected:** `CancellationsMockup.jsx` + `CancelDetailMockup.jsx`. Data supports every filter (probe).
- **Depends on:** CR-555 (for the risk-tier filter option).
- **Owner decisions:** filter UI (dropdowns vs chips); duration filter = risk-tier buckets (recommended, ties to CR-555) vs numeric range.

## Recommended execution order (Gate 3+)
`BUG-713 + CR-554` (column layout together) → `CR-555` (needs CR-554 Duration) → `CR-556` (needs CR-555 tier). Single FE batch, no backend. Sequence CancellationsMockup edits with BUG-708.

## Verification Matrix (seed for Gate 3 / QA)
| Item | How to verify |
|---|---|
| BUG-713 | On a 1366/1440-wide viewport, open Cancellations → Details: Punch Time + Duration visible without horizontal scroll. |
| CR-554 | Item Cancellation Detail shows Punch Time + Duration; values match the Cancellations screen for the same row. |
| CR-555 | Rows with duration <5 / 5–15 / 15–30 / ≥30 min show no-tier / doubt / risk / high-risk badge, identical on both screens; matches Audit tier for the same order. |
| CR-556 | Each filter (Stage/Scope/Reason/Cancelled By/Risk-tier) narrows rows correctly on both screens; combined filters AND together. |

## Owner Decision Queue
1. **BUG-713:** which columns to prioritise/reorder so Punch Time + Duration show without scroll (or accept sticky + horizontal scroll)?
2. **CR-555:** ~~confirm thresholds~~ **DECIDED (owner 2026-11-19): thresholds LOCKED at CR-543's 5/15/30 min as-is, for consistency with the Audit report.** Remaining: badge labels/colours (proposed Doubt=amber / Risk=orange / High Risk=red) + no badge when duration null. Note: live data skews high (≈52% ≥30 min) — owner accepted this for Audit consistency.
3. **CR-556:** duration filter as risk-tier dropdown (recommended) or numeric range?

---

**Handover:** Impact Analysis complete for 4 items (BUG-713, CR-554, CR-555, CR-556). All FE-only, data confirmed on live preprod. Code reality: BUG-713 FULL, CR-554 NONE, CR-555 NONE, CR-556 PARTIAL. Awaiting owner review of the 3 decisions → Gate 3 (Implementation Plan).
