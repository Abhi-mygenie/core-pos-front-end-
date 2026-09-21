# SESSION HANDOVER — 2026-09-21 — CR-385 Phase 0.5 (Bug Fix + QA) CLOSED — awaiting owner Phase 0 smoke

```
Roles this session: Bug Fix (Role 5) → QA (Role 4) · ALPHA v0.7 · owner "Phase 0.5 GO" (severities confirmed)
Items:     BUG-434 · BUG-435 · BUG-436 · BUG-437 · BUG-438 → FIXED + QA-VERIFIED (P0.5, rounds 1–2) · BUG-439 → INTAKE (registered; routing open — rec. Fast Lane Bug Fix) · CR-385 → Gate 5B (P0+P0.5) CLOSED by owner 2026-09-21
Next:      OWNER combined Phase 0 smoke (§6 below) → say "Phase 0 smoke OK" → only then read phased plan §1 (Phase 1). Phase 1 NOT read, NOT started.
Sandbox:   restored (r4/8525 HK). 8524/8526 never touched. No bookings/payments. Credentials in memory/test_credentials.md (gitignored — re-extract from evidence/CR-385/probes_2026_09_20_final/run_gate4.py on a fresh pod; never echo).
Env note:  the repo `memory/` folder was not present under /app/memory on this pod (only in the clone at /tmp/pos-frontend) — copied in; /tmp is ephemeral (since wiped).
Reconciled: owner-approved sparse re-pull of `memory/` from remote pms21sep @ ce1e7c66 → 1,153/1,159 identical, 0 missing, 6 differ (= this session's control edits), 8 extra (= this session's new files). Structure identical. Temp clone deleted. See PRD.md 2026-09-21 reconciliation entry.
```

## 1 · Boot for the next agent (in order)
1. `memory/control/AGENT_PROMPT_ALPHA.md` (v0.7) → 2. this file → 3. `handover/MASTER_HANDOVER_2026_09_21_CR385_P0_TO_P0_5.md` (P0 as-built map §2, still valid; §3 bug table now closed) → 4. `plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md` §0, §0-bis, §0.5, §0.7 (do NOT read §1 before "Phase 0 smoke OK") → 5. `plans/CR-385_DESIGN_DECISIONS.md` D1–D71 → 6. `plans/CR-385_PHASE_0_5_BUGFIX_PLAN.md` → 7. `test_reports/QA_REPORT_2026_09_21_CR385_P0_5.md` + `/app/test_reports/iteration_7.json`, `iteration_8.json` → 8. `control/BUG_TRACKER.md`, `registry.json` (CR-385, BUG-431…438) → 9. source: the five §3 files below.

## 2 · What changed (all marked `// CR-385 M0.5 BUG-43x`, 37 lines, only master-handover §4.3 files)

| Bug | File · lines | Change |
|---|---|---|
| 434 | `pages/pms/FrontDeskWorkstationPage.jsx` L114, L133 · `components/pms/frontdesk/RoomsPanel.jsx` L2, L12, L44 | `fd-retry-btn` / `fd-rooms-retry-btn`: `disabled={refreshing|retrying}` + `aria-busy` + `<Loader2 animate-spin/>` + "Retrying…"; page passes `retrying={refreshing}` to RoomsPanel |
| 435 (D71) | `FrontDeskWorkstationPage.jsx` L27–54 | `export const useFrontDeskSnapshot` (named export for RTL); `inFlightRef` — a second `refresh()` returns the in-flight promise (coalesced, never dropped; `await refresh()` after PATCH still works); `lastFetchRef` set on success; focus handler returns early when `< 5000 ms` since last success |
| 436 | `FrontDeskWorkstationPage.jsx` L122 | `<main data-testid="fd-workstation-body">` (fd-page kept on the outer wrapper) |
| 437 (D70) | `FrontDeskWorkstationPage.jsx` L24 · `ArrivalsPanel.jsx` L32, L38–39, L54, L56 · `DeparturesPanel.jsx` L4, L26–27, L32, L34 | `DEFAULT_CHIP.arrivals/departures = null` (= auto); `export const firstNonEmptyChip(counts, order)` → first key with count > 0 in display order, all-zero → `'today'`; panels use `active = chip ?? firstNonEmptyChip(...)` (re-evaluates on every refresh until a chip click / `navigateTo` sets a value → pinned for the session; reload resets). In-House / Rooms unchanged (`'all'`) |
| 438 | `__tests__/GuestTable.cr385.test.jsx` (NEW, 4) · `__tests__/GlobalSearch.cr385.test.jsx` (NEW, 5) · `__tests__/phase05.cr385.test.jsx` (NEW, 7 — also covers 434/435/437) · `api/transforms/__tests__/frontDeskTransform.cr385.test.js` (+1 `isTurn` live-shaped) | cr385 suite 20 → **38** green |

