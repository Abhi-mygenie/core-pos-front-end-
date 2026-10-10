# CR-390 — next agent: present both sessions, current position and option 3b execution approvals

**Date:** 2026-09-28 (workspace date). **Role:** 2 — PLANNING. **Language:** plain English.
**CURRENT STOP:** **Gate 3 OPEN / OWNER REVIEW; no Gate 4 GO.** Option **3b is LOCKED FOR PLANNING**, not a new gate, Gate 3 closure or live-access permission. No discovery has run.
**Risk:** CRITICAL recovery. **Code reality:** PARTIAL. **Sprint:** `modules_pdf`.

## 1. Owner request — verbatim and interpretation

> “Gate 3B plan is fine. So you can make a note of it and write a detailed handover for the next agent who will present me the work which has been done in this session and previous session over, over this CR and where exactly we are, and explain me what decisions are needed from me to take those decision to-- for the plan 3B gate”

The immediately preceding question was: “Would you like to select 3b for the plan? That selection alone will not start discovery or advance us beyond Gate 3.” Therefore:

- Record **OD-390-25 = option 3b: read-only discovery first**, then owner reviews the shortlist/gaps. Do not ask the owner to choose 3a versus 3b again.
- “Gate 3B” is the owner's shorthand for **option 3b within Step 2 / Gate 3**. Do NOT create a new gate/state, equate it with QA Gate 5b, mark Gate 3 closed, or infer Gate 4 GO.
- This request authorizes decision documentation and a detailed presentation handover only. The next agent first presents, explains the remaining execution approvals in §7, asks, and **waits**.
- Do not run login, live queries, capture automation, setup/seed scripts, exports, imports, writes, code repairs or video work merely to make the presentation more complete.

## 2. Required reading order / source of truth

Paths are relative to `/app/` unless stated otherwise.

1. `memory/control/AGENT_PROMPT_ALPHA.md` — choose Planning, respect role/gate limits.
2. This handover — current owner request, accepted choices and next-agent presentation contract.
3. `memory/plans/CR-390_IMPLEMENTATION_PLAN.md` — CURRENT recovery amendment at top. Its old 2026-09-27 foundation plan below the historical divider is NOT new execution permission.
4. `memory/plans/CR-390_MM_RECOVERY_EVIDENCE_SPEC.md` — all-70 proposed correction/evidence chains, source anchors, data examples and mutation risks. It is not an implemented manifest or corrected narration.
5. `memory/impact/CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md` — Step 1 canonical findings, original 50-image inventory, 70-FAQ/237-group assessment and OD-390-16…22.
6. `memory/evidence/CR-390/GATE2_2026_09_28/READ_ONLY_EVIDENCE.md` — prior agent's Step 1 evidence/provenance and limits.
7. `memory/evidence/CR-390/GATE3_2026_09_28/PLANNING_EVIDENCE.md` — current source-preservation hashes and actual documentation checks, including later decision updates.
8. `memory/control/registry.json` (CR-390 item), `CONTROL_DASHBOARD.md`, `CR_REGISTRY.md`, `OPEN_GAPS_REGISTER.md`, `FILE_OWNERSHIP.md`, `SPRINT_STATUS.md`, `memory/PRD.md`, `memory/CHANGELOG.md`, `memory/ROADMAP.md`.
9. Supporting history: `memory/handover/SESSION_HANDOVER_2026_09_28_CR390_STEP1_GATE2_REVIEW.md`, `memory/handover/SESSION_HANDOVER_2026_09_28_CR390_STEP2_GATE3_REVIEW.md`, `memory/handover/SESSION_HANDOVER_2026_09_28_CR390_PRESENT_PLAN_AWAIT_STEP2.md`, `memory/handover/SESSION_HANDOVER_2026_06_CR390_MM_RECAPTURE_AND_VIDEO_PIPELINE.md`.

Latest notices/this handover override historical “Step 1 not started”, “Gate 3 not started” and “OD-390-25 open” dispatch text. Preserve the historical evidence; do not repeat obsolete permission questions. Original video-script/mapping files are known inaccurate inputs, not current execution instructions.

## 3. Overall goal and existing application — context, not a new task

