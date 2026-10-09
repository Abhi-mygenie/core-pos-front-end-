# SESSION HANDOVER — 2026-09-22 — CR-385 Gate 5B P4 + P4.5 QA PASSED · P4.5b (D88) · BUG-450 mini-gate · Gate 6 combined smoke pre-read
Read with `control/AGENT_PROMPT_ALPHA.md` (QA role §, Fast Lane §). Owner-driven, gate-by-gate. **Wait for "GO combined smoke — logged in" before facilitating any smoke row. No Phase 5 planning yet.**

## 1. State of record
| Item | State | Evidence |
|---|---|---|
| CR-385 Phases 0–1.5 | Owner-smoked, closed | earlier handovers |
| Phase 2 (M1/M3), Phase 3 (M4/M5), BUG-447 | Coded, Gate 5B QA PASSED, **owner smoke deferred (D84 → D86)** | it.17/18/19/20, `QA_REPORT_*_P3_ROLE4.md` |
| Phase 4 (M6 Bill/Checkout) + 4.5 (BUG-448) | Coded (`284d74cb` + P4.5), **Gate 5B P4 QA PASSED** — 0 BLOCKER / 0 MAJOR | it.23 (A 6/7 → BUG-448), it.25 (B 5/5), it.26 (C PASS, exit read-back 4/4) → `test_reports/QA_REPORT_2026_09_22_CR385_P4_ROLE4.md` |
| Phase 4.5b (D88) | Split tile hidden under `.frontdesk-bill` (1 CSS rule + guard test); Split → **FU-385-D**; OG-PMS-048 | `frontdesk.css`, `tests/cr385/hideSectionRows.cr385.test.js` |
| BUG-450 (legacy CR-358-P5 RatesTab) | Owner routing (a) mini-gate — **fixed this session**, unit 7/7; independent read-only spot-check → see §4 | `pages/pms/RatesTab.jsx`, `ChannelManagerPage.jsx` (+1 prop), `pages/pms/__tests__/RatesTab.bug450.test.jsx` |
| Registry `CR-385` | `GATE_5B_QA_PASSED (P4 + P4.5)`; `current_gate` = 6 combined (D86) | `control/registry.json` |
| Sandbox | baseline: r2 (174 bkol) / r3 (155 blpi) owner in-house · r1/r4/r5 not in-house · 3 rules default · no `QA*` rows | `evidence/CR-385/phase4_qa/t9_readback.json` |
| F-7 (it.26 possible empty dine-in order) | **No residual order** — running-orders glance 2026-09-22 (QA_TGK, API read-only): 3 running orders, all created 2026-09-20 (1232583 room/blpi ₹112.35 · 1232602 room/bkol · 1232603 dine-in ₹209 — pre-existing, not QA); nothing from 09-22 → nothing to cancel | `evidence/CR-385/phase4_qa/f7_running_orders_glance.json` |

## 2. Deferred to FU-385-C (legacy cutover CR) — do not fix inside CR-385
| ID | What | Where |
|---|---|---|
| BUG-431 (CRITICAL) | CheckInPage Room Amount pre-fill re-applies GST | legacy `/pms/check-in` |
| BUG-432 (CRITICAL) | Legacy NewBookingPage FE rate overrides CM rate | legacy `/pms/new-booking` |
| BUG-443 | Legacy Modify sends `amount_after_tax` (probe harmless, D77) | legacy `/pms/arrivals` |
| BUG-444 | Tape chart missing pending-unassigned (D78) | legacy tape chart |
| BUG-446 | Legacy `/pms/arrivals` + `/pms/room-status` headers show browser date (X-06 gap) | legacy pages |
| BUG-449 | Legacy `PmsCheckoutDrawer` TAB name/phone not prefilled → Checkout disabled until typed (smoke: use **Cash**) | legacy `/pms/departures` |
| X-06 | Business-date rule on legacy pages (same root as BUG-446) | legacy pages |
| BQ-385-22 | Server folio balance per stay (retire `getInHouseGuests` fan-out; OG-PMS-047 "…" latency) | backend |
| BQ-385-23 | Modify `reason` leaks into `special_requests` ("| MODIFY: <reason>" appended) | backend |
| BQ-385-25 | `dashboard-kpis` physical occupancy ignores overdue in-house guests (disagrees with board / LR) | backend |
| BQ-385-26 | Malformed `direct-reservation` returns 200 `skipped:true` instead of 422 (FE rejects hard) | backend |
| BQ-385-27 | Folio-level GST-inclusive balance (retires the M5 FE sum + shared round-off, D85 exception) | backend |
| BQ-385-28 | `upgrade_reason` on `charge` (non-blocking, D87 Q3) | backend |
| BQ-385-29 | Charge-only room checkout body (closes D87 exception) | backend |
| Legacy folio rounding residual (BUG-433 legacy displays, OD-385-20 a) | legacy In-House / Folio | legacy |
**FU-385-D** (new, D88): Split (multi-method) settlement for room stays in Front Desk (Beta) Bill — `control/CR_REGISTRY.md` row; OG-PMS-048.

