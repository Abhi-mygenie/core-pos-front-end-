# CR-390 — MM FAQ coverage / impact-analysis amendment

**Role:** 2 — PLANNING. **Stage:** Step 1 / Gate 2 ONLY. **Date:** 2026-09-28.
**Current progression (later 2026-09-28): OD-390-25 LOCKED FOR PLANNING** — option 3b read-only discovery first; earlier menu/video/1a/2a choices retained. **Gate 3 OPEN / OWNER REVIEW; no Gate 4 GO**, no discovery/access permission. Next-agent presentation: `../handover/SESSION_HANDOVER_2026_09_28_CR390_OPTION3B_ACCEPTED_PRESENTATION.md` — both sessions, current position, P3B-1…4 approvals, then WAIT. Existing Gate 3 plan/annex remain authoritative. This Step 1 assessment/matrix and its historical stop text remain the unchanged evidence baseline.
**Code Reality:** PARTIAL — existing capture/PDF pipeline and 50 PNGs exist; recovery checks and video pipeline do not. Do not rebuild the existing foundation.
**Conflict Pre-Check:** Documentation-only now; no runtime-file conflict. Future evidence must be revalidated against BUG-359/390/391/392/394, CR-373/374/376/FU-A/FU-B and CR-140/144/155/158/159; these have existing implementation/QA history, some awaiting owner smoke. No approval to modify their code.
**Risk:** CRITICAL for the recovery item: unsafe automated selectors, immediate imports, deletion, prices/tax, printing and restaurant-wide stock effects. This upgrades the original LOW tooling-only assessment under Alpha R21; current read-only/documentation activity does not authorize those mutations.
**Sprint:** `modules_pdf`. Historical parent milestone remains `GATE_5A_MM_PDF_GENERATED`; recovery has a separate Gate 2 status. Generated does not mean validated.

## 1. Authorization and boundaries

Owner explicitly approved: **"start step 1 follow gates"** and provided accounts for standard MM and aggregator MM inspection. Credentials authorize access, not business-data changes.

- Account aliases: `MM_STANDARD` = owner-provided Palm House account; `MM_AGGREGATOR` = owner-provided Kunafa Mahal account. Passwords/tokens are deliberately absent from this report.
- Later owner decision: **Palm House Normal** for standard demonstrations; **Kunafa Mahal Aggregator** for aggregator demonstrations; **Palm House Premium** only for menu-switching/comparison examples. No Party setup is planned. This selects evidence sources, not permission to edit their operational data.
- Completed: read-only source tracing, visual review of existing images, inventory/hash reconciliation, narrowly scoped live observations, and this FAQ/action coverage assessment.
- Not performed: source changes, capture-runner execution, manifest edits, narration rewrites, new capture-pack PNGs, Save/Delete/Import/stock actions, data seeding, PDF/ZIP regeneration, storyboards, voiceover, video, or EM work.
- Browser checks used isolated sessions, blocked non-read business requests, and allowed only existing login and source-confirmed read-only station-list POST requests. Login/session activity is not claimed to be zero backend activity.
- OD-390-15 remains locked: clean actual-UI PNGs; separate explanations/scripts/mappings; annotated PDF optional for video preparation, never a frame source. Original nine-module PDFs and frozen layout remain unchanged.
- This is an assessment of requirements/evidence, **not** an ordered capture list, edit specification, implementation plan, QA verification matrix, or storyboard.

## 2. Evidence and limitations

Source baseline: git `ea31ed69615b963d94d7338f6fe5b0804d20ea67`, inspected 2026-09-28. Source line anchors below refer to this baseline.

| Evidence | Result |
|---|---|
| `design_briefs/MM_FAQ_VIDEO_SCRIPTS_70.md` | All FAQ-01…FAQ-70 read; original scene groups assessed in the matrix below. Script text unchanged. |
| `handover/FAQ_VIDEO_AGENT_HANDOVER_MM_2026_09_27.md` | All 70 existing mappings examined. Historical fallback guidance is NOT a valid recovery approval. |
| `frontend/scripts/screen-reference/manifests/MM_menu.json` | 50 expected states; corresponding PNGs all present. Existing titles do not prove image content. |
| `evidence/CR-390/MM/` | 50 PNGs, **42 distinct SHA-256 hashes**, six duplicate groups, eight redundant copies. **Not 40 proven-correct screenshots.** |
| Existing PNG visual inspection | All 50 inspected via temporary contact sheets; ambiguous details checked against source/original state. These are derivatives for inspection, not new captures or client assets. |
| Live standard account | Existing common-login HTTP 200; dashboard reached. Party foods-list HTTP 200 / 0 items; Premium HTTP 200 / 122 items rendered. Normal refresh timed out in one observation, so no new Normal total is asserted. |
| Live station settings | `/visibility/status-config` rendered; **Normal / Premium buttons**, not a dropdown; **Save Configuration** visible. No selection saved. |
| Live aggregator account | Login/dashboard successful; Aggregator foods-list HTTP 200 / **108 items**; addon-list HTTP 200 / **10 add-ons**; Main Brand variations HTTP 200 / **0 items**, empty message visible. |
| Brand completeness | Main Brand verified only. An earlier observation showed two brand options, but the later inspection enumerated options before asynchronous brand loading completed. Other-brand variation coverage is **UNVERIFIED**, not zero. |
| API actions | Only reads plus existing auth executed. No write-method probes; existing POST update calls are recorded as current code, not certified backend contracts. |
| Video / ZIP | No video pipeline execution. `/app/memory/final/` held no files at inspection; old ZIP/download claims cannot establish current artifact availability. |

