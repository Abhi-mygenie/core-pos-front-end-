# BUG-483 — Dashboard Graphs in New POS Show Function Error — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)
**Note:** recharts is confirmed at v2.15.4 (BUG-465 fix applied) — this is a DIFFERENT issue.

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — dashboard unusable |
| Risk | MEDIUM — display/data issue |
| Area | Dashboard / Charts / New POS / Insights |
| Duplicate check | DISTINCT from BUG-465 (recharts version — already fixed) |
| Code reality | FE — `DashboardMockup.jsx` uses LineChart/BarChart from recharts |
| Fast Lane | NO |

---

## Description

The **Dashboard graphs in the New POS** (Insights Dashboard at `/reports-module/dashboard`) display a **“Function Error”** message. The charts do not render.

> Note: recharts package is confirmed at v2.15.4 (BUG-465 fix for Terser crash already applied). This is a separate runtime data error.

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Browser console error | **OWNER TO PROVIDE** — needed for root cause |
| Confidence | REPORTED |

---

## Blast Radius

- FE: MEDIUM — `DashboardMockup.jsx`, `insightsService.js`
- Scope: SMALL (dashboard charts page)

---

## Open Questions — OWNER WILL ANSWER LATER

- **OD-483-01 (BLOCKER):** What does the browser console show when the error occurs? Please copy the exact error message.
- OD-483-02: Is it all charts on the dashboard, or specific ones?
- OD-483-03: Does it error on all restaurants or a specific one?
- OD-483-04: When did this start — was the dashboard ever working for this restaurant?

---

## Next Step

Need browser console error from OD-483-01 before investigation can proceed. Possible causes: null API data passed to recharts, API shape change in `fetchInsightsDashboard`, or a JS runtime error unrelated to recharts.
