# CR-390 — Implementation Plan

## CURRENT — Step 2 / Gate 3 MM recovery amendment (2026-09-28)

**Role:** 2 — PLANNING. **Owner authorization:** “begin step 2”; preceding constraint: “choose planning role for step 2 , donot jump gates”.
**Status:** PLAN DRAFT WRITTEN / OWNER REVIEW; **Gate 3 OPEN, NOT owner-closed. No Gate 4 GO.** Owner follow-up “1 a 2 a 3 take me through”: **OD-390-23/24 LOCKED FOR PLANNING**; **OD-390-25 OPEN**, explanation requested, no data/access option selected. Category reorder is gesture-only: no release/save, category-order API call or persisted-order claim under this plan. Any older conditional whole-vector permission language is superseded by this accepted restriction. Writing a plan is not executing it.
**Sprint:** `modules_pdf`. **Risk:** CRITICAL. **Code Reality:** PARTIAL — existing runner/manifest/PDF tooling, scripts and 50 PNGs; recovery safety and accepted FAQ coverage not implemented. Plan only remaining work; do not rebuild the foundation.
**Based on:** `../impact/CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md` (Step 1), including OD-390-15…22. Detailed companion: `CR-390_MM_RECOVERY_EVIDENCE_SPEC.md` (data/requests/all-70 evidence rows).
**Baseline:** workspace HEAD `016efe1`; source, tooling, scripts, mapping and original PNG hashes match Step 1. Frontend .env has a different entry hash in this preview and is preserved as-is. See `../evidence/CR-390/GATE3_2026_09_28/PLANNING_EVIDENCE.md`.

### A. Gate boundary and retained decisions

- This session changes planning/control Markdown and CR-390 metadata only. No source, capture-runner, manifest, original script/mapping, PNG, environment, dependency, backend, public file or business-data edits.
- Palm House **Normal** for standard MM; Kunafa Mahal **Aggregator** for aggregator MM; Palm House **Premium only for switching/comparison**. No Party setup. No Premium create/edit implicit in the tutorial adaptation.
- Clean real-UI PNGs, explanations/scripts/maps separately. Annotated reference PDF optional for video preparation; never a video-frame source. Original nine-module PDF scope/frozen layout retained.
- 70 FAQ IDs retained. Step 1 baseline **237 original scene groups / 34 blocked / 36 partial / none externally accepted** is unchanged. This plan is not a rewritten script or a storyboard.
- Explicit owner approval of the plan/decisions precedes a separate **Gate 4 GO**. Gate 4 must name the permitted implementation stage and data/capture scope; a tooling-only GO cannot authorize live writes.
- After approved repairs/captures: independent QA, corrected private review pack, external validation of **all 70**, owner all-green confirmation, then separately authorized storyboard/translation/TTS/video work. EM only after final MM-video review. No voice/LLM/auth/storage integration implemented now.

### B. Revalidation and conflict pre-check

| Surface / current ownership | Observed reality / future conflict | Disposition |
|---|---|---|
| `frontend/scripts/screen-reference/runner.py` and MM manifest | Existing CR-390 foundation, 15 tooling/config files; runner 253 lines; 50 manifest states. No other registry item declares ownership of these recovery files. | Modify in place only after Gate 4; no new parallel screenshot framework. |
| `ProductForm.jsx`, `ProductCard.jsx`, `BulkEditor.jsx`, `AddonManagementPanel.jsx` | BUG-359/390/391/392/394, CR-373/374, CR-140/144/155/158/159 have implementation/QA history, some awaiting owner smoke. FILE_OWNERSHIP records BUG-394 2026-09-11 and layered earlier changes; current registry outweighs stale historical human rows. | **Read only**. Never restore removed Tax Calc or add controls to satisfy narration. Recheck source hashes immediately before implementation/capture. |
| `MenuContext.jsx`, `StatusConfigPage.jsx`, OrderEntry/CategoryPanel | CR-376/FU-A/FU-B QA history; latest menu ownership 2026-09-25/26. R5 runtime surfaces. | Read-only facts; use isolated context for local-setting demo. No orders, printer jobs or source edits. |
| `memory/design_briefs/**`, original mapping / evidence | CR-390 previous agents; original files protected in Step 2. | Later archive exact original content before correction; revision all corrected evidence. No silent overwrite of audit baseline. |
| `frontend/public`, `.env`, existing backend | CR-372-A public-surface policy; platform config. | Untouched. No public downloads, additional server, environment rewrite, deployment or dependency install in recovery planning. |

**Parallel-safety:** documentation is parallel-safe; future capture is not safe against changing runtime source or concurrent data editing. Stop/revalidate on drift. No unrelated bug status changes, cleanup/refactor or module reprioritization.

### C. Implementation scope lock — proposed, not authorized

**Future existing files to edit (5):**
1. `frontend/scripts/screen-reference/runner.py` — safety, deterministic setup, readiness, provenance.
2. `frontend/scripts/screen-reference/manifests/MM_menu.json` — corrected state specifications, never secrets.
3. `frontend/scripts/screen-reference/README.md` — safe operation and gates.
4. `memory/design_briefs/MM_FAQ_VIDEO_SCRIPTS_70.md` — English source-content corrections after owner review of annex; no storyboard/translation.
5. `memory/handover/FAQ_VIDEO_AGENT_HANDOVER_MM_2026_09_27.md` — corrected production mapping/limitations, archive original first.

**Future new tooling files (2, necessary verification only):**
- `frontend/scripts/screen-reference/validate_mm_pack.py` — offline pack validator/review-pack builder; no backend/API/UI service.
- `frontend/scripts/screen-reference/tests/test_mm_recovery.py` — offline unittest safety/pack regressions; no live credentials.

**Future generated/private artifacts (not created now):** `memory/evidence/CR-390/MM_recovery/<revision>/` for clean PNGs, sanitized state journal, explicit run approval/bindings, source hashes, correction log and all-70 review records; `memory/design_briefs/downloads/screen_reference/MM/review/<revision>/` for the private review pack. Revision directories cannot overwrite originals. Optional ZIP of the allowlisted review files only, not blanket directory zipping.

**WILL NOT TOUCH:** `frontend/src/**`, `backend/**`, `.env`, dependencies/lock files, supervisor, `.emergent`, `frontend/public/**`, PDF layouts/assemblers/persona/template config, the other eight module manifests, original 50 PNGs/PDFs/ZIPs. No new API endpoint, object store, upload implementation, scheduler or video pipeline. Existing app upload/export controls are only planned demonstrations, not new integrations.

**No refactoring track.** Extend current runner; add only the offline validator/test file justified above. Runtime test-ID/label gaps are handled with uniquely scoped existing selectors or a blocked state, not unapproved JSX edits.