- MyGenie POS is an existing React/CRACO frontend under `frontend/`, using its configured external preprod services. Platform backend/config folders remain present and protected; no application rebuild is requested.
- Earlier work imported/re-pulled GitHub branch `21implement`, preserving `.env` and platform folders and synchronizing `memory/`. Yarn installation/compilation/page rendering were observed; the older compiler hook warning was non-fatal. Full authenticated app functionality was not certified by this deployment check. Do not redeploy, repull or fix unrelated lint/source issues in this task.
- Current workspace entry for this handover: `f553f22`; previous planning entry `016efe1`. These are local platform history, not a newly verified remote branch head. Use current `frontend/.env` `REACT_APP_BACKEND_URL` for any later authorized preview access; never reuse historical preview URLs or overwrite protected environment values.
- Original CR-390 scope: repeatable reference-PDF pipeline for nine modules — Menu Management, Expenses, Inventory, Day Closure & Settlement, Credit Management, Daily Report, Insights Basic, Insights Advanced and PMS redo. That scope and frozen reference layout remain intact.
- Current priority is **Menu Management FAQ evidence recovery**, then **70 English + 70 Hindi videos (140 total)**. Clean real-UI PNGs are source assets; scripts/explanations are separate. Annotated PDF is an optional reference companion, never a video-frame source.
- The desired video pack and its review/download UI are still future work. No LLM/TTS/video provider was integrated by these planning sessions. No generation or translation begins before all-70 external acceptance and owner confirmation.

## 4. What has happened across the CR — chronological, with provenance

### A. Earlier foundation and original capture pack (historical work)

- Existing `frontend/scripts/screen-reference/` has `runner.py`, `assemble.py`, `master_assemble.py`, persona/template files and nine module manifests. MM manifest has 50 states; original scripts cover 70 FAQs. Reference PDF and PNG pack exist.
- Registry parent `status=GATE_5A_MM_PDF_GENERATED`, `gate=5A` records that historical generated-PDF milestone. It is NOT proof that recovery passed or that assets are client-ready. Keep parent/sprint fields; describe recovery stage in existing metadata.
- Earlier “50 unique/all valid” and “40 correct” claims were withdrawn. The images exist, but filenames/counts do not establish their claimed UI states. Do not relabel the old pack as accepted.

### B. Previous recovery session — Step 1 / Gate 2 assessment

- Prior agent assessed **70 FAQs / 237 original scene groups** against source, old assets and limited read-only live observations.
- Inventory: **50 PNG files / 42 distinct hashes**; six duplicate groups, eight redundant copies. **34 FAQs blocked as written/mapped; 36 partial; none externally accepted**.
- These are tutorial-evidence classifications, not 34 broken app features. The 237 groups are the original script baseline, not an approved new screenshot count.
- Findings: dashboard/loader/wrong states in some captures; missing expanded variations/inline editors/results; narration pointing to absent/wrong controls; ambiguous selectors; errors concealed by old fallback/masking guidance; sensitive guest/room details in some frames; no proof of many claimed downstream results.
- Source reality included: Active Menu is in Local Settings, not MM; Full Edit has no Tax Calc; Quick Edit has no Out of Stock; quick-created add-on is not automatically selected; add-on inventory requires a recipe but there is no recipe picker there; imports write immediately; bulk saves can partially succeed; listing flags differ from timed stock; some add-on changes affect all brands.
- Historical live limits: Normal refresh timed out; Main Brand variation list was empty; other brands were not verified. Historical counts are not current readiness evidence. Do not refresh them without permission.
- Step 1 agent recorded 30/30 documentation checks; later decision synchronization recorded 23/23. These historical checks are not app QA and were not rerun as a fresh live investigation by this handover agent.
- Owner accepted OD-390-16…22 with the specific restaurant/menu amendment below. Old awaiting-Step-1 handovers were superseded.

### C. This recovery session — Step 1 review and Step 2 / Gate 3 planning

