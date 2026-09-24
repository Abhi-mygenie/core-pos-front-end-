# SESSION HANDOVER — 2026-09-24 — GST / `gst_status` / menu-validation investigation — GATE CLOSED

**For:** the next agent who continues this topic with the owner
**Role you should boot into:** STEP -1 → read this file → owner will ask you to explain, then pick **PLANNING** (BUG-454) or **INTAKE follow-up** (CR-387 / BUG-455) depending on which answers have arrived. Do **not** re-investigate; the investigation gate is closed.
**Code changed in this session:** NONE (`frontend/src` untouched). **Branch:** `21implement` @ `a4c9196f`. **Registry:** 715 items.

---

## A. Plain-English brief (say this to the owner first)

We checked how GST works end to end in the POS — from the restaurant settings, through the menu, into an order, the tax calculation and the bill — and how the new backend on/off key fits in.

**What we found, in one breath:** the restaurant-level "GST on/off" switch already exists in the backend and the app already reads it — but the app only respects it in two places (the bulk menu editor and the collect-bill screen). It ignores it in the place that matters most — the order it sends to the server still carries GST when the switch is off. The single-item menu form ignores it too, and the Swiggy/Zomato menu rule ("always exactly 5 % GST") overrides both the switch and the owner's "packaged items are exempt" rule. There is no per-item GST-applicable flag and no packaging-GST field anywhere in the API. The settings wizard still saves the old-shaped key, not the new flat one.

**What we registered:** three items — one critical bug (order payload), one medium bug (form validation), one change request (align the menu rules with the switch) — plus five questions for the backend team and four decisions for the owner.

**What we did not do:** we did not toggle GST on a live restaurant to reproduce the payload bug (it is a tax setting on real data) and we changed no code.

## B. What the investigation covered (scope checklist — all DONE)
| Asked by owner | Covered in report section |
|---|---|
| GST configured at restaurant / item / applicable-yes-no level | §1 table (3 levels + room; item-level flag **does not exist**) |
| Exact new key, API, storage, FE consumption, item impact | §1 rows 1–3, §5 (`gst_status`: profile boolean ✅ consumed since CR-036-FU-03; settings flat int ❌ not consumed; storage = backend, BQ-387-01) |
| Flow Settings → Menu → API → Order → GST calc → Bill | §2 (break point = `orderTransform.js:723-734` / `calcOrderTotals`) |
| Menu upload / management validation for GST, item GST, packaging charge, packaging GST | §3 V1–V5 (packaging GST: **no key, no rule**) |
| Exact GST-vs-packaging conflict (rules, condition, FE/BE, files) | §4 X1–X4 (all FE: `BulkEditor.jsx:568-584`, `ProductForm.jsx:440-456`) |
| Can the new key align the logic (GST=No / GST=Yes / packaging) | §5 alignment proposal + OD-387-01..04 |
| Report sections: architecture · keys · rules · conflict · new-key impact · gaps · expected vs actual · pre-planning changes | §1 · §1 · §3 · §4 · §5 · §7 · §6 · §8 |
| Confirmed vs assumption separation | ✅/⚠️ legend + §9 |
| Register BUG/CR per control rules + handover | §7/§11 + this file |

## C. The registered items (what each one is, in one line)
| ID | Plain English | Priority | Where it sits | Blocked on |
|---|---|---|---|---|
| **BUG-454** | With GST switched OFF, the app still sends GST amounts inside the order to the server (only the on-screen bill hides them). | P0 CRITICAL (money; hotspot `orderTransform.js`) | INTAKE — Gate 1 | Nothing hard — OD-454-01 (also zero SC/delivery GST? recommend yes) then Gate 2. Full gate flow + E2E money regression mandatory. |
| **BUG-455** | The single-item Add/Edit form lets you save an item without tax even when GST is ON; the bulk editor refuses the same item. | P2 MEDIUM | INTAKE — Gate 1 | OD-455-01 (same packaged-item exemption as bulk editor? recommend yes). Sensible to plan together with CR-387. |
| **CR-387** | Make the menu rules obey the GST switch and stop the Aggregator "always 5 %" rule from overriding the packaged-item exemption; make the settings wizard read the new flat key; decide what to do about packaging GST. | P1 HIGH | INTAKE — Gate 1 | Backend BQ-387-01..05 + owner OD-387-01..04 |