### D. Small, independently testable execution stages (future)

| Stage | Work | Minimum exit evidence / stop |
|---|---|---|
| T0 — owner review | Resolve OD-390-23/24/25 and Gate 4 scope; confirm G-journey revision and exact record/action bindings or mark dependent scenes blocked. | Owner record + immutable approved plan/manifest/policy hashes. No code until Gate 4. |
| T1 — offline safety | E1–E4 runner/manifest draft + E7 tests. No browser login or live requests. | V01–V13 pass offline; unapproved actions rejected. Stop before capture permission. |
| T2 — content | E5 scripts/mapping corrections using every annex row, archive originals, retain 70 IDs, qualifications and missing-evidence markers. | V14–V16; owner review of semantic adaptations, no narrated success unsupported by evidence. |
| T3 — bound read-only capture pilot | With scoped live GO and approved credentials: exact boot/read allowlist, account/menu checks, then one Normal screen and one Aggregator screen; isolated Local Settings if permitted. | V17–V21; zero unapproved business requests; preserve errors. Failed/empty/wrong state is BLOCKED, not a source frame. |
| T4 — controlled action evidence | Implement only permits approved for bound disposable records; saves/status and links first, destructive/import/stock last and separately allowed. | Per-action UI + response/read-back + complete field-diff/cleanup evidence; V22–V28. Never retry an uncertain commit. |
| T5 — private pack / independent QA | E6/E8 offline validation and packaging of exact revision. External validator receives candidate pack, not claimed accepted assets. | V29–V34; all FAQ coverage/qualifications explicit. QA findings repaired only within approved scope. |
| T6 — external review stop | External reviewer checks every FAQ/state/claim; owner confirms all 70 green against exact hashes. | External and owner acceptance records. STOP again before any storyboard/translation/TTS/video instruction. |

No duration/cost/frame-count estimate before data feasibility. T3–T4 sub-batches reuse the same proven runner; no implement/screenshot loop or all-50 rerun before the safety pilot.

### E. Exact edit specification (all proposals)

Source line numbers below refer to the unchanged Step 2 entry files. E1–E4 overlap runner blocks deliberately: implement in listed order with named function anchors, not stale line-number patches.

| Edit | File / current anchor | Current → proposed change | Verify |
|---|---|---|---|
| E1 | `runner.py:22–35,182–199` (`load_manifest`, CLI/output setup) | A lone historical `journey_approved=true` and default old output directory → require MM recovery schema/revision, reviewed manifest hash, plan reference, account alias, explicit mode and run-specific approval/bindings. No truthy default approval. Add offline `--validate-only` that performs no Playwright import/login/network; `--only` accepts stable state IDs. Output only a new revision directory; refuse overwrite/path escape. Non-MM generation stays gated by its own G-journey and is not run here. | V01–V04 |
| E2 | `runner.py:84–155` (`_loc`, `execute_action`) | Implicit `.first`, unscoped keyboard presses, arbitrary eval, warn-and-continue/reload → exact unique locator resolution, explicit typed action allowlist, scoped fill/select/click/hover/scroll/assert, count==1 checks and fatal failure. Unknown actions, nth/first targeting, arbitrary eval and absent state assertions rejected. A fixed internal read-only DOM inspection helper is allowed; no manifest JavaScript. Expand/collapse only if the expected body state differs. No reload/retry after actions. Capture held drags only with verified cancel behavior; release is separately permitted W. | V05–V08 |
| E3 | `runner.py:158–179,201–235` (`login`, contexts, journey loop) | Shared context/password, first restaurant, soft login result, inherited route state → separate ephemeral context for each account, credentials from approved environment aliases (not CLI/manifests/logs), current preview from `REACT_APP_BACKEND_URL`. Existing app login only, no auth protocol/endpoint change. Missing exact restaurant/identity match is fatal; never pick first. Source-derived request guard installed before first navigation with service workers blocked; no open wildcard write permission. Enforce each action's exact one-use request envelope and bindings (§F); `--only` expands read-only setup only. Stop before unavailable setup, never replay a create/delete to reach a screenshot. Before later changes to authentication-handling code, obtain the required auth integration playbook; this document does not implement auth. | V09–V13, V17–V19 |
| E4 | `runner.py:38–81,231–247` (name swap, toast hiding, capture) | Global text/input substitution and toast removal → narrowly scoped approved business-header persona replacement only, no form value modification. Remove `scrub_toasts`; record failures before waiting for transient success messages to expire naturally. Reject any observed relevant API/business error/loader even if it later vanishes. Require route/menu/brand/record ID + expanded controls/expected values + ready responses. Screenshot only after assertions; write sanitized journal/hash atomically after cleanup outcome. No failed source PNG, no raw HAR/auth log. | V06, V11, V20–V21, V29 |
| E5 | Original scripts FAQ-01…70 at lines 14–1146; mapping inventory L40–93, FAQ table L97–173, unsafe guidelines L177–204, sample L230–243 | Existing contradictory scripts/fallback map → archive both exact originals in private revision provenance, then apply every annex §4 correction. Keep 70 IDs and separate script text; produce correction log original scene→new supported instruction/evidence or BLOCKED. Correct menu/location/control labels, import/stock semantics and all unsupported claims. Replace fallback/error-masking/empty-as-populated guidance with blocked/review states. Do not author timings/callouts/storyboards or Hindi text. | V14–V16 |
| E6 | NEW `validate_mm_pack.py` | No accepted-state/FAQ manifest validator → standard-library offline checks for unique IDs, exact all-70 map, required state presence, clean PNG format/dimensions/hash, manifest/script revision binding, explicit shared-state reasons, privacy review and per-state verdicts. Separate `review` output from `accepted`: review pack may carry BLOCKED rows but never mark all green; accepted mode requires all 70 external passes + matching owner approval. Explicit allowlist copy/ZIP under memory only, no symlinks, traversal, secret files or raw logs. No missing-file placeholders. | V29–V34 |
| E7 | NEW `tests/test_mm_recovery.py` | No regression tests for capture safety → unittest cases against synthetic local DOM/request objects/temp files for all safety/pack failure modes in V01–V16 and V29–V34. Network is disabled. These are MOCKED safety fixtures, never tutorial evidence or claims of live app QA. | Run named checks with 0 unexpected network attempts; no app/source changes |
| E8 | `README.md:7–27,47–53,66–91`; MM manifest top-level + journey entries listed below | Historic runnable quickstart/3-page cap → recovery HOLD warning, stage/permit/readiness/cleanup procedure, current env references without credentials, private revision outputs and external all-70 gate. The 3-page cap applies to original reference-PDF selection, not video action coverage. Do not invoke assemble.py automatically or promote old PDFs as current. Replace MM metadata/controls/narration with corrected descriptions only after owner acceptance; historical G-journey date cannot approve new states. | V14–V16, V30–V34 |