## 3. Open gaps still carried
OG-PMS-038 paid upgrade — **5th deferral → combined smoke M2-S08 only** (needs an Executive room free; r2 is the owner's stay 174 — never touch without the owner's word) · OG-PMS-047 NOTE (balance "…" latency, by design D85 Q2 a) · OG-PMS-048 (D88 Split) · BQ-385-07 room discount (M6 control greyed "needs BQ-385-07").

## 4. BUG-450 mini-gate — what was done / what QA must check
- Fix: `roomTypes` = distinct `ratesData.rateplans[].roomCode` (`useMemo`); `roomLabel(code)` = Room Mapping `aiosellRooms[].roomName ?? code` (prop from `ChannelManagerPage` `rooms?.aiosellRooms` — populated only after the Room Mapping tab was opened in that session; otherwise the code is shown — **never a literal**); `invForm` lazily keyed (`invFor(rt)`), `handlePushInvRestrictions` iterates `roomTypes`; 0 types → `rt-inv-empty` "Load rates first to populate room types." + `rt-inv-push-btn` disabled; Rates-grid group header L288 → `roomLabel`. New testids `rt-inv-card-<code>`, `rt-inv-label-<code>`, `rt-inv-empty`. Markers `// BUG-450`.
- Unit: `RatesTab.bug450.test.jsx` 7/7 (2-code, 3-code + names, 1-code no phantom, TGK regression, 0-type empty state, grid headers, guard grep). Guard grep across `src` (excluding tests/fixtures): 0 literals.
- **Pre-existing, NOT fixed (scope):** React "unique key" warning from the Rates-grid fragment at L286 (`<>` without key) — CR-358-P5 residue, cosmetic; note for FU/CR-358 follow-up.
- **Outcome:** `yarn build` exit 0 (without `CI=true`; with `CI=true` the repo fails on pre-existing eslint hook warnings in unrelated files — none in RatesTab). Full jest (`--testPathIgnorePatterns cr358p4`, because two CR-358-P4 script-style tests call `process.exit` and kill the runner): **762 passed / 56 failed, 818 total — all 56 failures in 12 pre-existing suites that import none of this session's files** (rawField, barrelExports, BulkEditor ×2, placeOrderPayload, updateOrderPayload, qa_subtotal_delivery_validation, profileTransform, printerAgentConfigTransform, POS2_003_REOPEN_A_wire, PlatformDropdown, ScanOrderPopOut). cr385 + bug450 suites 70/70.
- **it.27 (read-only, QA_TGK) PASS** for cards == rateplan codes, 0 push requests, Rate Restrictions codes match, D88 Split absent in the Front Desk Bill. Two QA observations resolved by main-agent self-checks: (1) "Room Mapping names not applied" = brief error (Room Mapping is `channel-manager-tab-2`, not tab-1) — `bug450_selfcheck.json` shows labels/headers flip from `executive`/`suite` to catalogue `room_name` **EXECUTIVE / SUITE** after the tab is opened; (2) "legacy routes redirect to /loading" = bootstrap on hard reload (lands back on the deep link after a few seconds); `legacy_routes_selfcheck.json` shows all three legacy pages render, 0 console errors. Key warning fixed (keyed `<Fragment>`). D88 POS-side positive check not reachable read-only → owner M4-S08 (priced item).
- Independent verification: testing_agent **read-only** spot-check on preprod `/pms/channel-manager` with **QA_TGK** — Inventory Restrictions lists the property's real room types with labels; Rates grid headers correct; **NO OTA push**; 0 console errors. Report → `test_reports/iteration_27.json` (also carries the read-only parallel regression, §6).

