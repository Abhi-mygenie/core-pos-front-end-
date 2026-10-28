# CR-390 Step 1 — read-only evidence ledger

Date: 2026-09-28. Role: PLANNING / Gate 2 only. Owner approval: "start step 1 follow gates".
Primary assessment: `memory/impact/CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md`.

## Baseline fingerprints

Recorded before inspection, HEAD `ea31ed69615b963d94d7338f6fe5b0804d20ea67`.
Directory digest method: sort all file paths, omit `__pycache__`; update SHA-256 with each `/app`-relative path then its file bytes. No secret file content is included here.

| Protected surface | Files | SHA-256 |
|---|---:|---|
| `frontend/src` | 605 | `5d3d672ae6475f67108691249ec109b5a78dc31b529e5f69feeb54f4d443717b` |
| `frontend/scripts/screen-reference` | 15 | `aedc931bca08769a8bb667b7669f69e8bd0dc7530e288ead769ca13dd600aed4` |
| `backend` | 4 | `4022ac8cf843667342ec0f3b3f3bdec1008c4c2e0b529e3846f9feb4ae9e218a` |
| `memory/evidence/CR-390/MM` | 50 | `472a1b9d6d2264c4d43df91ced875d8ffcd2dda97e32a2fb0aff4c7f9e9b082f` |
| `memory/final` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

Individual originals:
- `frontend/.env`: `19d823fb740b52265820da97c98c8abd033630e5e5f2949ba21ed0aacf99246d`
- `backend/.env`: `0dff2f9c66c17db4ac4f67ac88e74a28b3241fa42675f7b18ea0e84da83d5dcc`
- `frontend/package.json`: `943138148206de33516a3150cc8358f87b0f24dffbad438441666ecf062d9b76`
- `frontend/yarn.lock`: `45bd16e4f75405fb245c021d31533ce499685ae85d0ac9f3c9c69fadbf7c4e34`
- `memory/design_briefs/MM_FAQ_VIDEO_SCRIPTS_70.md`: `d3043ed94dc7e1eb2434a83ec051bc54a9b4ef01a546dd8904f9d5ada3120e72`
- `memory/handover/FAQ_VIDEO_AGENT_HANDOVER_MM_2026_09_27.md`: `8c447cb44a6bc31fe2a185a695cd84503d994643df93ba7dd4fdabf13d889e3f`

## Inspection provenance

- 50 original PNGs visually reviewed through five `/tmp/cr390-existing-*.jpg` contact sheets. These temporary derivatives are not deliverables or required future evidence; numbered observations are retained in the assessment, originals remain canonical.
- An automated image-review response produced malformed output and was **not used** to certify coverage. Visual/source cross-checks, not its summary, support findings.
- Live checks used current `REACT_APP_BACKEND_URL` from protected frontend environment, never the older handover URL.
- Separate browser contexts for MM_STANDARD and MM_AGGREGATOR; existing common-login returned 200 for both; tokens/passwords were not logged in the report.
- All non-GET business requests blocked except exact existing auth endpoints and `POST /api/v1/vendoremployee/station-order-list`, source-confirmed read-only at `stationService.js:172–190`. No Save, delete confirmation, Enter-in-edit, import-file selection, stock toggle confirmation or drag/drop was performed.
- Final guarded observations reported zero blocked business mutations. The initial conservative guards blocked necessary login/station reads; this is disclosed, not classified as a product failure.
- Standard: Party GET 200/0 foods; Premium GET 200/122 foods and 122 rendered cards; subsequent Normal observation timed out. Active Menu later rendered Normal/Premium buttons and Save Configuration.
- Aggregator: GET foods-list 200/108 foods and 108 rendered cards. GET addon-list 200/10. GET aggregator-sync/variations 200/0 for Main Brand. Other brands remain unverified because option loading was not comprehensively awaited.
- No assertion of backend invariance from screenshots: auth may establish sessions, and reads may be logged server-side. No intentional business-data mutation.

## Documentation verification