**MM manifest edit sites (E1/E8):** L1–22 metadata; L24–50 dashboard entry; L53–100 menus; L102–274 categories; L277–509 items; L512–755 full edit; L758–813 add-ons; L816–1048 bulk; L1051–1247 aggregator; L1250–1293 Local Settings; L1296 onward supplements. Expand into the annex's logical state chains rather than renaming old screenshots as if recaptured. Drop Party 41/49 from active journeys. Reject 43/45 arbitrary eval, 47 Name coercion, 48 nonexistent category selector, 39/40 delay-only readiness. Every new state has its own full setup/readiness/cleanup declaration; no `fresh_route=false` dependency on preceding capture.

### F. Minimal runner contract / guard strategy

Use existing manifest structure with one recovery extension, not a generic workflow service. Proposed root fields: `recovery_revision`, `plan_ref`, `journey_approved=false` until owner approval, `journey_approved_date`, `journey[]`. Each journey carries `account_alias`, exact restaurant-binding alias, `route`, `menu_type`, `brand_alias` when relevant, and states. Each state carries `id`, `faq_ids`, `setup` (read-only actions), `preconditions`, `actions` (type/unique locator/value/mutation class), `ready`, `cleanup`, `required_evidence`, `shared_reason` when reused. No passwords/emails/URLs/real operational identifiers baked into source manifest.

Run approval/bindings are private metadata, not authorization merely because a file exists: record owner GO quote/reference, approved scope, expiry/window, operator, revision + source/manifest hashes, menu/brand/record aliases→verified IDs, allowed actions/fields/values, baseline/read-back hashes, cleanup permission and explicit denied scopes. An owner-approved file hash must be recorded independently in the handover; `approved:true` alone is insufficient. Missing or changed bindings refuse execution. No new credential file/keys written in Step 2.

- Default is **no business writes**. Match full configured origin + normalized exact path + method + query + decoded body, not only method or URL suffix. Block unknown GET side-effect endpoints too; auth/station-list POST exceptions do not license other POSTs. Inspect multipart `food_info` and flat fields; malformed/unparsed body aborts. Never print raw headers/body/tokens/signed URLs.
- Source-derived bootstrap/read list is a Gate 4/capture prerequisite, not an assumption that all GETs are safe. Allow only required existing app login and confirmed read APIs; station-list POST is read-only as documented in Step 1. OAuth/auth application logic is unchanged. Unexpected optional Firebase/socket/analytics activity remains blocked; do not bypass safety to make the page load. Read failures or missing data cause BLOCKED; no mocked backend response to make a real capture appear successful.
- HTTP guards do not protect WebSocket messages. Deny socket transports/handshakes in the isolated capture context unless a later reviewed read-only policy is proven; record that these contexts are not end-to-end realtime tests. If startup requires unclassified traffic, stop and return to planning.
- A W action arms only the exact permitted request(s) for that state and IDs. Full serialized form must equal permitted values plus unchanged baseline fields. Action quota one per expected request, separate quotas for per-row batch calls and status follow-up. Account/brand identity checked before arming. Permit expires immediately after action; no generic `allow_writes` flag. Redirects to new origins are blocked.
- Response HTTP 200 alone is insufficient; business success + fresh existing read + UI state must agree. Unknown backend semantics remain H; do not probe with writes in planning. Missing expected request fails the action, even if a UI toast is present. A blocked request invalidates the state.
- No hidden replay of mutation steps under `--only`. Result-only recapture requires pre-existing verified result/baseline binding; otherwise blocked. Never save from a local dirty form after import has already changed server data.
- Safety cleanup is also guarded. Failure stops the batch, records uncertain state and requests owner intervention. No automatic global rollback or cleanup of operational records. See annex §3 for precise classes.
- Script/PNG privacy: no guest/order dashboard data as tutorial background. Prefer the clean `/menu` opening. Approved restaurant-name substitution may touch only verified read-only header nodes; never names/prices/statuses inside forms. Mask only specifically approved private fields without hiding warnings or functionality; if this is impossible, block the asset. No blanket toast/error crop.

### G. Source-grounded selector recipes (no JSX edits)

All locators below must resolve uniquely and be checked against response-bound record identity. IDs in braces are runtime approved bindings, not prefix-first matches.

