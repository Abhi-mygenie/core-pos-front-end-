# CR-390 — Step 2 evidence, data and content specification

**Date:** 2026-09-28 (workspace UTC). **Role:** PLANNING, Gate 3 ONLY.
**Status:** PROPOSED / OWNER REVIEW. Owner “1 a 2 a 3 take me through”: **OD-390-23/24 LOCKED FOR PLANNING** (gesture-only category reorder; truthful FAQ adaptations). **OD-390-25 OPEN**, walkthrough only, no option/access approved. Gate 3 OPEN; no Gate 4 GO. Not a runnable manifest, corrected script, storyboard or capture approval.
**Parent plan:** `CR-390_IMPLEMENTATION_PLAN.md`, current Step 2 amendment.
**Baseline:** `../impact/CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md` — 70 FAQs / 237 original scene groups, 34 blocked as written/mapped and 36 partial. No reclassification or external acceptance here.

## 1. Binding and evidence rules

- N = MM_STANDARD / Palm House / Normal. P = same account / Premium, **switching and comparison only**. A = MM_AGGREGATOR / Kunafa Mahal / Aggregator with an explicitly bound brand. No Party examples. Stock tabs' Main Brand uses a null/omitted client ID; the card filter uses 0 for Main Brand and null for All. Do not confuse these representations.
- Every future state is an independently reproducible journey from its declared route/account/menu/brand. Shared read-only prerequisites may be expanded, never silently skipped by a partial run. Creation/save/delete/stock actions are never replayable prerequisites.
- Future logical evidence IDs: `faq-XX-<state>` using the ordered state names in §4 (for example `faq-17-before`, `faq-17-price-draft`, `faq-17-saved`). Filenames derive from these IDs, not the old 01…50 counters. Mapping of unchanged generic openings may point to one canonical shared evidence ID, with an explicit reason.
- A state is not a video frame. No narration, timing, camera move, highlight geometry, translation or storyboard is authored here. Split a state when controls cannot be legibly visible together. The final count follows approved coverage, not 50 or 237.
- `saved` always requires successful response semantics plus a subsequent uncached/read-through existing API fetch and reopened real UI for the **same bound ID**. A toast, optimistic card or unsaved input is insufficient. Record metadata separately; never paint success into the PNG.
- Scope markers below: R = read-only navigation; D = local draft, discard on exit; L = isolated browser-local setting; W = business write requiring an exact approved permit; X = export/download with separate privacy/side-effect permission; H = blocked evidence/contract/permission. A chain containing W/X/H is not executable merely because its opening is R.
- All rows retain their FAQ IDs. Titles/journeys may be corrected under OD-390-18; no silent reduction from 70 FAQs to the convenient subset. If a question cannot honestly be answered, keep it BLOCKED until the owner approves a truthful adaptation or supplies evidence.

## 2. Proposed disposable-data inventory — UNBOUND, not authorization

Each alias below needs actual restaurant ID, record ID(s), original values and owner approval before a business action. IDs cannot be guessed from first rows. Proposed names carry a run-specific prefix `CR390 DEMO <run>`; use test-record names in UI, not substituted operational names. No records are created in Step 2.

