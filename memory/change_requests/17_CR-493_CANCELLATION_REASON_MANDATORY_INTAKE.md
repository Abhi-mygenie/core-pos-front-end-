# CR-493 — Cancellation Reason (Mandatory on Every Cancellation)

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (accountability: cancellations without reasons can't be audited)
**Risk:** HIGH (touches order cancel flow, reports, printing — R5 hotspot)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**
**Sprint:** TBD

---

## Description

When an order or item is cancelled, the staff should be REQUIRED to select a cancellation reason from the backend-provided reasons list (`/api/v1/vendoremployee/cancellation-reasons`). Currently, the cancellation flow may allow cancellation without selecting a reason, or the reason selection is not enforced consistently across all cancel paths (order cancel, item cancel, after-serve cancel).

**Expected behavior:** Every cancellation (order-level and item-level) must require a reason selection from the dropdown before the cancel action can proceed. The reason should be sent in the API payload and visible in reports.

**Current behavior:** Cancellation reasons API exists and is consumed in insights/reports, but enforcement at the point of cancellation may be inconsistent. BUG-440 (Cancel Dialog Reasons Empty) suggests the reasons dropdown was empty in some flows.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Cancel an order or item → check if reason is mandatory
- **Confidence:** SUSPECTED (cancellation_reasons API exists at `constants.js:111`, used in insights but enforcement at cancel point needs verification)

---

## Code Reality Check

**Code reality: PARTIAL** — `CANCELLATION_REASONS` endpoint exists in `constants.js`. `insightsService.js` fetches and uses reasons for reports. `pmsService.cancelReservation` takes a `reason` param. BUG-440 (Cancel Dialog Reasons Empty) is in INTAKE — related issue.

---

## Duplicate Check

**RELATED** to:
- BUG-440 (Cancel Dialog Reasons Empty — INTAKE): the dropdown shows empty → related root cause
- BUG-603 (cancel_type overwrites stage — INTAKE): cancel type handling
- BUG-604 (cancel_type unknown/null — INTAKE): cancel data integrity

**Verdict: DISTINCT** — this CR is about mandatory enforcement, not empty dropdown (BUG-440) or data integrity (BUG-603/604).

---

## Blast Radius

- `cancelOrder` / `cancel` referenced in ~40+ lines across ~8 files
- Hotspot files touched: YES — `DashboardPage.jsx` (cancel handler), `OrderEntry.jsx`, `orderTransform.js` (R5)
- Estimated scope: MEDIUM (3-5 files, ~20-30 lines)

---

## Open Questions

- **OD-493-01:** Should the reason be mandatory for BOTH order-level and item-level cancellations, or only order-level?
- **OD-493-02:** Should the reason dropdown also allow a free-text "Other" option with a notes field?
- **OD-493-03:** Is this related to BUG-440 (empty reasons dropdown)? Should BUG-440 be fixed as a prerequisite?