| Recipe | Source anchor | Proposed targeting / state assertions |
|---|---|---|
| S01 menu/brand | `MenuManagementPanel.jsx:176–221`; `ProductList.jsx` browse inputs | `menu-management-panel`, `menu-type-selector`; A `client-selector` with explicit bound option, not All. After select wait exact foods-list menu response and `menu-loading-inline` absent; compare visible IDs/names with selected menu/brand. Never require product cards before selecting Aggregator on an account with empty Normal. |
| S02 categories | `CategoryList.jsx:110–300` | `category-{id}`; hover then `button:has(svg.lucide-pencil)` / `button:has(svg.lucide-trash2)` within exact row only, count 1. Inline editor replaces that row: scope `category-list` to container with exact original input value and unique Save/Cancel, no first input/Enter. Add uses `add-category-btn`, `new-category-input`, `new-category-station`; confirm after-state ID. Drag handle unique inside bound row; release is W. |
| S03 cards/quick edit | `ProductCard.jsx:68–270,312–439`; `ProductList.jsx:40–135` | `product-card-{id}`, `quick-edit-{id}`, `full-edit-{id}`, `status-toggle-{id}`, `delete-{id}`, `delete-reason-{id}`, `confirm-delete-{id}`. `quick-edit-form` name/price via `quick-edit-name/price`, Save via `quick-edit-save`. Search/filter scope exact group so duplicate All labels are not ambiguous. |
| S04 full edit | `ProductForm.jsx:10–84,311–471,501–672` | `product-form` heading must match bound item. Section button testids (`section-pricing-&-tax`, `section-availability-&-channels`, `section-status-&-flags`) identify parent section; assert body control visible before toggling. Inputs use exact native label-text parent→input/select (labels lack htmlFor); toggles use exact label-row→button (NOT role=switch). Image uses `image-upload-btn input[type=file]`, real img preview and `product-form-save`. No arbitrary page eval. |
| S05 variations | `ProductForm.jsx:120–208,516–532` | `add-variation-btn`; `variation-group-{index}` plus expected group name and returned group order; `variation-name-{index}`, `add-option-btn-{index}`. Within group exact Single/Multiple and wrapped Required checkbox; option name uniquely identifies its row/price. Expand via the header DIV, NOT the first button (delete). Min/Max fields scoped to their text wrappers. |
| S06 addon attachment | `ProductForm.jsx:536–601` | `addon-option-{id}` checkbox; new name/price fields by exact testid. `add-addon-btn` is immediate W; after create await master response, bind ID, then explicitly select it before saving food. |
| S07 addon master | `AddonManagementPanel.jsx:114–317` | `manage-addons-btn` opens panel; search by placeholder `Search add-ons...`. Exact table Name cell text→row→button exact Edit or Del. Editing row is the immediate following sibling and must show the bound name input and unique Save. Reject ambiguous rows. Never generic `tr button` (first button changes status). Inventory control via unique title `Attach a recipe first` or `Toggle inventory tracking`. |
| S08 bulk | `BulkEditor.jsx:879–1340,1390–1508` | `bulk-edit-toggle-btn`, `bulk-editor-grid`, `row-{id}`, **`cell-basePrice-{id}`**, `col-toggle-{key}`, **`filter-category-select`** trigger then exact option text/ID set. Clear selection, assert row IDs before `bulk-select-all-checkbox`; then `bulk-delete-reason-select/confirm-btn`. Import input `import-file-input` is W at set_input_files, not at a later Save. Reject any old Name/NaN editing recipe. |
| S09 aggregator card | `AggregatorStockToggle.jsx:47–169,188–199`; `ProductForm.jsx:371–428` | `stock-toggle-{id}` opens only; exact popover title Disable on UrbanPiper; radio wrapped label 30 minutes; exact Disable in that popover is W. `stock-enable-{id}` is W. Listing flags via bound Full Edit Platform Sync label rows; `swiggy-use-item-image`/`swiggy-upload-different` separate from stock. |
| S10 stock tabs | `MenuManagementPanel.jsx:290–320`; `AddonStockTab.jsx:97–211`; `VariationStockTab.jsx:76–146` | `stock-tab-addon-stock/variation-stock`. Scope tab content by its unique loading/message/table header, then exact brand select. Add-on row named cell and **column header index** distinguish Catalog and UP; assert header text and row name before any action. Variation food/header→group name→option label and bound indexes; En/Dis buttons exact, no Enable All. Missing or duplicate names block. |
| S11 local menu | `StatusConfigPage.jsx:530–605,665–675,1014–1045` | `/visibility/status-config`; `active-menu-option-normal/premium`; assert chosen local draft, `save-btn` then reload/inspect actual preference in same isolated context. No manual localStorage injection to fake a saved UI. |

If a structural recipe fails uniqueness in the live preflight, mark state BLOCKED and return with exact evidence; do not silently introduce ordinal targeting or new source test IDs. Source-grounded is not a claim these selectors were browser-tested today.

### H. Verification matrix — future tests, NOT executed in Step 2

| Check | Edits | Behavior / minimum expected evidence | Method |
|---|---|---|---|
| V01 | E1 | Missing/revoked/expired owner approval, wrong plan/manifest hash or false journey flag → blocked before browser creation | Offline |
| V02 | E1 | Unknown/duplicate state IDs, malformed schema, forbidden action/missing readiness → nonzero exit | Offline |
| V03 | E1 | `--only` expands read-only prerequisites; mutation prerequisites never replay; unknown state blocks | Offline |
| V04 | E1/E6 | Output revision exists, traversal, symlink or public destination → refuse without overwrite | Offline |
| V05 | E2 | Zero/two matching selectors, `.first`/nth/eval/unknown action → fail, no screenshot | Offline local DOM |
| V06 | E2/E4 | Action timeout, hidden loader or error previously observed → blocked; no automatic reload or toast masking | Offline |
| V07 | E2 | Variation expand cannot click delete; addon Edit cannot hit status; collapse/open idempotence | Offline local DOM then approved pilot |
| V08 | E2 | Drag cancel leaves no persisted reorder; release requires correct W permit | Offline + scoped live only later |
| V09 | E3 | Wrong/missing account/restaurant/menu/brand identity stops; isolated contexts do not leak sessions | Offline then live read-only |
| V10 | E3 | Unknown GET/write/origin/redirect/multipart/WS/service-worker bypass denied; auth/station exception exact | Offline request fixtures |
| V11 | E3/E4 | No email/password/token/request bodies/raw logs in stdout, journal or PNG metadata | Offline secret canaries + manual privacy |
| V12 | E3 | Wrong ID, field, value, request count, client or stale baseline cannot use permit; consumed permit cannot replay | Offline |
| V13 | E3 | 200-with-business-error/uncertain commit/missing read-back → no accepted result, stop without retry | Offline |
| V14 | E5/E8 | All 70 IDs retained; each original scene accounted for by supported correction or explicit BLOCKED record | Offline doc reconciliation |
| V15 | E5/E8 | All seven locked decisions/menu bounds retained; no Party setup, Premium edit or error/empty fallback | Offline + owner review |
| V16 | E5/E8 | Correct labels/location/import/UP semantics, unsupported claims qualified; original scripts archived byte-exact | Offline + independent content review |
| V17 | E3 | N and A pilots get appropriate loaded menu without assuming Normal nonempty on A | Scoped live read-only |
| V18 | E3 | Await complete async brand list; separately log verified brands and unresolved variations, no false zero | Scoped live read-only |
| V19 | E3 | No unapproved business requests during pilot; bootstrap failures disclosed, no mocked real capture | Scoped live guarded browser |
| V20 | E4 | Expanded specific controls and correct item/route/menu; no dashboard/loader/empty substitute | Visual + request provenance |
| V21 | E4 | Clean UI, native labels visible, no guest/account identifiers, no falsified fields or hidden errors | Independent privacy/visual review |
| V22 | E2/E3 | Normal create/edit/status/links read back full permitted fields; unrelated sentinels unchanged; restore recorded | Scoped live W permits |
| V23 | E2/E3 | Category reorder request/release always blocked under OD-390-23; cancelled gesture leaves original order; item vector exact approved demo IDs | Offline; category gesture only in later scoped capture; item writes only if separately permitted |
| V24 | E2/E3 | Delete/bulk delete permitted disposable IDs only; selected set exact, post-delete absent; no undo claim | Scoped live W permits |
| V25 | E2/E3 | Bulk partial success handled per ID; Reset not portrayed as server rollback | Offline failure fixtures; live happy-path read-back |
| V26 | E2/E3 | Export privacy contract and template schema checked; import only exact permitted file/rows, immediate request, read-back reconciled | X/W only after contract permission |
| V27 | E2/E3 | A listing vs timed stock vs all-brand catalog distinct; exact brand/tuple; timer return not certified from schedule alone | Read-only or scoped W, external result evidence |
| V28 | E3/E4 | Local Settings persistence in same isolated context; multiple local keys protected; context discarded; no order/printing | Scoped L browser |
| V29 | E4/E6 | Every PNG matches journal/hash/recipe; unexplained duplicate hashes rejected, legitimate shared opening explicit | Offline + visual |
| V30 | E6 | Missing asset/corrupt PNG/stale script/mapping hash/blocked state prevents accepted-pack output | Offline |
| V31 | E6 | Review pack exact all-70 coverage, separate explanations and limitations, no PDF frame sources | Offline + reviewer |
| V32 | E6 | Copy/ZIP includes only allowlisted sanitized assets; no approvals with private bindings, env, credentials, HAR or signed URLs | Offline canaries |
| V33 | E6 | One failed/missing external FAQ verdict or missing owner all-green blocks acceptance; changed hash revokes affected pass | Offline |
| V34 | E6/E8 | No storyboard/translation/TTS/video/EM invocation; nine-module scope/layout and untouched files preserved | Offline scope/digest check |

