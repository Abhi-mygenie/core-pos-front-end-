# BATCH INTAKE 2026-11-27 — Audit Report Enhancements (CR-563 to CR-567)

**Source:** `Audit_Report_Feedback_and_Enhancement_Requirements.docx` (owner upload 2026-11-27)
**Reporter:** owner@palmforest.com (Palm Forest)
**Area:** Reports / Analytics — `AuditLogMockup.jsx` (Audit Report page)
**Sprint:** dec_sprint
**Assignee:** Abhishek
**Client:** ALL

---

## CR-563 — Audit Report: Interactive Risk Filter Bands

**Type:** CR | **Severity:** P2 | **Risk:** MEDIUM

**What:** The three risk bands at the top of the High-Risk Cancellations section — Doubt (5–15 min), Risk (15–30 min), High Risk (30+ min) — currently display as static summary counts. Owner wants them to act as **clickable filters**: clicking a band filters the order list to show only that risk category. Clicking again (or the same band) returns to the full unfiltered list.

**Duplicate check:** DISTINCT — CR-555 added per-row risk badges on CancellationsMockup. This CR is about AUDIT report (AuditLogMockup.jsx) risk bands as interactive filters. BUG-730 fixed a mislabelled pill ("High Risk" → "Late Cancel") — different. No existing interactive-filter CR on AuditLogMockup.

**Code Reality:** NONE — risk bands are static summary tiles; no click handler or filter state.

**Blast radius:** SMALL (1–2 files: AuditLogMockup.jsx + possibly a filter util)

**Fast Lane eligible:** NO (component state change)

---

## CR-564 — Audit Report: High-Risk Cancellations — Date, Actioned By, Duration Columns

**Type:** CR | **Severity:** P2 | **Risk:** MEDIUM

**What:** The High-Risk Cancellations order list currently lacks three columns that the owner needs:
1. **Date** — the date the cancellation occurred
2. **Actioned By** — the name/login of the employee who performed the cancellation
3. **Cancellation Duration** — elapsed time between order placement and cancellation (minutes, or hh:mm where appropriate)

**Duplicate check:** DISTINCT — CR-524 / CR-554 added Punch Time + Duration to `CancellationsMockup.jsx` / `CancelDetailMockup.jsx`. This CR is for the **Audit Report** (AuditLogMockup.jsx) High-Risk section, a different page. The column names and data sources may differ.

**Code Reality:** NONE on AuditLogMockup for these three columns.

**Blast radius:** SMALL (1 file: AuditLogMockup.jsx; needs backend data availability check for `cancelled_by` / `actioned_by` field in insights-cancellations response)

**Open question for Planning (OD-564-01):** Does the insights-cancellations API already return `cancelled_by` / `actioned_by` and `cancellation_duration` fields? (Probe needed — can reuse Cafe103 patterns from CR-556 investigation)

**Fast Lane eligible:** NO (new columns + backend probe needed)

---

## CR-565 — Audit Report: Leakage After Unpaid — Date, Actioned By, Paid-to-Unpaid Duration Columns

**Type:** CR | **Severity:** P2 | **Risk:** MEDIUM

**What:** The Leakage After Unpaid section needs three additional columns:
1. **Date** — when the unpaid/cancellation action occurred
2. **Actioned By** — the employee who performed the unpaid action
3. **Paid-to-Unpaid Duration** — elapsed time between order being marked Paid and subsequently changed to Unpaid

**Duplicate check:** DISTINCT — no existing CR for Leakage After Unpaid extra columns. RELATED to CR-564 (same column types, different audit section).

**Code Reality:** NONE for these columns in the Leakage section.

**Blast radius:** SMALL (1 file: AuditLogMockup.jsx)

**Open question for Planning (OD-565-01):** Does the insights-dashboard API return `actioned_by` and timestamp data for the make_unpaid event? (BUG-709 noted that `make_unpaid` events persist after cancel; probe confirmed in BUG-709 investigation)

**Fast Lane eligible:** NO (new columns)

---

## CR-566 — Audit Report: Global Filters + Sorting Across All Sections

**Type:** CR | **Severity:** P1 | **Risk:** MEDIUM

**What:** Currently the Audit Report has limited / section-specific filters. Owner wants **global filter and sort controls** that work across the ENTIRE report (all sections where the data exists):

**Filters:**
- Date / Date Range
- Person / Actioned By (employee who performed the action)
- Category / Event Type (Doubt, Risk, High Risk, After Unpaid)

**Sorting:**
- Amount: highest → lowest, lowest → highest
- Duration: longest → shortest, shortest → longest
- Date: newest → oldest, oldest → newest
- Time: ascending / descending
- Actioned By: alphabetical / group by employee

**Key rule:** Filters and sorting must update records **dynamically without requiring export**.

**Duplicate check:** DISTINCT — CR-556 added filters to CancellationsMockup only. This is for the AuditLogMockup audit report page, covering all sections. CR-563 covers risk-band click-filter (additive/complementary, not duplicate).

**Code Reality:** NONE for global multi-filter + multi-sort on AuditLogMockup.

**Blast radius:** MEDIUM (1–2 files: AuditLogMockup.jsx + possibly new FilterBar component; may reuse FilterBar.jsx patterns from AllOrdersReportPage)

**Fast Lane eligible:** NO (significant new state management)

---

## CR-567 — Audit Report: Expandable Order Activity Logs (Inline)

**Type:** CR | **Severity:** P2 | **Risk:** MEDIUM

**What:** Each order row/tile in the Audit Report should be **clickable to expand** its full activity log directly below the order, inline. No navigation away.

**When expanded shows:**
- Date and time of each action
- Action performed
- Employee / login who performed it
- Previous and updated status (where applicable)

Clicking the same order collapses the log. Users can inspect multiple records without losing report context.

**Duplicate check:** DISTINCT — CR-509 (Order Beta: Order Details + Activity Logs) is about the Order Beta page, not the Audit Report. No existing expandable-row CR for AuditLogMockup.

**Code Reality:** NONE — order rows are static tiles on AuditLogMockup, no expand/collapse mechanism.

**Open question for Planning (OD-567-01):** Does the insights-cancellations/insights-dashboard API return per-event activity history for a given order ID, or does a separate `order-details` call need to be made on expand?

**Blast radius:** MEDIUM (1 file AuditLogMockup.jsx + possible API call on row expand)

**Fast Lane eligible:** NO (new interaction model + possible API call)

---

## Duplicate Check Summary

| ID | Against | Result |
|----|---------|--------|
| CR-563 | CR-555, BUG-730 | DISTINCT (different page, different behaviour) |
| CR-564 | CR-524, CR-554 | DISTINCT (AuditLogMockup, not CancellationsMockup) |
| CR-565 | (none found) | DISTINCT |
| CR-566 | CR-556 | DISTINCT (AuditLogMockup, global scope) |
| CR-567 | CR-509 | DISTINCT (different page) |

## Next: Planning Gate 2 for all 5 items (can batch as single IA session)
