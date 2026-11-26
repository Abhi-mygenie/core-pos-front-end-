# CR-497 — Daily and Weekly Summary (Crisp)

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (operational visibility: owner needs at-a-glance business performance)
**Risk:** MEDIUM (new report/dashboard feature, no existing logic modified)
**Process required:** Full gate flow. FAST LANE eligible? **NO** (new page/component)
**Sprint:** TBD

---

## Description

A crisp daily and weekly summary view that gives the restaurant owner/manager a quick at-a-glance overview of business performance. This should be concise — not a full analytics dashboard, but key numbers that matter.

**Expected behavior:**
- **Daily Summary:** Total revenue, total orders, average order value, cancellations count + value, top 5 items, payment method breakdown (Cash/Card/UPI), comp orders count
- **Weekly Summary:** Same KPIs aggregated for the week, day-over-day trend, best/worst day comparison
- Accessible from dashboard or sidebar
- Printable / shareable (ties to CR-424 WhatsApp/Email reports)

**Current behavior:** Daily Report exists but is detailed/complex. No crisp summary view. Insights pages are analytics-heavy. Owner needs a quick "how did today go?" answer.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** N/A (new feature)
- **Confidence:** N/A

---

## Code Reality Check

**Code reality: PARTIAL** — Daily Report page exists (`DailyReportPage`). Settlement report exists. Various insights mockups exist (`HourlySalesMockup`, `TaxDetailMockup`, etc.). But no crisp summary component. Data sources (order APIs, settlement APIs) are available.

---

## Duplicate Check

**RELATED** to:
- CR-444 (Revenue Report with all discounts/cancellations — INTAKE): overlapping KPIs but full report scope
- CR-474 (Datewise Sales Revenue Report — INTAKE): sales data, different format
- CR-485 (Reports UI improvements — INTAKE): UI enhancement, not new summary

**Verdict: DISTINCT** — no existing item is a crisp daily/weekly summary.

---

## Blast Radius

- New component/page (no existing code modified)
- Data from existing APIs (orders, settlement, products)
- Sidebar entry (if standalone page)
- Estimated scope: LARGE (new page + service + transforms, 5+ files, ~200+ lines)

---

## Open Questions

- **OD-497-01:** Should this be a new page in the sidebar, or a summary card on the existing dashboard?
- **OD-497-02:** What KPIs are mandatory for the daily summary? (Revenue, orders, cancellations, comp, payment split — anything else?)
- **OD-497-03:** Should the weekly summary be a separate view or a toggle on the same page?
- **OD-497-04:** Should it support date selection (view summary for any past day/week)?
- **OD-497-05:** BACKEND DEPENDENCY — Is there a dedicated summary API, or should the FE aggregate from existing endpoints?