Not changed: hotspots, legacy PMS pages, `frontDeskService.js`, `frontDeskTransform.js`, `GuestTable.jsx`, `GlobalSearch.jsx`, `.env`, mockup HTML (sha `12fd0f4a…1168b86`). Checklist evidence appended (`public/cr385-master-checklist.html` M0-01/02/03/10, X-10, X-12).

## 3 · Verification summary
- Repro-first: BUG-434/437 reproduced by failing RTL tests on the unfixed code; BUG-435 reproduced live (2 focus events → 3 batches; 2 overlapping ↻ → 2 extra calls); BUG-436 by DOM (fd-page wrapped Sidebar); BUG-438 = missing files.
- Unit 38/38 · grep guards (money keys, `toISOString().slice`, `new Date().getDate`) 0 · "Channel Manager" in `frontdesk/` + page 0 · `yarn build` exit 0 · webpack compiled.
- QA Run A `iteration_7.json`: 8/10 PASS; 2 FAIL disproved by a network-timed probe (focus ≥7 s after last response → 1 batch; Retry recovery 1.8 s) — cause: preprod degraded (login 11.6 s, LR 6.9 s, 60 s timeout at boot) and idle measured from the click. Run B `iteration_8.json`: 15/15 P0 matrix at 1366×768 incl. Rooms retry + r4 round-trip restored. Zero console errors both runs. Report: `test_reports/QA_REPORT_2026_09_21_CR385_P0_5.md`.

## 4 · Open items / routing (unchanged)
- BUG-431/432 → DEFERRED-TO-P2 (entry conditions) · BUG-433 → DEFERRED-TO-P3 (entry condition; backend brief early in P3).
- **Re-test round 2 (owner-requested, `/app/test_reports/iteration_9.json`):** the two round-1 FAILs + the BLOCKED case + coalescing → 4/4 PASS independently with request timelines. **New MINOR finding → BUG-439** (duplicate `data-testid` for row actions while a row is expanded — pre-existing P0 code in `RowExpansionStub`/panels, all three guest tabs; intake `change_requests/BUG-439_…_INTAKE.md`). **Owner D72 (2026-09-21): accepted MINOR, Gate 5B (P0+P0.5) CLOSED; BUG-439 registered by Intake, routing OPEN (owner decides).** Intake recommendation: Fast Lane Bug Fix (LOW risk, no hotspots, ~8 lines: suffix the expansion copy of the actions, e.g. `fd-row-<id>-exp-<action>`, + extend `GuestTable.cr385.test.jsx`); Planning only if batched into Phase 1. Any route: QA duplicate-testid check with a row expanded on all three guest tabs.
- QA-protocol note for every future run: measure debounce "idle" from the **last snapshot response**; use ≥60 s waits on preprod; correct testids are `fd-tab-<id>-count`, `fd-header-greeting`, `fd-header-date`, `fd-sync-pill`, `fd-new-booking-btn`, `fd-alert-bar`/`fd-alert-more`/`fd-alert-popover`.