These checks seed implementation self-testing and independent QA; no QA agent runs in Gate 3. Unit/DOM/request fixtures are MOCKED test inputs only, not screenshot data. Live/API behaviors remain unverified until the specifically authorized checks run.

### I. Risks and unresolved Gate 3 details

| ID | Risk | Mitigation / owner decision |
|---|---|---|
| R1 | CRITICAL wrong record/action from ambiguous selectors or account leakage | E2/E3 fail-closed + exact account/ID request guard + isolated sessions; default no writes |
| R2 | CRITICAL immediate import/delete/status/stock effects or partial success | Exact permit inventory, one-shot quotas and full read-back; uncertain state stops, no blind retries |
| R3 | CRITICAL category order touches operational rows | OD-390-23, default HOLD, no implied whole-vector approval from disposable category policy |
| R4 | HIGH images/recipes/printers/aggregator variation data unavailable | Bind owner-prepared evidence or keep dependent FAQ blocked; never seed through unsupported endpoint |
| R5 | HIGH unsupported removal/guest/KDS/financial/sync claims | OD-390-24 for difficult adaptations; otherwise qualify to proven configuration per OD-390-20; no product repairs |
| R6 | HIGH privacy/error masking and stale evidence | E4/E6 revision hashes, narrow redaction, fail on errors; all-70 external review |
| R7 | HIGH unsafe startup traffic and missing credentials | OD-390-25; precise source-derived read policy before live capture, no blanket GET or POST exception |
| R8 | MEDIUM source/brand/index drift during capture | Revalidate hashes, bound option labels/indexes and timestamps before each affected state |
| R9 | HIGH accidental publication / video gate bypass | Memory-only allowlisted pack; explicit acceptance record and separate later-stage authorization |

**Owner Decision Queue (new details only; OD-390-16…22 remain LOCKED):**

| ID | Question / recommendation | Status |
|---|---|---|
| OD-390-23 | Owner **1a**: gesture-only category-reorder explanation, cancel without releasing/saving; no persisted-result claim. Category-order API writes are DENIED under this plan, not a maintenance-window exception. | LOCKED FOR PLANNING — owner “1 a 2 a 3 take me through” |
| OD-390-24 | Owner **2a**: accepted the proposed truthful FAQ adaptations (read-only Normal/Premium comparison; preview clearing without promising saved-photo removal; listing flags distinct from timed stock). Retain all 70 IDs; missing essential evidence stays BLOCKED. Original narration/assets remain unchanged until separately approved repair execution. | LOCKED FOR PLANNING — owner “1 a 2 a 3 take me through” |
| OD-390-25 | Owner asks **“3 take me through”**, not a choice or access approval. Explain owner-prepared data vs a separately authorized read-only inventory, what examples are needed, missing-data treatment and later item-by-item write/cleanup permission. Recommendation for this walkthrough: consider read-only discovery first to minimize owner preparation, then owner identifies/prepares only missing safe examples. | OPEN — walkthrough requested; neither option selected; NO live access |

**Decision-3 walkthrough (explanation only):** the goal is real, safely usable tutorial examples, not testing on normal trading items. An explicitly authorized read-only inventory would list existing Palm House Normal items/categories/add-ons, existing Normal/Premium comparison pairs, and Kunafa brand/item/add-on/variation examples. It must separately distinguish an existing operational item (observe only) from an owner-confirmed disposable record (candidate for later permitted edits). It also checks whether an existing printer mapping/recipe-enabled add-on and owner-provided licensed photos are available. Nothing is created, edited, deleted, imported, reordered, toggled, printed or submitted to aggregators. No full-menu workbook download is included.

The output would be a short readiness table: example, account/menu/brand/ID, FAQ use, existing-vs-missing, read-only-vs-potential-mutation, risk, and exact later proposed action/cleanup. Owner then reviews only the gaps and specific proposed records. If the owner already has a safe demo set, they may nominate it instead and skip broader discovery. A read-only option selected later is still not automatic live access or Gate 4: record the exact request/account scope and obtain explicit authorization before logging in. New demo data, bindings, mutation permits and cleanup remain later separately authorized work. No unavailable photo/recipe/variation or outcome is fabricated to make the pack green.

**Gate 4 readiness checklist — not met:** owner reviews/closes Gate 3; accepted plan/annex revision; OD-23/24/25 resolved or explicit blocked subsets; scoped GO for tooling vs capture vs writes; valid secret access provision; required bootstrap/read requests source-confirmed; exact demo IDs/field baselines/allowed actions/cleanup; safe aggregator exposure and data/brand feasibility; permitted workbook/contract for import; privacy policy; approved G-journey revision. Tooling-only authorization may omit live prerequisites but cannot advance captures.

### J. Post-code registry checklist (future implementation agent)

- [ ] Keep CR-390 parent `status=GATE_5A_MM_PDF_GENERATED`, `gate=5A`, `sprint_key=modules_pdf` as historical milestone. Use existing notes/metadata for **recovery** stage; do not overwrite parent or invent schema. No unrelated item update.
- [ ] Record only actually completed recovery stage: tooling implemented ≠ captures accepted ≠ external all-70 pass. No CLOSED or owner-smoke pass without evidence.
- [ ] Update CR_REGISTRY row/control/sprint pointers, FILE_OWNERSHIP for actual changed recovery files, open gaps and QA handover; preserve pending restrictions.
- [ ] Add CR-390 markers in changed Python/JSON metadata as permitted by format; do not insert invalid JSON comments.
- [ ] Attach executed V-check results, source/manifest/content hashes, sanitized permission/read-back/cleanup record, remaining BLOCKED FAQs and regression scope.
- [ ] Preserve originals/archive before script/map edits. Keep public/runtime/config protected digests unchanged.
- [ ] Stop at independent QA / external all-70 review; no automatic video or next-module run.

