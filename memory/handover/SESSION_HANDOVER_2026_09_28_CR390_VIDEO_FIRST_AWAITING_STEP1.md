**Session:** 2026-09-28 — CR-390 MM — Role 2 PLANNING (documentation and handover only)

> **SUPERSEDED STATUS — later 2026-09-28 decisions:** Step 1 complete; OD-390-16…22 LOCKED FOR PLANNING. Owner chose Palm House Normal, Kunafa Mahal Aggregator and Palm House Premium for switching/comparison only; no Party setup. **Await separate Step 2 instruction; Gate 3 NOT STARTED; no new Gate 4 GO.** Current handover: `SESSION_HANDOVER_2026_09_28_CR390_STEP1_GATE2_REVIEW.md`; decisions: `../impact/CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md` §7. Historical text below preserved; do not ask owner to repeat accepted choices. No code/capture/data/video changes or asset acceptance.
**Registry synced:** YES — OD-390-15 recorded; existing lifecycle status, gate and sprint unchanged
**Scope drift:** NONE — no application code, automation, captures, preprod data or generated deliverables changed
**Next:** Present the complete scenario in English, then ask owner approval for Step 1 ONLY; Step 1 NOT STARTED

# CR-390 — Video-first Menu Management FAQ preparation: complete handover

## 1. First action for the next agent — present, ask, then wait

The owner explicitly wants the next agent to explain the complete scenario and ask permission to begin Step 1. Do not silently begin work because this handover exists. Do not repeat already-settled delivery choices.

Read this handover and the reference documents below, select **Role 2 — PLANNING**, then present:

1. Existing application deployment is not the task to redo. CR-390's Menu Management screenshot/FAQ materials already exist, but the capture pack is not validated or ready for videos.
2. The prior investigation found both capture/QA failures and planning/content gaps. The repair scope is wider than the old handover's ten tasks.
3. All 50 expected PNG filenames were present, but the images do not consistently demonstrate their claimed states. A file count or clean-looking PDF is not evidence of completeness.
4. The owner has now locked **OD-390-15, option (a): video-first**, with clean screenshots and separate explanations/scripts/mappings; an annotated reference PDF is optional and is never the video-frame source.
5. Step 1 is a targeted coverage/impact-analysis amendment, not new application development, not recapture and not video generation. Subsequent permissions and the exact repair plan belong to Step 2.
6. No repair implementation starts without the amended plan and owner Gate 4 GO. No storyboards/TTS/videos start until the user confirms that external validation is green for all 70 FAQs.

Then ask explicitly:

> May I start Step 1 only: the CR-390 Menu Management FAQ coverage and Gate 2 impact-analysis amendment? I will assess all 70 FAQs against the current UI and screenshot evidence, document gaps and owner decisions, and stop for your review. I will not write the Gate 3 repair plan, change code, recapture screens, modify preprod data or generate storyboards/videos.

**Wait for the owner's answer.** If the owner wants more discussion, stay in discussion. This handover request is not approval for Step 1.

### Important numbering distinction

The owner's current **Step 1 = coverage / Gate 2 impact-analysis amendment** in the four-step recovery sequence. It is NOT the historical video pipeline's internal "Step 1 — Storyboard generation", and NOT the old recapture handover's first coding task. Those execution steps remain blocked.

## 2. Product, original goal and current environment

- Product: MyGenie POS, an existing React/CRACO frontend connected to an external Laravel preprod backend and other existing services. Do not replace it with a new React/FastAPI/Mongo implementation.
- Earlier owner requests: pull branch `21implement`, preserve platform/environment files, install with Yarn, run the frontend, sync `memory/`, and summarize the CR-390 handover. Those deployment/sync requests were completed before this discussion. Do not repeat a wipe, clone or pull without a new request.
- Repository snapshot previously reported: `ec45dedf`. Use the actual current repository state when later work is authorized.
- Frontend resides at `/app/frontend`, Supervisor-managed on port 3000; existing `/app/backend` and platform configuration were not changed in this session.
- Never trust preview URLs copied from old handovers. Use the current `REACT_APP_BACKEND_URL` in `/app/frontend/.env` for any later authorized browser work.
- Yarn only; if installation is later needed, this repository previously required `yarn install --ignore-engines`. No installation or service restart is needed for this documentation task.
- The broader CR-390 objective remains client-facing screen-reference material for nine modules: MM, EM, IM, DC, CM, DR, IN-Basic, IN-Advanced and PMS redo. MM is the current pilot. OD-390-15 does not cancel the other modules' PDF scope.
- MM video goal: **70 FAQs in English and Hindi = 140 MP4s**, with a separate preview/download UI. This is future work, not implemented in this session.