| Alias | Proposed data / use | Permitted-menu boundary | Binding / cleanup requirement |
|---|---|---|---|
| CAT-A, CAT-B | Two disposable categories for creation/rename/move/subset examples | Palm House categories are shared restaurant-wide, not inherently Normal-only | Check all menus for dependencies before any delete. Bind station and mapped printer independently. Never delete a category with unrelated foods. |
| FOOD-A, FOOD-B | Normal demo items for fields/variations/add-ons, two prices and reordering | N only | Start with channels disabled, inventory off, no operational use; exact field changes, original snapshot and approved temporary availability exposure required. All persisted field differences must be permitted, including serializer defaults. |
| FOOD-CREATE | New Normal item for FAQ-14/15/16 | N only | One creation per attempt; obtain ID by exact unique name + response/read-back. Timeout means reconcile, not retry-create. |
| FOOD-DELETE | Disposable Normal item for FAQ-44/45/46 | N only | Separate from reusable examples; deletion cannot be undone. Capture creation ownership and approved reason; remove from future dependencies before deletion. |
| FOOD-BULK-1/2/3 | Normal records in CAT-B for price grid and bulk-delete subset | N only | Before selection, visible and selected ID sets must equal approved set, not just same count. Later delete only these IDs, never Select All across operational categories. |
| ADDON-A | Disposable add-on reusable across FOOD-A and FOOD-B | Palm House master is restaurant-wide | Before updates/delete, prove all attachments are approved demo foods. Detach from surviving demo foods before cleanup; do not assume cleanup deletes attachments safely. |
| ADDON-DELETE | Disposable unattached master add-on | Palm House | Use only for destructive example; no operational attachment, no shared recipe. |
| IMAGE-A/B | Owner-supplied, licensed, non-sensitive item-photo files | N photo and A Swiggy-photo examples | Bind filename/content hash, type and size; original photo provenance must be retained where restore is possible. No generated/stock images or new hosting integration in this recovery. |
| COMPARE-N/P | Existing matching dish examples, if genuinely available | N ↔ P read-only | No Premium creation/edit. Do not assert same dish, differing price or independence from matching names alone; record distinct IDs/menu membership and existing prices. |
| PRINTER-EXAMPLE | Existing mapped station/printer label | Palm House, observation only until separately approved | No printer setup or test printing. If unavailable, FAQ-09 result remains blocked; a warning is not successful mapping. |
| RECIPE-EXAMPLE | Existing approved recipe-enabled demo add-on | Palm House | No recipe creation/attachment or sale/deduction in this scope. Without it, show and explain prerequisite only if owner accepts adapted FAQ-50. |
| AGG-ITEM / AGG-ADDON / AGG-VALUE | Approved Kunafa demo item/add-on/food-group-option tuple and brand | A only | Require confirmation of safe platform exposure. Fully enumerate brand choices after load; don't assume Main Brand is the only brand. No automatic aggregator variation seeding: current multipart omits variations/addon_ids. |
| IMPORT-WORKBOOK | Minimal owner-approved workbook using only bound demo rows | N only, if backend contract proves scope | Exact file hash, schema, row IDs and expected create/update set before selection. No full-menu export fed back into import. Import stays blocked until backend matching/update behavior and restoration are evidenced. |

Read-only inventory discovery is a separate explicitly bounded run after credentials/access approval. `memory/test_credentials.md` is absent in this workspace; no login was attempted and no credentials guessed. Account aliases are directions, not available sessions.

## 3. Mutation contract inventory and restoration

These are **current frontend call shapes**, not independently certified backend contracts. `P2` below abbreviates `/api/v2/vendoremployee/product`, `P1` abbreviates `/api/v1/vendoremployee/product`, and `AS` abbreviates `/api/v2/vendoremployee/aggregator-sync`. Runtime origins come only from protected environment configuration; this document grants no endpoint permission.

