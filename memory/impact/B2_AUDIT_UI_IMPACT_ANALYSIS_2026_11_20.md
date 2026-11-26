# Impact Analysis (Gate 2) — B2 · Audit-UI (BUG-730, BUG-739, BUG-722 FE)

**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-20
**Batch:** B2-AUDIT-UI (global order B4→**B2**→B5→B6→B1→B3)
**Stage dispatch:** owner picked PLANNING manually → **both** IA (this doc) + Implementation Plan (`plans/B2_AUDIT_UI_IMPLEMENTATION_PLAN_2026_11_20.md`).
**Items:** BUG-730 (P2), BUG-739 (P3), BUG-722 FE slice (P0/P1). BUG-722 backend slice = B3.
**Live-probed:** preprod `owner@cafe103.com` — evidence `evidence/B2-AUDIT-UI/` (PROBE_NOTES + 7d audits json).

---

## Header — Code Reality + Conflict Pre-Check

**Code Reality: PARTIAL.** Audit Report v3 exists and works (`AuditLogMockup.jsx`, 475 lines, component `AuditReportPage`). All three items are defects/omissions in shipped code, not greenfield.
- `pages/reports-module/AuditLogMockup.jsx` — single page owner of all FE edits.
- `utils/riskTier.js` — shared tier helper (CR-555) already present (`getRiskTier`, thresholds 5/15/30).
- `utils/reportExporter.js` — Excel/PDF builder; Summary sheet rows at L283-298.
- `api/services/insightsService.js` `fetchInsightsDashboard` L600-606; `api/axios.js` global `timeout:60000` L18.

**Conflict Pre-Check:**
| Item | File | Status | Conflict? |
|---|---|---|---|
| CR-543/544/546, CR-528 | AuditLogMockup.jsx | GATE_5A_IMPLEMENTED | NO — shipped; these are additive fixes |
| BUG-695/697/698/699/700 | AuditLogMockup.jsx | fixes already in file (L35,116,146,194,215) | NO — same-file, already landed |
| BUG-696 / BUG-719 | insightsService.js / backend | IA done / backend brief filed | **CONSOLIDATE** — BUG-722 is the same insights-dashboard latency root cause |
| CR-555 | utils/riskTier.js | IMPLEMENTED | NO — reuse, do not modify |

**Verdict:** CLEAN. `AuditLogMockup.jsx` is NOT an R5 hotspot. Do NOT touch `axios.js` global timeout (R1) or `riskTier.js`.

**Risk roll-up:** BUG-730 LOW (FE de-mislabel) + MEDIUM/backend (true tier column); BUG-739 LOW; BUG-722 FE LOW (clear-stale + disable-download), backend MEDIUM (B3).

---

## BUG-722 (FE slice) — 30D/LM/FY timeout + stale KPIs + Download-on-error · Risk LOW (FE) / MEDIUM (backend)

**Live reproduction:** 30D request aborts at **63.7s** (exceeds 60s); 7D = 46.7s/200. (evidence/PROBE_NOTES)

**Data flow:** `fetchData` (L221-227) → `fetchInsightsDashboard` → `api.post(INSIGHTS_DASHBOARD)` on shared axios (`timeout:60000`). On abort the catch (L225) sets `error` **but does not clear `rawData`** → `analytics` memo (L231) stays populated → KPI bar + cards keep showing the **previous range's numbers** under the error shield, and the Download trigger (`disabled={isLoading || !analytics}`, L349) **stays enabled** → user can export stale data under the new date label.

**Root cause:** (1) PRIMARY — backend latency on `insights-dashboard` for wide ranges (B3; `backend_briefs/BACKEND_BRIEF_2026_11_19_INSIGHTS_DASHBOARD_TIMEOUT.md`). (2) SECONDARY (FE, this batch) — page does not clear/disable on error.

**Fix direction (FE, unblocked):** on error clear `rawData` (so `analytics`→null blanks KPIs/cards AND auto-disables Download). Optional defensive `|| !!error` on the Download trigger. Do NOT raise global axios timeout (R1). Per-request timeout bump deferred to OD-696-01 + backend outcome.

**Owner decisions:** none for the FE clear/disable. Backend = B3 (OD-696-01 interim cap value).

---