## 3. What exists and what is still missing

### Existing artifacts

- Capture runner, PDF assembler, master assembler and manifests in `frontend/scripts/screen-reference/`.
- Current MM manifest: 10 journey entries, 50 state definitions.
- 50 PNGs under `memory/evidence/CR-390/MM/`.
- Existing annotated reference PDF, 70 FAQ scripts and a FAQ-to-screen mapping / external-agent brief.
- A video-pipeline design document, not an executed video system.
- An earlier ZIP was delivered in a previous environment. `/app/frontend/public/downloads/MM_FAQ_Video_Pack.zip` was not present at the inspected path during this session; do not promise that an old download link works. Packaging remains later work.

### Not completed or authorized

- Step 1 coverage/impact-analysis amendment: **NOT STARTED**.
- Complete current 70-FAQ action-to-image matrix: not produced in this session.
- Amended Gate 3 repair plan and capture/data permissions: not approved.
- Capture automation repair, strict validation, recapture and corrected pack: not performed.
- Full external validation for all 70 FAQs: not green / not confirmed.
- Storyboard generation, translation, TTS, MP4 rendering and download UI: not started.

The previous investigation was a read-only artifact/source/history review. It was not live end-to-end application QA, a formal approved Gate 2 amendment or approval to act on preprod.

## 4. Findings already established — carry forward, do not ignore

### A. This is primarily capture execution and QA failure, with planning/content gaps

The required application views generally exist. Many intended screenshots were already planned but the automation did not reach the right UI state. Other states were added later but captured incorrectly. Some narration describes controls or behavior not supported by the mapped current UI.

Historical evidence available in the previously inspected remote clone's commit history:

- `10d509ab`: explicitly reported screens 03, 08 and 09 showing the dashboard instead of the intended screen.
- `2dc496bd`: reported "0 toast pages across all 40 screens" and called the PDF final. That check did not establish that the correct states were captured.
- `d1b49ac6`: supplementary screens 41–50 packaged; some problems deferred and PDF completion claimed.
- `ce29afac`: ZIP delivery reported.

The temporary clone `/tmp/pos-repo` may not survive a new environment; use these commit references if history is available, not as a reason to pull or change the repository.

### B. Inventory and duplicate findings

The read-only inventory check found **50 expected files present, zero missing filenames, 42 distinct byte hashes**. Six duplicate groups account for eight redundant outputs:

| Files | Meaning |
|---|---|
| 01 = 03 = 08 = 09 | Dashboard image; only 01 legitimately represents sidebar entry |
| 04 = 10 | Same base category/item view; reuse may be legitimate if correctly described |
| 15 = 44 | Same Quick Edit view, not new coverage |
| 24 = 45 | Add-on panel; intended inline editing was not demonstrated |
| 38 = 50 | Same empty variation-stock state; not populated controls |
| 41 = 49 | Same empty Party menu; no Party Quick Edit |

Screens 39 and 40 show loading splashes. Do not repeat the older statement "40 unique and correct": 42 unique files minus two splash images does NOT establish that the other 40 are correct. Several still have wrong, empty or incomplete states.

### C. Known visual coverage defects, including ones missed by the old ten-task list

