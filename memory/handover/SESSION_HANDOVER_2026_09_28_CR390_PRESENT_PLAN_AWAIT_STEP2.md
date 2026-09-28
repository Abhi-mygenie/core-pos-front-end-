# CR-390 MM — next agent: present the complete picture, then ask for Step 2

> **SUPERSEDED stage dispatch — later 2026-09-28:** Owner “begin step 2”. Recovery plan draft is now written: `../plans/CR-390_IMPLEMENTATION_PLAN.md` + `../plans/CR-390_MM_RECOVERY_EVIDENCE_SPEC.md`. **Gate 3 OPEN / OWNER REVIEW, no Gate 4 GO.** Current handover: `SESSION_HANDOVER_2026_09_28_CR390_STEP2_GATE3_REVIEW.md`. Preserve this prior presentation request as history; do not ask to restart Step 2 or infer implementation permission. OD-390-16…22 remain locked, OD-390-23/24/25 are new pending details.

**Date:** 2026-09-28. **Language:** plain English. **Role:** 2 — PLANNING under `memory/control/AGENT_PROMPT_ALPHA.md`.
**CURRENT STOP:** Step 1 / Gate 2 assessment complete; OD-390-16…22 accepted FOR PLANNING. **Step 2 / Gate 3 NOT STARTED. No new Gate 4 GO.**
**Code reality:** PARTIAL. **Recovery risk:** CRITICAL. **Sprint:** `modules_pdf`.
**This document:** handover and agreed overall sequence, NOT a Gate 3 implementation plan, capture list, narration rewrite or verification matrix.

## 1. Exact owner request for this handover

> “Write a handover for the next agent who will present me the complete plan, what has been done in step one, and then ask me for step two”

The next agent must:

1. Read the references below and choose **Planning**.
2. Present the full agreed goal, overall stages, Step 1 work/findings, accepted decisions, unresolved implementation details and safety limits in plain English.
3. Explain that the **detailed Step 2 repair plan has not been written yet**. “Complete plan” in this presentation means the agreed end-to-end approach, not invented file edits or a claim Gate 3 is complete.
4. Ask permission to start **Step 2 / Gate 3 ONLY**, then **WAIT**. Do not infer permission from this handover request, earlier account access, or “all recommended”.
5. Do not ask the owner to approve the seven already accepted general decisions again. Ask only new necessary specifics after the appropriate gate is authorized.

**Do NOT** start Step 2 while preparing/presenting the recap. Do not run the capture runner, write code, alter business data, rewrite narration, regenerate deliverables or start video work.

## 2. Required reading / source of truth

All paths below are relative to `/app/` unless beginning with `/app/`.

| Read | Purpose |
|---|---|
| `memory/control/AGENT_PROMPT_ALPHA.md` — Role 2 / stage dispatch | Follow Gate 2 versus Gate 3 boundaries; risk/owner approval requirements. |
| `memory/control/CONTROL_DASHBOARD.md` and `memory/control/registry.json` CR-390 | Current state and historical parent milestone. |
| `memory/impact/CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md` | **Canonical Step 1 assessment:** 50-image inventory, all-70 FAQ/237-scene matrix, source anchors, risks, accepted decisions in §7. Read the full document. |
| `memory/evidence/CR-390/GATE2_2026_09_28/READ_ONLY_EVIDENCE.md` | Inspection provenance, protected-file hashes, checks, limitations and later decision synchronization. |
| `memory/handover/SESSION_HANDOVER_2026_09_28_CR390_STEP1_GATE2_REVIEW.md` | Detailed previous-session summary and accepted choices. This new handover adds the owner-requested presentation/ask sequence. |
| `memory/change_requests/CR-390_MODULES_SCREEN_REFERENCE_PDF_ALL_MODULES_INTAKE.md` | Parent nine-module scope and decision history. Current notices override historical holds. |
| `memory/design_briefs/MM_FAQ_VIDEO_PIPELINE_PLAN.md` | Future video direction only; historical fallback/publication/checkpoint details are not an approved repair plan. |
| `memory/PRD.md`, `memory/CHANGELOG.md`, `memory/ROADMAP.md` | Current goal, preserved history and prioritized next steps. |

The canonical assessment's source references should support the presentation; no new exhaustive source audit or live probes are needed just to explain what was already assessed.

## 3. Goal and existing application

