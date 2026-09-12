# Layer 1 — Control Dashboard

**Status:** POPULATED
**Last Updated:** 2026-09-13 — **SESSION CLOSED. Handover written.** CR-379 Gate 3 COMPLETE + ALL PROBES CLOSED. Zero open gaps. Two plan corrections: `doc.uploaded_at` (not `created_at`), `crmCustomer.pointsValue` (not calculated). V-11 CLOSED (pmsCheckIn returns `cust_membership_id` confirming backend storage). Handover at `handover/SESSION_HANDOVER_2026_09_13.md`. **Awaiting Gate 4 GO from owner in next session.**
**Last Updated:** 2026-09-12 — **CR-379 GATE 3 GO. Design frozen by owner.** Gate 2 IA + Gate 2.5 Design Review CLOSED. 8 design decisions locked (DD-1..DD-8): auto-lookup on 10 digits, badge placement below name/phone, 4-col stats (Stays/LastStay/LoyaltyPts/StoreCredit), doc-type cards with getDocuments fetch, inline adult slots, per-child name inputs, corporate checkbox, amber non-blocking error. Mockup live at `/cr379-design-mockup.html`. Design decisions at `plans/CR-379_DESIGN_DECISIONS.md`. CR-379 completeness 3/7. Implementation Plan (Gate 3) to be written next.
**Last Updated:** 2026-09-12 — **CR-379 + CR-380 INTAKE COMPLETE (Gate 1).** PMS Check-In CRM gap registered. CR-379 (CRM Customer Link, P1 HIGH): CRM typeahead + lookup/create + `customer_id`/`cust_membership_id` in pmsCheckIn + extra adults/children + returning guest badge (all 7 ODs locked). CR-380 (Guest ID Documents, P1 HIGH): JSON→FormData + docs-on-file viewer + CRM upload + CR-350 toggle reuse (all ODs locked, DEPENDS ON CR-379). BUG-090 registry status updated to STALE (backend confirmed fixed). Next: CR-379 → Planning Gate 2.
**Last Updated:** 2026-09-11 — **SESSION CLOSED (Investigation + Intake + CR-162 Fix).** Backend reply processed: BUG-384+BUG-385 CLOSED, CR-163 GAP1+GAP2 unblocked. 5 intake docs updated (CR-162/163/363/364/366). backend-briefs.html: ep10–ep15 added (6 new cards, ep8+ep9 resolved). CR-162 fixed: payment_type=interim in roomService.js. Handover: `handover/SESSION_HANDOVER_2026_09_11_INV_INTAKE_CR162_FIX.md`. Next: CR-163 Gate 3+impl → CR-162 QA → pos_7_0 QA (once preprod auth confirmed) → owner ODs for CR-363/364/366.
**Last Updated:** 2026-09-11 — **SESSION CLOSED (Planning + QA Prep).** CR-376 Gate 2+3 complete (IA + Impl Plan written). CR-377 QA handover written. test_credentials.md populated. QA attempt BLOCKED — preprod auth failure (owner@cafe103.com creds invalid). All 5 QA batches (95 tests) ready, awaiting credential fix. CR-376 advanced gate 1→3. Handover: `handover/SESSION_HANDOVER_2026_09_11_PLANNING_QA_PREP.md`.
**Last Updated:** 2026-09-11 — **SESSION CLOSED.** Handover: `handover/SESSION_HANDOVER_2026_09_11_FULL_SESSION.md`. Items shipped this session: BUG-395 addendum-2 (customerTransform.js house/floor) + CR-378 Fast Lane (sidebar name `CAFE 103 · #644`) + BUG-394 Gate 5a (18 edits, 4 files, number inputs) + CR-377 Gate 5a (9 edits, 82 API fields, Sales Report). BUG-393 absorbed into CR-377. QA pending: BUG-390/CR-373/BUG-392/CR-374 (Batch A) + BUG-391 + BUG-395 addendums + BUG-394 + CR-377. Deferred: all QA + Gate 2 CR-376 + Owner smoke CR-378.
**Last Updated:** 2026-09-10 — **BUG-392 + BUG-395 ADDENDUM FIXED.** BUG-392: `VariationOptionRow` price `onWheel` gap. BUG-395: `buildDeliveryAddress` city+state write path. Both webpack clean, EXIT GATE 5/5, QA PENDING. CRM probe inconclusive (no CRM token for thegoankitchen). Fixes in `ProductForm.jsx` L100 + `orderTransform.js` L943-944.
**Last Updated:** 2026-09-10 — **SESSION CLOSED.** Handover at `handover/SESSION_HANDOVER_2026_09_10_DEPLOYMENT_BUG394_CYCLE.md`. BUG-395 gate violation cleared. BUG-392 gap fixed. BUG-394 Gate 3 complete (plan ready, Gate 4 GO pending). 6 items QA pending (Batch A + BUG-391 + BUG-395). CR-376/CR-377 in intake.
**Last Updated:** 2026-09-11 — **BUG-394 PLAN VALIDATED.** All 18 edit sites re-verified against live code. 17/18 exact. 1 line drift corrected: E3c L100→L99 (BUG-392 addendum shifted onChange). No new conflicts. Plan is current and implementation-ready. Awaiting Gate 4 GO.
**Last Updated:** 2026-09-10 — **BUG-394 GATE 3 COMPLETE.** Plan at `plans/BUG-394_IMPLEMENTATION_PLAN.md`. Awaiting Gate 4 GO.
**Last Updated:** 2026-09-10 — **BUG-394 GATE 2 CLOSED.** IA verified complete (14/14 sections). Awaiting Gate 3 GO.
**Last Updated:** 2026-09-10 — **BUG-394 P6 added — zero-clear onFocus gap.** IA updated. 4 files, ~15 total edit sites. All ODs locked. Ready Gate 3 GO.
**Last Updated:** 2026-09-10 — **BUG-394 OD-394-01 LOCKED: Option A.** IA fully closed. All decisions resolved. Ready for Gate 3 GO.
**Last Updated:** 2026-09-10 — **BUG-394 GATE 2 COMPLETE.** IA at `impact/BUG-394_IMPACT_ANALYSIS.md`. 4 files, 7 edits. BLOCKER: AddonManagementPanel raw string to API. Conflict: BUG-392 same lines (parallel-safe). OD-394-01 OPEN: Option A (silent block) RECOMMENDED. Awaiting answer → Gate 3.
**Last Updated:** 2026-09-10 — **BUG-394 INTAKE COMPLETE (Gate 1).** 5 patterns / 4 files. BLOCKER: `AddonManagementPanel` price = raw string to API. MAJOR: `ProductForm` + `VariationExpandPanel` silent 0. MAJOR: `BulkEditor` NaN. P1 HIGH. Intake doc at `change_requests/BUG-394_NUMBER_INPUTS_SPECIAL_CHARS_INTAKE.md`. Evidence at `evidence/BUG-394/`. Awaiting Gate 2 GO. BUG-395 gate violation resolved. BUG-391 / Batch A QA still pending.
**Last Updated:** 2026-09-10 — **BUG-395 REGISTERED + GATE VIOLATION RESOLVED.** INV-2 officially registered as BUG-395 (pos_7_0, P2 MEDIUM). `orderTransform.js` L2194-2205 — 4 delivery address sub-fields added to `buildBillPrintPayload`. EXIT GATE 5/5. QA handover at `handover/QA_HANDOVER_BUG395_2026_09_10.md`. ⚠️ Gate violation flag cleared — owner approved retroactively. BUG-394 (special chars in number inputs) still at Gate 1 — needs Gate 2 GO. BUG-391 / Batch A still QA PENDING.
**Prior:** 2026-09-10 — **CR-376 INTAKE CLOSED.** All 6 ODs locked. Design A (pure local setting, no tab strip). OD-376-05: StatusConfigPage only. OD-376-06: no fallback — empty-state in Order Entry. Ready for Gate 2.
**Prior:** 2026-09-10 — **BUG-391 GATE 5a IMPLEMENTED.** 5 edits / 3 files. ProductForm locked tax read-only for Aggregator (GST 5% mandatory). BulkEditor validateRow unconditional Aggregator check. Transform safety net. webpack clean. QA handover: `handover/QA_HANDOVER_BUG391_2026_09_10.md`.
**Prior:** 2026-09-10 — **BUG-391 GATE 3 COMPLETE.** Implementation Plan written (`plans/BUG-391_IMPLEMENTATION_PLAN.md`). 5 edits / 3 files (ProductForm.jsx E1-E3, BulkEditor.jsx E4, menuManagementTransform.js E5). ~25 lines. 11 verification checks. Awaiting Gate 4 GO.
**Prior:** 2026-09-10 — **BUG-391 GATE 2 COMPLETE.** Impact Analysis written (`impact/BUG-391_IMPACT_ANALYSIS.md`). 5 edits / 3 files (ProductForm.jsx E1-E3, BulkEditor.jsx E4, menuManagementTransform.js E5). ~25 lines. Conflict: Batch A QA must pass first. All ODs locked. Awaiting Gate 4 GO.
**Prior:** 2026-09-11 — **INTAKE COMPLETE: 5 new items registered from session investigations (CR-374, CR-375, BUG-391, BUG-392, CR-376). All at Gate 1. CR-374 design locked (Option A). BUG-392 ready for Gate 4 GO. CR-375 + BUG-391 have open owner decisions. CR-376 has 4 open ODs. Session handover: `handover/SESSION_HANDOVER_2026_09_11_INTAKE_BATCH.md`.**
**Prior:** 2026-09-11 — INVESTIGATION BATCH: INV-MENU-BULK-FILTER-GAP (CR-374/375), INV-AGGREGATOR-GST (BUG-391), INV-SCROLL-WHEEL (BUG-392), INV-MENU-SWITCH (CR-376). All 5 in registry.json (total 638 items).
**Prior:** 2026-09-08 — **CR-358-P5 GATE 3 DONE. Implementation Plan written (`plans/CR-358-P5_IMPLEMENTATION_PLAN.md`). 8 edits (2 NEW: RatesTab.jsx, NoShowDialog.jsx), 28 verification checks, all line refs verified against live code. Awaiting Gate 4 GO from owner.**
**Prior:** 2026-09-08 — **CR-358-P5 GATE 2 v2 DONE. Full-scope IA written (`impact/CR-358-P5_IMPACT_ANALYSIS.md`). All blockers resolved (B-P5-01, BUG-384, GAP-09, OG-PMS-015). CR-358-P5.1 RETIRED (merged back). Full scope: rates+inv-restrictions+rate-restrictions+no-show. 8 files (2 NEW). 28 verification checks. ZERO blockers. Awaiting Gate 4 GO.**
**Prior:** 2026-09-08 — **Backend reply `rate_push_r` processed. B-P5-01 RESOLVED (restrictions=object, schema confirmed). BUG-384 CLOSED (FE code already correct, probe was wrong — HTTP 200 confirmed). OG-PMS-014 RESOLVED. OG-PMS-015 RESOLVED (operational_status=no_show). GAP-09 CLOSED (auto-push confirmed). CR-358-P5.1 UNBLOCKED. CR-364 UNBLOCKED. CR-358-P5 has ZERO remaining blockers — awaiting Gate 4 GO.**
**Prior:** 2026-09-08 — **CR-358-P5 GATE 2 DONE. Impact Analysis written (`impact/CR-358-P5_IMPACT_ANALYSIS.md`). Scope B: rates+no-show only. 7 files (2 NEW: RatesTab.jsx, NoShowDialog.jsx). Restrictions deferred → CR-358-P5.1 registered (BACKEND-BLOCKED B-P5-01). 20 verification checks. Awaiting Gate 4 GO.**
**Prior:** 2026-09-08 — **CR-358-P5 DESIGN APPROVED. All 4 ODs locked. Gate 2 ready. OD-P5-01: all roles (deferred gate). OD-P5-02: Hybrid matrix+popover+bulk. OD-P5-03: Staged bar+diff modal. OD-P5-04: Both surfaces. V3 mock live at `public/cr358-p5-v3-mockup.html`. Backend brief filed (Q1–Q4, non-blocking for Gate 2). Next: Gate 2 Impact Analysis → Gate 3 Impl Plan.**
**Prior:** 2026-09-08 — **CR-358-P5 ODs ALL LOCKED. OD-P5-01: all roles push rates (role-gate later). OD-P5-02: Hybrid matrix + cell popover + bulk drawer. OD-P5-03: Staged bar + Before/After diff modal. OD-P5-04: Both surfaces (Arrivals Late/Today + Tape Chart popover). Design spec at design_guidelines.json. Awaiting backend brief reply (Q1 restrictions schema + Q2 mark-no-show + Q3 GAP-09 + Q4 room-payment 403).**
**Prior:** 2026-09-08 — **BACKEND BRIEF filed: `backend_briefs/BACKEND_BRIEF_CR358_P5_2026_09_08.md`. Covers 4 open questions: Q1 restrictions[] schema (push-inventory-restrictions + push-rate-restrictions), Q2 mark-no-show failure BDC7497606, Q3 GAP-09 checkout inventory release, Q4 room-payment 403 (BUG-384). Fresh probes: push-rates 200 confirmed, fetch-rates 200. Waiting backend reply before Gate 3 impl plan can be written.**
**Prior:** 2026-09-08 — **INTAKE: BUG-383 (HK filter count 0, P1 MEDIUM — roomStatusTransform.js L28 counts displayStatus not manualStatus), BUG-384 (room-payment 403, P1 HIGH, BACKEND-BLOCKED — sandbox perm gap), BUG-385 (no_show field missing, P2 LOW, BACKEND-BLOCKED — LR+kpis). All 3 from OG-PMS-010/014/015 fresh probe. Intake docs at change_requests/BUG-383/384/385_*. Registry: 628 items.**
**Prior:** 2026-09-08 — **INVESTIGATION: OG-PMS-010/013/014/015 fresh API probe (15 probes). OG-PMS-010 backend FIXED (auto-HK firing — r1+r2 have manual_status:hk with timestamps). FE BUG found: roomStatusTransform.js L28 counts HK by displayStatus; auto-HK on occupied rooms only sets manualStatus → "HK 0" in filter. Needs BUG intake + fix. OG-PMS-013 cannot reproduce (state changed). OG-PMS-014 (room-payment 403) STILL OPEN. OG-PMS-015 (no_show field) STILL OPEN. Backend change: local-reservations now requires start_date+end_date (FE already handles). room_operational_status_at new field added (FE reads it). Report: evidence/INV-OG-PMS-010-013-014-015/INVESTIGATION_REPORT_2026_09_08.md**
**Prior:** 2026-09-08 — **STATE SNAPSHOT HANDOVER written by review agent. No src/ changes. Audit track state reconstructed and documented at `handover/SESSION_HANDOVER_2026_09_08_AUDIT_STATE_SNAPSHOT.md`. Completed: CR-370 + CR-372-A. Stopped at Gate 2: CR-368 (awaiting Dev team Q1/Q2). Not started: CR-372-B (needs Gate 4 GO), CR-371 (needs OD-CR371-01 enum). Blocked: CR-369 (hard-blocked on CR-368).** Source: `handover/SESSION_HANDOVER_2026_09_08_AUDIT_STATE_SNAPSHOT.md`.
**Prior:** 2026-09-08 — **CR-368 PLANNING Gate 2 complete (Impact Analysis only). Owner locked OD-CR368-02 (c hybrid), -03 (A), -04 (c freeze), -05(i) (register P3 BUG intake only); OD-CR368-07 resolved by probe (test-infra). Still OPEN: OD-CR368-05(ii) + OD-CR368-06 → handed to Dev team via `backend_briefs/BACKEND_BRIEF_CR-368_2026-09-08.md` (Q1/Q2). Owner instruction: stop — Gate 3 not yet.** Live Jest run: 54 failing tests / 11 suites + 2 fake `process.exit` scripts that hang the runner (EXIT 124 after 900 s). 46 STALE-HIGH, 7 STALE needing R6/hard-gate ack, 2 POLICY, 1 CANDIDATE REAL BUG (`reportService.js:671` ungated `_raw`), 1 UNDETERMINED (BulkEditor G-Toast). Phase 2 (axios mapper) already done by BUG-382. `impact/CR-368_IMPACT_ANALYSIS.md`, `evidence/CR-368/`. Source: `handover/SESSION_HANDOVER_2026_09_08_CR368_GATE2.md`.
**Prior:** 2026-09-08 — **CR-372-A IMPLEMENTED (Gate 5a). 92 files moved (15 `__dev/` → `memory/dev-dashboard/`, 74 HTML + 3 non-HTML → `memory/design_briefs/`). `REACT_APP_CRM_API_KEYS` + `CORS_ORIGINS` removed from `frontend/.env`. V1–V17 all PASS. Dev dashboard now at `/app/memory/dev-dashboard/` (filesystem only).** Source: `handover/SESSION_HANDOVER_2026_09_08_CR372A_IMPL.md`.
**Prior:** 2026-09-08 — **CR-372-A PLANNING complete (Gate 2 + Gate 3). Awaiting Gate 4 GO.** Prior: 2026-09-08 — **AUDIT TRACK: CR-370 PLANNING complete (Gate 2 + Gate 3).** Impact Analysis `impact/CR-370_IMPACT_ANALYSIS.md` + Implementation Plan `plans/CR-370_IMPLEMENTATION_PLAN.md` written. Code reality PARTIAL: C3/C4/C5 exist with 3 drifts (ENV_REGISTRY says 2 keys removed but still in `.env`; test_credentials login path ≠ `constants.js`; cafe103 RID 103→644). All owner decisions OD-CR370-02..06 LOCKED (branch `pms8sep`; ENV keys → PENDING REMOVAL; code-is-truth login path; RID 644; actual counts 96 HTML / 2 fake tests; Upcoming Tasks untouched). v1-defunct claim disproved by code (35 live v1 endpoints in `constants.js`). Plan: 9 edits / 7 doc files / zero `src/`. **Awaiting Gate 4 GO for CR-370.** Source: `handover/SESSION_HANDOVER_2026_09_08_CR370_PLANNING.md`.
**Prior:** 2026-09-08 — **AUDIT TRACK: Setup + Blocker Analysis complete.** New pod deployed (branch `pms8sep`, preview URL updated). Memory dir synced from repo (326 files). All 6 audit CRs (CR-368 → CR-372-B) blocker-analysed. `test_credentials.md` populated (OD-CR370-C5 resolved — 3 owner accounts: cafe103, palmhouse, kunafamahal). CR-368 execution plan proposed and owner-approved. 3 owner decisions still open: CR-372-B Gate 4 GO · OD-CR371-01 (enum list) · OD-CR371-02 (__dev regeneration). **Next: execute audit CRs in order CR-370 → CR-372-A → CR-368 → CR-372-B → CR-371 → CR-369.**
**Prior:** 2026-09-08 — **AUDIT TRACK: INTAKE complete.** 6 active audit CRs registered (CR-368/369/370/371/372-A/372-B). All D1–D6 decisions locked. `control/PUBLIC_ROUTES.md` created. `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md` §5 decisions section added. registry.json → 625 items. Source: `handover/SESSION_HANDOVER_2026_09_08_AUDIT_INTAKE.md`.
**Prior:** 2026-09-06 — **INVESTIGATION: CR-363/364/366 API impact analysis** (`INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md`). CR-363 🟡 partial (no no-show field → OG-PMS-015), CR-364 🟡 partial (`pos/room-payment` 403 → OG-PMS-014), CR-366 🟢 mostly unblocked. v1 endpoints 404 → v2 live (OG-PMS-016). Also delivered `frontend/public/MyGenie_PMS_Screen_Reference.pdf` (14 pp, landscape, dummy data, no AIOSELL refs). **Next: owner picks Gate 2 order; backend ruling on OG-PMS-014.**
**Prior:** 2026-09-04 — CR-358-P4 GATE 3 — Implementation Plan WRITTEN (`plans/CR-358-P4_IMPLEMENTATION_PLAN.md`) per PLANNING agent (ALPHA v0.7). Local `/app/frontend/src` re-synced to `origin/PMS1` @ `0c3d3c0` (9 drifted P3/BUG-380 files; git remote was missing). G3 re-probes unchanged. **Next: owner Gate 4 GO + SC-P4-01 ack → IMPLEMENTATION.**
**Deployment Reconciliation:** 2026-06-11 — branch `main` @ `1f05d05`; preview URL: https://pos-front-pull.preview.emergentagent.com (env restored from ENV_REGISTRY; yarn install fixed incomplete node_modules; webpack compiles clean)