Browser evidence was summarized here from inspection outputs; incidental tooling login-page images are not tutorial captures. No customer/order payloads, credentials or raw network logs are copied into the deliverable. The first guards blocked common-login, then the read-only station-list POST; source-confirmed exceptions allowed subsequent observation. Those initial timeouts were **inspection limitations**, not evidence of invalid credentials or an app auth defect.

### Duplicate groups (byte-exact)

- 01 = 03 = 08 = 09 (dashboard reused for unrelated states).
- 04 = 10 (category/item overview; may be intentionally reusable, not distinct state coverage).
- 15 = 44 (Quick Edit; no additional fields captured).
- 24 = 45 (add-on list, not inline editing).
- 38 = 50 (empty variation stock).
- 41 = 49 (empty Party menu, not Party Quick Edit).

## 3. Existing screenshot inventory — observed, not approved

Numbers are the prefixes of the original filenames in `evidence/CR-390/MM/`. A reusable visual may still lack the required action/result; none is automatically client-approved.

| # | Actual visible state / limitation |
|---|---|
| 01 | Dashboard with sidebar expanded; menu entry visible. Guest/room details remain visible: privacy review required, not client-clean. |
| 02 | Normal menu overview with categories and product cards; usable opening context only. |
| 03 | Same dashboard as 01; no Premium menu. |
| 04 | COFFEE category selected and its products; usable overview. |
| 05 | Category hover actions visible; no rename committed. |
| 06 | Category inline name/station form; **No printer mapped** warning contradicts successful printer-routing narration. |
| 07 | Category delete confirmation; no confirmed deletion/result. |
| 08 | Same dashboard as 01; no Add Category form. |
| 09 | Same dashboard as 01; no category drag. |
| 10 | Duplicate of 04, not additional anatomy evidence. |
| 11 | Non-Veg filter selected, product search empty; supports filter context, not typed search. |
| 12 | Product hover with action icons; no edit/action result. |
| 13 | Lifted item during drag in All Items view; no category-specific saved ordering or downstream result. |
| 14 | Inactive filter selected and dimmed items; usable filter state, no reactivation result. |
| 15 | Full visible Quick Edit fields; no Out of Stock control, no saved change. |
| 16 | Single-item delete strip with empty reason and disabled Delete; no selected reason or after-state. |
| 17 | Full Edit name/description/empty image Upload; no existing image, X removal or upload preview. |
| 18 | Full Edit pricing; discount ON, zero value/Percent; **no Tax Calc control**. |
| 19 | Channels ON and all-day time range; does not show delivery-only, disabled Takeaway or breakfast times. |
| 20 | Food Variations collapsed; no options, Required, prices or Multiple bounds visible. |
| 21 | Add-on checklist plus blank quick-create inputs; no named newly created add-on or post-save attachment. |
| 22 | Operations expanded; Status & Flags collapsed. Prep field differs from script's example; no flag toggles visible. |
| 23 | Add Product form; blank name, preselected category, zero price, GST, discount ON. No successful new item. |
| 24 | Add-on master list, status and Edit/Del controls; inventory displayed Yes/No, not editable in list. |
| 25 | Blank add-on creation row; not inventory editing. |
| 26 | Bulk grid with data; starting context, no changed prices. |
| 27 | Column picker open; no demonstrated resulting chosen-column set. |
| 28 | Excel menu with **Export All Items (.xlsx)** and **Download Template (.xlsx)**; Import is a separate toolbar control. |
| 29 | Search for Coffee in bulk grid; not a category-filter selection. |
| 30 | Bulk add-on expansion for one food; useful additional supporting evidence for attachment, not master-price/result proof. |
| 31 | Three rows selected and Delete Selected (3) footer; no deletion. |
| 32 | Bulk delete dialog, blank reason, disabled Confirm Delete; no submitted result. |
| 33 | Aggregator catalogue with passive Swiggy/Zomato listing chips and a separate Live/Offline stock pill. |
| 34 | **Disable on UrbanPiper** popover; 30 min/1h/2h/6h/12h/1d/7d/custom, not a Swiggy-only control or 4h preset. |
| 35 | Aggregator Quick Edit with platform listing selectors; separate concept from timed stock. |
| 36 | Aggregator Full Edit, Upload different image selected, empty upload; platform toggles visible. No uploaded photo/result. |
| 37 | Addon Stock: **Catalog (all brands)** versus **UrbanPiper (this brand)**; not Swiggy/Zomato columns. |
| 38 | Main Brand variation-stock empty state; no variation row/control. |
| 39 | Loading/bootstrap page, not Local Settings. |
| 40 | Loading/bootstrap page, not Active Menu. |
| 41 | Party selected with no products. Supports emptiness only, not comparison pricing. |
| 42 | Pricing collapsed on a different item; not discount-expanded. |
| 43 | Discount value/Percent partially visible, **No variations added**; not Multiple/Min/Max. |
| 44 | Exact duplicate of 15; no extra Quick Edit state. |
| 45 | Exact duplicate of 24; inline add-on edit never opened. |
| 46 | Validate Tax reports 68 issues; count alone does not substantiate the script's invented slab-validation rule. |
| 47 | **Name** changed to `NaN`; not a valid price edit. Reject for price/import/save demonstrations. |
| 48 | All Categories with 336 selected; not one selected category. Destructive tutorial cannot use this as safe subset evidence. |
| 49 | Exact duplicate of empty Party 41; no Quick Edit. |
| 50 | Exact duplicate of empty variation stock 38; no populated state. |