MyGenie POS is an existing React/CRA/Craco frontend. The original work imported the repository into `/app/frontend`, preserved platform files and environment configuration, and ran it under supervisor. It uses external preproduction services; the default local FastAPI/Mongo stack is not the POS data source for these tutorials.

**Current task is tutorial-evidence repair, not rebuilding the app.** CR-390's parent deliverable is nine module reference PDFs: Menu Management (MM), Expenses (EM), Inventory (IM), Day Closure/Settlement (DC), Credit Management (CM), Daily Report (DR), Insights Basic, Insights Advanced and PMS redo. Work is currently focused only on **MM**.

For MM, the owner chose a **video-first preparation pack**:

- Clean screenshots showing the actual application UI, with truthful privacy safeguards.
- Separate FAQ narration, explanations, inventory, mappings and validation evidence.
- An annotated reference PDF is **optional for video preparation** and never used as a video frame. This does not cancel the original nine-module PDF commitment or change its frozen layout.
- After approved corrections and external validation: **70 FAQs × English/Hindi = 140 videos**, using screenshot zoom/highlights, voiceover, matching-language subtitles and branded intro/outro.
- The planned separate video preview/download interface and processing pipeline are **not implemented**.

Existing committed tooling: `frontend/scripts/screen-reference/runner.py`, `assemble.py`, `manifests/MM_menu.json`; 50 PNGs in `memory/evidence/CR-390/MM/`; FAQ scripts in `memory/design_briefs/MM_FAQ_VIDEO_SCRIPTS_70.md`; original mappings in `memory/handover/FAQ_VIDEO_AGENT_HANDOVER_MM_2026_09_27.md`; generated MM reference PDF under `memory/design_briefs/downloads/screen_reference/MM/`.

The old ZIP was absent from `memory/final/` at inspection. Do not promise its historical link works. No new pack was produced.

## 4. Complete agreed sequence to explain to the owner

| Stage | What it does | Present status / permission |
|---|---|---|
| **Step 1 — Gate 2: assessment** | Compare every FAQ/action with existing screenshots and current app; identify missing evidence, wrong narration, unsafe capture behavior and decisions. | **Complete.** All seven general directions accepted, with menu amendment below. Evidence is not fixed or accepted. |
| **Step 2 — Gate 3: detailed repair plan** | Turn the assessment into exact remaining repair scope: screenshots/states needed, narration corrections, safe test records/actions/cleanup, tooling changes and verification matrix. Preserve existing working foundation. | **NOT STARTED. Ask permission after presenting this recap, then wait.** Planning only, no actual repairs or data writes. |
| **Step 3 — repair and capture** | Implement only approved tooling/content changes and collect approved evidence using the agreed data safeguards. | Requires owner review of Step 2 and explicit **Gate 4 GO**. No current authorization. Independent QA follows implementation. |
| **Step 4 — corrected pack and external validation** | Prepare clean PNGs, corrected separate scripts/mappings/inventory and validation evidence; optional reference PDF only if included appropriately. Reviewer examines every FAQ 01–70. | Future gated work. Errors must be corrected and reviewed; no misleading fallback images or hidden failures. |
| **Video production** | Storyboards, Hindi translation/voiceover, subtitles/highlights, sample review, then the approved full batch and preview/download experience. | **Blocked until the owner explicitly confirms all 70 FAQs externally green.** Later integration keys/voice choices required when relevant; do not request them just to present this handover. |
| **Later modules** | Owner reviews final MM videos, then EM discussion and subsequent approved module work. | **Not started.** No automatic expansion into EM or other modules. |

The historical video-plan heading “Step 1 — Storyboard generation” uses a DIFFERENT numbering scheme. In this conversation Step 1 = Gate 2 coverage assessment, Step 2 = Gate 3 repair planning. Do not mix them up.

## 5. What Step 1 actually completed

