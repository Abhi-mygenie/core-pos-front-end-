# BUG-446 — Old Arrivals / Room Status pages show the browser's date instead of the property business date

**Registered:** 2026-09-22 (INTAKE role, owner smoke session) · **Type:** BUG · **Priority:** P3 · **Risk:** LOW (header text only; lists still use server buckets) · **QA severity:** MINOR
**Duplicate check:** DISTINCT — RELATED CR-385 X-06 (Front Desk (Beta) reads `meta.business_date`), FU-385-C (retire old pages), CR-358 (owner of the old pages). No existing BUG for it (grep BUG_TRACKER "browser date"/"toLocaleDateString" = 0).
**Source:** AGENT-FOUND during owner smoke validation 2026-09-22 (old `/pms/arrivals` header "Monday, 21 September 2026" while Front Desk (Beta) shows "Tuesday, 22 September 2026" from the server) · **Confidence:** CONFIRMED (code read)
**Code reality:** EXISTS — `pages/pms/ArrivalsPage.jsx` L102 and `pages/pms/RoomStatusPage.jsx` L28 use `new Date().toLocaleDateString(...)` (device clock).

## Impact
Cosmetic on preprod (the sandbox clock vs. IST business date); on a real property it matters only around midnight / for a device with a wrong clock. Front Desk (Beta) is correct.

## Fix proposal (not applied)
Read `meta.business_date` from the reservations response the pages already fetch and format it (2 files, 2 lines). Fast Lane eligible. Alternative: no fix — retires with FU-385-C.

## Routing options
(a) DEFERRED-TO-FU-385-C · (b) Fast Lane one-liner in the next bug-fix sub-phase.

**Routed 2026-09-22 (owner, Phase 2 plan-note round): (a) DEFERRED-TO-FU-385-C** — "c=defer to FU-385-C". No code in Phase 2 / 2.5. Recorded in DESIGN_DECISIONS D81.