## 5. Gate 6 combined owner smoke — PRE-READ (deliver verbatim to the owner; ≈60 min, money)
**Order:** M2-S01…S13 → M3-S01…S10 → M4-S01…S09 → CM-S01 (read-only, any time). Record of truth: `control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md` — **every row gets the owner's verdict verbatim; "smoke OK" alone closes nothing.** Gate words at the end: **"Phase 2 + 3 + 4 smoke OK"**.
**Preconditions:** owner logged in with OWNER_TGK (say "GO combined smoke — logged in"); business date read from the page header (server `meta.business_date`, never the browser date); r4/r5/r1 free (r1 may be HK — allowed, N9); Front Desk Rules = OFF + Rate table + auto-print OFF at start; **one Executive room free for M2-S08** — otherwise write "not available — OG-PMS-038 5th deferral" on that row (r2/stay 174 is never checked out for the smoke without the owner's own decision).
**Known-ignore list:** console lines from socket / firebase messaging (pre-existing); balance cell "…" for a few seconds after check-in/Bill open (OG-PMS-047, by design); POS Split tile absent on a ₹0 order (it.26 F-6 — use a priced item, M4-S08); Room Mapping names in the Rates tab appear only after the Room Mapping tab was opened (else codes); legacy Departures TAB checkout disabled until name+phone typed (BUG-449 → use **Cash**); room discount greyed "needs BQ-385-07"; M4-S03 write "integer case only" if no paise line; M4-S07 **Split tile NOT shown** (D88).
**Cleanup rules:** every smoke stay settled (M3-S10 legacy Cash / M4-S05 TAB / M4-S07 Cash); cancel leftover smoke bookings; rules back to OFF + Rate table + auto-print OFF; r4/r5/r1 free; In-House = owner rows only (r2/r3); never confirm No-Show; never touch r3.
**Facilitation:** one row at a time; facilitator writes the owner's words into the Verdict column before moving on; any FAIL → stop, intake (origin P2/P3/P4), owner routes.

## 6. Read-only parallel regression rule (during the smoke)
While the owner smokes with OWNER_TGK, the testing_agent may run **iteration_27 with QA_TGK only, READ-ONLY** (no bookings, check-ins, extends, payments, rule toggles, OTA pushes, POS orders): BUG-450 spot-check (§4), 4 Front Desk tabs at 1920×800 + 1366×768 with 0 console errors, legacy pages load, `/dashboard` panel render. Mutating regression (full chain) only **after** the smoke, as the **Phase 5 entry** step — not before.

## 6b. SECURITY NOTE (owner-recorded 2026-09-22, Gate 6 start)
The QA password (shared with the owner login) is present in ~50 files under `memory/` (handovers, plans, evidence probe scripts, registry.json, BUG_TRACKER, AGENT_PROMPT_ALPHA) and in `test_reports/iteration_18/19/20.json`. **Owner to rotate the password after the combined smoke; agent to scrub the files on request** (replace literals with a `test_credentials.md` read, as done for `test_reports/c6_readback.py`). Until then: no new file may carry the literal; probe scripts read `memory/test_credentials.md`.

## 6c. OG-PMS-049 (owner-filed) — full jest not green → Phase 5 entry condition (see OPEN_GAPS_REGISTER).

## 7. Push
Owner-requested commits (via **Save to GitHub** → `origin/21implement`): "CR-385 P4.5: BUG-448 TAB prefill · Gate 5B sessions B/C" and "BUG-450: Inventory Restrictions room types from rateplans" (this session also carries D88 CSS + docs).

## 8. Files touched this session
Code: `frontend/src/pages/pms/RatesTab.jsx` · `frontend/src/pages/pms/ChannelManagerPage.jsx` (+1 prop) · `frontend/src/pages/pms/__tests__/RatesTab.bug450.test.jsx` (NEW) · `frontend/src/components/pms/frontdesk/frontdesk.css` (+1 D88 rule) · `frontend/src/tests/cr385/hideSectionRows.cr385.test.js` (+split guard).
Docs: `change_requests/BUG-450_*_INTAKE.md` (NEW) · `control/BUG_TRACKER.md` · `control/registry.json` (BUG-450 item) · `control/OPEN_GAPS_REGISTER.md` (OG-PMS-038 text, OG-PMS-048) · `control/CR_REGISTRY.md` (FU-385-D) · `plans/CR-385_DESIGN_DECISIONS.md` (D88) · `plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md` (§4) · `control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md` (M4-S07/S08, CM-S01, header) · `PRD.md` · this handover · `evidence/CR-385/phase4_qa/f7_running_orders_glance.json`.