---

---

## 2026-09-10 — Session Update (INTAKE complete)

**INVESTIGATION + INTAKE + PLANNING session:**
- **INV:**  — BUG-393 + CR-377 re-investigated with live token. 82 API fields catalogued. Backend ignores `to` input (single-day endpoint confirmed).
- **INTAKE:** CR-377 registered (P2, MEDIUM, Gate 1, 5 ODs open). BUG-393 registered then SUBSUMED by CR-377. NEW call site found: `orderLedgerService.js:257` also missing `to` field.
- **PLANNING Gate 2:** CR-374 Impact Analysis complete (). Batch A conflict check: ZERO conflicts. Batch A ready for Gate 3.
- **Memory sync:** Full `/app/memory/` synced from remote main branch (506→512 files). AGENT_PROMPT_ALPHA.md confirmed present.


## Current Deployment

| Field | Value |
|---|---|
| Branch | `pms8sep` (working copy — sync via Save to GitHub after each coding session) |
| Preview URL | https://pos-front-staging-1.preview.emergentagent.com |
| Last Deploy | 2026-09-08 (fresh pod — repo clone + npm install + env configured) |
| Source of truth | `pms8sep` branch. Pod = working copy; sync via Save to GitHub after each coding session. |
| Node.js | v20.x |
| Yarn | 1.22.x |
| React | 19.0.0 |
| CRACO | 7.1.0 |
| REACT_APP_SHOW_AUDIT_TAB | true (Audit tabs visible on S5/S6/S7/S9) |
| All env vars | Configured — see `control/ENV_REGISTRY.md` |