| Screen / area | Existing evidence / gap |
|---|---|
| 03, 08, 09 | Wrong dashboard instead of Premium selection, Add Category or category drag |
| 06 | Inline category form shows "No printer mapped to BAR"; not a successful printer-routing demonstration |
| 11 | Shows Non-Veg filtering, no typed search query for FAQ 11 |
| 17 | No existing image/remove-photo control for FAQ 22 |
| 20 | Food Variations section collapsed; option controls absent |
| 22 | Operations visible, but actual Status & Flags toggles below the captured area |
| 38 / 50 | Empty variation-stock data; cannot demonstrate populated variation controls |
| 39 / 40 | Loading splashes, not Status Configuration / Active Menu |
| 41 / 49 | Party menu empty, no Party-price Quick Edit |
| 42 | Pricing & Tax collapsed, despite claiming expanded discount fields; useful discount fields already appear in 17/18, so assess mapping/reuse rather than assume another duplicate is needed |
| 43 | "No variations added", not a Multiple group with Min/Max |
| 44 | Duplicate of 15; does not supply the Out of Stock shortcut claimed by FAQ 39 |
| 45 | No inline add-on edit form |
| 47 | Item NAME changed to `NaN`, not a valid price revision; direct cell edit is not Excel-import evidence |
| 48 | All Categories and 336 selected items, not selecting all items within one category |
| Rename/delete result frames | Missing after-state images; historical capture rules prohibited saving/deleting on preprod, so safe result capture needs an owner decision |

These are inputs to Step 1, not a new approved exhaustive recapture list. Further gaps may emerge when the owner authorizes the full scene-by-scene assessment.

### D. Confirmed narration / current-source mismatches

- FAQs 04/05: Active Menu is on the separate Status Configuration page and uses option buttons, not a dropdown at the bottom of Menu Management.
- FAQ 25: the claimed Tax Calc control is not rendered in Full Edit; it is rendered in Quick Edit.
- FAQ 39: Quick Edit does not render an Out of Stock toggle. Do not add a React control merely to make this narration true.
- FAQ 50: add-on inventory tracking requires an existing recipe; the described recipe field does not appear after ticking Inventory.
- FAQs 61–63 and 67–68: mapped stock interfaces use UrbanPiper item/brand controls, not the separate Swiggy/Zomato stock buttons described by the scripts. Do not claim platform-isolated behavior solely from these screenshots; validate the actual supported flow before proposing narration.
- The old handover says narration is final except FAQ 02. That cannot be treated as proof of correctness. Propose necessary changes and seek owner approval; do not silently rewrite scripts.

### E. Automation weaknesses and safety concern

- Failed actions can log warnings and continue to screenshot.
- `--only` can omit prerequisite route/form setup for dependent states; do not assume targeted recapture is independently reliable.
- The inspected manifest had no per-state `assert_text` entries. Correct page/state, populated data and duplicate checks were not hard acceptance gates.
- Screen 43's generic variation-button selector can target the group's delete button rather than Multiple.
- Screen 45's broad row-button selector can target the Active-status button instead of Edit. That control can persist a status change. **Do not rerun it unmodified on preprod.** The source risk was identified; this session did not execute it or establish whether an earlier run changed data.
- Screen 48 targets a category selector different from the actual `filter-category-select` test ID.
- The original verification matrix checked pipeline basics such as the presence of at least one PNG, not complete FAQ-to-scene correctness.

Slow preprod contributed, but waiting longer alone cannot fix wrong selectors, missing prerequisites, missing data, stale narration or weak acceptance checks.

## 5. Owner's latest approved decision — OD-390-15

Owner first questioned whether detailed functionality text belongs on images intended for videos. We checked `runner.py`, `assemble.py`, the plan and a PDF sample:

- Raw source PNGs capture the application UI.
- The PDF assembler adds the title, "What this screen is", "Controls & Actions" and narration sections around the image.
- The existing video design already consumes PNGs, not rendered PDF pages.

Owner selected:

> (a) Video-first, with a separate annotated PDF retained as an optional reference.

Then instructed verbatim:

> "a update docs and decsion do not start step 1"

**Locked interpretation:**

1. Source images contain real application UI, with existing privacy/persona safeguards; no added explanatory paragraphs, functionality lists or narration boxes. Native UI text is not removed.
2. Keep explanations, narration and mappings separately. Later storyboards also remain separate from source images.
3. Videos consume clean PNGs, not annotated PDF pages.
4. Existing zoom/highlights, voiceover, same-language subtitles and branded intro/outro remain approved. The owner did not choose "no subtitles" or "no text anywhere".
5. Required preparation pack: clean screenshots, separate scripts/inventory/mappings and validation evidence.
6. Annotated PDF is an optional reference companion, not a prerequisite for video preparation or external validation. If included, it must match validated assets; do not present the old invalid PDF as current.
7. The frozen reference-PDF bottom layout and original nine-module PDF scope are not cancelled or redesigned.
8. Coverage should be judged by FAQ action/scene, not a fixed count of 50 images. Exact scene requirements and capture counts are to be assessed in Step 1, not decided in this handover.