- Read Planning-role instructions, reviewed the Step 1 agent's handover/assessment/ledger, explained the current state and waited for Step 2 permission. Owner then said **“begin step 2”**.
- Revalidated current source/tooling. Source, capture tooling, original scripts/mapping and PNG fingerprints match Step 1. Frontend .env differs from the old agent's historical hash; current entry .env was preserved, not reset.
- Amended the existing implementation plan in place and added the detailed data/evidence annex. **8 proposed edit groups**, touching **5 existing files + 2 new tooling/test files** only in a future approved implementation; **34 future verification checks** and stages T0–T6.
- Proposed existing edits: runner, MM manifest, runner README, English source FAQ scripts and production mapping/handover. Proposed new files: offline pack validator and offline safety tests. **None of those source/tooling/original-script edits has been implemented.**
- The plan covers exact source-grounded selectors, separate account contexts, read-only setup, request/identity/field guards, immediate-action risks, saved-result read-back, privacy, cleanup, revisioned private packs and all-70 external acceptance.
- Additional refinements: category reorder submits the whole category list; item reorder submits the filtered item list; several stock/add-on actions write immediately; Local Settings Save writes multiple local preferences; many UI labels lack input associations and switches are ordinary buttons. These facts are reasons for bounded evidence collection, not authorization to repair app source.
- Initial Step 2 documentation/preservation suite **50/50 PASS**, including 72 original binary evidence/deliverable files unchanged. Follow-up 1a/2a decision check: 34/36 initially passed, two status-text assertions standardized and targeted recheck 2/2 passed. Exact check provenance is in the Gate 3 ledger; do not label future V01–V34 as executed.
- Owner selected **1a and 2a**, asked to understand decision 3; the agent explained the two data-sourcing options and recommended read-only discovery first. Owner now accepted **3b for planning** and requested this presentation handover.

### D. This final handover update only

- Recorded OD-390-25 as LOCKED FOR PLANNING (3b), with no automatic access/implementation approval.
- Updated plan/data/status pointers and this complete handover. Detailed previous artifacts remain the source of truth, not duplicated runnable tooling.
- Final handover-only checks: 58/59 initially passed; the sole flagged reference was the explicitly absent credentials file, not a missing required handover. Required-reference recheck PASS with that known prerequisite excluded; all 59 conditions satisfied. **72 original binary assets unchanged**, source/tooling/env protected, parent/unrelated registry unchanged; no app QA or discovery. Detailed method is in the Gate 3 ledger.

## 5. Accepted decisions — present, do not ask again

| Decision | Accepted choice | What it does NOT authorize |
|---|---|---|
| OD-390-15 | Video-first, clean real-UI PNGs; separate explanations; optional reference PDF | No storyboard/TTS/video generation yet; no cancellation of nine-module PDF scope |
| OD-390-16 | Approved disposable records for modifying demonstrations | Existing trading records are not automatically safe to modify; exact later actions still need approval |
| OD-390-17 | Palm House Normal for standard MM; Kunafa Mahal Aggregator; Palm House Premium only for switching/comparison; no Party setup | No Premium edits, Party seeding or cross-account substitutions |
| OD-390-18…22 | Match actual app/aggregator semantics, qualify unsupported downstream claims, retain enough evidence for all FAQs, protect privacy without hiding errors | No fictional outcomes, arbitrary screenshots, public data dumps or app feature changes |
| OD-390-23 = 1a | Category reorder gesture-only, cancel without save; no persisted-order claim | No category-order request, whole-list change or maintenance exception under this plan |
| OD-390-24 = 2a | Truthful specific FAQ adaptations: read-only N/P comparison, preview clearing without saved-photo deletion promise, listing flags distinct from timed stock | No drop in FAQ count; missing required evidence remains BLOCKED; original scripts not rewritten yet |
| OD-390-25 = 3b | Read-only discovery FIRST, then owner reviews existing examples and missing safe demo data | Not live-access permission, Gate 3 closure, Gate 4 GO, approved IDs, setup or write/cleanup permission |

**All OD-390-16…25 directions are now locked for planning.** Remaining questions concern operational scope/access/staging, not reselecting these options.

## 6. Exactly where we are / next-stage dependency map