## D. Open questions you must collect before planning CR-387 / BUG-455
**Backend (brief already filed: `backend_briefs/BACKEND_BRIEF_CR-387_2026-09-24.md`)**
- BQ-387-01 Are `basic.gst_status` and `basic.gst.status` the same stored value? Which is canonical? Will the object be removed?
- BQ-387-02 Can `gst_status` be the same type everywhere (profile sends `true`, settings sends `1`)? FE gate is strict `=== true`.
- BQ-387-03 What server-side validation exists on add/edit/import for tax vs `packed_food` / `pack_charges`? Exact rejection rules.
- BQ-387-04 Is a packaging-GST field planned (like `deliver_charge_gst`)?
- BQ-387-05 On place-order, does the server trust FE `tax_amount` / `gst_tax` or recompute? (decides how severe BUG-454 really is)

**Owner**
- OD-454-01 GST-OFF gate: zero GST-type item lines only, or also service-charge/delivery GST? (VAT always untouched)
- OD-455-01 Form uses the same packaged-item exemption as bulk editor? (rec. yes)
- OD-387-01 Aggregator **packaged** item: forced 5 %, any rate ≥ 0, or exempt? (rec. any rate, default 5 %)
- OD-387-02 GST OFF + Aggregator menu: save 0 %, keep 5 %, or block? (rec. 0 % + warning)
- OD-387-03 Excel import: FE pre-validation or backend errors only? (rec. backend errors until BQ-03)
- OD-387-04 Packaging GST out of scope until a backend key exists? (rec. yes)

## E. Suggested path forward (present as options, owner decides)
1. **Fast path for money:** owner answers OD-454-01 → PLANNING Gate 2/3 for BUG-454 alone (R5 hotspot `orderTransform.js` + R6 financial → file-level plan, regression checklist, owner Gate-4 GO, E2E money test incl. Walk-in R13). Plan must include a **validation step**: toggle GST OFF on a sandbox tenant, place an order, capture the POST payload before/after.
2. **Verify the new key write path (needed for CR-387 §4):** with owner approval, on a sandbox tenant run the owner's `update-settings` curl with `basic.gst_status: 0`, re-read profile + settings-list, then restore `1`. Save outputs to `evidence/CR-387/`. Do not run on owner1@thegoankitchen.com / owner@palmhouse.com without explicit OK.
3. **CR-387 + BUG-455** → Gate 2 once BQ-387-01/03 and OD-387-01/02 are in.

## F. Files to read (in this order)
1. `/app/memory/INV_GST_MENU_VALIDATION_INVESTIGATION_REPORT_2026_09_24.md` (final, gate closed — §0 summary, §11 closure record)
2. `/app/memory/change_requests/BUG-454_ORDER_PAYLOAD_GST_NOT_GATED_BY_GST_STATUS_INTAKE.md`
3. `/app/memory/change_requests/CR-387_ALIGN_MENU_GST_PACKAGING_VALIDATION_WITH_GST_STATUS_INTAKE.md`
4. `/app/memory/change_requests/BUG-455_PRODUCTFORM_MISSING_TAX_REQUIRED_RULE_INTAKE.md`
5. `/app/memory/backend_briefs/BACKEND_BRIEF_CR-387_2026-09-24.md`
6. Evidence: `/app/memory/evidence/INV-GST-KEY-2026-09-24/` (profile ×2, settings-list ×2, products sample — tokens masked)
7. Code anchors: `profileTransform.js:176-184` · `restaurantSettingsTransform.js:118-120, 218` · `BulkEditor.jsx:220, 553-586` · `ProductForm.jsx:240-241, 287, 433-460` · `orderTransform.js:723-734, 796+` · `CollectPaymentPanel.jsx:266-304`
8. History: CR-036-FU-03 (gst_status first consumed), BUG-391 (Aggregator 5 %), BUG-336/338 (display gating), BUG-326 (is_packaged_good), CR-158 (validate button), INV-GST-001 (Aug 2026 settings-gate audit)

## G. Facts vs assumptions (repeat to owner if asked "how sure are you")
- **Confirmed (code / live API):** every table row in §1–§4 and §6 of the report.
- **Assumed (needs backend):** both `gst_status` keys are one stored flag; server persists FE tax amounts as-is; server has no menu tax validation.
- **Not reproduced live:** BUG-454 (MEDIUM confidence) — reproduction requires a GST-OFF tenant.

## H. Other items from this same day (not part of this topic, do not mix)
BUG-408 re-validation (still BACKEND-BLOCKED) · P&L/Consumption double-offset (unregistered, 2 files) · caching GAP-C1/C2 (unregistered) — see `handover/SESSION_HANDOVER_2026_09_24_INV_BUG408_LAYOUT.md`.

## I. Environment
preprod boot for owner@palmhouse.com fails on the pod at "kitchen stations (BAR)" — browser QA blocked until backend recovers; curls work.