## 6. Four-step recovery sequence and roles

| Step | Role / gate | Scope | Stop condition |
|---|---|---|---|
| 1 | Role 2 PLANNING — Gate 2 amendment | Assess current UI and screenshot evidence against all 70 FAQs; document coverage gaps, content mismatches, data/safety constraints, impact and owner decisions | Present impact analysis / gap matrix; wait for owner review. Do not write Gate 3 plan yet |
| 2 | Role 2 PLANNING — Gate 3 amendment + OWNER | Resolve narration/data permissions; specify exact automation changes, scope lock and verification matrix | Wait for explicit Gate 4 GO |
| 3 | Role 3 IMPLEMENTATION | Repair approved capture/validation tooling, recapture approved states, self-test, update required records and QA handover | Hand off to QA; no unapproved adjacent changes |
| 4 | IMPLEMENTATION → Role 4 QA → OWNER / Role 8 SMOKE FACILITATOR if useful | Package clean PNGs with separate scripts/mappings/evidence; optional reference PDF; independent verification and user-run external validation | Wait for explicit user confirmation that all 70 FAQs are green |

QA failures then route to **Role 5 BUG FIX → Role 4 QA re-test**. New scope/policy gaps route back to Planning/owner rather than being improvised. Pick one role at a time; QA does not fix code.

Do not start with a fresh Intake for the same CR-390 scope. If a genuinely separate product defect is discovered later, flag it for the owner's routing decision, not an unauthorized app fix.

## 7. Hard boundaries and downstream backlog

- No `/app/frontend/src/**` changes for capture repair; no React refactor or invented controls.
- Do not mutate preprod categories, prices, inventory flags, stock status or printer configuration without explicit scope-specific owner permission. Do not treat a general future capture GO as blanket permission for writes.
- Do not seed test data or introduce mocked states without approval. Existing evidence comes from real UI/preprod captures, with persona/privacy processing.
- Preserve `.env`, Supervisor/platform files, `.git` and `.emergent`; do not disclose secrets.
- No storyboard generation, translation, TTS or video rendering until the external-validation gate passes for all 70 FAQs. The external agent validates; it does not generate the storyboards in the chosen architecture.
- Future video design: in-pipeline LLM storyboards, English + natural Hindi/Hinglish UI nouns, ElevenLabs primary voice and Sarvam/Bulbul Hindi alternative, frame highlights/zoom/subtitles, MP4 composition, standalone HTML preview/download UI outside React `src`.
- No integration was implemented or tested in this session. Do not request keys now. Follow the relevant integration playbooks and obtain required credentials only when that phase is authorized.
- EM starts only after the owner reviews final MM videos. Other CR-390 modules remain future work; do not process unrelated workflow batches automatically.

## 8. Files to read and evidence references

Paths below are relative to `/app` unless absolute.