---

## Active Sprints

| Sprint | Status | Progress | Top Blocker |
|---|---|---|---|
| **pos_audit_1 (Audit Track)** | **CR-368 Gate 2 DONE — 4 ODs locked, OD-05(ii) + OD-06 OPEN, Gate 3 on hold (owner)** | CR-370 DONE · CR-372-A DONE (92 files moved, V1–V17 PASS) · CR-368 IA written (54 fails/11 suites/2 fake scripts; see `impact/CR-368_IMPACT_ANALYSIS.md` §6 for decisions). Execution order: ~~CR-370~~ → ~~CR-372-A~~ → CR-368 → CR-372-B → CR-371 → CR-369. Open decisions: OD-CR368-05(ii)+06 (Dev team brief Q1/Q2) · CR-372-B Gate 4 GO · OD-CR371-01 · OD-CR371-02. | Owner answers OD-CR368-05(ii)/06 → Gate 3 plan |
| **POS 4.0 (Consolidated Backlog)** | **FROZEN (2026-06-13, baseline corrected 2026-06-14)** | 50 items CLOSED — OWNER VERIFIED (43 + 7 retroactive) | **None — sprint frozen** |
| POS 3.1 | CLOSED → consolidated into POS 4.0 | 3/3 QSR bugs shipped | — |
| CRM 2.0 | CLOSED → backlog into POS 4.0 | CR-002 CLOSED (T-28/T-29 live PASS); 5 CRs → POS 4.0 | — |
| Audit Report CR | SHIPPED | Complete | None |
| PROD Hotfixes (this session) | SHIPPED | PROD-007 + PROD-008 closed | None |
| Dev Tooling (DEV-DASHBOARD-001) | CLOSED — OWNER VERIFIED | v1.0 + v1.1 delivered, 6/6 artifacts present | None |
| Audit Reconciliation (AUDIT-CLOSURE-DRIFT-001) | CLOSED — OWNER VERIFIED | v1.2 dashboard + 44 bugs reconciled; G-2 owner smoke PASSED 2026-05-31 | None |
| Closure Debt Re-Audit (CLOSURE-DEBT-REAUDIT-001) | CLOSED — OWNER VERIFIED | v2.1 — CRITICAL 17→4; reproducible scanner committed; 108 bugs got artifact_refs | None |
| Intake Backfill + CG Waiver (INTAKE-BACKFILL-001) | CLOSED — OWNER VERIFIED | v2.2 — 38 intake stubs + 10 CG waivers; 9 bugs RESOLVED; WAIVED state in UI/CSV/JSONs | None |
| Dashboard Active-vs-Resolved counter fix (v2.3)   | CLOSED — OWNER VERIFIED | Headline strip + RESOLVED card + "19/28" tab badge + Active-only default filter | None |
| Big Batch Closure 001 (v2.6)                       | CLOSED — OWNER VERIFIED | 26 bugs archived (active 19→18, archived 19→45); 6 G2 reclassified NCN→IMPL→OV; CG Waiver Batch-3 (30 bugs); 24 intake stubs auto-gen | None |
| CR Registry Refs Sync 001 (v2.7)                   | CLOSED — OWNER VERIFIED | 54/54 CRs got artifact_refs + category; +35 CSV rows; CR Registry tab gets Active/Shipped/Tracked headline + clickable categories; row-detail shows linkable artifact panel | None |
| Active CR Compliance 001 (v2.8)                    | CLOSED — OWNER VERIFIED | 16 active-CR Intake stubs + 22 CG Premature waivers; 2 CRs auto-promoted; RESOLVED 49→65 | None |
| Subsumed Backlog Owner Attestation 001 (v2.9 + v2.9.1) | CLOSED — OWNER VERIFIED | v2.9: 8 INTAKE bugs → SUBSUMED. v2.9.1: 4 more bugs subsumed (BUG-018, 104, 106, 108); BUG-106 carries owner-attested CRM Coupon/Loyalty subsumption note. `active_recent_bugs` 25 → 22 | None |
| Subsumed CR + Status Pill Fix (v2.10) | CLOSED — OWNER VERIFIED | SUBSUMED renders green everywhere; CR_STATUS_CATEGORY maps SUBSUMED→SHIPPED; 5 CRs subsumed (CR-003/004/005/008/009); scanner over-match flagged; CR active 26→20 | None |
| Auto-promotion + Active-only register (v2.4)      | CLOSED — OWNER VERIFIED | 23 bugs auto-promoted IMPLEMENTED→OWNER VERIFIED; 9 fully-closed items archived from active register; CSV preserves history | None |
| Smoke Backfill Batch 001 (v2.5)                    | CLOSED — OWNER VERIFIED | 10 more bugs promoted to OWNER VERIFIED (6 smoke-only + 4 mid-effort with intake/CG-waiver); CSV grew 28→38 rows | None |
| **CR-014 Menu Management API Migration** | **CLOSED — OWNER VERIFIED** | **Phase 1: 20 API endpoints wired. Phase 2: Bulk Editor shipped (inline spreadsheet, 33 columns, 4-tier picker, category grouping, batch save). Gate 6 PASSED.** | **None** |
| **CR-015 Settlement Module** | **CLOSED — OWNER VERIFIED** | **Full settlement as dashboard slide-over panel. 5 APIs wired. 5 KPI cards, per-waiter table, 3 modals. QA: 14/14 + 9/9 passed. Owner smoke PASSED 2026-06-09.** | **None** |
| **CR-016 Settlement History (Insights)** | **CLOSED — OWNER VERIFIED** | **7/7 gates complete. Settlement Report under Insights. Active-only days + waiters. KPI strip, drill-down, 365-day range, Excel/PDF export. Owner smoke PASSED 2026-06-09.** | **None** |
| **BUG-120 CR-014 Menu Mgmt Post-Delivery (5 sub-bugs)** | **GATE 2 COMPLETE** | **A: InputField defined inside render — move to module scope (LOW). B: Image uploads to preprod storage — working, document only (ZERO). C: Variation CRUD UI + form section redesign (HIGH). D: 8 new API fields to wire — is_inventory, packed_food, stock_out, is_disable, tax_calc + 3 more (MEDIUM). E: Socket handler exists but needs verification + category ops handling (MEDIUM).** | **Gate 3 (Implementation Plan) next** |
| **BUG-121 Category Count + Post-Save Refresh** | **CLOSED — OWNER VERIFIED** | **A: Category count derived from foods array (categories API has no count field). B: 500ms delay on post-save refresh. Both fixes verified.** | **None** |
| **CR-017 WhatsApp Payment Link** | **Gate 2 COMPLETE** | **P1. All 9 Qs answered. UI mockup approved (OrderCard footer: [KOT][Cancel][WhatsApp]). Impact analysis done. 2 new files + 2 modified files planned. Zero regression risk.** | **Gate 3 (Implementation Plan) next** |
|| **CR-019 Restaurant Settings Wizard** | **Gate 5 COMPLETE (IMPLEMENTED + QA 18/18)** | **P1. 6-step self-onboarding wizard at `/restaurant-settings`. Pre-populates from GET settings-list, saves via POST update-settings (multipart). Steps: Restaurant Identity, Channels & Payments, Charges & Tips, Order & Kitchen, Inventory & Extras, Owner Info. 3 new files + 3 modified. Testing: 18/18 passed.** | **Gate 6 (Owner Smoke) next** |
|| **BUG-122 Post-Delivery Fixes (3 FE fixes from handover)** | **IMPLEMENTED — smoke batch S-7** | **Fix #1: Cancel (X) button added to POS YTC on OrderCard (was ✓ only, now ✗+✓ matching TableCard). Fix #2: Snooze clock gated to web-only on TableCard (`table.isWebOrder === true`). Fix #3: `schedule_at` empty time fix — removed trailing space, strengthened Place Order disable guard to require time component.** | **Awaiting owner smoke** |
|| **CR-020…CR-027 batch (2026-06-10/11)** | **See CR_REGISTRY** | **CR-021 split payments CLOSED · CR-022 food filters CLOSED · CR-023 typing lag CLOSED · CR-024 channel visibility CLOSED · CR-020 P4+B12–B15 awaiting smoke (S-4) · CR-025 discount payload awaiting smoke (S-1, P0) · CR-026 report sweep awaiting smoke (S-9) · CR-027 toast surfacing NOT STARTED (next sprint) · BUG-123 (401 redirect) + BUG-124 (socket payload) open intake** | **Smoke batch: `POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md`** |
|| **PRE-FREEZE GATE (2026-06-11)** | **OPEN** | **Baseline freeze blocked on: 9 smoke items (S-1…S-9) → DEBUG-B11 log removal (post S-4) → cut BASELINE_INDEX entry. Full gap register: `POS4_0_BASELINE_CONSOLIDATION_REPORT_2026_06_11.md` §3. Owner rulings R1–R5 resolved.** | **Owner runs smoke batch** |
|| **CR-028 Item-Level Discount (P1, money)** | **CLOSED — OWNER VERIFIED (2026-06-15, retroactive).** | **All 5 gaps fixed. distributeItemDiscounts() in orderTransform.js, giveDiscount in productTransform.js, discountableTotal in both panels, per-item GST recomputation. Code present on 15-june branch.** | **None** |
|| **CR-047 AGENT_PROMPT_ALPHA v0.6 Role Hardening** | **CLOSED — OWNER VERIFIED (2026-06-15)** | **v0.6 applied. 8 edits, 1482 lines. STEP -1 session start, STEP -1.5 env check, PLANNING stage dispatch, INTAKE hardened, QA hardened, BUG FIX full rewrite, INVESTIGATION hardened. Full gate cycle (Intake→Plan→Impl→Owner GO→Verify). Zero app code changes.** | **Done** |