| Stage | Current state |
|---|---|
| Step 1 / Gate 2 coverage assessment | Complete; accepted general planning decisions recorded |
| Step 2 / Gate 3 repair plan | Detailed draft prepared; 1a/2a/3b accepted; **Gate 3 still OPEN for scoped discovery/plan review** |
| Option 3b read-only discovery | Selected as plan direction; **NOT STARTED / NOT AUTHORIZED TO RUN** |
| Tooling fixes / original-script rewrite / recapture | NOT STARTED; separate Gate 4 scope required |
| Business-data setup / modifications / stock actions | NOT AUTHORIZED; exact safe IDs/fields and cleanup plan depend on discovery findings |
| Corrected pack / independent QA / all-70 external review | NOT COMPLETED; no FAQ/assets externally accepted |
| Storyboard / Hindi translation / TTS / 140 videos | NOT STARTED; all-70 external and owner all-green gate first |
| EM and remaining reference modules | Later; EM after owner reviews final MM videos |

**Important dependency:** do not demand unknown demo record IDs before approving a READ-ONLY inventory whose purpose is to find those IDs. Account/restaurant scope and read-access permission come first. Exact IDs/fields/baselines/write permits come later, after discovery and owner review. Conversely, read permission can never stand in for permission to modify discovered records.

## 7. Decisions the next agent must explain and request — staged, not a blanket GO

The owner should not need to design selectors, supply network allowlists or inspect code. The agent prepares technical details; the owner chooses the business scope and grants or withholds access.

| Approval checklist | Ask the owner in plain English | Recommendation / boundary | Status |
|---|---|---|---|
| P3B-1 — read scope | May the future discovery inspect Palm House Normal categories/items/add-ons, Normal/Premium comparison candidates and Kunafa Aggregator brand/item/add-on/variation lists? All accessible Kunafa brands or named brands only? | Restrict to the already selected accounts/menus. Read menu-type metadata if necessary, but no Party item journey/setup. Existing printer mapping/recipe-availability metadata only; no configuration changes. | PENDING — exact scope not approved |
| P3B-2 — access | Confirm the authorized preprod accounts/restaurant identities and provide or restore appropriate credentials securely, only when scheduling the authorized pass. | `memory/test_credentials.md` is absent; do not guess credentials, assume prior sessions work or copy secret values into this handover. Never use an operational terminal's browser profile. Current environment values remain protected. | PENDING — access not provisioned/verified |
| P3B-3 — evidence/privacy | May the pass save a private, minimal readiness table in memory with record IDs, menu/brand, relevant names/prices/configuration, FAQ use and available/missing status? | Recommended metadata-only discovery: NO screenshots, full-menu Excel download, full JSON dumps, guest/order/bill data, auth/session material or public sharing. Request a separate exception if an extra field/file is truly needed. | PENDING — private read-output scope |
| P3B-4 — sequencing/explicit GO | After the next agent presents the exact limited pass and safety prerequisites, does the owner approve the Gate 3 scope/closure and then issue a separate scoped Gate 4 GO for the specific next operation? | First review, then explicit approval. A tooling-only GO permits only offline safety work; a later read-only-discovery GO must explicitly name it and exclude captures/writes. Do not bundle in script rewrites, recapture or business changes. | PENDING — Gate 3 OPEN, no Gate 4 GO |

Do not ask for all future demo records, workbooks, tax values or stock-write permission now. Those depend on the readiness table and belong to a later scoped review. No need to select voices, pay for providers, set up object storage, approve public pages or decide EM scope in this presentation.

## 8. What a later authorized option-3b pass would do

This is a presentation of the approved DIRECTION, not an executable script or a permission grant.