### K. Step 2 output and stop

Plan draft: **8 edit groups across 5 existing files + 2 new tooling/test files**, all proposed. Data/action inventory and all 70 correction/evidence chains in `CR-390_MM_RECOVERY_EVIDENCE_SPEC.md`. Verification matrix: **34 future checks** (offline, live-permitted and independent visual/external review). No source or original assets changed in this session.

**Gate 3 remains OPEN for OD-390-25 walkthrough and owner plan review. OD-390-23/24 are LOCKED FOR PLANNING via 1a/2a; no category-order writes or persisted-order claim. No discovery/access permission inferred from “take me through”. Await owner review/closure, then a separate Gate 4 GO.** Do not execute the historical commands below.

---

# HISTORICAL FOUNDATION PLAN — implemented previously; NOT recovery authorization

The original 2026-09-27 LOW-risk pipeline foundation below is preserved for provenance. Its CLI/password, first-restaurant, fallback and old gate guidance is superseded for MM recovery by the CRITICAL-risk amendment above. OD-390-15 video-first decision and nine-module scope remain unchanged. Do not reinstall/rebuild the foundation or treat the historical closing Gate 4 request as a current approval.

---

## Scope Lock

**WILL create:**
- `frontend/scripts/screen-reference/runner.py`
- `frontend/scripts/screen-reference/assemble.py`
- `frontend/scripts/screen-reference/master_assemble.py`
- `frontend/scripts/screen-reference/persona.json`
- `frontend/scripts/screen-reference/config/template.json`
- `frontend/scripts/screen-reference/manifests/` — 9 manifest JSON files
- `frontend/scripts/screen-reference/README.md`
- `memory/design_briefs/downloads/screen_reference/` (directory, populated per-module run)

**WILL NOT touch:**
- `frontend/src/**` — zero runtime code change
- `frontend/public/**` — PMS PDFs stay until M6 regen
- `frontend/package.json` — no new yarn dependencies
- `.env`, supervisor configs, any R5 hotspot file

---

## Pre-Implementation

```bash
pip install fpdf2 pypdf pillow
```
Verify: `python3 -c "import fpdf, pypdf, PIL; print('OK')"`

---

## E1 — `frontend/scripts/screen-reference/runner.py`

**Purpose:** Playwright-based screenshot runner. Authenticates → navigates → DOM-swaps name → screenshots.

**Key structure:**
```python
# CR-390: Screen Reference pipeline — Playwright screenshot runner
import argparse, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).parent
EVIDENCE_DIR = Path("/app/memory/evidence/CR-390")
LOGIN_URL = "https://preprod.mygenie.online/api/v1/auth/vendoremployee/login"
FICTIONAL_NAME = "Sharma Hotel & Restaurant"   # OD-390-02

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", required=True)   # e.g. MM
    parser.add_argument("--url", required=True)       # app preview URL
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    manifest = json.loads((BASE_DIR / "manifests" / f"{args.module}_*.json").read_text())
    assert manifest["journey_approved"], f"Sub-gate G-journey NOT approved for {args.module}. Get owner approval first."

    out_dir = EVIDENCE_DIR / args.module
    out_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Step 1: Login
        page.goto(args.url)
        page.fill("input[type='email']", args.email)
        page.fill("input[type='password']", args.password)
        page.click("button:has-text('LOG IN')")
        page.wait_for_url("**/restaurant-picker", timeout=10000)
        # Select restaurant (first one)
        page.click(".restaurant-card") if page.query_selector(".restaurant-card") else None
        page.wait_for_url("**/dashboard", timeout=10000)

        # Step 2: Screenshot each route in journey order
        counter = 1
        for route_entry in manifest["journey"]:
            page.goto(f"{args.url}{route_entry['route']}")
            page.wait_for_load_state("networkidle")

            for state in route_entry["states"]:
                # Execute pre-actions
                for action in state.get("pre_actions", []):
                    _execute_action(page, action)

                # DOM-swap restaurant name (OD-390-02)
                _swap_restaurant_name(page, FICTIONAL_NAME)

                filename = f"{counter:02d}_{state['slug']}.png"
                page.screenshot(path=str(out_dir / filename), full_page=False)
                print(f"  [{counter:02d}] {state['slug']} → {filename}")
                counter += 1

        browser.close()
    print(f"Done. {counter-1} screenshots saved to {out_dir}")

def _execute_action(page, action):
    # CR-390: pre-action dispatcher
    t = action["type"]
    if t == "click":
        page.click(action["selector"])
        page.wait_for_timeout(500)
    elif t == "type":
        page.fill(action["selector"], action["value"])
    elif t == "wait":
        page.wait_for_timeout(action.get("ms", 1000))
    elif t == "wait_for":
        page.wait_for_selector(action["selector"])

def _swap_restaurant_name(page, fictional_name):
    # CR-390: DOM-swap restaurant name → fictional (OD-390-02)
    page.evaluate(f"""
        const name = document.querySelector('[data-testid="sidebar-restaurant-name"], .restaurant-name, .sidebar-name');
        if (name) name.textContent = '{fictional_name}';
    """)

if __name__ == "__main__":
    main()
```

**CLI usage:**
```bash
python3 runner.py --module MM --url https://core-pos-deploy-25.preview.emergentagent.com --email owner@palmhouse.com --password ****
```

---

## E2 — `frontend/scripts/screen-reference/assemble.py`

**Purpose:** Reads PNGs from evidence dir + manifest metadata → builds styled per-module PDF.