---

## Service Health (as of 2026-05-31)

| Service | Status |
|---|---|
| Frontend | RUNNING (webpack compiled with 1 warning — pre-existing ESLint warning in OrderEntry.jsx:1311) |
| Backend (supervisor) | RUNNING (default Emergent — not used by app) |
| Backend API (preprod.mygenie.online) | External — not monitored from pod |
| Socket (presocket.mygenie.online) | External — not monitored from pod |
| CRM | External — endpoint varies per deploy |
| Firebase | External — mygenie-restaurant.firebaseapp.com |
| MongoDB | RUNNING (not used by this frontend-only app) |

---

## Quick Links

| Layer | Doc |
|---|---|
| Baseline | [BASELINE_INDEX.md](./BASELINE_INDEX.md) |
| Handover | [AGENT_HANDOVER_PROTOCOL.md](./AGENT_HANDOVER_PROTOCOL.md) |
| CR Registry | [CR_REGISTRY.md](./CR_REGISTRY.md) |
| Bug Tracker | [BUG_TRACKER.md](./BUG_TRACKER.md) |
| Env & Config | [ENV_REGISTRY.md](./ENV_REGISTRY.md) |
| Sprint Status | [SPRINT_STATUS.md](./SPRINT_STATUS.md) |
| File Ownership | [FILE_OWNERSHIP.md](./FILE_OWNERSHIP.md) |
| Access | [ACCESS_REGISTRY.md](./ACCESS_REGISTRY.md) |
| Open Gaps | [OPEN_GAPS_REGISTER.md](./OPEN_GAPS_REGISTER.md) |
| Agent Prompt | [AGENT_PROMPT_ALPHA.md](./AGENT_PROMPT_ALPHA.md) |
| **Intake Workflow** | [INTAKE_WORKFLOW.md](./INTAKE_WORKFLOW.md) |
| Code Gate Policy | [CODE_GATE_POLICY.md](./CODE_GATE_POLICY.md) |
| **Registration Gate** | [REGISTRATION_GATE_POLICY.md](./REGISTRATION_GATE_POLICY.md) |
| **CR-011 Screen Freeze Protocol** | [CR_011_SCREEN_FREEZE_PROTOCOL.md](./CR_011_SCREEN_FREEZE_PROTOCOL.md) (BINDING — Gate 2.5) |
| **CR-011 Screen Freeze Log** | [CR_011_SCREEN_FREEZE_LOG.md](./CR_011_SCREEN_FREEZE_LOG.md) |
| **CR-011 Loading & Interaction Spec** | [../memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md](../memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md) (Gate 4 Code Gate contract; planning-only during Gate 2.5) |
ng-only during Gate 2.5) |