- Read all **70 original FAQs and their mappings**; reconciled **237 existing scene groups**.
- Visually reviewed **all 50 existing PNGs**, traced relevant current controls/services, and produced a per-FAQ action/result gap assessment.
- Counted **42 distinct SHA-256 hashes**, six duplicate groups and eight redundant images. The older “40 unique and correct” claim was retracted; distinct bytes do not establish correctness.
- Classified the current tutorials/evidence: **34 BLOCKED as written/mapped; 36 PARTIAL; none externally accepted**. These are **not 34 broken application features**.
- Performed narrowly scoped, guarded live reads using the supplied standard and aggregator accounts; no intentional business-data changes.
- Raised recovery risk from historical LOW to **CRITICAL** because unsafe automation can affect deletion, imports, prices/taxes, printing and restaurant-wide stock.
- Recorded OD-390-16…22 and the owner’s amendment; synchronized assessment/intake/registry/control/status/evidence pointers/ownership/gaps/handovers/PRD/ROADMAP/CHANGELOG. Earlier notices are marked historical.
- Verified preservation of source, capture tooling, environment, dependencies, original FAQ scripts/mappings and original PNGs with hashes.

### Important Step 1 findings

1. **Wrong or missing visual states:** dashboard/loading images stand in for controls, variation panels are collapsed or empty, and many workflows lack actual saved-result evidence.
2. **Scripts do not match the app:** Active Menu is in Local Settings with buttons and Save Configuration; Full Edit does not have Tax Calc; Quick Edit has no Out of Stock field; category '+' has no action; quick-created add-ons are not automatically selected; the described add-on recipe picker is absent.
3. **Excel behavior is dangerously misdescribed:** Import writes to the server immediately, not after a later Save. Bulk Save is per-row, not atomic. Screenshot 47 edits the Name to `NaN`, not a valid price; 48 selects all categories rather than a safe category subset.
4. **Aggregator actions have different scopes:** platform-listing flags are separate from UrbanPiper timed stock. Current timed stock does not supply the claimed platform-only selector. Some add-on catalogue actions affect **all brands**.
5. **Runner safety needs repair:** failed actions can be ignored; ambiguous first-button selectors can select the wrong action; waits do not establish readiness; error hiding can conceal a failed state. Do not run it as-is.
6. **Privacy and unsupported outcomes:** old dashboard images contain guest/room details. A form setting alone cannot certify downstream billing, printing, inventory, guest-menu or sync behavior.

### Observed live data — snapshot, not a guarantee of current counts

| Account/context | Observed during Step 1 |
|---|---|
| Palm House | Party 0; Premium 122 rendered items. Normal count re-read timed out, so no fresh Normal total was asserted. |
| Palm House Local Settings | Active Menu options Normal/Premium; Save Configuration visible. Nothing saved. |
| Kunafa Mahal Aggregator | 108 items; add-on list 10; Main Brand variations 0. |
| Other aggregator brands | **Not fully verified** due async selector timing. Do not say every brand has no variations. |

Party's emptiness was part of the original diagnosis. **Owner has since excluded Party examples**, so do not re-open Party seeding as the selected solution.

## 6. Owner decisions already accepted — present, do not ask again

Owner verbatim:

> “All recommended but use normal menu from palm house and aggregator menu from kunafa while switching menu u can use premium from palm house”

| Decision | Agreed direction |
|---|---|
| **OD-390-16 — safe demo data** | Approved, clearly labelled disposable test records; agree exact permitted actions, original-state checks and cleanup later. Do not use operational records for destructive demonstrations. Credentials do not grant mutation permission. |
| **OD-390-17 — menu sources** | **Palm House Normal** for standard MM. **Kunafa Mahal Aggregator** for aggregator MM. **Palm House Premium only for switching/comparison with Normal. No Party setup/examples.** Standard create/edit demonstrations remain Normal unless separately approved. |
| **OD-390-18 — narration** | Correct tutorials to current app rather than alter the app to fit inaccurate scripts. Retain all 70 FAQ IDs; adapt misleading titles/steps, including old Party references. Genuine product changes need separate intake. |
| **OD-390-19 — aggregator** | Explain actual stock/listing and all-brand/per-brand distinctions. Do not promise unsupported Swiggy-only or Zomato-only timed actions. Need suitable approved variation data. |
| **OD-390-20 — downstream claims** | Use confirmed rules or approved evidence; otherwise qualify narration rather than promise unverified outcomes. Extra evidence collection cannot silently expand scope. |
| **OD-390-21 — coverage** | Enough appropriate screenshots for all 70 FAQs, not a fixed count of 50; reuse only genuinely applicable states. Optional annotated PDF remains separate. |
| **OD-390-22 — privacy** | Protect guest/account data, use test data and repo-only working artifacts. Never hide an error or falsify a result under the guise of privacy. Public sharing needs separate approval. |