## 5 · Registry / doc state
`registry.json` CR-385 `GATE_5B_QA_PASSED (P0+P0.5)` (+ `files_p0_5`, status_history), BUG-434…438 `QA-VERIFIED (P0.5)` (+ `fixed_in`, FIXED/QA-VERIFIED history) · `BUG_TRACKER.md` rows + header · `CR_REGISTRY.md` · `CONTROL_DASHBOARD.md` · `FILE_OWNERSHIP.md` (P0.5 section) · `PRD.md` · master checklist · `plans/CR-385_PHASE_0_5_BUGFIX_PLAN.md` · `test_reports/QA_REPORT_2026_09_21_CR385_P0_5.md` · evidence `evidence/CR-385/qa_2026_09_21_p0_5/`.

## 6 · COMBINED PHASE 0 OWNER SMOKE (phased plan §0.5 + master handover §4.4) — ≈12 min, read-only except step 4

Log in as the owner, then:
1. Sidebar → **Rooms & Reservations → Front Desk (Beta)**. The page opens on **Arrivals**; the header shows your first name and today's business date; the pill says "synced just now"; **New Booking** is greyed.
2. **Chips (BUG-437):** Arrivals opens on **Late N** when Today is empty (today: Late 10), or on Today when it has rows — never on an empty table while another chip has rows. Click **Today 0** → "No today arrivals"; click ↻ → Today stays selected. Reload → back to Late.
3. **Tiles = old pages:** Arrivals count = `/pms/arrivals` Today count; In-House = `/pms/in-house` rows; Rooms "N free" = `/pms/room-status` Available count. Must be identical.
4. **Departures** → chips Overdue / Today / Tomorrow / Upcoming (opens on the first non-empty). Click a row → expands (actions greyed "Phase 3/4"); `Esc` closes; focus a row and press `↓` `↑` → highlight moves, `Enter` opens, `Esc` closes (BUG-438).
5. **Rooms** → Group by **Area** → Ground Floor · First Floor · 2nd Floor · 3rd Floor · Patal Lok. Click an occupied tile → guest, dates, balance from the server. Click **r4 (HK)** → **Mark Clean** → button greys with a spinner ≈5 s → tile Available → **Request HK** → back to HK (the only write in Phase 0; r4/r5/r1 only).
6. Type `/`, search a guest name or the last 4 digits of a phone → grouped results; click → jumps to the row.
7. **Retry (BUG-434):** DevTools → Network → Offline; click ↻ → red error card; click **Retry** → the button greys, shows a spinner and "Retrying…", cannot be clicked twice; set Online; click Retry → the page returns within a few seconds.
8. **One batch (BUG-435):** with DevTools Network open, filter `aiosell`; switch browser tab for ≥10 s, come back and click ↻ **immediately** → exactly **one** batch of three calls (`local-reservations`, `room-status-board`, `dashboard-kpis`), not two. Click ↻ twice quickly → still one batch.
9. Old `/pms/front-desk` looks exactly as before.

Say **"Phase 0 smoke OK"** (or list what's wrong — anything found goes to intake and stays in Phase 0.5).

## 7 · Formal lines
Bug Fix → QA: "Fixes done. BUG-434/435/436/437/438 in one batch, repro-first, 37 marker lines, §4.3 files only. Unit 38/38, build exit 0, hotspots clean. Registry synced: YES."
QA → Owner: "QA complete. Run A 10/10 (round-2 independent re-test 4/4 confirms the 2 disputed cases), Run B 15/15. 0 BLOCKER/MAJOR, 1 MINOR (BUG-439, owner to decide ship-or-fix), 3 NOTE. Registry SYNCED — CR-385 GATE_5B_QA_PASSED (P0+P0.5), BUG-434…438 QA-VERIFIED. EXIT GATE 5/5. Ready for Gate 6 owner combined Phase 0 smoke."