## BUG-730 — drill-down "High Risk" on every row; no Risk/Duration column; rows not time-ordered · Risk LOW (FE) + backend-blocked (column)

**What the user sees:** every Card-1 (late-cancel) drill-down row shows a red **"High Risk"** pill in the "Cards" column — even doubt/risk-tier rows.

**Root cause (traced):** the "Cards" column renders `<OverlapBadges>` (L171) from `classifyEvent(e)` (L61-67). For any `late_cancel`, `CARD_1_TYPES.has('late_cancel')` pushes `'card1'`, and `CARD_BADGES.card1.label === 'High Risk'` (L87). So the pill asserts "High Risk" on **every** card-1 row regardless of the row's true tier. The card is already titled "High Risk Cancellations", so the per-row pill is both redundant and wrong.

**No true tier/duration per row — backend-blocked (confirmed live):** events in `audits.orders[]` carry **no `risk_level` and no `duration_minutes`** (0/N in probe). The Excel export already declares `risk_level` + `duration_minutes` columns (reportExporter columns L291-292) → they export **blank**. The analytics tiering (`e.risk_level || getRiskTier(e.duration_minutes)`, L238-240) therefore collapses to `getRiskTier(undefined)='ok'`; the only real tier signal lives in the **summary counts** `late_cancel_doubt/risk/high_risk_count`. A genuine per-row Risk tier + Duration column needs the backend to add those fields per late-cancel event (or `created_at`+`cancel_time_full` so the FE derives via `riskTier.durationMins`).

**Multi-day time ordering:** drill-down renders events in payload order with no sort; make_unpaid rows have no timestamp field at all, late-cancel rows would need `cancel_time`. Ordering is only meaningful once a per-event timestamp is reliably present → tie to the same backend ask.

**Fix split:**
- **(a) FE, unblocked:** stop mislabeling — rename the card-1 overlap pill from "High Risk" to a bucket-accurate label (e.g. "Late Cancel"). Removes the "High Risk on every row" defect immediately.
- **(b) OD + backend:** add a real per-row **Risk tier** badge (Doubt/Risk/High Risk via `riskTier.js`) and a **Duration** column — needs OD-730 (which columns/placement) AND backend per-event `risk_level`+`duration_minutes`.

**Owner decision:** **OD-730** — confirm the drill-down column set (add Risk-tier badge? add Duration? reorder multi-day by time?). Agent will NOT guess (R3).

---

## BUG-739 — "Total Events" counts orders not events; Excel Summary gaps; Risk raw · Risk LOW

**(a) Total Events mislabel/count (OD-blocked):** `analytics.totalEvents = uniqueOrderIds.size` (L252, L269) → KPI shows **unique orders** (live: 1) while there are **3 events** (`audits.total`=3). Two clean fixes, owner must choose:
- **Relabel** KPI "Total Events" → "Orders Flagged" (keep unique-order count), OR
- **Recount** to true events: `analytics.totalEvents = allEvents.length` (or `audits.total`, already provided) and keep the "Total Events" label.
Both are 1-line FE once decided. → **OD-739.**

**(b) Excel Summary — Restaurant ID + Generated By empty (FE, unblocked):** `buildExportPayload` (L276-287) passes `restaurant:{ name }` (no `id`) and `generatedBy: restaurant?.ownerName`. `restaurant.id`/`.name` exist in the profile transform (profileTransform L111-112) but **`restaurant.ownerName` does not exist** → always blank. reportExporter Summary writes `restaurant?.id` (L288) and `generatedBy` (L292) → both blank today.
- Fix: pass `id: restaurant?.id`. For Generated By, use a real source — logged-in user email (`localStorage 'user_email'`, STORAGE_KEYS.USER_EMAIL) or role name (`role_names` from login). Minor source pick (default: user email).

**(c) Risk exported raw `high_risk` (coupled to BUG-730 backend):** export column `risk_level` is `format:'text'` → prints the raw enum. A label map (`high_risk`→"High Risk") is a trivial FE formatter, but it only matters once per-event `risk_level` actually arrives (currently blank) → sequence after BUG-730(b).

**Owner decision:** **OD-739** (relabel vs recount) + micro-pick for Generated By source (recommend user email).

---

## Combined Blast Radius

