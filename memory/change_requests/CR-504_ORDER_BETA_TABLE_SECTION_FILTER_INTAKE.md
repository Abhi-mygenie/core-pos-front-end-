# CR-504 — Order Beta Report: Table Section-wise Filter

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P2 — MEDIUM (filtering convenience for multi-section restaurants)
**Risk:** MEDIUM (new filter in FilterBar, no billing/payment logic)
**Process required:** Full gate flow. FAST LANE eligible? **NO** (FilterBar shared component)
**Sprint:** TBD
**Source:** Order Beta Report Enhancement Requirements Excel (Item #2)

---

## Description

Add a **Section dropdown** filter to the Order Beta report. Sections are configured during table creation (e.g., "Outdoor", "AC Hall", "Rooftop"). Selecting a section shows only orders from tables assigned to that section. Newly created sections should appear automatically without manual setup.

**Expected behavior:**
- New dropdown filter "Section" in the filter bar
- Populated automatically from all sections configured during table creation
- Selecting a section filters orders to only those from tables in that section
- Works alongside existing filters (Pay Type, Payment, Channel, etc.)
- New sections appear without manual configuration

**Current behavior:** No section filter exists. FilterBar has: Pay Type, Payment, Channel, Platform, Punched By, Collected By, Status, PG filters.

---

## Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Screenshot:** Filter bar visible — no Section dropdown
- **Confidence:** CONFIRMED

---

## Code Reality Check

**Code reality: NONE** — `FilterBar.jsx` (403 lines) has no section filter. Section data would need to come from table configuration API. No `section` or `tableSection` references in report modules.

## Duplicate Check

**DISTINCT.**

## Blast Radius

- `FilterBar.jsx` — add Section dropdown
- `OrderReportBetaPage.jsx` — filter state + API query param
- `reportService.js` — pass section filter to API (or client-side filter)
- Estimated scope: MEDIUM (3 files, ~25-35 lines)

## Open Questions

- **OD-504-01:** Is section data available in the order API response, or does it need a separate API call to fetch table→section mapping?
- **OD-504-02:** Should this filter be available on ALL tabs or only "All Orders" and specific tabs?