1. **Before live access:** source-revalidate necessary read requests and their side effects; record allowed origin/method/path/query/account and safe output fields. Avoid the old capture runner and dashboard boot because their actions/preloads can be unsafe. Determine whether an existing approved read-only mechanism is sufficient; if new safety/auth-handling code is needed, return to the appropriate tooling scope/required integration guidance before writing it. Never run the unsafe capture runner unmodified.
2. **Isolated authorized access:** verify exact restaurant identity, use the configured preprod origin, separate sessions per account. Only normal permitted login/session housekeeping and explicitly verified read requests; no business mutation. “Read-only” does not mean every HTTP GET is permitted or every POST is a business write.
3. **Inventory minimal metadata:** identify Normal examples; comparable existing Premium items; Kunafa brands and populated variation/add-on candidates; existing printer mapping and recipe-availability facts if covered. An API timeout/empty/unavailable field is reported as unknown/missing, not invented data. Normal being empty on an Aggregator account does not establish that Aggregator is empty.
4. **Return a readiness table:** account/menu/brand, record ID/label, FAQ(s), observation-only or possible future demo candidate, available/missing/unknown, sensitivity, and proposed later action. Existing operational data is marked observation-only. Owner must separately confirm disposal/edit safety.
5. **Stop for owner review:** shortlist reusable examples and request only missing safe data. No seeds, uploads/imports, edits, deletions, drag release, stock changes, catalog sync, settings save, sales, printing or scheduling. No image capture or workbook download under the recommended metadata-only pass.
6. **Later, separately:** owner approves exact records/actions/values/exposure/cleanup; approved tooling/content/capture stages proceed with their checks. Unknown import behavior or unsafe aggregator scope remains blocked, not “tested” by trying it on live data.

Suggested read-source references (not an automatically approved allowlist): `frontend/src/api/services/menuManagementService.js` — getMenuMaster/getFoodsList/getCategories/getAddonList/getRestaurantClients/getStationPrinterList; `frontend/src/api/services/aggregatorConfigService.js` — getBulkAddons/getBulkAddonItems/getVariations. Verify current source and field needs before any request; recipe mapping cannot be assumed present from a name alone. No store config/push/clear/toggle endpoints in discovery.

The full runner safety implementation in the Gate 3 plan remains proposed. Do not label it installed or trust its proposed guards until implemented/tested under scope. Discovery may precede data-dependent content/capture stages but may not bypass necessary safety work or approvals.

## 9. What the next agent must present, in order

1. “CR-390's original tooling/assets exist; the current job is repairing the evidence for all 70 MM FAQs before producing 140 EN/HI videos.”
2. Explain prior Step 1 findings: 50 files/42 hashes, 34 blocked/36 partial, wrong screens/content/safety issues. Separate documented historical observations from fresh verification.
3. Explain this session's plan: 8 edit groups, all-70 evidence map, safety boundaries and 34 FUTURE checks; no implementation yet.
4. Confirm accepted menu/video decisions and 1a/2a/3b; explain that 3b is a selected data-discovery approach, not a gate advancement.
5. Show the stage table (§6) and walk through P3B-1…4 (§7), especially what the pass will NOT do and how the resulting table reduces questions for the owner.
6. Ask only the remaining scope/access/privacy/staging questions, maximum four focused questions; avoid requesting secrets prematurely or in an ordinary public document. Do not re-ask 1a/2a/3b or any other locked general direction.
7. **WAIT.** Do not improve the presentation by logging in, sampling data, creating code/captures or calling a testing agent. Record answers only when given; gate status changes need explicit owner approval.

## 10. Verification, blockers and preservation checklist

- Actual documentation checks are in the Gate 3 ledger, with historical vs latest runs distinguished. They do not prove app behavior, data readiness or external asset acceptance.
- Existing frontend hook warning/linter-engine limitation is not fixed and is outside this documentation task. No deployment-readiness check was requested or performed. Do not claim auth/API integrations work based on a login-page screenshot.
- Protect `frontend/src/**`, `frontend/scripts/screen-reference/**`, original FAQ scripts/mapping, original 50 PNGs/PDFs/ZIPs, `frontend/public`, env/dependencies, backend and platform config. No newly generated video/capture files.
- Preserve unrelated registry records; CR-390 parent generated-PDF milestone remains historical. Recovery is Gate 3 OPEN with OD-390-25 LOCKED FOR PLANNING and P3B execution approvals pending. No new “Gate 3B” enum/schema.
- No credentials are printed here. If a later authorized agent creates/updates a secure test credential record, follow the project credential workflow and never put values into a handover or public asset.
- Future V01–V34 include MOCKED offline safety fixtures; none has run as implementation QA and none may be used as real tutorial evidence. Original source UI must not be faked to conceal missing controls, errors or results.
- Final stop remains: **present this handover and ask for the remaining approvals; do not execute option 3b yet.**