| File | Items | Approx lines | Risk | Blocked? |
|---|---|---|---|---|
| `AuditLogMockup.jsx` | 722-FE (clear stale), 730(a) label, 739(a) count, 739(b) payload id/generatedBy | ~6-10 | LOW | (a)-parts unblocked; 739(a) needs OD-739; 730(b) needs OD-730+backend |
| `utils/reportExporter.js` | 739(c) risk label map (optional) | ~2 | LOW | coupled to backend risk_level |
| `insightsService.js` / `axios.js` | 722 per-request timeout | 0 now | — | DEFER (OD-696-01 + backend); axios global DO NOT TOUCH |
| Backend `insights-dashboard` (Gyan, B3) | 722 latency + per-event risk_level/duration_minutes | n/a | MEDIUM | BACKEND |

**Files WILL change (unblocked parts, Gate 3):** `AuditLogMockup.jsx` (+ `reportExporter.js` only if 739(c) taken now).
**Files WILL NOT touch:** `axios.js`, `riskTier.js`, `InsightsCacheContext.jsx`, `datePresets.js`, any transform, any other report page.

---

## Owner Decision Queue (BLOCK Gate-4 for the blocked parts)

> **RESOLVED 2026-11-20** (record: `control/OWNER_DECISIONS_B2_2026_11_20.md`): **OD-739 = RECOUNT** (true event count, label stays "Total Events") → P2 unblocked. **OD-730 = YES** (add Risk-tier badge + Duration col + time-order) → approved but BACKEND-BLOCKED; brief filed `backend_briefs/BACKEND_BRIEF_BUG-730_2026-11-20.md`. OD-739-b = default (user email).


| # | Item | Decision needed | Recommendation |
|---|---|---|---|
| **OD-730** | BUG-730 | Drill-down columns: add a true per-row **Risk tier** badge and a **Duration** column? Reorder multi-day rows by time? (Requires backend to send per-event `risk_level`+`duration_minutes`.) | Add Risk-tier badge + Duration col + time-order; raise backend brief |
| **OD-739** | BUG-739 | "Total Events" KPI: **relabel** to "Orders Flagged" (keep unique-order count) **or recount** to true event count (`audits.total`)? | Recount to true events (label stays accurate; backend already sends `total`) |
| OD-739-b | BUG-739 | "Generated By" source for Excel (no `ownerName` on restaurant) | logged-in user email |

**Backend brief needed (feeds B3 + BUG-730):** add per-event `risk_level` + `duration_minutes` (or `created_at`+`cancel_time_full`) to each `audits.orders[]` late-cancel event; optimise wide-range latency (<60s).

---

## Verification Matrix (seeds Gate 3 / QA)

| # | Item | Check | Method | Automated? |
|---|---|---|---|:--:|
| V1 | 722-FE | Force a timeout (30D) → KPI bar + 3 cards disappear (no stale numbers); Download trigger disabled | Browser (cafe103, 30D) | NO |
| V2 | 730(a) | Card-1 drill-down "Cards" pill no longer says "High Risk" on every row | Browser + DOM | NO |
| V3 | 739(a) | After OD-739: Total Events reflects the chosen semantic (3 not 1 for the 7D cafe103 case, if recount) | Browser | NO |
| V4 | 739(b) | Excel Summary shows Restaurant ID and a non-blank Generated By | Download .xls, open Summary | NO |
| V5 | 730(b)/739(c) | After backend delivers per-event risk_level/duration: tier badge + Duration col populate; Excel Risk reads "High Risk" | Browser + Excel | NO (post-backend) |
| V6 | all | Webpack 0 new warnings | dev server | YES |

```
Impact Analysis complete — B2 (BUG-730, BUG-739, BUG-722 FE).
Code reality: PARTIAL. Conflict: CLEAN (consolidate 722 with 696/719; same-file batch).
Live-probed cafe103: 30D timeout 63.7s; per-event risk_level/duration ABSENT; totalEvents=unique orders bug confirmed.
Unblocked now: 722-FE clear-stale+disable-download, 730(a) de-mislabel, 739(b) Excel id/generatedBy.
Blocked: OD-730 (+backend per-event fields), OD-739 (relabel vs recount), 722 true fix (B3).
Awaiting owner on OD-730 / OD-739 → Gate 3 for the blocked parts; Gate 3 plan already drafted for the unblocked parts.
```