**Key structure:**
```python
# CR-390: Screen Reference pipeline — PDF assembler per module
from fpdf import FPDF
import argparse, json, glob
from pathlib import Path
from datetime import date

BASE_DIR = Path(__file__).parent
EVIDENCE_DIR = Path("/app/memory/evidence/CR-390")
OUT_DIR = Path("/app/memory/design_briefs/downloads/screen_reference")
GREEN = (50, 153, 55)      # MyGenie brand green #329937

class ScreenReferencePDF(FPDF):
    # CR-390: Custom FPDF subclass for MyGenie screen reference template
    def __init__(self, module_name, eyebrow, today):
        super().__init__(orientation="L", unit="mm", format="A4")
        self.module_name = module_name
        self.eyebrow = eyebrow
        self.today = today
        self.set_auto_page_break(False)

    def cover_page(self):
        # Green brand block (OD-390-08 PMS v2.0 template)
        self.add_page()
        self.set_fill_color(*GREEN)
        self.rect(0, 0, 297, 210, 'F')
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(255, 255, 255)
        self.set_xy(20, 60)
        self.cell(0, 8, self.eyebrow, ln=True)
        self.set_font("Helvetica", "B", 28)
        self.set_xy(20, 72)
        self.cell(0, 12, "MyGenie POS", ln=True)
        self.set_font("Helvetica", "", 16)
        self.set_xy(20, 88)
        self.cell(0, 8, self.module_name, ln=True)
        # Disclaimer on cover (OD-390-14b)
        self.set_font("Helvetica", "I", 9)
        self.set_xy(20, 160)
        self.cell(0, 6, "All figures are sample data for illustration purposes only")
        # Edition line
        self.set_font("Helvetica", "", 9)
        self.set_xy(20, 170)
        self.cell(0, 6, f"v1.0  ·  {self.today}")

    def screen_page(self, png_path, badge_num, section, title, description):
        self.add_page()
        # Screenshot (full-width, leaving room for header + footer)
        self.image(str(png_path), x=10, y=20, w=277, h=155)
        # Badge (numbered, top-left)
        self.set_fill_color(*GREEN)
        self.set_xy(10, 8)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(255, 255, 255)
        self.cell(8, 7, str(badge_num), fill=True, align="C")
        # Section eyebrow
        self.set_text_color(100, 100, 100)
        self.set_font("Helvetica", "", 7)
        self.set_xy(20, 9)
        self.cell(0, 5, section.upper())
        # Title
        self.set_text_color(30, 30, 30)
        self.set_font("Helvetica", "B", 11)
        self.set_xy(20, 14)
        self.cell(0, 5, title)
        # Footer (OD-390-14b)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(150, 150, 150)
        self.set_xy(10, 203)
        self.cell(0, 5, f"MyGenie {self.module_name}  ·  Screen Reference Guide v1.0  ·  {self.today}  ·  Sample data  ·  © MyGenie 2026")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", required=True)
    args = parser.parse_args()

    # Load manifest
    manifest_files = list((BASE_DIR / "manifests").glob(f"{args.module}_*.json"))
    assert manifest_files, f"No manifest for module {args.module}"
    manifest = json.loads(manifest_files[0].read_text())
    assert manifest["journey_approved"], "Journey not approved — run G-journey sub-gate first"

    today = date.today().strftime("%Y-%m-%d")
    module_name = manifest["module_name"]
    eyebrow = manifest.get("eyebrow", module_name.upper())
    png_dir = EVIDENCE_DIR / args.module

    pdf = ScreenReferencePDF(module_name, eyebrow, today)
    pdf.cover_page()

    badge = 1
    for route_entry in manifest["journey"]:
        section = route_entry["section"]
        for state in route_entry["states"]:
            png_path = png_dir / f"{badge:02d}_{state['slug']}.png"
            if not png_path.exists():
                print(f"  WARNING: missing {png_path} — skipping")
                continue
            pdf.screen_page(png_path, badge, section, state["title"], state["description"])
            badge += 1

    out_module_dir = OUT_DIR / args.module
    out_module_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_module_dir / f"MyGenie_{module_name.replace(' ', '_')}_Screen_Reference_v1_{today}.pdf"
    pdf.output(str(out_path))
    print(f"PDF saved: {out_path}  ({badge-1} pages)")

if __name__ == "__main__":
    main()
```

---

## E3 — `frontend/scripts/screen-reference/master_assemble.py`

**Purpose:** Merges all per-module PDFs into one master PDF in OD-390-07 sequence order.

**Key structure:**
```python
# CR-390: Screen Reference pipeline — master PDF assembler
from pypdf import PdfWriter, PdfReader
from pathlib import Path
from datetime import date

MODULE_ORDER = ["MM", "EM", "IM", "DC", "CM", "DR", "IN-Basic", "IN-Advanced"]  # PMS last, deferred
OUT_DIR = Path("/app/memory/design_briefs/downloads/screen_reference")

def main():
    writer = PdfWriter()
    for module in MODULE_ORDER:
        pdfs = list((OUT_DIR / module).glob("*.pdf"))
        if not pdfs:
            print(f"  SKIP {module} — no PDF found yet")
            continue
        reader = PdfReader(str(sorted(pdfs)[-1]))  # latest version
        for page in reader.pages:
            writer.add_page(page)
        print(f"  + {module}: {len(reader.pages)} pages")

    today = date.today().strftime("%Y-%m-%d")
    out_path = OUT_DIR / f"MyGenie_Complete_Screen_Reference_v1_{today}.pdf"
    with open(out_path, "wb") as f:
        writer.write(f)
    print(f"Master PDF: {out_path}")

if __name__ == "__main__":
    main()
```

---

## E4 — `frontend/scripts/screen-reference/persona.json`

```json
{
  "_comment": "CR-390: Shared fictional business persona (OD-390-02). Business name used in all PDFs.",
  "business_name": "Sharma Hotel & Restaurant",
  "business_short": "Sharma Hotel",
  "location": "Connaught Place, New Delhi — 110001",
  "gst_number": "07AAAAS0000A1Z5",
  "phone": "+91 98100 00001",
  "email": "manager@sharmahotel.example",
  "outlets": ["Main Restaurant", "Bar & Lounge", "Room Service"],
  "reference_week": {
    "start": "2026-09-14",
    "end": "2026-09-20",
    "label": "Week of 14–20 Sep 2026"
  },
  "currency": "INR",
  "gst_type": "CGST+SGST"
}
```

---

## E5 — `frontend/scripts/screen-reference/config/template.json`

```json
{
  "_comment": "CR-390: PDF template config (OD-390-08 — PMS v2.0 template as interim default)",
  "brand_green": "#329937",
  "page_size": "A4",
  "orientation": "landscape",
  "viewport": { "width": 1440, "height": 900 },
  "screenshot_region": { "x": 10, "y": 20, "w": 277, "h": 155 },
  "footer_text": "Sample data · © MyGenie 2026",
  "cover_disclaimer": "All figures are sample data for illustration purposes only",
  "edition_format": "vMAJOR.MINOR",
  "scrub_rules": [
    "No 'Beta' labels",
    "No coming-soon screens",
    "No real restaurant names (DOM-swap to persona.business_name)",
    "No internal CR/BUG IDs visible in UI",
    "Realistic INR/GST figures"
  ]
}
```

---

## E6a — Manifest Schema (all 9 manifests follow this structure)

```json
{
  "module_code": "MM",
  "module_name": "Menu Management",
  "eyebrow": "MENU MANAGEMENT",
  "journey_approved": false,
  "journey_approved_date": null,
  "journey": [
    {
      "route": "/menu",
      "section": "Menu Overview",
      "states": [
        {
          "slug": "menu-overview",
          "title": "Menu Management",
          "description": "All menu categories with item counts and availability status.",
          "pre_actions": []
        },
        {
          "slug": "menu-item-list",
          "title": "Category — Item List",
          "description": "Items within a category, showing price, tax, status and type.",
          "pre_actions": [
            { "type": "click", "selector": "[data-testid='category-row']:first-child" },
            { "type": "wait", "ms": 500 }
          ]
        }
      ]
    }
  ]
}
```