**PASS — 30/30 documentation checks, 2026-09-28.** Checked using read-only reconciliation against original scripts, file bytes and baseline git objects:

- Exactly 70 distinct/consecutive FAQ IDs; every original script line anchor and scene-group count matches; **237 groups total, 34 B / 36 P**.
- Exactly 50 inventory entries matching existing PNG prefixes; 42 distinct hashes, six duplicate groups, eight redundant copies.
- All five protected directory digests and six individual original file hashes above unchanged, including both environment files, source, capture tooling, FAQ scripts/mapping and PNGs.
- Registry parses; only CR-390 record changed; no new keys/schema or unrelated registry changes. Parent status/gate/sprint unchanged; CRITICAL risk and separate recovery Gate 2 owner-review hold confirmed.
- Seven open OD-390-16…22 entries; primary output references exist; no Gate 3 edit plan or verification matrix written.
- Recent PRD history preserved verbatim in CHANGELOG.md; PRD now 693 lines; current priorities in ROADMAP.md.
- New documents contain no supplied password, bearer/JWT tokens or provider-key patterns.

This verifies documentation integrity and preservation, **not** Gate 5 application QA, full API correctness or all-70 external acceptance. Live observation limitations above remain open. The older generated dev-dashboard snapshot did not contain a CR-390 record at inspection; it was not broadly regenerated during this limited Gate 2 task. Canonical registry.json, human registry and control/sprint notices carry the current status.

**Additional verification limitation:** the workspace completion check reported “JavaScript linting failed due to a linter engine error.” No diagnostic stack or application-code finding was supplied. JavaScript lint therefore is **NOT VERIFIED**, not PASS. This also occurred before Step 1 approval in this conversation. No lint/config/dependency fixes were attempted because this task authorizes Gate 2 documentation/read-only assessment only. The 30 documentation checks above are separate and remain passed.

## Later decision-record synchronization — 2026-09-28

Owner accepted all recommendations with Palm House Normal / Kunafa Mahal Aggregator / Palm House Premium for switching-comparison only, then instructed “first update all docs and deecsions”. **OD-390-16…22 are now LOCKED FOR PLANNING**, superseding the original seven-open-decisions state in the historical verification above. No Party setup is planned.

**23/23 decision synchronization checks PASS:** seven locked rows and verbatim owner choice; exact menu restrictions; unchanged 70-FAQ/237-scene baseline; current and parent gate separation; 15 active Markdown notices/references carry the menu amendment; current handover/CHANGELOG; all five directory and six original-file fingerprints; only CR-390 registry entry changed with no schema change; PRD under 700 lines; no supplied password/token patterns in decision outputs.

Current assessment, intake, registry/human registry, control/sprint notices, evidence pointer, ownership/gaps, pipeline status, handover/supersession notices, PRD/ROADMAP/CHANGELOG synchronized. Original FAQ scripts/mappings and source assets intentionally unchanged, not silently rewritten under “all docs”. This follow-up made no live requests or new captures and no source changes. **Await separate Step 2 instruction; Gate 3 NOT STARTED; no new Gate 4 GO.** Prior linter limitation remains unchanged; no JavaScript lint/QA acceptance asserted.

## Presentation handover verification — 2026-09-28

Owner requested the next agent present the complete agreed sequence and Step 1 work, then ask for Step 2. Created `memory/handover/SESSION_HANDOVER_2026_09_28_CR390_PRESENT_PLAN_AWAIT_STEP2.md` and updated discovery/status pointers; this did not start Gate 3.

**24/24 handover checks PASS:** verbatim owner request; presentation → specific Step 2 ask → WAIT; clear distinction between overall approach and unwritten detailed repair plan; all seven accepted decisions/menu boundaries; honest coverage/verification/credential limits; external all-70 gate and later EM; all 16 named source references exist; all 11 discovery/status/history pointers updated; registry pointer with preserved parent gate/sprint; all five protected directory and six original-file hashes unchanged; no supplied secret/token pattern in handover; PRD under 700 lines. Documentation checks only, not application QA or video readiness. No new live requests, captures, narration changes or code.