| Permit class | Action / trigger | Current request shape | Scope check and restore/read-back |
|---|---|---|---|
| W-CREATE-CAT | Add / Enter in category form | POST `P1/add-categories`, multipart name/station/printer/order | Name unique; category restaurant-wide. Returned or uniquely reconciled ID, GET categories; cleanup only after verifying no foods in any menu. |
| W-EDIT-CAT | Save / Enter in category editor | POST `P1/update-categories/{id}`, name/image/type/station/printer/order | Compare complete outgoing payload to baseline, allow only approved changes on CAT-A/B; same endpoint can restore snapshot fields, then GET categories. |
| W-DELETE-CAT | Yes in delete strip | DELETE `P2/delete-categories/{id}` | Zero attachments across all menus, disposable ID only; confirm absence. No restoration claim for deletion. |
| W-REORDER-CAT (DENIED) | Category drag release — forbidden under OD-390-23 | POST `P2/quick-reorder`, `{type: category, items:[{id,position}]}` | **All categories submitted**. Owner chose gesture-only explanation (1a); no release/save or category-order request allowed. Cancel the gesture, verify original order; no saved-result claim. Any future reversal of this policy requires renewed owner scope review, not an ordinary per-record permit. |
| W-CREATE-FOOD | Add Product | POST `P2/add-food`, multipart `food_info` + optional image | N only; exact approved full initial payload. Fresh GET foods-list Normal → unique ID. Cleanup uses approved disposable delete reason, not blind retry. |
| W-EDIT-FOOD | Quick Edit / Full Edit Save | POST `P2/foods/{id}`, Normal multipart `food_info`; A flat multipart | Full form serialization can write unedited fields/defaults; compare all fields, not only visually edited one. Reopen/fetch and compare all persisted values. Restore only from captured original fields; image-removal contract unknown. |
| W-STATUS-FOOD | Card Power immediately / Bulk status after edit request | POST `P2/status-food/{id}`; N `{status}`, A `{food_for: Aggregator}` | N explicit value can be restored. A is toggle-like: never retry blindly; use read-back and separate approved action. A status changes not substituted for timed stock. |
| W-REORDER-FOOD | Item drag release | POST `P2/quick-reorder`, `{type: food, items:[{id,position}]}` | Includes filteredProducts, not only dragged item. Filter to exact demo category/set, assert entire payload set, record original positions and consumer implications. Restore original sequence only with permit; verify fresh read/order. |
| W-DELETE-FOOD | Delete with reason | DELETE `P2/delete/{id}`, `{delete_reason}` | Disposable only; deleted absence after fresh GET. No undo/recreate-as-restore claim. |
| W-BULK-SAVE | Save N Changes | Multiple W-EDIT-FOOD requests; optional subsequent W-STATUS-FOOD | Permit exact dirty IDs and each field. Read each row on partial failure; success of one request does not authorize retry of whole batch. Reset All discards draft, not server changes. |
| W-BULK-DELETE | Confirm Delete | DELETE `P2/delete-bulk`, `{ids,delete_reason,food_for}` | N only, exact ID-set equality, no operational categories. Delete-last phase, fresh GET confirms each absent; unrelated sentinel rows unchanged. |
| W-ADDON | Quick-create Add / master Save / status button / Delete | POST `P2/add-addon`; PUT `P2/addon-update/{id}`; POST `P2/status-change/{id}`; DELETE `P2/delete-addon/{id}` | Restaurant-wide. Known attachment set must contain only demo foods. Create refreshes master but does not auto-select. Restore price/status/links individually; deletion is irreversible. |
| X-EXPORT | Export All Items | POST `P2/bulk-export`, `{type: all}`, returns download URL | Exports all menus regardless of displayed filters. Owner permits generation/download + data handling; artifact stays private, never attach raw workbook to client pack. API response inspected without logging signed URL. |
| X-TEMPLATE | Download Template | GET `P2/export-sample`, returns download URL | Permit download host/path separately; inspect real schema. No import inferred. Private workbook evidence may contain sample data. |
| W-IMPORT | File selection, **before** later refresh dialog | POST `P2/bulk-import`, multipart `products_file` | HOLD until file schema/matching/complete affected set known. Permit exact workbook hash/size, Normal-only semantics and result reconciliation; never synthetic orange-cell success. No automatic rollback promised. |
| W-AGG-ITEM | Disable / Enable Now | POST `AS/stock-toggle`, action/item_ids/client_id, optional turn_on_preset or turn_on_at | Exact A brand/ID, permission for connected platforms, previous status/timer. 30m is valid, 4h preset is not. Read-back of timestamp proves schedule accepted, not scheduler firing. Restore requires approved original-timer semantics. |
| W-AGG-ADDON | Catalog Confirm OOS / Catalog Enable / UP Enable or Disable | POST `AS/bulk-actions/apply` or `AS/bulk-actions/toggle-addon`, addon_id/action/client_id | Catalog is ALL BRANDS; UP is this brand. Catalog Enable and UP actions submit immediately. Record all affected linked foods/brands; no operational addon permitted. |
| W-AGG-VALUE | En / Dis / Enable All / Disable All | POST `AS/toggle-variation`, food_id/variation_index/variation_value_index/action/client_id | Individual tuple only by default; group actions fan out. Reconfirm group/option labels and indexes immediately before action. Missing data → HOLD, not invented state. |
| L-LOCAL | Save Configuration | localStorage writes + source-confirmed station read refresh | Isolated disposable browser context only; record initial non-secret settings, confirm `mygenie_active_menu_type` via UI reload and storage read. Discard entire context afterward; never use a cashier's live profile. |