### POS 5.0 QA Batch (2026-07-11)
| Field | Value |
|---|---|
| QA Batch | 43 items (5 P0 + 23 P1 + 15 P2) — ALL PASS |
| QA Report P0+P1 | `/app/memory/test_reports/QA_REPORT_P0_P1_BATCH_2026_07_11.md` |
| QA Report P2 | `/app/memory/test_reports/QA_REPORT_P2_BATCH_2026_07_11.md` |
| Smoke Batch | `/app/memory/control/POS5_0_OWNER_SMOKE_BATCH_2026_07_11.md` (11 tests, ~9 screenshots) |
| Regression Zones | 6 identified — blocked on Gate 6 (owner smoke) |
| Next Gate | Owner Smoke (Gate 6) → Regression → Pre-Release Audit |

### POS 5.0 QA Wave 2 — July Sprint (2026-07-31)
| Field | Value |
|---|---|
| Current Gate | **5b — COMPLETE** |
| QA Group A (9 items) | `/app/memory/test_reports/QA_REPORT_GROUP_A_2026_07_31.md` — ALL PASS |
| QA Group B (6 items) | `/app/memory/test_reports/QA_REPORT_GROUP_B_2026_07_31.md` — ALL PASS |
| QA Group C (29 items) | `/app/memory/test_reports/QA_REPORT_GROUP_C_2026_07_31.md` — ALL PASS |
| Session Handover | `/app/memory/handover/SESSION_HANDOVER_2026_07_31_QA_GROUP_C.md` |
| Total QA Wave 2 | **44 items — ALL at Gate 5b — AWAITING OWNER SMOKE (Gate 6)** |
| Items for Owner Smoke | OV-1 (CR-109), OV-2 (CR-110), OV-3 (CR-116), OV-4 (CR-114/115), OV-5 (BUG-274/278), OV-6 (BUG-271) + QN-B1 (CR-118), QN-A1 (CR-123) |
| Blocked | HOLD-01 (`fos=5` terminal state — backend confirm needed) · CRM Keys truncated (owner to provide full string) |
| Next Gate | **Gate 6 — Owner Smoke Test** (SMOKE FACILITATOR role) |

**2026-09-10 — PLANNING Gate 2:** CR-374 Impact Analysis complete (`impact/CR-374_IMPACT_ANALYSIS.md`). Code reality: NONE. All 3 ODs locked. 1 file only (BulkEditor.jsx, ~66 lines, 4 edits). Conflict: BUG-392 parallel-safe (different section, line 1318 vs 244/425/958). BUG-391 declared Batch B (must wait for Batch A QA). OG-AUDIT-003 noted (line 682 marker, pre-release concern, do not touch). Zero blockers. Registry: 642 items. Next: Gate 3 Implementation Plan after owner Gate 4 GO.
