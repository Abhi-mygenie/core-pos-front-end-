# Batch Intake — Cancellation Reports QA-found gaps — 2026-11-19

**Role:** INTAKE (ROLE 1) · Source: QA-FOUND (testing_agent iteration_8, 2026-11-19) · Triage/registration only — no code changed.
**Context:** Post-implementation QA of the cancellation-reports batch (BUG-713, BUG-708, CR-554, CR-555, CR-556). All 5 items PASSED in the live UI (owner@cafe103.com, Cafe 103, window 2026-10-01..11-19, 65 cancelled lines). QA surfaced 6 residual gaps, registered below as BUG-714..BUG-719.
**Code reality:** Items BUG-714..718 are defects inside the freshly-implemented batch (code EXISTS → fix, not retroactive registration). BUG-719 is pre-existing backend latency, independent of this batch.
**Duplicate check:** All DISTINCT. RELATED to CR-556 (filters), CR-554 (detail parity), CR-524 (added punch/duration), CR-546/CR-528 (Audit). No existing open item covers these symptoms.
**Client:** ALL · **Release target:** 2026-11-17 sprint (nov_cr_batch)

---

## BUG-714 — Scope filter persists after switching scope tabs (hidden → 0 rows, no visible cause)
- **Classify:** BUG · **Severity:** P2 MEDIUM (filter/navigation; works but awkward; no data loss) · **Risk:** LOW · FAST LANE eligible: YES (owner approval)
- **Area:** Reports / Analytics · **Assignee:** Abhishek (FE, not backend-blocked) · **Relates:** CR-556
- **Evidence:** QA-reproduced. On the *All* scope tab set `cx-filter-scope`=Full Order, then click the Item-Level tab (`cancellations-scope-item`). Result: 0 records + "No cancellations match the current filter". The scope select only renders on the *All* tab, so the stale `scopeFilter` is invisible and only Clear is shown → user cannot see the cause. · Confidence: CONFIRMED.
- **File:** `src/pages/reports-module/CancellationsMockup.jsx` (scope-tab onClick + `filteredTable` scopeFilter clause).
- **Fix direction (planning):** reset `scopeFilter` on scope-tab change, OR ignore `scopeFilter` when `activeScope !== 'all'`.
- **Blast radius:** 1 file, 1 component.

## BUG-715 — Punch Time shown in browser timezone, disagrees with Order/cancel time (both screens)
- **Classify:** BUG · **Severity:** P2 MEDIUM (misleading display; no data corruption) · **Risk:** LOW
- **Area:** Reports / Analytics · **Assignee:** Abhishek · **Relates:** CR-524, CR-554, CR-555
- **Evidence:** QA-reproduced. Punch Time uses `new Date(created_at).toLocaleString()` with no `timeZone`, so it renders in the browser TZ, while the Order column (report) and `cancel_date`/`cancel_time` (detail) are IST wall-clock strings. In a UTC browser, #019208 shows Order '01 Oct, 10:23 pm' but Punch '01 Oct, 04:47 pm' (created_at 22:17+05:30) — looks ~5.5 h apart though Duration = 6 min. · Confidence: CONFIRMED.
- **Files:** `CancellationsMockup.jsx` + `CancelDetailMockup.jsx` (Timing & Risk punch-time formatting).
- **Fix direction:** pass `timeZone: 'Asia/Kolkata'` (or restaurant timezone) when formatting punch time.
- **Blast radius:** 2 files.

## BUG-716 — Item Cancellation Detail: no empty-state row when filters match nothing
- **Classify:** BUG · **Severity:** P3 LOW (minor display) · **Risk:** LOW
- **Area:** Reports / Analytics · **Assignee:** Abhishek · **Relates:** CR-556
- **Evidence:** QA-reproduced. When the 5 detail filters (`s28-filter-*`) exclude all rows, `<tbody>` renders empty with only the TOTAL footer — the report screen has a `colSpan=7` message, the detail screen does not. · Confidence: CONFIRMED.
- **File:** `src/pages/reports-module/CancelDetailMockup.jsx` (tbody).
- **Fix direction:** add an empty-state row (colSpan 7) when `analytics.items.length === 0`.
- **Blast radius:** 1 file.

## BUG-717 — Item Cancellation Detail polish (subtitle, raw Order timestamp, scope option order)
- **Classify:** BUG (cosmetic bundle) · **Severity:** P3 LOW · **Risk:** LOW
- **Area:** Reports / Analytics · **Assignee:** Abhishek · **Relates:** CR-554, CR-556
- **Evidence:** QA-observed. (a) Subtitle still reads "filterable by stage & reason" though there are now 5 filters; (b) Order cell shows raw `2026-10-01 22:23` while the report shows formatted `01 Oct, 10:23 pm`; (c) Scope option order is Item-Level then Full Order, whereas the report uses Full Order then Item-Level. · Confidence: CONFIRMED.
- **File:** `src/pages/reports-module/CancelDetailMockup.jsx`.
- **Fix direction:** update subtitle text; format the Order date like the report; align scope option order.
- **Blast radius:** 1 file.

## BUG-718 — Exports: Punch Time column holds raw ISO string
- **Classify:** BUG · **Severity:** P3 LOW · **Risk:** LOW
- **Area:** Reports / Analytics (export) · **Assignee:** Abhishek · **Relates:** CR-554
- **Evidence:** QA-observed. The new Punch Time export column outputs the raw `2026-10-01T22:17:29+05:30` ISO string instead of a human-friendly value. · Confidence: CONFIRMED.
- **File:** `src/pages/reports-module/CancelDetailMockup.jsx` (buildExportPayload) — optionally the shared report-export config.
- **Fix direction:** pre-format punchTime for the export row (or add a formatter), keeping timezone consistent with BUG-715.
- **Blast radius:** 1 file.

## BUG-719 — Audit Report full 50-day range times out (insights-dashboard ~78 s > 60 s axios timeout)
- **Classify:** BUG · **Severity:** P1 HIGH (feature unusable for full window; workaround = narrower range) · **Risk:** MEDIUM · **BACKEND-BLOCKED**
- **Area:** Reports / Analytics (backend latency) · **Assignee:** Gyan (backend-blocked, non-inventory/non-PMS) · **Relates:** CR-546, CR-528 (Audit Report)
- **Evidence:** QA-reproduced. `/reports-module/audit-log` with 2026-10-01..11-19 shows "Failed to load report data — timeout of 60000ms exceeded"; narrower windows (e.g. 11-01..11-07) load fine. Backend insights-dashboard ~78 s for 50 days. **NOT caused by the getRiskTier refactor** (Audit renders correctly on normal ranges, no console errors). · Confidence: CONFIRMED.
- **Fix direction:** backend to optimise insights-dashboard for wide windows; optionally raise the client axios timeout / paginate. Owner to route to backend channel.
- **Blast radius:** backend endpoint; FE timeout config only.

---
**Intake complete:** BUG-714, BUG-715, BUG-716, BUG-717, BUG-718, BUG-719 registered (GATE_1_INTAKE). Proposed severities applied via rubric — owner may override. Next: PLANNING (Gate 2/3) for the FE-ready items (714–718 can batch; 719 is backend-blocked).