Sources: `menuManagementService.js:31–219`, `aggregatorConfigService.js:148–194`, `menuManagementTransform.js:241–300`, `ProductList.jsx:68–135`, `CategoryList.jsx:37–106`, `BulkEditor.jsx:629–828`, `StatusConfigPage.jsx:530–605`, `activeMenuPrefs.js:13–27` (all relative to `frontend/src/` with API/component directories in the parent plan).

**Incident/cleanup order:** stop on unexpected request/response, uncertain commit, account mismatch or stale baseline; do not retry writes. Re-read affected IDs; record safe field differences without credentials. If an unrelated record changed, freeze the run and ask the owner before any repair. For approved changes only: restore demo fields/flags/timers → detach shared add-ons → delete designated disposable foods → delete now-unattached disposable add-ons → delete empty disposable categories → compare baseline/sentinels → discard browser context. Cleanup itself needs scoped approval. If unsafe or uncertain, retain records as quarantined and report them; never conceal an incomplete restore with a successful screenshot.

## 4. All-70 proposed correction and evidence map

`Controls` references the selector recipes in the parent plan. State chains specify evidence intent, not executable code or completed work. Old script line anchors refer to the unchanged original `MM_FAQ_VIDEO_SCRIPTS_70.md`.

| FAQ | Old line | Source / controls | Ordered evidence states and proposed correction | Class / outstanding condition |
|---|---:|---|---|---|
| FAQ-01 | 14 | N/P; S01 | normal → premium-selected → premium-items → normal-return. Replace Party with Premium; verify menu values and loaded item IDs for each transition. | R; two populated menus required |
| FAQ-02 | 28 | N/P; S01/S03 | normal-price → premium-price → normal-return. Compare existing same-dish records; remove Premium price-edit action. Route editing demonstration to Normal FAQ-17. | R/H; genuinely comparable records needed |
| FAQ-03 | 45 | N then A; S01/S09 | normal-context → aggregator-selected → brand-catalog. Identify separate account/menu sources; explain listing vs stock without claiming platform results. | R; intentional account change disclosed |
| FAQ-04 | 59 | N; S11 | local-settings → active-menu-buttons → saved-local-menu. Correct location and buttons; no Aggregator Active Menu choice. | R/L; same isolated context |
| FAQ-05 | 73 | N/P; S11 | normal-setting → premium-draft → saved-setting → reloaded-setting. Browser-local device preference, not MM editor's default. | L; discard context after confirmation |
| FAQ-06 | 91 | N; S02 | categories → add-form → filled-name-station → created-empty-row. Keep Add label; station/printer warning remains truthful. | D/W-CREATE-CAT; CAT-A |
| FAQ-07 | 108 | N; S02 | category-before → rename-draft → saved-name. Save or Enter both write; no unproved POS-wide immediacy. | D/W-EDIT-CAT; CAT-A |
| FAQ-08 | 122 | N; S02 | empty-category → delete-strip → removed-category. Remove blanket nonempty-deletion refusal claim; don't test refusal on operational category. | W-DELETE-CAT; dedicated empty category |
| FAQ-09 | 139 | N; S02 | current-station → mapped-printer-draft → saved-mapping. Show actual existing mapping; do not promise physical print from form evidence. | H/W-EDIT-CAT; mapped example needed |
| FAQ-10 | 156 | N; S02 | order-before → lifted-category → gesture-cancelled-original-order. Owner 1a accepts gesture-only explanation. No drag release, save/request, order-after-save screen or persisted-result claim. Cancellation itself must be safety-verified before a later approved capture. | D; OD-390-23 LOCKED FOR PLANNING; no capture GO |
| FAQ-11 | 174 | N; S01/S03 | search-empty → typed-demo-name → matching-card → cleared-search. Use actual edit icon, not generic card click. | R; uniquely bound demo search |
| FAQ-12 | 188 | N; S03 | filters → inactive-items → reactivated-item → all-reset. Reactivation is immediate API write, not a filter action. | R/W-STATUS-FOOD; FOOD-A |
| FAQ-13 | 202 | N; S03 | filters → nonveg → inactive-nonveg → cleared-filters. Show both dimensions and matching IDs, not just one chip. | R; suitable approved records |
| FAQ-14 | 220 | N; S04 | add-product → filled-name-category-price → food-type → created-card. Button Add Product, not Save Item; safe initial channels explicitly agreed. | D/W-CREATE-FOOD; FOOD-CREATE |
| FAQ-15 | 240 | N; S04 | blank-form → required-fields-and-defaults → created-card. Do not imply blank category or discount OFF; distinguish UI required marks from backend acceptance. | D/W-CREATE-FOOD; may share FAQ-14 result |
| FAQ-16 | 254 | N then P comparison; S01/S04 | normal-selected → add-product-normal → created-normal → premium-unchanged. Title becomes adding to selected menu (Normal example); no Party/Premium creation. | W-CREATE-FOOD/R; comparison only in P |
| FAQ-17 | 275 | N; S03 | before → price-draft → saved-price. Bind FOOD-A and unchanged fields. | D/W-EDIT-FOOD |
| FAQ-18 | 289 | N; S03 | quick-edit → tax-type-rate-draft → saved-tax. Non-Aggregator only; configured allowed example, not tax advice. | D/W-EDIT-FOOD; approved tax values |
| FAQ-19 | 303 | N; S03 | old-category → existing-target-selection → saved-new-category. Remove nonworking '+' creation branch. | D/W-EDIT-FOOD; CAT-A/B |
| FAQ-20 | 317 | N; S03 | complementary-no → complementary-yes → saved-flag. Explain configuration only; avoid automatic zero-bill claim absent confirmed rule. | D/W-EDIT-FOOD; billing remains unverified |
| FAQ-21 | 335 | N; S04 | image-before → selected-file-preview → saved-reopened-image. Owner-approved photo only; don't infer guest publication. | D/W-EDIT-FOOD; IMAGE-A |
| FAQ-22 | 352 | N; S04 | existing-preview → cleared-preview. Owner 2a accepts explaining preview clearing, NOT promising persisted photo deletion. Original persisted-removal claim is outside this approved adaptation; no Save or backend-removal demonstration implied. | D; OD-390-24 LOCKED FOR PLANNING; no capture GO |
| FAQ-23 | 366 | N; S04 | description-before → description-draft → saved-description. Guest visibility is conditional on confirmed product behavior; no invented guest screen. | D/W-EDIT-FOOD/H for downstream claim |
| FAQ-24 | 384 | N; S04 | pricing-expanded → tax-type-rate → saved-tax. Omit Full Edit Tax Calc; explain Aggregator GST-5 lock separately. | D/W-EDIT-FOOD |
| FAQ-25 | 401 | N; S03 | quick-edit-tax-calc → exclusive-context → inclusive-context. Explain arithmetic separately from screenshots; no Full Edit control or verified invoice claim. | D; approved illustrative values, no save necessary |
| FAQ-26 | 418 | N; S04 | discount-default-on → off-draft → on-value → saved-discount. Correct default; do not imply switching ON creates eligibility everywhere. | D/W-EDIT-FOOD |
| FAQ-27 | 435 | N; S04 | percent → amount → entered-value → saved-value. UI label Amount, not Flat. | D/W-EDIT-FOOD |
| FAQ-28 | 453 | N; S04 | channels-before → delivery-only-draft → saved-channels. Explicitly set Dine-In/Takeaway OFF; separately state Live Web setting. | D/W-EDIT-FOOD; temporary exposure permit |
| FAQ-29 | 467 | N; S04 | live-web-off → on-draft → saved-flag. Title/configuration scope must not claim guest page is live without downstream evidence. | D/W-EDIT-FOOD; exposure permit |
| FAQ-30 | 481 | N; S04 | all-day → breakfast-0700-1100 → saved-window. No clock/sale simulation or assertion of outside-window enforcement. | D/W-EDIT-FOOD |
| FAQ-31 | 498 | N; S04 | takeaway-on → off-draft → saved-channel. Verify other channel fields unchanged; no order placement. | D/W-EDIT-FOOD |
| FAQ-32 | 516 | N; S05 | variations-open → size-single → small-medium-large-prices → required → saved-reopened-group. No collapsed/empty substitutes. | D/W-EDIT-FOOD; FOOD-A |
| FAQ-33 | 536 | N; S05 | spice-group → three-zero-priced-options → required-on → saved-group. No order-required proof inferred. | D/W-EDIT-FOOD |
| FAQ-34 | 553 | N; S05 | existing-options → extra-price-draft → saved-option-price. Billing effect requires separate evidence. | D/W-EDIT-FOOD |
| FAQ-35 | 567 | N; S05 | single-group → multiple-selected → min-max → saved-group. Label Multiple; choose bounds consistent with actual option count. | D/W-EDIT-FOOD |
| FAQ-36 | 585 | N; S06 | addon-list → bound-addon-selected → saved-attachment. Confirm returned addon ID in food, not only checked UI. | D/W-EDIT-FOOD |
| FAQ-37 | 599 | N; S06 | quick-create-filled → created-master-unselected → manually-selected → saved-attachment. Remove auto-ticked promise; creation is an immediate write. | W-ADDON plus W-EDIT-FOOD |
| FAQ-38 | 616 | N; S06/S07 | master-addon → food-a-link → food-b-link. Prove same ID; qualify global price/order claims absent evidence. | R; use two approved existing links |
| FAQ-39 | 634 | N; S04 | status-flags-expanded → out-of-stock-draft → saved-flag. Remove Quick Edit alternative; distinguish OOS from inactive Power. | D/W-EDIT-FOOD |
| FAQ-40 | 648 | N; S04 | flags-expanded → hidden-draft → saved-hidden-flag. No claimed consumer disappearance without additional evidence. | D/W-EDIT-FOOD |
| FAQ-41 | 662 | N; S04 | operations → prep-12-draft → saved-prep. KDS coloring is not established here; qualify narration. | D/W-EDIT-FOOD |
| FAQ-42 | 679 | N; S04 | operations-charges → approved-charge-values → saved-charges. Distinguish Pack/Takeaway/Delivery; remove invented per-order/per-item financial rule. | D/W-EDIT-FOOD; no billing test |
| FAQ-43 | 696 | N; S04 | inventory-flag → tracking-configuration → saved-flag if approved. Explain recipe dependency separately; no recipe editor or stock deduction proof. | D/W-EDIT-FOOD/H for deduction claim |
| FAQ-44 | 714 | N; S03 | disposable-item → blank-reason-disabled → chosen-reason → deleted-absence. Separate dedicated delete record. | W-DELETE-FOOD |
| FAQ-45 | 731 | N; S03 | blank-reason → valid-reason-enabled → verified-delete if referenced. Explain rationale, not an unverified audit-report destination. | D/W-DELETE-FOOD; share FAQ-44 legitimately |
| FAQ-46 | 745 | N; S03 | deletion-absence → separate-surviving-item → inactive-after-power. No undo control; do not certify backend recovery policy or recreate the deleted ID. | R/W-STATUS-FOOD |
| FAQ-47 | 763 | N; S07 | menu-header → master-list → inventory-readonly-cell. Explain Inventory Yes/No displayed in list; editable only in inline Edit with prerequisite. | R |
| FAQ-48 | 777 | N; S07 | bound-addon → inline-editor → changed-price → saved-master-price. Use Save; no Enter-save promise. All attachments must be demo-only. | D/W-ADDON |
| FAQ-49 | 791 | N; S07 | disposable-addon → delete-dialog → removed-addon. Confirm no unrelated attachments; never use list-only image as result. | W-ADDON |
| FAQ-50 | 805 | N; S07 | inline-editor → recipe-required-disabled → recipe-enabled-example if available → saved-inventory if approved. No recipe picker in this panel. | D/H/W-ADDON; recipe example prerequisite |
| FAQ-51 | 826 | N; S08 | demo-grid → exact-price-cells → valid-dirty-prices → saved-reopened-rows. Do not edit Name, use basePrice field. | D/W-BULK-SAVE |
| FAQ-52 | 846 | N; S08 | column-picker → selected-tiers → resulting-columns. Exact resulting headers; no fictional column groups. | R/D |
| FAQ-53 | 860 | N; S08 | validate-context → actual-tax-issue → corrected-draft → revalidated-row. All loaded rows checked, not filtered rows only; no arbitrary 7% slab rejection claim. | D; invalid values only on unsaved demo draft |
| FAQ-54 | 874 | N; S08 | valid-dirty-rows → per-row-save-results → fresh-values → separate-reset-draft. Explain partial failure and modified-row count; never call batch atomic. | W-BULK-SAVE/D; no artificial live failure |
| FAQ-55 | 892 | N; S08 | excel-menu → export-request → inspected-private-workbook. Label Export All Items (.xlsx); disclose all-menu scope regardless of filter. | X-EXPORT; owner privacy permission |
| FAQ-56 | 906 | N; S08 | approved-workbook → import-control → immediate-upload → reconciled-server-result. Remove staged-orange-cells/later-Save narrative. Refresh dialog is after import. | H/W-IMPORT; contract/file permit required |
| FAQ-57 | 926 | N; S08 | template-menu → downloaded-template → verified-headers. Describe actual schema only after inspection; no upload required. | X-TEMPLATE |
| FAQ-58 | 941 | N; S08 | exact-three-demo-rows → selected-footer → valid-reason-dialog → deleted-absence. Non-Aggregator only. | W-BULK-DELETE |
| FAQ-59 | 958 | N; S08 | no-reason-disabled → valid-reason-enabled → result if referenced. No invented audit log evidence. | D/W-BULK-DELETE; share FAQ-58 |
| FAQ-60 | 972 | N; S08 | demo-category-filter → exact-visible-IDs → exact-selected-IDs → delete-result. Filter first, clear old selection, assert every ID, never All Categories. | W-BULK-DELETE; CAT-B and only demo rows |
| FAQ-61 | 990 | A; S09 | brand-item → live-pill → urbanpiper-popover → approved-disabled-result. Remove platform-chip click and 4h preset. | D/W-AGG-ITEM/H pending exposure permit |
| FAQ-62 | 1007 | A; S09 | urbanpiper-popover → 30m-selected → saved-schedule → actual-return only with later real evidence. Schedule acceptance does not prove timed restoration. | W-AGG-ITEM/H; no accelerated clock substitute |
| FAQ-63 | 1021 | A; S09 | listing-flags → zomato-off-draft → saved-listing. Owner 2a accepts Zomato listing flag versus UrbanPiper timed stock adaptation; don't assert Normal unchanged across different restaurants. A saved-listing state still needs later explicit write/evidence approval. | D/W-EDIT-FOOD; adaptation LOCKED FOR PLANNING, no write GO |
| FAQ-64 | 1039 | A; S04/S09 | same-image-mode → different-mode → approved-image-preview → saved-reopened-image. Default depends on existing photo; no platform publication promise. | D/W-EDIT-FOOD; IMAGE-B and exposure permit |
| FAQ-65 | 1056 | A; S09 | platform-sync → one-flag-off → persisted-flags. Other flag unchanged in read-back; no timed-stock equivalence. | D/W-EDIT-FOOD |
| FAQ-66 | 1070 | A; S09 | aggregator-edit-context → saved-catalog-fields → separately-confirmed-sync-rule. Explain only supported sync behavior; no automatic push success/timing claim. | R/H; no sync-catalog action |
| FAQ-67 | 1088 | A; S10 | bound-brand-addons → catalog-vs-up-columns → correct-action-context → result only if separately permitted. Adapt to all-brands catalog versus per-brand UP, not Swiggy-only. | R/H/W-AGG-ADDON |
| FAQ-68 | 1102 | A; S10 | loaded-brands → populated-food → named-group-option → correct-per-brand-action → result. Remove Zomato-only claim; no empty fallback or assumed seeded variations. | H/W-AGG-VALUE; populated brand tuple needed |
| FAQ-69 | 1123 | N; S03 | demo-category → order-before → lifted-item → persisted-reloaded-order. Payload set must equal approved filtered demo IDs. | W-REORDER-FOOD |
| FAQ-70 | 1137 | N; S03 | verified-menu-order → consumer-scope-explanation. Reuse genuine FAQ-69 evidence; guest/aggregator ordering not proven by MM. | R/H; qualify downstream claim |