## 4. Current UI/data-flow reference anchors

Paths below are relative to `frontend/src/` unless otherwise stated. **READ-ONLY references, not edit sites.**

| Ref | Source / observation | Relevant finding |
|---|---|---|
| C1 | `components/panels/MenuManagementPanel.jsx:19–47,70–145,156–167` | Management selection starts Normal; foods fetched by `food_for`; categories fetched separately and counts derived. Management selection is not station Active Menu. |
| C2 | `contexts/MenuContext.jsx:99–117`; `pages/StatusConfigPage.jsx:570–571,1014–1045` | Station menu comes from device preference; only populated active/non-hidden non-Aggregator menus; selector visible with >1 type. Pill selection is local draft until Save Configuration. |
| C3 | `components/panels/menu/CategoryList.jsx:28–107,151–194,250–300` | Station/printer hint; inline create/edit/delete; Enter can SAVE; category drag-end calls API. No frontend non-empty-category deletion guard demonstrated; backend rule unprobed. |
| C4 | `components/panels/menu/ProductList.jsx:40–91,238–290`; `ProductCard.jsx:304–444` (same menu directory) | Search/filter/drag/card behavior; power writes immediately; item deletion requires reason. Drag before/after and downstream ordering still need evidence. |
| C5 | `components/panels/menu/ProductCard.jsx:26–274` | Quick Edit has Tax Calc; no OOS field. Category '+' at 142–144 has no onClick. Complementary is a Yes/No select. |
| C6 | `components/panels/menu/ProductForm.jsx:225–303,325–471,637–672` | Defaults, image selection, platform listing and tax. Add Product / Save Changes are real button labels; discount defaults ON; amount label is Amount, not Flat. Full Edit Tax Calc removed; Aggregator tax locked GST 5%. |
| C7 | `components/panels/menu/ProductForm.jsx:120–208,501–628` | Single/**Multiple**, Required and Min/Max; availability, add-ons, operations and flags. Quick-create add-on calls master creation but does NOT append returned ID to selectedAddonIds. |
| C8 | `components/panels/menu/AddonManagementPanel.jsx:38–101,181–283,296–323` | Inline edit, immediate status action and delete dialog. Inventory is recipe-gated; no recipe picker appears. Edit has Save button, no Enter handler in this row. |
| C9 | `components/panels/menu/BulkEditor.jsx:550–610,629–750,758–828,935–949,1018–1023,1237–1345` | Validate Tax iterates rows; GST/VAT-positive / Aggregator GST-5 rules, not arbitrary configured slabs. Save performs per-row requests with possible partial failures. Import submits immediately; later dialog protects local edits from refresh, NOT server writes. |
| C10 | `components/panels/menu/AggregatorStockToggle.jsx:7–16,47–84,107–169`; `ProductCard.jsx:13–24,343–373` | Passive platform chips; timed stock is UrbanPiper item/brand action, no platform parameter. No 4-hour preset. |
| C11 | `components/settings/aggregatorSetup/AddonStockTab.jsx:66–90,101–117,148–163`; `VariationStockTab.jsx:46–69,78–139` | Add-on catalog action is restaurant-wide; UP toggle is per brand. Variations grouped by food and group; no per-Swiggy/per-Zomato selector. |
| C12 | `api/services/menuManagementService.js:15–20,31–141,148–219`; `api/transforms/menuManagementTransform.js:241–290` | Current food/category mutations include legacy POSTs; addon update uses PUT. No explicit image-removal instruction in inspected save serialization. Aggregator multipart skips variations/addon_ids; cannot assume its Add form can seed required variation data. |

Overall flow: configured external API → existing services → `fromAPI` transforms → MM panel state → category/product/stock UI → existing PNG → mapping/scripts → external validation → later video. Local Settings instead consumes MenuContext/device prefs. No local Mongo schema changes or new API integrations belong to this amendment.

## 5. All-70 FAQ action/scene coverage matrix

**Legend:** `P` = PARTIAL (some correct visual/source support; important scene/result unproven). `B` = BLOCKED as currently narrated/mapped (wrong primary state, nonexistent control/behavior, dangerous misdescription, or missing essential data). Neither means an application test failed. No row is external-validator GREEN.

`Scenes` counts existing `[Opening] / [Action] / [Closing]` script groups, not newly authored video frames. Script entry line appears after the FAQ ID. `Existing` lists original mapping numbers, not approved replacements. Scene/action requirements below account for the original sequence; downstream claims absent from this repository remain unverified even when a control exists. `Result` means persisted/observable completion, not a toast or an unsaved local form.

| FAQ / script line | Scenes | Existing | State | Required scene/action evidence and current gap | Basis |
|---|---:|---|:---:|---|---|
| FAQ-01 / 14 | 3 | 41,02 | B | Normal → Party switch → populated Party prices/counts → back. Opening exists, but Party is empty live and in 41; no requested populated result. | C1; live |
| FAQ-02 / 28 | 4 | 41,15 | B | Compare same dish across menus → Party Quick Edit → new price → Normal unchanged. 41 empty; 15 is Normal. Premium live data exists but substituting it changes narrated Party journey and needs approval. | C1,C5 |
| FAQ-03 / 45 | 3 | 33 | P | Menu choice and aggregator catalogue shown. Delivery-platform-only scope supported by C2; separate-platform stock and guest images/outcomes need qualified narration/evidence. | C1,C2,C10 |
| FAQ-04 / 59 | 3 | 40 | B | Navigate actual Local Settings → Active Menu buttons → save/device effect. 40 is loader; script wrongly places dropdown at bottom of MM and includes Aggregator. | C1,C2; live |
| FAQ-05 / 73 | 3 | 40 | B | Same correct location/buttons → Premium selected → Save Configuration/device persistence. Does not change management editor's Normal default; claims of remembering MM selection are wrong. | C1,C2; live |
| FAQ-06 / 91 | 4 | 08 | B | Category list → add form/name → station and Add → new zero-count row. 08 dashboard; no form or result, creation needs disposable data permission. | C3 |
| FAQ-07 / 108 | 3 | 06,05 | P | Hover/pencil and edit exist; renamed value and committed renamed row missing. Immediate POS-wide propagation not proven by these images. | C3 |
| FAQ-08 / 122 | 4 | 07,05 | P | Hover/trash → Yes → removed empty category. Confirmation exists; result missing; cannot assert backend refusal for nonempty category without evidence. | C3 |
| FAQ-09 / 139 | 4 | 06 | B | Station label → edit → mapped printer selection → saved mapping. Existing warning explicitly says no printer mapped; physical print outcome outside inspected MM evidence. | C3 |
| FAQ-10 / 156 | 3 | 09 | B | Grip → lifted category/gap → persisted ordering. 09 dashboard. Drag release writes API; a paused/cancelled drag is not result proof. | C3 |
| FAQ-11 / 174 | 3 | 11 | P | Search field → typed query/matching rows → clear and intended edit icon. 11 only food filter; no typed query; clicking any card is not the documented icon action. | C4 |
| FAQ-12 / 188 | 3 | 11,14 | P | Filters → Inactive → reactivation/All reset. Correct inactive state exists; Power reactivation and resulting list not shown and is an immediate write. | C4 |
| FAQ-13 / 202 | 3 | 11 | P | Filters → Non-Veg → combined Inactive+Non-Veg → clear/hide. 11 supports Non-Veg only; combination/reset states missing. | C4 |
| FAQ-14 / 220 | 5 | 23,17 | P | Add Product → fill name/category/price → food type → create → resulting card. Blank form available; filled form and created card absent; labels need Add Product, not Save Item. | C6,C7 |
| FAQ-15 / 240 | 3 | 23 | P | Required fields/defaults → successful create. Default food/channel/variation state only partly visible; category already selected and price zero, no success proof. Required-field labels are not proof of backend acceptance rules. | C6,C12 |
| FAQ-16 / 254 | 4 | 41,23 | B | Party selected → Party-bound add form → created Party item → Normal unchanged. 23 is Normal; 41 empty; no cross-menu proof. | C1,C6 |
| FAQ-17 / 275 | 3 | 12,15 | P | Hover/Quick Edit → price typed → saved card price. Opening available; changed and persisted price missing. | C4,C5 |
| FAQ-18 / 289 | 3 | 12,15 | P | Quick Edit → GST/VAT/%/Tax Calc selection → saved configuration. Fields visible; edits/result absent. Scope to non-Aggregator; do not imply changing mandatory Aggregator GST. | C5,C6 |
| FAQ-19 / 303 | 3 | 15 | B | Category selection → optional '+' creation → saved moved item. '+' has no handler in current Quick Edit; existing-target move remains demonstrable but no result. Remove unsupported branch or route separate product issue. | C5 |
| FAQ-20 / 317 | 3 | 15 | P | Complementary Yes → Save → billing effect. Control exists but not selected; blanket zero/Comp receipt semantics require business/consumer validation, not inferred from flag. | C5,C6,C12 |
| FAQ-21 / 335 | 4 | 17 | P | Full Edit → select image → actual preview → Save Changes/result. Only Upload with no image exists; image/persistence and external guest visibility unproven. | C6,C12 |
| FAQ-22 / 352 | 3 | 17 | B | Existing photo/X → removal → persisted no-image result. No existing photo in 17. UI clears preview but inspected save sends no explicit removal signal; backend removal contract unverified. | C6,C12 |
| FAQ-23 / 366 | 3 | 17 | P | Description → where guests see it → save. Field present but empty. Live Web/aggregator display and claimed POS exclusion not proved by MM screenshot. | C6 |
| FAQ-24 / 384 | 4 | 18 | B | Pricing → tax type/% → Inclusive/Exclusive → save. Tax Calc is absent in Full Edit (BUG-359); arbitrary rates also not allowed for Aggregator GST-5. Do not restore removed UI for a video. | C6 |
| FAQ-25 / 401 | 4 | 18 | B | Tax Calc context → 100+5 / 105-inclusive explanation → choice. Arithmetic is illustrative, but control location is wrong. Quick Edit has it; approved scope/business semantics and separate explanation needed. | C5,C6 |
| FAQ-26 / 418 | 4 | 43,18 | B | Allow Discount off → on → value/type → saved result. Script says default OFF but new form defaults ON; no OFF state and no saved discount. UI choice is Amount, not Flat. | C6 |
| FAQ-27 / 435 | 3 | 43 | B | Type dropdown → Amount versus Percent → value/save. 43 shows Percent only; 'Flat' is not an option label. Both state/value and result evidence absent. | C6 |
| FAQ-28 / 453 | 3 | 19 | P | Channels → Dine-In/Takeaway OFF, Delivery ON → persisted settings/effect. 19 shows all ON; Live Web is separate and should be explicitly addressed. | C7 |
| FAQ-29 / 467 | 3 | 19 | P | Live Web switch → Save Changes → online availability. ON state exists, transition/result and actual guest page do not. Saving UI does not prove publication. | C7 |
| FAQ-30 / 481 | 4 | 19 | P | Time fields → 07:00–11:00 → Save Changes → outside-window behavior. 19 all-day; application/clock enforcement not proved by this form. | C7 |
| FAQ-31 / 498 | 3 | 19 | P | Takeaway ON → OFF → persisted channel-specific effect. Only ON state present; no result. | C7 |
| FAQ-32 / 516 | 5 | 20 | B | Add group → Size/Single → three options/prices → Required → saved options. 20 collapsed, 43 empty. No operative variation controls/results captured. | C7 |
| FAQ-33 / 536 | 4 | 20 | B | Spice group → three zero-price choices → Required → saved mandatory choice. Core controls absent from mapped frame. | C7 |
| FAQ-34 / 553 | 3 | 20 | B | Expanded existing options → specific extra price → save/order effect. 20 collapsed; no price/option evidence. | C7 |
| FAQ-35 / 567 | 3 | 20 | B | Group Single → **Multiple** → Min/Max → save. 20 collapsed; 43 no variations. 'Multi' is narration shorthand, not actual button label. | C7 |
| FAQ-36 / 585 | 3 | 21 | P | Checklist → selected intended extras → saved attachment/order choices. Selected rows present but different examples; result absent. 30 offers additional existing attachment context only. | C7 |
| FAQ-37 / 599 | 4 | 21 | B | Fill new add-on → create → allegedly auto-ticked → reusable master entry. Create is immediate API write; current handler refreshes master but does NOT auto-select new ID. | C7 |
| FAQ-38 / 616 | 3 | 24 | P | Master list → same add-on attached across items → common-price behavior. List exists; reuse/price propagation claim needs same-ID evidence or qualified explanation. | C7,C8 |
| FAQ-39 / 634 | 3 | 22,44 | B | Full Edit OOS → alternative Quick Edit OOS → badge/order restriction. 22 flags collapsed; Quick Edit has no OOS control. Remove unsupported alternative; actual result still missing. | C4,C5,C7 |
| FAQ-40 / 648 | 3 | 22 | B | Expanded Hidden from POS → ON → saved visibility effect. Flags collapsed in 22; core control absent. | C7 |
| FAQ-41 / 662 | 4 | 22 | P | Prep time → 12 minutes → save → KDS color behavior. Operations shown but not example value/result; KDS claim outside shown evidence. | C7 |
| FAQ-42 / 679 | 4 | 22 | P | Charge fields → delivery value → pack/takeaway distinctions → save. Controls present, zeros shown; 'per item, per order' billing basis needs owner/consumer confirmation, no financial result proof. | C7 |
| FAQ-43 / 696 | 3 | 22 | B | Inventory flag → ON → recipe-linked deduction. Flag hidden in collapsed section; recipe prerequisite/result outside scope and unverified. | C7 |
| FAQ-44 / 714 | 4 | 12,16 | P | Trash → reason strip → chosen reason/confirm → removed item. Before/confirmation exist; selected reason and committed result absent. Disposable-data permission required. | C4 |
| FAQ-45 / 731 | 3 | 16 | P | Disabled-until-reason → reason selection → audit explanation. Disabled state exists; audit storage/reports not demonstrated; do not claim verified reporting path. | C4,C12 |
| FAQ-46 / 745 | 3 | 14,12 | P | Post-delete absence/no undo → safer deactivation → inactive result. 14 shows existing inactive items, not the same item transitioned; backend recovery policy not established. | C4 |
| FAQ-47 / 763 | 3 | 24 | P | Add-ons header → master columns → reuse effect. Correct list exists; Inventory is read-only Yes/No until Edit, not a checkbox in list; update wording. | C8 |
| FAQ-48 / 777 | 3 | 45,24 | B | Master Edit → changed price → saved/propagated value. Both mappings are same list, no editor; source shows Save, no Enter handler in inline edit. | C8 |
| FAQ-49 / 791 | 3 | 24 | P | Del → confirmation → removal from list/attachments. List only; dialog/result absent; destructive cross-item consequence needs controlled data. | C8 |
| FAQ-50 / 805 | 4 | 24,25 | B | Edit → inventory enabled → allegedly revealed recipe field → save/deduction. No inline edit screenshot; no recipe field exists; toggle is disabled until recipe already attached elsewhere. | C8 |
| FAQ-51 / 826 | 5 | 26,47 | B | Bulk grid → Price edits/Tab → valid dirty cells → save → correct prices. 47 corrupts Name to NaN, not Price; resulting saved rows absent. | C9 |
| FAQ-52 / 846 | 3 | 27 | P | Open picker → select/deselect columns → close/resulting grid. Picker exists; resulting set absent. Labels are tiers, not the script's invented named groups. | C9 |
| FAQ-53 / 860 | 3 | 46 | B | Validate → actual tax rule/highlight → correct/revalidate. Code does not check arbitrary registered slabs or only visible filtered rows; 7% rejection example unsupported. 68 issues only proves old count. | C9 |
| FAQ-54 / 874 | 3 | 47,26 | B | Valid changed rows → Save → Reset alternative. Invalid Name screenshot; save is multiple per-row calls, possible partial failure—not one atomic API call; count is modified rows, not dirty cells. | C9 |
| FAQ-55 / 892 | 3 | 28 | P | Excel → **Export All Items (.xlsx)** → downloaded workbook. Menu present; action label differs, workbook not examined. Export is server generation, not executed at Step 1. | C9,C12 |
| FAQ-56 / 906 | 5 | 28,47 | B | Export → offline edits → separate Import → outcome. **Import sends file immediately and writes server data; it does not stage orange cells for later Save.** 47 is unrelated invalid Name edit. | C9,C12 |
| FAQ-57 / 926 | 2 | 28 | P | Download Template → inspect correct headers/new-item preparation. Menu exists, workbook structure/import compatibility unverified; import must not be portrayed as reversible local staging. | C9,C12 |
| FAQ-58 / 941 | 4 | 31,32 | P | Select subset → footer → reason dialog → confirmation/result. First states exist; reason-selected/result absent. Bulk delete is non-Aggregator only. | C9,C12 |
| FAQ-59 / 958 | 3 | 32 | P | Mandatory reason → audit rationale → reason/confirm. Blank dialog only; configured reason option and audited result unverified. | C9,C12 |
| FAQ-60 / 972 | 3 | 48,31 | B | Category filter → select matching rows/count → delete subset. 48 All Categories/336 selected directly contradicts intended subset. Preserve all unrelated items; no current delete permission. | C9 |
| FAQ-61 / 990 | 4 | 33,34 | B | Aggregator item → intended control → preset → disable result. Chips are passive; actual action is UrbanPiper stock, not platform-selective. No 4h preset; scope must be rewritten/approved. | C10 |
| FAQ-62 / 1007 | 3 | 34 | B | Correct UrbanPiper popover → 30m → scheduled return. 30m control exists but not selected; script's per-platform/4h wording wrong. Scheduled return cannot be proven by unsaved popover. | C10 |
| FAQ-63 / 1021 | 3 | 34,33 | B | Zomato-only disable → Normal unchanged. Timed stock payload has no platform selector. Platform-listing setting is a different action; owner must approve changed journey, not silently substitute. | C6,C10 |
| FAQ-64 / 1039 | 4 | 36 | P | Aggregator Full Edit → same/different image → upload preview → persisted image. Different mode shown, preview/result missing. Default depends on existing Swiggy image; save does not itself prove downstream publication. | C6,C12 |
| FAQ-65 / 1056 | 3 | 36 | P | Platform Sync → Zomato OFF → save/listing outcome. Toggles exist but both ON; listing flags distinct from timed stock; propagation unproven. | C6,C10 |
| FAQ-66 / 1070 | 3 | 33,36 | P | Save changes → sync explanation → platform reflection. MM screenshot cannot establish automatic sync timing/success. Need owner/backend contract evidence or qualified wording; no push actions performed. | C6,C12 |
| FAQ-67 / 1088 | 3 | 37 | B | Stock tab → Swiggy-only add-on action → Zomato unchanged. No such column. Actual controls distinguish restaurant-wide catalog and per-brand UP stock; incorrect script is dangerous. | C11 |
| FAQ-68 / 1102 | 4 | 38,37 | B | Variation tab → populated food/group/option → Zomato-only disable → Swiggy unaffected. Main Brand empty live; platform-only action absent. Other brands unverified; must resolve both data AND semantics. | C11; live |
| FAQ-69 / 1123 | 3 | 13 | P | Select category → lift card → drop/persist order. 13 is All Items drag, not selected category; no saved order result. No drag released during Step 1. | C4 |
| FAQ-70 / 1137 | 3 | 13,02 | P | Persisted reorder → Live Web/POS display → aggregator caveat. No online menu/order propagation evidence. External display rule requires owner/backend proof or qualified explanation. | C4 |

**Coverage conclusion:** all **70 FAQs / 237 original scene groups** assessed: **34 BLOCKED as written/mapped, 36 PARTIAL; none externally accepted**. These are evidence/content classifications, not counts of broken application features. Frame count is driven by required actions/results, not a target of 50. Correct generic opening frames may be shared intentionally; identical images cannot stand in for different data/actions. No success, delete, import, sync or timed-restore claim is certified from an unsaved state.

**Documentation verification:** 30/30 reconciliation checks passed; exact script line/scene counts, inventory, protected hashes, registry-only CR-390 changes and parent/recovery gate separation verified. Evidence ledger: `../evidence/CR-390/GATE2_2026_09_28/READ_ONLY_EVIDENCE.md`. This is not independent application QA or owner acceptance.

## 6. Cross-cutting impact and recovery blockers

| ID | Risk | Finding / consequence | Gate 2 disposition |
|---|---|---|---|
| G2-01 | HIGH | Runner `execute_action` soft-fails, proceeds to screenshots; `fresh_route=false` and short delays leak wrong states; no route/menu/brand/content gates. `--only` skips required prior-state setup. | Recovery must fail closed and ensure independently reproducible states. Exact edits belong to Gate 3. |
| G2-02 | CRITICAL | Manifest 43's first variation button can delete the group draft. Manifest 45's first table button can immediately toggle add-on status. Arbitrary eval/first-match selectors are not safe. | Existing runner must NOT run until action targeting and mutation policy approved. No claim old data is unmodified: historical execution side effects unproven. |
| G2-03 | CRITICAL | Import selects a file then immediately sends bulk-import; add-on quick-create and Power write immediately; drag drop persists. Avoiding a button named Save does not make a run read-only. | Explicit mutation inventory, approved disposable IDs, read-back/restore policy required before implementation. |
| G2-04 | HIGH | `scrub_toasts` removes/hides failures before capture; fictional-name substitution does not scrub room/guest details, account IDs or all sensitive strings. | Never hide failures to pass readiness. Any privacy-only redaction must not falsify UI state; reject unsafe source assets. |
| G2-05 | HIGH | Manifest currently has no per-journey `login_as` entries although runner supports them. Different restaurants underlie standard/aggregator images. Credentials alone do not produce deterministic account/brand selection. | Account alias/restaurant/menu/brand attribution required. No raw secrets in manifests/CLI logs. |
| G2-06 | HIGH | Scripts, inventory, manifest captions and images contradict each other; old production brief permits misleading fallbacks/empty-state substitutions and hiding errors. | Canonical corrected content after owner decisions; preserve originals for comparison, invalidate unsafe guidance by status notice. |
| G2-07 | CRITICAL | Price/tax/discount/printing/charge/stock semantics are not proven by form fields. Full Edit image removal serialization and category '+' are candidate runtime gaps. | Qualify unsupported claims; separately route product/backend issues if owner requires changed behavior. Do not fix app to fit script. |
| G2-08 | HIGH | Party empty; Main Brand variation data absent; photo/recipe/mapped-printer examples not established. Aggregator multipart skips variations/addon_ids. | Data feasibility and allowed setup must be resolved; cannot simply seed via assumed UI save path. |
| G2-09 | MEDIUM | Original 3-pages-per-route guidance conflicts with 70 action-based FAQs using mostly `/menu`; historical 50-count captions are arbitrary. | Clarify limit applies to original reference-PDF selection, not a silent cap or expansion of video source coverage. Owner decision. |
| G2-10 | HIGH | Historical video plan writes to public/downloads, permits fallback masking, and lists only three human checkpoints; conflicts with CR-372 placement and all-70 external gate. | Not implementation-ready. Gate 3 must resolve publication/privacy and explicitly preserve all-70 validation before ANY storyboard/video. |

### Affected surfaces — remaining work only

- Potential future tooling changes: existing `frontend/scripts/screen-reference/runner.py`, `manifests/MM_menu.json`, relevant capture documentation; separate quality/evidence metadata as needed. No file/line edit plan approved here.
- Potential future content changes: FAQ scripts, mapping/inventory, controls/narration metadata, invalid images and missing action/result evidence. Annotated PDF optional, not a prerequisite for video review.
- Downstream consumers: per-module/reference PDFs, screenshot packs, external reviewer, LLM storyboard input, Hindi translation, TTS, highlight regions, video preview/download UI. All must reference one validated revision, never old fallback tables.
- **Will NOT touch in this step:** `frontend/src/**`, `.env`, dependencies, backend, public assets, manifests, original scripts/mappings, PNGs, existing PDFs/ZIPs, parent Gate 5A milestone.
- No app defect is fixed or closed here. No new external integration, scheduler, upload service or authentication work is authorized.

## 7. Owner decisions — LOCKED FOR PLANNING (2026-09-28)

**Owner verbatim:** “All recommended but use normal menu from palm house and aggregator menu from kunafa while switching menu u can use premium from palm house”. This accepts the seven plain-English recommendations with an explicit amendment to account/menu examples. The prior recommendation to set up Party examples is NOT selected.

**Gate boundary:** these are planning decisions, not implementation permissions. **Gate 3 still needs separate authorization**; record IDs, actions, safe restoration/cleanup and any mutation permissions remain to be specified in that plan and approved at Gate 4. No new captures or narration rewrites are performed by this decision update.

| ID | Status | Owner-approved direction | Boundary / remaining planning detail |
|---|---|---|---|
| OD-390-16 | LOCKED FOR PLANNING | Use clearly labelled, approved disposable test records for future changes; preserve original state where appropriate and agree cleanup/read-back. Do not alter operational records for demonstrations. | Selected accounts below are evidence sources, not blanket permission to mutate them. Exact records/actions and safe cleanup require the later plan and Gate 4 GO. Deletion only of disposable records; do not promise recovery of operational deletes. |
| OD-390-17 | LOCKED FOR PLANNING — OWNER AMENDMENT | Standard MM: **Palm House Normal**. Aggregator MM: **Kunafa Mahal Aggregator**. Switching/comparing menus: **Palm House Normal ↔ Premium**. Do not seed or use Party examples. | Retain 70 FAQ IDs; plan required title/step adaptations where original FAQs 01/02/16 name Party. Premium use is for switching/comparison, not general permission to create/edit Premium items. Standard creation/edit examples remain Normal unless separately approved. Original scripts remain unchanged now. |
| OD-390-18 | LOCKED FOR PLANNING | Correct tutorials to the current app: accurate location, labels, controls and behavior. Retain 70 FAQ IDs; adjust misleading titles/steps as needed. | Missing product features become separate intake items, not source changes to fit a tutorial. Includes category '+', image-removal uncertainty, auto-ticked add-ons and nonexistent recipe picker. No narration rewrite yet. |
| OD-390-19 | LOCKED FOR PLANNING | Explain actual UrbanPiper stock versus platform-listing flags, and catalog-all-brands versus UP-per-brand add-on actions. Use Kunafa Mahal Aggregator evidence. | Do not promise unsupported Swiggy-only/Zomato-only timed stock. Populated variation data/brand and permitted actions still need feasibility checks; do not manufacture a successful state. |
| OD-390-20 | LOCKED FOR PLANNING | Definite downstream claims need confirmed product/backend rules or approved evidence; otherwise qualify narration. | MM forms alone do not prove guest-menu, KDS, inventory, printing, billing or sync results. Any additional evidence scope must be agreed; no orders, printing, stock writes or platform pushes now. |
| OD-390-21 | LOCKED FOR PLANNING | Enough clean screenshots for all 70 FAQs, not a fixed 50-image cap. Genuine shared openings may be reused; unrelated/empty frames cannot substitute for actions/results. | Annotated reference PDF remains optional for video preparation; original nine-module PDF scope and frozen layout unchanged. Exact evidence list belongs to Gate 3. |
| OD-390-22 | LOCKED FOR PLANNING | Protect guest/account information, use test data, keep working packs in approved repo-only memory paths and out of public folders. | Privacy edits must not hide errors or falsify results. Public sharing requires separate approval/CR-372 compatibility. No new public output or secret copied to documentation. |

The original 70-row matrix above remains the **pre-correction assessment of the existing scripts**, including their Party references. Decisions do not repair that evidence or change its 34-blocked/36-partial classification; reclassification requires corrected assets and validation later.

## 8. Handoff / gate stop

1. **Completed:** owner accepted OD-390-16…22 for planning, with Palm House Normal/Premium and Kunafa Mahal Aggregator selection. Await a separate instruction to start Step 2; no further general decision approval is needed for these seven directions.
2. Only after owner authorizes **Step 2 / Gate 3**, prepare the permissions/data strategy, corrected-content scope, exact repair implementation plan and verification matrix. This report is not that plan.
3. Only after explicit **Gate 4 GO**, implementation may repair tooling and capture approved states; QA remains independent.
4. External validator checks every FAQ-01…70 against corrected clean assets and scripts; owner explicitly confirms all 70 green before ANY storyboard, translation/TTS/video generation.
5. EM remains after owner review of final MM videos. Other eight reference modules and optional video enhancements are not started here.

**No claim of delivery readiness. No new screenshots count, repair estimate or video schedule is promised before decisions/data feasibility.**