| Path | Purpose / trust note |
|---|---|
| `memory/control/AGENT_PROMPT_ALPHA.md` | Role definitions, approval boundaries and handover expectations |
| `memory/control/CONTROL_DASHBOARD.md` | Current OD-390-15 hold at top; older CR-390 next-action notes are historical |
| `memory/change_requests/CR-390_MODULES_SCREEN_REFERENCE_PDF_ALL_MODULES_INTAKE.md` | Original scope and canonical OD-390-15 decision |
| `memory/impact/CR-390_IMPACT_ANALYSIS.md` | Existing impact analysis; amend only after Step 1 approval |
| `memory/plans/CR-390_IMPLEMENTATION_PLAN.md` | Historical foundation plan with current documentation-only delivery amendment |
| `memory/design_briefs/MM_FAQ_VIDEO_PIPELINE_PLAN.md` | Locked delivery separation and future video design; its internal Step 1 is not the currently requested Step 1 |
| `memory/design_briefs/MM_FAQ_VIDEO_SCRIPTS_70.md` | Existing scripts; known inaccuracies above, not rewritten |
| `memory/handover/FAQ_VIDEO_AGENT_HANDOVER_MM_2026_09_27.md` | Existing inventory/mappings; known stale/incorrect claims, not a validation pass |
| `memory/handover/SESSION_HANDOVER_2026_06_CR390_MM_RECAPTURE_AND_VIDEO_PIPELINE.md` | Previous recapture proposals; newest owner hold overrides its old execution instructions |
| `memory/handover/SESSION_HANDOVER_2026_09_27_CR390_MM_PHASE2_COMPLETE.md` | Historical completeness claims; do not treat as acceptance evidence |
| `frontend/scripts/screen-reference/runner.py` | Capture action handling, setup dependencies and screenshot capture |
| `frontend/scripts/screen-reference/manifests/MM_menu.json` | Actual capture intentions/actions for 50 states |
| `frontend/scripts/screen-reference/assemble.py` | Adds PDF descriptions/controls/narration separately from source PNGs |
| `memory/evidence/CR-390/MM/` | Original PNGs; authoritative visual evidence of captured state |
| `memory/design_briefs/downloads/screen_reference/MM/MyGenie_Menu_Management_Screen_Reference_v1_2026-09-27.pdf` | Existing reference PDF containing known invalid states; not ready for reuse as final evidence |
| `frontend/src/components/panels/menu/ProductCard.jsx` | Quick Edit controls |
| `frontend/src/components/panels/menu/ProductForm.jsx` | Variations, discounts, tax and status flags |
| `frontend/src/components/panels/menu/AddonManagementPanel.jsx` | Add-on edit/status controls and recipe prerequisite |
| `frontend/src/components/panels/menu/BulkEditor.jsx` | Real category-filter selector and bulk UI |
| `frontend/src/components/panels/menu/AggregatorStockToggle.jsx` | UrbanPiper item stock control |
| `frontend/src/components/settings/aggregatorSetup/AddonStockTab.jsx` | Brand-scoped versus catalog-wide controls |
| `frontend/src/components/settings/aggregatorSetup/VariationStockTab.jsx` | Actual variation-stock controls |
| `frontend/src/pages/StatusConfigPage.jsx` | Separate Active Menu option buttons |
| `memory/control/FILE_OWNERSHIP.md`, `memory/control/OPEN_GAPS_REGISTER.md` | Planning conflict/gap checks after authorization |
| `memory/control/ENV_REGISTRY.md`, `memory/test_credentials.md` | Secure credential references if later authorized work needs access; do not copy raw secrets into reports |

## 9. Documentation updates and verification already completed

OD-390-15 and the hold were synchronized to these nine existing records:

1. `memory/design_briefs/MM_FAQ_VIDEO_PIPELINE_PLAN.md`
2. `memory/change_requests/CR-390_MODULES_SCREEN_REFERENCE_PDF_ALL_MODULES_INTAKE.md`
3. `memory/plans/CR-390_IMPLEMENTATION_PLAN.md`
4. `memory/handover/SESSION_HANDOVER_2026_06_CR390_MM_RECAPTURE_AND_VIDEO_PIPELINE.md`
5. `memory/PRD.md`
6. `memory/control/registry.json`
7. `memory/control/SPRINT_STATUS.md` (Owner Decision Log)
8. `memory/control/CR_REGISTRY.md`
9. `memory/control/CONTROL_DASHBOARD.md`

Documentation checks: **11/11 PASS** — nine decision/optional-PDF/Step-1-hold checks, valid registry JSON with unchanged lifecycle fields, and matching source/automation/backend/environment hash before/after. These were documentation checks, not product QA or screenshot acceptance.

Existing CR-390 machine fields were deliberately preserved: status `GATE_5A_MM_PDF_GENERATED`, gate `5A`, sprint `modules_pdf`, risk `LOW`. They describe historical work, not a new recovery approval or evidence that the pack is valid. Latest decision/notes explicitly hold Step 1. The forthcoming impact analysis must assess recovery risks; this documentation-only session did not downgrade them or reconcile unrelated historical registry drift.

This new handover supersedes earlier next-action instructions for the current MM recovery discussion. PRD/control pointers are updated to it. No credentials were created or changed.

## 10. Current stopping point

**Waiting for owner authorization to begin Step 1 ONLY.**

The next agent must first summarize the complete situation, confirm the already-locked option (a), and ask the Step 1 question in §1. No code/capture/data/packaging/video work is permitted by this handover. After Step 1 is separately approved and completed, stop again for review before Step 2.