## 5. Candidate source assets and release policy

- Old images are historical unaccepted evidence, retained byte-for-byte. Do not delete or overwrite them during recovery. Candidate reuse requires renewed account/menu/brand/content/privacy checks and a hash-linked source record; byte uniqueness is not correctness.
- Reject old 01/03/08/09 (wrong or privacy-unsafe dashboard), 39/40 (loaders), 41/49 (Party not selected), 47 (NaN Name), 48 (all-category destructive scope) as replacements for their intended journeys. 38/50 cannot satisfy populated variation evidence. 42/43 cannot satisfy Multiple/Min/Max. These files remain for audit, not in an accepted pack.
- Core safe reuse candidates are context only: 02/04/05/11/12/14/15/17/18/19/21/23/24/26/27/28/30/31/32/33/34/35/36/37. Each is still subject to new validation and exact claim match. No blanket copy list or 40-valid assertion.
- Review pack: clean UI PNGs + corrected content revision + FAQ/state mapping + inventory/hashes + source/permission/read-back provenance + limitations + all-70 external review table. Scripts and explanatory text are separate from PNGs. No PDF-page frames, no hidden errors, no fabricated successful UI, no public folders.
- Status lifecycle per state: PLANNED → BLOCKED or CAPTURED → INTERNAL_REVIEW_PASS → EXTERNAL_PASS. Per-FAQ acceptance requires every required state/claim, including approved truthful adaptations. A missing prerequisite or qualification not accepted by owner cannot be silently waived.
- Acceptance binds exact script/map/PNG hashes and reviewer/version to each FAQ; any changed input invalidates affected approval. All 70 external passes plus explicit owner all-green confirmation required before ANY storyboard, Hindi translation, TTS or video generation. English corrected source scripts may be written only in the later approved repair phase; no language-generation integration now.