These decisions are **LOCKED FOR PLANNING ONLY**. The original FAQ/script/image baseline remains unchanged and unaccepted. The upcoming Gate 3 plan must specify exact record IDs, allowed actions, cleanup, suitable variation brand/data, necessary claim evidence and precise edits. Those are remaining planning details, not reasons to ask the seven general decisions again.

## 7. Verification and honest limitations

- **30/30 original documentation checks passed:** IDs/scenes/line anchors, inventory/hashes, references, registry scope, historical PRD preservation and secret-pattern checks.
- **23/23 decision-sync checks passed:** seven locked decisions, owner wording/menu restrictions, current pointers, gate separation, protected fingerprints, only CR-390 registry record changed and no schema change.
- These checks are **not independent application QA**, not a clean JavaScript lint result, and not the external 70-FAQ acceptance.
- A workspace completion check reported a **JavaScript linter-engine error** without diagnostic detail, also seen before Step 1. No out-of-scope tooling/config/source fix was attempted. Do not start fixing it merely to present this handover.
- Initial browser guards blocked login/read-only station-list requests; source-confirmed exceptions allowed later observation. No app-auth defect was established. Login can establish sessions and backend reads may be logged; “no business-data mutation” does not mean no server activity at all.
- The older generated dev-dashboard snapshot did not contain CR-390 and was not broadly regenerated. Canonical registry and human control records carry current status.

## 8. Non-negotiable boundaries and environment notes

- No `frontend/src/**`, backend, dependency, environment or authentication changes under the current documentation scope. No new code files, capture manifests or original-script rewrites in this handover task.
- No imports/file selection, Save/Enter-in-edit, deletes, Power/stock confirmation, completed drag/drop, platform push, print, order placement or business-data changes before approved exact scope and Gate 4 GO.
- Never treat avoiding a Save button as proof of safety: several other actions write immediately.
- Preserve `.env`, `.git`, `.emergent`, existing application and original evidence. Use only the current environment-provided preview URL if a later authorized live check is needed; older URLs are stale.
- `memory/test_credentials.md` was absent at handover creation. Earlier accounts were supplied by the owner and used successfully; no passwords/tokens have been copied here. **Credentials are not needed to present this recap.** If later approved live checks require unavailable credentials, request them securely then; do not invent accounts or log in during this presentation task.
- Parent registry fields deliberately remain `status=GATE_5A_MM_PDF_GENERATED`, `gate=5A`, `sprint_key=modules_pdf`. This is a **historical generated-PDF milestone**, not approval or acceptance of recovery work. Current recovery state is in notes/current docs.
- Video settings already chosen include English/Hindi, ElevenLabs primary with optional Sarvam Hindi comparison, separate scripts/processing and preview UI. Their old estimates, fallback mappings and placement details need later gated reconciliation; nothing was built or newly approved here.

## 9. Suggested presentation and exact stopping question

Present in this order, in plain English:

1. “We are repairing the MM tutorial material, not rebuilding your POS.” Explain the final clean screenshot/script pack and later 140 videos, while retaining original PDF commitments.
2. Walk through the **complete stage table in §4**. Clearly mark done, awaiting permission and future work.
3. Summarize Step 1's all-70 coverage, 34 blocked/36 partial, visual/narration/safety/privacy findings and honest live-data limits.
4. Confirm the **already selected menu sources** and the seven accepted directions.
5. Explain Step 2's intended output: a precise repair plan and verification matrix, covering remaining evidence/content/tooling work, safe record/actions/cleanup and approval boundaries. Do not provide invented completed edits, capture counts or timescales.
6. State that no source/scripts/images/business data were changed and that all-70 external acceptance still gates videos.
7. Ask:

> **“May I start Step 2 — Gate 3 planning only: prepare the detailed repair plan and verification matrix using Palm House Normal, Kunafa Mahal Aggregator, and Palm House Premium for switching/comparison? I will not change data, rewrite scripts, recapture screens or generate videos, and I will stop for your review before Gate 4 GO.”**

Offer a simple approve / discuss-first / keep-paused choice if appropriate. **WAIT FOR THE OWNER’S ANSWER.** No automatic progression after presenting the plan.

## 10. What this handover task did

Created this presentation-ready handover and updated current discovery/status pointers only. It did not start Gate 3 or add any repair implementation. Validation of handover references, accepted decisions and preserved gate/source/evidence boundaries is recorded in the evidence ledger after checks.