*`journey_approved: false` until owner approves via sub-gate G-journey at module start.*
*Journey array is a DRAFT — order and states confirmed with owner before locking.*

---

## E6b–E6i — Remaining 8 manifests (EM, IM, DC, CM, DR, INB, INA, PMS)

Same schema as above. Route inventories from IA §Module × Route Inventory.
- `EM_expenses.json` — 2 routes, journey PENDING
- `IM_inventory.json` — 8 routes, journey PENDING
- `DC_day_closure.json` — 4 routes, journey PENDING
- `CM_credit.json` — 1 route, journey PENDING
- `DR_daily_report.json` — 6 routes (OD-390-11), journey PENDING
- `INB_insights_basic.json` — 13 routes (OD-390-12), journey = sidebar order (PENDING G-journey confirm)
- `INA_insights_advanced.json` — 23 routes (OD-390-12), journey = sidebar order (PENDING G-journey confirm)
- `PMS_pms.json` — skeleton only; `journey_approved: false`, note: DEFERRED OD-390-13

---

## E7 — `frontend/scripts/screen-reference/README.md`

```markdown
# MyGenie Screen Reference Pipeline — CR-390

## Quick start (per module)

1. Get owner approval for module journey (sub-gate G-journey)
2. Set journey_approved=true + date in the manifest
3. Run screenshots:
   python3 runner.py --module MM --url https://... --email ... --password ...
4. Assemble PDF:
   python3 assemble.py --module MM
5. Master PDF (all modules):
   python3 master_assemble.py

## Output locations
- PNGs: /app/memory/evidence/CR-390/<MODULE>/
- Module PDF: /app/memory/design_briefs/downloads/screen_reference/<MODULE>/
- Master PDF: /app/memory/design_briefs/downloads/screen_reference/

## Module sequence (OD-390-07)
MM → EM → IM → DC → CM → DR → IN-Basic → IN-Advanced → PMS (redo, last)

## Rules
- NEVER run a module before G-journey sub-gate is approved
- NEVER include Beta, coming-soon, real restaurant names (OD-390-14)
- DOM-swap: restaurant name → "Sharma Hotel & Restaurant" (OD-390-02)
- Max 3 screenshots per route (OD-390-03)
- PMS PDFs in public/ to be MOVED here during M6 regen (closes CR-372 carve-out)
```

---

## Verification Matrix

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|:---:|
| V1 | E1 runner.py | `scripts/screen-reference/runner.py` | `python3 runner.py --help` prints usage without error | YES (syntax check) |
| V2 | E1 G-journey guard | runner.py | Attempt run with `journey_approved: false` → assert fires | YES (unit test) |
| V3 | E1 DOM swap | runner.py | Run on a test route → PNG text contains "Sharma Hotel" not real name | NO (visual check) |
| V4 | E2 assemble.py | `scripts/screen-reference/assemble.py` | `python3 assemble.py --help` prints usage | YES |
| V5 | E2 cover page | assemble.py | Run on MM (after runner) → PDF opens, cover shows green block + module name + disclaimer | NO (visual) |
| V6 | E2 footer | assemble.py | Each page footer shows "Sample data · © MyGenie 2026" | NO (visual) |
| V7 | E3 master | `master_assemble.py` | Run after MM + EM assembled → master PDF contains both modules in order | NO (visual) |
| V8 | E4 persona | `persona.json` | `python3 -c "import json; json.load(open('persona.json'))"` → no error | YES |
| V9 | E5 template | `config/template.json` | JSON loads without error | YES |
| V10 | E6a MM manifest | `manifests/MM_menu.json` | JSON loads; `journey_approved == false` (pre-G-journey state correct) | YES |
| V11 | E6b–i all manifests | 8 manifests | All 8 JSON files load without error | YES |
| V12 | E7 README | `README.md` | File exists, contains module sequence MM→EM→…→PMS | YES (grep) |
| V13 | Output dir | `memory/design_briefs/downloads/screen_reference/` | Directory exists after first run | YES |
| V14 | PNG packs | `memory/evidence/CR-390/MM/` | After MM run: ≥1 PNG file exists | YES |

---

## Post-Code Registry Checklist

Implementation agent MUST execute before handover:

```
[ ] registry.json: CR-390 → status: IMPLEMENTED, sprint_key: modules_pdf
[ ] CR_REGISTRY.md: row updated with IMPLEMENTED status
[ ] FILE_OWNERSHIP.md: add all N1–N15 new files with CR-390 + date
[ ] Code markers: every new .py and .json file contains a # CR-390 or // CR-390 comment
[ ] compile/syntax check: python3 -m py_compile runner.py assemble.py master_assemble.py
```

---

## Execution Sequence

```
1. pip install fpdf2 pypdf pillow
2. Create directory: frontend/scripts/screen-reference/ + subdirs
3. E4 — persona.json
4. E5 — config/template.json
5. E6a–i — 9 manifest JSONs
6. E1 — runner.py
7. E2 — assemble.py
8. E3 — master_assemble.py
9. E7 — README.md
10. Create output dir: memory/design_briefs/downloads/screen_reference/
11. Syntax checks (V1/V4/V8/V9/V10/V11)
12. Post-Code Registry Checklist
```

**Per-module execution (AFTER Gate 4 GO, one module at a time):**
```
For each module in MM → EM → IM → DC → CM → DR → IN-Basic → IN-Advanced → PMS:
  A. Present journey draft to owner → G-journey approval
  B. Owner provides credentials for this module's restaurant
  C. python3 runner.py --module <CODE> --url ... --email ... --password ...
  D. python3 assemble.py --module <CODE>
  E. Owner reviews PDF → feedback → re-run if needed
  F. Owner approves → edition v1.0 locked

After all modules:
  G. python3 master_assemble.py
  H. Owner reviews master PDF
```

---

## Open Owner Decisions (non-blocking for pipeline foundation)

| OD | Status | Impact on plan |
|---|---|---|
| OD-390-01 | DEFERRED — credentials per module at Gate 4 | `runner.py` CLI accepts `--email/--password`; no fixtures baked in |
| G-journey per module | PENDING — approved live at module start | manifests ship with `journey_approved: false`; runner guards on this flag |
| OD-390-13 (PMS journey) | DEFERRED | PMS manifest ships as skeleton |

---

*Plan ready — awaiting owner Gate 4 GO.*
