# CR-390 Step 2 / Gate 3 — planning evidence ledger

**Date:** 2026-09-28 (workspace UTC). **Owner authorization:** “begin step 2”, following “choose planning role for step 2 , donot jump gates”. Documentation/source inspection only.
**Workspace HEAD at entry:** `016efe1` (platform copy/re-pull commit). Step 1's original source commit `ea31ed69615b963d94d7338f6fe5b0804d20ea67` is historical; do not claim it is current HEAD. Source/tooling byte fingerprints below still match Step 1.

## Baseline and preservation method

For directory digests: sorted file paths, omit `__pycache__`, feed `/app`-relative path bytes then file bytes into SHA-256. Individual hashes feed file bytes only. Environments were hashed without printing values. No browser, API, authentication, capture, download or external-service call performed.

| Protected surface | Files | Entry SHA-256 |
|---|---:|---|
| frontend/src | 605 | 5d3d672ae6475f67108691249ec109b5a78dc31b529e5f69feeb54f4d443717b |
| frontend/scripts/screen-reference | 15 | aedc931bca08769a8bb667b7669f69e8bd0dc7530e288ead769ca13dd600aed4 |
| backend (includes .env) | 4 | 4022ac8cf843667342ec0f3b3f3bdec1008c4c2e0b529e3846f9feb4ae9e218a |
| memory/evidence/CR-390/MM | 50 | 472a1b9d6d2264c4d43df91ced875d8ffcd2dda97e32a2fb0aff4c7f9e9b082f |
| memory/final | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| frontend/public | 65 | 1770e2e4619a3793eb1960a256ff2ebfe4b5b3fe3600deebcdb2a8009c96c219 |

| Individual file | Entry SHA-256 |
|---|---|
| frontend/.env | bcf7bccb443bd370e3466afd06eda9587151bf8257bef363faa8c4100a8e31f5 |
| backend/.env | 0dff2f9c66c17db4ac4f67ac88e74a28b3241fa42675f7b18ea0e84da83d5dcc |
| frontend/package.json | 943138148206de33516a3150cc8358f87b0f24dffbad438441666ecf062d9b76 |
| frontend/yarn.lock | 45bd16e4f75405fb245c021d31533ce499685ae85d0ac9f3c9c69fadbf7c4e34 |
| memory/design_briefs/MM_FAQ_VIDEO_SCRIPTS_70.md | d3043ed94dc7e1eb2434a83ec051bc54a9b4ef01a546dd8904f9d5ada3120e72 |
| memory/handover/FAQ_VIDEO_AGENT_HANDOVER_MM_2026_09_27.md | 8c447cb44a6bc31fe2a185a695cd84503d994643df93ba7dd4fdabf13d889e3f |

Frontend .env differs from the previous agent's recorded fingerprint, consistent with a new preview/re-pull environment but cause not independently established. Its **current entry hash** is the preservation baseline. Do not overwrite it to match history. Backend env, source, tooling, scripts/mapping and PNG baseline match Step 1.

Registry comparison baseline: remove only item `CR-390`, serialize remaining registry object with sorted keys using standard Python JSON settings → SHA-256 `4167cc2a617ee2fe02872b74e364e16743dd48fd0fbe845972ae4eb9446d08f2`. Keep parent status `GATE_5A_MM_PDF_GENERATED`, gate `5A`, sprint `modules_pdf`; record recovery Gate 3 in existing notes/fields, no registry schema changes.

## Source revalidation and refinement

- Existing capture foundation is PARTIAL, not absent. No duplicate generator/framework planned. Runner 253 lines; MM manifest 50 states; assemblers exist. No current approved evidence journal or recovery safety engine.
- Directly read source for categories, products, forms, addon master, bulk edit, aggregator stock tabs/services and local menu preferences. Existing Step 1 C1–C12 line anchors remain applicable because the source-tree hash matches.
- Category reorder submits ALL categories (`CategoryList.jsx:37–45`), even when search displays fewer rows. Must not permit by dragged ID alone. Item reorder uses **filteredProducts** (`ProductList.jsx:68–84`), so every filtered ID must be checked.
- Add-on Catalog Enable, UP buttons and variation En/Dis can write immediately; group variation action fans out (`AddonStockTab.jsx:148–163`, `VariationStockTab.jsx:48–69`). Existing no-Save policy is not safe.
- Local Settings Save writes many local preferences and then may refresh station data (`StatusConfigPage.jsx:530–605`); only an isolated disposable browser profile is appropriate, not an operator's live profile.
- Label markup in ProductForm is often not associated with inputs; ToggleField is an ordinary button without role=switch. Plan selectors must not assume get_by_label or switch roles that do not exist. Unique local container + exact text/testid recipes specified; no runtime test-ID edits proposed.
- Read current registry/ownership/gap entries. Runtime-related items mostly await owner smoke; planning is parallel-safe because zero runtime edits. Future capture must stop for source drift/revalidate affected facts. Old human-registry rows can be stale; no unrelated closure performed.
- `memory/test_credentials.md` absent at entry. No credentials created, recovered or changed. This is a live-execution prerequisite, not a failure of the documentation task.

## Outputs and gate boundary

- Current amendment in `memory/plans/CR-390_IMPLEMENTATION_PLAN.md`; historical foundation retained below.
- New detailed all-70/data annex: `memory/plans/CR-390_MM_RECOVERY_EVIDENCE_SPEC.md`.
- Current handover: `memory/handover/SESSION_HANDOVER_2026_09_28_CR390_STEP2_GATE3_REVIEW.md`.
- Proposed edits and verification matrix are future work, not executed test cases. Gate 3 remains OPEN for owner review/decisions. No Gate 4 GO inferred.
- New owner-detail questions OD-390-23/24/25 do not reopen locked OD-390-16…22. Data/action bindings and additional evidence remain unapproved. No estimate, screenshot count or video delivery date certified.

## Documentation verification

**Final read-only reconciliation: 50/50 PASS** (same session, after status synchronization).

- 12 protected tree/file fingerprint checks passed, including current frontend/backend env, source, tooling, package/lock files, original scripts/mapping and 50 original PNGs.
- Registry parses; one CR-390 item; parent status/gate/sprint preserved; all unrelated records/metadata remain byte-equivalent after canonical serialization.
- Exactly 70 unique annex FAQ IDs, all 70 original script line anchors, 237 original scene groups, E1–E8, S01–S11, T0–T6, V01–V34 and three OPEN detail decisions checked.
- Five proposed existing files exist; two proposed new tooling/test files have NOT been created; no recovery captures; original manifest still 50 states; PRD within 700 lines.
- Original foundation suffix compared against entry commit `016efe1` and preserved exactly. The first check run had 45/46 passing because its preservation check incorrectly expected the heading `Files to Create`; actual heading is `Scope Lock`. Corrected the assertion to compare the actual entire original suffix, then reran all 50 checks successfully. No document repair was needed for that assertion mismatch.
- All 16 current discovery/status pointers resolve to Step 2 handover and Gate 3 OPEN/no Gate 4 GO. Handover references exist; common credential-value patterns absent from new content; accepted menu/video boundaries retained.
- **72 original binary evidence/deliverable files** (PNG/PDF/ZIP/JPG under tracked evidence/download paths) compared byte-for-byte against entry commit: 0 changes. This includes original screenshots/reference deliverables, not only named source folders.

These are documentation/preservation checks, NOT application QA. V01–V34 are still future tests, none represented as executed. No testing agent, live browser/API check or new integration ran. Existing JavaScript linter-engine limitation remains outside scope and is not claimed fixed. Gate 3 OPEN / owner review; no Gate 4 GO.
