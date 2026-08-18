# CR QA Consolidation & Clash-Risk Matrix

**Author:** QA Consolidation Agent
**Date:** 2026-05-03
**Branch:** `may4`
**Scope:** Consolidate QA state across all shipped / parked CRs & sub-CRs in `/app/memory/change_requests/`. **No code changes. No test agents executed. No branch switch.**
**Primary sources read:**
- `/app/memory/change_requests/SESSION_TRACKER.md`
- `/app/memory/change_requests/qa_handover/QA_HANDOVER_INDEX.md`
- `/app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md`
- `/app/memory/change_requests/qa_reports/QA_NEXT_AGENT_HANDOVER.md`
- `/app/memory/SESSION_HANDOVER_2026_05_03.md`
- `/app/memory/change_requests/qa_handover/CR_00{1,3,4}_QA_HANDOVER.md`
- `/app/memory/change_requests/qa_reports/CR_00{1,3,4}_QA_REPORT.md`
- `/app/memory/change_requests/qa_handover/CR_008_SUB_1_QA_HANDOVER.md`
- All `implementation_handover/CR_BUCKET_*.md` + `CR_004_BUCKET_*.md` docs
- `/app/memory/change_requests/CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md`
- `/app/memory/change_requests/BE_1_BACKEND_ASKS_CONSOLIDATED.md`, `BE_2_LODGING_PAYMENT_BREAKDOWN.md`
- `/app/memory/change_requests/CR_BUCKETS_A3_A4_PARKED_HANDOVER.md`
- `/app/memory/change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md`

---

## 1. Executive Summary

| Signal | Count |
|---|---|
| CRs / buckets currently in scope of this consolidation | **13** |
| Already formally QA-signed with a QA report | **3** (CR-001, CR-003, CR-004 — but CR-004 is `qa_failed`) |
| Fixes shipped AFTER the last QA report (silent re-test debt) | **1** (CR-004 filter-derivation fix absorbed into Bucket B / FE-1) |
| Shipped + owner-validated WITHOUT a formal QA report | **9** (CR-004 Phase 2 A/B/C, CR-008 Sub-CR #1, A0a, A0b, A1, A2, B1, B2-split, D1) |
| Items blocked on backend and MUST remain parked | **10 backend asks + 1 endpoint contract gap** (BE-1, BE-2, BE-T, BE-U, BE-V, BE-W, BE-W2, BE-A, BE-F + CR-008 Sub-CR #3 contract) |
| Missing documents reported in §9 | **0 critical** (all referenced docs exist) |

**Bottom line:** we have heavy silent QA debt. 9 buckets were shipped on owner-validation alone and never received a formal QA handover + QA report. The single formally-failed item (CR-004 Phase 1 status-filter) already has its fix shipped via CR-004 Phase 2 / Bucket B (FE-1) on 2026-04-29 but has never been re-validated. Before we accept or open new work we need: (a) a CR-004 re-validation pass, (b) a QA report for CR-008 Sub-CR #1, and (c) consolidated regression passes for A0a/A0b/A1/A2/B1/B2-split/D1/CR-004-P2-A/B/C. Everything backend-blocked stays parked.

### Ship-vs-QA delta (visual)

```
CR-001            [shipped ████] [QA pass ████]                 → ACCEPT
CR-003            [shipped ████] [QA pass ████]                 → ACCEPT
CR-004 Phase 1    [shipped ████] [QA FAIL ░░] fix shipped ????  → RE-VALIDATE (blocker)
CR-004 P2 A/B/C   [shipped ████] [QA ────────]                  → FORMAL QA NEEDED
CR-008 Sub-CR #1  [shipped ████] [QA handover yes / report ──]  → QA EXECUTION NEEDED
A0a / A0b         [shipped ████] [QA ────────]                  → FORMAL QA NEEDED
A1 / A2           [shipped ████] [QA ────────]                  → FORMAL QA NEEDED
B1 / B2-split     [shipped ████] [QA ────────]                  → FORMAL QA NEEDED
D1 (CR-008 #4 A)  [shipped ████] [QA ────────]                  → FORMAL QA NEEDED
```

---

## 2. QA Priority Order (execute top → bottom)

| # | Item | Why it's at this position | Pre-requisite |
|---|---|---|---|
| **P0** | **CR-004 Phase 1 + Phase 2 Bucket B (FE-1) re-validation** | Last formal QA report verdict is `qa_failed`. Product-owner-confirmed rule (`fOrderStatus===6 ⇔ Paid`) was the fix; the fix is already live via Bucket B but no re-test exists. Until this closes, CR-004 Phase 1 cannot be accepted and the "Paid/Unpaid pill" regression surface blocks all downstream room-report work. | None — room-report code + `reportService.js` already shipped on `may4`. |
| **P1** | **CR-008 Sub-CR #1 (D1-Cap R1 + R2 + D1-Gate)** QA execution | QA handover exists (`CR_008_SUB_1_QA_HANDOVER.md`) but **no QA report**. This touches the entire delivery / Collect-Bill / totals / override-gate pipeline — highest runtime blast radius. | `owner@palmhouse.com` / `Qplazm@10` on preprod (per handover). |
| **P2** | **CR-004 Phase 2 Buckets A / B / C** formal QA (Paid column, SummaryBar Paid stat, Rent→Total relabel, filter-pill data source, Remove-from-Room) | Shipped 2026-04-29 on Mantri preprod, owner-smoked, **no QA handover/report**. Rule-2 approximation (`outstanding=0` when `fOrderStatus===6`) needs explicit validation on mid-stay rooms. | P0 must be closed first — Bucket B is the same code path. |
| **P3** | **CR-006 Phase A (A1) + Phase B (B1)** variation modal regression pass | A1 owner-validated against `Ocean Blue (V)` only; B1 owner-validated same-day. No formal QA report. Variation / add-on modal is used on every cart add — high blast radius for add-on correctness, totals, KOT. | None. |
| **P4** | **CR-005 #1 / B2-split** Audit Report PG columns + scroll-architecture fix | Shipped 2026-05-02, visually verified, no QA report. Touches `OrderTable.jsx` column config — same file as CR-001 + CR-003 actions. | None. |
| **P5** | **CR-007 / A2** Order ID chip + Print Bill button | Shipped 2026-05-02, owner-approved, no QA report. Touches `OrderCard.jsx`, `OrderEntry.jsx`, `RePrintButton.jsx`. Also silently folded in BUG-PREPAID-MERGE-SHIFT (Merge / Table-Shift hidden for prepaid). | None. |
| **P6** | **CR-008 #4 Phase A / D1** Stay-on-Order-Entry toggle | Shipped 2026-05-03, owner-approved, no QA report. Narrow UX scope but post-Collect-Bill routing affects every cashier flow. | P1 recommended first (same OrderEntry / Collect-Bill surface). |
| **P7** | **A0a** UI-COD-MASK | Shipped, lint + webpack + local smoke pass, preprod manual QA pending — no creds used yet. | None. |
| **P8** | **A0b** ROLE-NAME-WIRE-FIX | Shipped, 6/6 unit tests pass, preprod manual QA pending. Low-level name-wire — low user-visible blast radius but touches multiple role consumers. | None. |
| **P9** | CR-001 + CR-003 **final acceptance** (paperwork only) | Already `qa_passed_with_deferred_backend_dependency`. Waiting on audit agent sign-off per `QA_NEXT_AGENT_HANDOVER.md`. | Nothing. |

**Do NOT begin P2 before P0 closes.** CR-004 Phase 2 Bucket B IS the P0 fix — re-validating Phase 1 is effectively validating Bucket B in situ.

---

## 3. Full QA Status Table

> **Legend — Risk:** 🟥 High (customer-facing or money path) · 🟧 Med · 🟩 Low
> **Legend — QA status:**
> - `pass` — formal QA report says passed (possibly with deferred backend items).
> - `fail` — formal QA report says failed.
> - `owner-only` — owner said OK on preprod; no formal QA report or handover.
> - `owner + handover, no report` — QA handover prepared, but no QA report yet.
> - `re-validate` — earlier QA run is stale vs current code.

| # | CR / Bucket | Parent CR | What shipped | Impl. status | QA handover? | QA report? | Current QA status | Backend dep | Recommended next QA action | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **CR-001** (P1 + P2) | CR-001 | Status derivation rewrite + filter restructure + room exclusion + Audit tab semantics + tab/column overhaul | `implemented_user_validated` | ✅ `qa_handover/CR_001_QA_HANDOVER.md` | ✅ `qa_reports/CR_001_QA_REPORT.md` | **pass** (with deferred BE P1–P6, G1) | BE-1 P1–P6 + G1 (display-only, FE wired) | Final acceptance paperwork only. | 🟧 |
| 2 | **CR-003** | CR-003 | Hold → Collect Bill drawer; Paid → Change Method; Paid → Mark Unpaid (3 row-level actions + permission gating + mutation window + optimistic state) | `implemented_user_validated` | ✅ `qa_handover/CR_003_QA_HANDOVER.md` | ✅ `qa_reports/CR_003_QA_REPORT.md` | **pass** (with deferred BE socket emission) | Backend socket on `make-order-unpaid` (fallback = FE refetch) | Final acceptance paperwork only. | 🟥 |
| 3 | **CR-004 Phase 1 (4.1–4.5)** | CR-004 | New `/reports/rooms` read-only PMS view, RM grouping, lazy detail, summary bar, `In-house`/`All` pills (Phase 1 wording) | `implemented_user_validated_partial_parked` | ✅ `qa_handover/CR_004_QA_HANDOVER.md` | ✅ `qa_reports/CR_004_QA_REPORT.md` | **fail** (status-filter derivation bug) — fix landed in Phase 2 Bucket B, NEVER re-validated | BE-1 G2 (in-house only), G3 (child payment_status refresh), OPT (collapse 3 calls) | **P0 re-validate.** Confirm `Paid ⇔ fOrderStatus===6`, `Unpaid ⇔ fOrderStatus!==6`, no `balancePayment` dependency; pills operate on day-list (no wait-for-detail). | 🟥 |
| 4 | **CR-004 Phase 2 Bucket A** (PR-1 Paid col + SummaryBar Paid stat; PR-3 Rent→Total relabel) | CR-004 Phase 2 | `RoomRowCard.jsx`, `RoomOrdersReportPage.jsx` | Shipped 2026-04-29, Mantri preprod | ❌ | ❌ | **owner-only** | Rule-2 approximation until BE-2 ships | **P2.** Verify Paid column matches settled rooms; SummaryBar Paid = Σ(Total of rooms with `fOrderStatus===6`); Rent→Total label on expanded card. | 🟧 |
| 5 | **CR-004 Phase 2 Bucket B (FE-1)** filter-pill-driven data source (`getRoomsForReport`) | CR-004 Phase 2 | `roomListTransform.js` (NEW), `reportService.js`, `DatePicker.jsx`, `RoomOrdersReportPage.jsx` | Shipped 2026-04-29, Mantri preprod — **contains the CR-004 Phase 1 fix** | ❌ | ❌ | **owner-only + silent fix of prior `qa_failed`** | BE-1 G2 in-house filter (already shipped), `order_id` (already shipped) | **Part of P0.** Pills hit day-list directly (no `detailCacheRef` dependency). `All` / `Paid` / `Unpaid` final labels. | 🟥 |
| 6 | **CR-004 Phase 2 Bucket C (PR-2)** Remove from Room | CR-004 Phase 2 | `MarkUnpaidConfirmDialog.jsx` (parameterised), `RoomOrdersReportPage.jsx`, `RoomRowCard.jsx`; reuses `makeOrderUnpaid`, `order_unpaid` permission, 2-day mutation window | Shipped 2026-04-29, Mantri preprod | ❌ | ❌ | **owner-only** | BE-1 G3 (child payment_status refresh) | **P2.** Click-through on real SRM; validate optimistic-removed Set clears within 1.5 s; confirm pill-flicker sharp edge on slow first expand (documented). | 🟥 |
| 7 | **CR-008 Sub-CR #1** · D1-Cap R1 (UI capture) + D1-Cap R2 (totals fold) + D1-Gate (override-rule flip) | CR-008 #1 | `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `AddressFormModal.jsx`, `OrderEntry.jsx`, `orderTransform.js` | `SHIPPED 2026-05-03`, owner-approved end-to-end on preprod | ✅ `qa_handover/CR_008_SUB_1_QA_HANDOVER.md` | ❌ | **owner + handover, no report** | None for Phase A/B. (BE-A distance-based fee is a separate parked feature.) | **P1.** 3-round regression: (a) UI capture inside New Address + inline in right-panel cart; (b) `order_amount` / `tax_amount` / `round_up` correctness on dashboard tiles, audit reports, bill prints; (c) override gate — readOnly only for prepaid, editable for non-prepaid with value > 0. | 🟥 |
| 8 | **Bucket A0a** UI-COD-MASK (standalone) | standalone | COD-mask UI tweak; NO backend change | Shipped, lint clean + webpack compile + local smoke pass. Preprod manual QA pending per handover. | ❌ | ❌ | **owner-only (local-only)** | None | **P7.** Preprod manual smoke. | 🟩 |
| 9 | **Bucket A0b** ROLE-NAME-WIRE-FIX (standalone) | standalone | 6 files, role-name wire-in; 6/6 unit tests pass; webpack compile back to pre-A0b baseline | Shipped. Preprod manual QA pending per handover. | ❌ | ❌ | **owner-only (local-only)** | None | **P8.** Preprod manual smoke across all role-surfaces (sidebar, reports columns, OrderDetailSheet, dispatch, audit). | 🟧 |
| 10 | **Bucket A1** (CR-006 Phase A — Optional Variation Fix) | CR-006 | `ItemCustomizationModal.jsx` — render optional variations; guard "required" rule | Shipped, lint clean, manually validated against `Ocean Blue (V)` (palmhouse) ONLY | ❌ | ❌ | **owner-only (one tenant)** | None | **P3.** Regression across restaurants that use multiple optional groups; edge cases: skip entire group, min=0 / max=1, legacy items without groups. | 🟧 |
| 11 | **Bucket A2** (CR-007) Order ID chip + Print Bill | CR-007 | `OrderCard.jsx`, `OrderEntry.jsx`, `RePrintButton.jsx` | SHIPPED 2026-05-02 | ❌ | ❌ | **owner-only** | None | **P5.** Chip visible on all dashboard card states (running/paid/hold/cancelled/merged); mid-panel header chip + Print Bill visible in OrderEntry; folded BUG-PREPAID-MERGE-SHIFT hides Merge/Table-Shift on prepaid. | 🟧 |
| 12 | **Bucket B1** (CR-006 Phase B — Multi-select variations) | CR-006 | `ItemCustomizationModal.jsx` (state shape + checkmark-pill render + `min`/`max` enforcement), `orderTransform.js` (outbound) | SHIPPED 2026-05-03, owner-approved end-to-end on preprod | ❌ | ❌ | **owner-only** | None (uses already-shipped `type`, `min`, `max`) | **P3.** Enforce `min`/`max`; multi-select payload round-trips through KOT + bill; CR-012 label mismatch (menu-config) documented and tolerated. | 🟧 |
| 13 | **Bucket B2-split** (CR-005 #1) Audit Report PG columns + scroll fix | CR-005 #1 | `OrderTable.jsx`, `reportService.js`, `AllOrdersReportPage.jsx` | SHIPPED 2026-05-02 | ❌ | ❌ | **owner-only (visual)** | BE-W2 `snapshot_razorpay_status` (Phase 2 of B2 auto-reveal — still parked) | **P4.** PG Order Id + PG Amount columns appear under PG filter only; scroll-architecture fix survives with 11→14 visible columns; sort + CSV export alignment. | 🟧 |
| 14 | **Bucket D1** CR-008 #4 Phase A — Stay on Order Entry After Collect Bill | CR-008 #4 | NEW `utils/orderEntryPrefs.js`, `StatusConfigPage.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx` | SHIPPED 2026-05-03, owner-approved | ❌ | ❌ (only `CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md`) | **owner-only** | BE-F `default_landing_screen` setting key (Phase B — still parked; Phase A uses localStorage) | **P6.** Toggle persistence (`mygenie_stay_on_order_after_bill`); OFF path unchanged (verbatim redirect-to-dashboard); ON path stays on OrderEntry, walk-in mode, empty cart, CollectPaymentPanel CLOSED; KOT print fires before stay-on-order when `autoBill` ON. | 🟧 |

---

## 4. Clash-Risk Matrix

Thirteen shipped items touch a few high-gravity code surfaces. Any single file in the "files" column is modified by 2 or more of the items above. All of these must be treated as regression-critical during QA passes P0–P9.

| # | Shared surface | Files | Overlapping CRs / buckets | Why it may clash | QA must regression-test? | Block future impl. until QA passes? |
|---|---|---|---|---|---|---|
| 1 | **Reports filter bar + filter pills** | `components/reports/FilterBar.jsx`, `components/reports/FilterTags.jsx`, `pages/AllOrdersReportPage.jsx`, `pages/RoomOrdersReportPage.jsx` | CR-001 (tabs, PG 2-checkbox, Channel/Platform), CR-003 (action-column gating uses tab + eligibility), CR-004 Phase 1 (`In-house`/`All`), CR-004 Phase 2 Bucket B (`All`/`Paid`/`Unpaid` on rooms), CR-005 #1 / B2-split (PG columns tied to PG filter visibility) | All of these touch the filter→tab→column contract. Changing filter semantics in one page silently changes another. | **Yes** — run CR-001 tab matrix, CR-004 pill matrix, and B2-split PG-toggle matrix end-to-end during P0. | **Yes** — no new Audit or Room-report filter work until P0 + P4 close. |
| 2 | **Audit Report column config + renderers** | `components/reports/OrderTable.jsx`, `components/reports/ExportButtons.jsx` | CR-001 (8-col base + missing-row placeholder), CR-003 (`renderActionsCell` + eligibility predicates), CR-005 #1 / B2-split (PG Order Id + PG Amount + scroll), Bucket A3 (ACTION TIME + TIME DIFF — PARKED), CR-005 #4/#5 (lifecycle + name fields — PARKED) | Line-number anchors drift across rounds. CR-005 #1 / B2-split explicitly warned that B2 ahead of A3 shifts A3 anchors. Also CSV summary-row alignment is already off by 1 cell (legacy `Payment Type` column) — QA should capture state today so next column addition does not worsen it. | **Yes** — 11-col baseline + 14-col (PG filter ON) visible-column audit + CSV column-count audit during P4. | **Yes** — park A3/A4 re-implementation until P4 closes and column map is re-asserted. |
| 3 | **Audit status derivation / tab routing** | `api/services/reportService.js::getOrderLogsReport`, `api/transforms/reportTransform.js` | CR-001 (Phase 1 rewrite), CR-004 Phase 2 Bucket D-1 (FE-3 SRM badge narrowing via `getActiveSrmIds()`), CR-005 #5 (name-fields via reportTransform — parked), BE-1 G1 withdrawal (transferToRoom badge rule moved to FE-3) | SRM-badge derivation + status routing share the same pipeline. If one is re-tuned without touching the other, audit Paid tab can regress. | **Yes** — SRM-settled-room → Audit Paid tab smoke is mandatory. | **Yes** — no reportService status-derivation edits until P0 + P4 close. |
| 4 | **Order lifecycle fields** (`payment_status`, `f_order_status`, `payment_method`) | `api/transforms/orderTransform.js:190` (`payment_status \|\| 'unpaid'`), `api/transforms/reportTransform.js:549` (paid-timestamp) | CR-001, CR-003 (Mark Unpaid), CR-004 Phase 2 Rule-2 (`fOrderStatus===6` only in room scope), CR-008 #1 (delivery-charge capture wraps into totals), OrderDetailSheet | `orderTransform.fromAPI.order` default `'unpaid'` is a sharp edge — any new consumer that reads `paymentStatus` on a settled order gets wrong value when API field is `null`. Rule-2 is intentionally room-scoped and NOT generalised — regression if a new caller assumes Rule-2 everywhere. | **Yes** — during P0 + P2 confirm settled SRMs stay consistent; during P1 confirm CR-008 #1 totals math. | **Yes** — do NOT generalise Rule-2 across Audit / OrderDetailSheet / reportTransform timeline until P0 + P1 close. |
| 5 | **OrderEntry** | `components/order-entry/OrderEntry.jsx`, `components/order-entry/CartPanel.jsx`, `components/order-entry/ItemCustomizationModal.jsx`, `components/order-entry/CollectPaymentPanel.jsx`, `components/order-entry/AddressFormModal.jsx`, `components/order-entry/RePrintButton.jsx` | CR-006 A (A1 optional) + B (B1 multi-select), CR-007 (A2 Order ID chip + Print Bill), CR-008 #1 (D1-Cap R1/R2), CR-008 #4 (D1 Stay-on-Order-Entry) | OrderEntry and its children are now rewritten by 4 different buckets. Each one believes its own test pack. | **Yes** — OrderEntry smoke must run under all combinations: D1 toggle ON/OFF × delivery order × variation-item with multi-select × prepaid. | **Yes** — no OrderEntry edits (incl. CR-008 Sub-CR #2 / #3 / #4 Phase B) until P1 + P3 + P5 + P6 close. |
| 6 | **Collect Bill path** | `components/order-entry/CollectPaymentPanel.jsx`, `components/reports/CollectBillPanelDrawer.jsx`, `api/services/paymentMutationService.js`, `orderTransform.toAPI.collectBillExisting`, `BILL_PAYMENT` endpoint | CR-003 (Hold → Collect Bill drawer reuses CollectPaymentPanel), CR-008 #1 (D1-Cap R2 folds delivery into order_amount / tax / round_up), CR-008 #1 D1-Gate (override-rule flip), CR-008 #4 (post-collect navigation) | Reuse pattern: the same `CollectPaymentPanel` is mounted in two places (dashboard vs. drawer). Delivery-charge fold + override gate changes behaviour for BOTH entry points. | **Yes** — both CR-003 entry (Hold tab drawer) AND CR-008 entry (in-POS order) must be QA'd on the same day. | **Yes** — no CollectPaymentPanel / CollectBillPanelDrawer edits until P1 + P6 close. |
| 7 | **Default landing / post-action routing** | `pages/DashboardPage.jsx`, `pages/OrderEntry.jsx`, `pages/StatusConfigPage.jsx`, `utils/orderEntryPrefs.js` (NEW), permissions | CR-008 #4 Phase A (D1 — shipped), CR-008 #4 Phase B (parked), CR-008 #1 D1-Cap + D1-Gate (may interact with post-collect navigation) | D1 deliberately narrowed scope to Collect-Bill / Place+Pay routing. Any future sub-CR adding Post-login / Post-Cancel / Post-Merge routing can silently subvert D1 behaviour. | **Yes** — P1 + P6 must be tested back-to-back. Confirm D1 ON + CR-008 #1 D1-Gate correction flow still lands cashier on walk-in OrderEntry. | **Yes** — no post-action redirect work (CR-008 #4 Phase B or CR-008 #3 navigation) until P1 + P6 close and BE-F confirmed. |
| 8 | **Payment method / PG status (payment lifecycle)** | `components/reports/PaymentMethodPicker.jsx`, `services/paymentMutationService.js`, `reportService.js` PG derivation + 2-checkbox filter, `AllOrdersReportPage.jsx` Paid tab | CR-003 (Change Method), CR-001 (PG filter / plumbing), CR-005 #1 / B2-split (PG Order Id + PG Amount), CR-011 (CLOSED — case mismatch), BE-W2 `snapshot_razorpay_status` (PARKED) | PG visibility rules are fragile. Auto-reveal of PG Status column (parked) depends on existing PG pipeline staying unchanged. | **Yes** — during P0 verify PG toggle + PG columns still render correctly after CR-003/CR-008 activity. | **Yes** — no PG-column auto-reveal work until BE-W2 lands AND P4 closes. |
| 9 | **Role / name attribution** | `api/transforms/reportTransform.js`, OrderDetailSheet action-log, `ROLE-NAME-WIRE` (A0b), cancel/ready/served by-name (Bucket B3 — PARKED) | A0b (shipped), B3 (parked), CR-005 #5 (parked), BE-V (parked) | A0b fix covers only the current 6 consumers. Adding a new name consumer without re-running the A0b test pack is a regression risk. | **Yes** — during P8 enumerate every name-surface touched by A0b and confirm none regressed. | **Yes** — no B3 / CR-005 #5 implementation until BE-V ships. |
| 10 | **Room reports math (Rule 1 / Rule 2)** | `RoomRowCard.jsx`, `RoomOrdersReportPage.jsx`, `roomListTransform.js` (NEW) | CR-004 Phase 1, CR-004 Phase 2 A/B/C, BE-1 G1 (withdrawn), BE-1 G3 (parked), BE-2 (parked) | Rule-2 is a room-scoped approximation; outstanding = 0 on `fOrderStatus===6`, residual `balance_payment` treated as discount. Brittle if BE-2 ships before re-validation. | **Yes** — P0 + P2 explicitly assert Rule 1 + Rule 2 on mid-stay rooms with advance deposit, cross-day consumption, and lodging-only settled rooms. | **Yes** — no BE-2 consumer (lodging_collected / discount_amount / payment_breakdown) wiring until BE-2 ships AND P0 + P2 close. |
| 11 | **Backend-dependent display fields (P1–P6)** | `reportService.js`, `reportTransform.js`, `OrderTable.jsx` | BE-1 (parked), CR-001, CR-005 #5 (parked), Bucket B3/B4 (parked) | Frontend already wires fallback UI (`—`, `Employee #<id>`). When any of P1–P6 lands, FE must switch silently — easy to regress. | **Yes** — once BE delivers, QA must verify "before/after" for each field. | **Yes** — no implementation-side changes to these fields until BE contract posted. |
| 12 | **Diagnostic logging retained in codebase** | `[CR-001 DIAG]`, `[CR-001 P2 DIAG]`, `[CR-001 G5 DIAG]`, `[CR-004 P2 DIAG] /get-room-list response`, `[CR-003 DIAGNOSTIC]` | CR-001, CR-003, CR-004 Phase 2 | Intentionally retained per owner. Three of them will be removed once BE P1–P6 land. Silent removal without QA notice could mask new bugs. | **Low** — confirm diagnostics still render during P0–P4. Removal is a separate ticket. | No — removal is gated on backend delivery, not QA. |

### Clash aggregate → new work that MUST be blocked

| Blocked new work | Blocked because of clashes | Unblock condition |
|---|---|---|
| CR-002 planning / implementation | Duplicates CR-001 status-derivation; overlap with Clash #1, #3 | P0 + P4 close; product owner re-asserts scope of CR-002 vs CR-001 |
| Bucket A3 (CR-008 #2 Action Time + Time Diff) | Column-config drift (Clash #2) + backend BE-T not shipped | BE-T landed AND P4 closed |
| Bucket A4 (CR-005 Phase A web-order attribution) | Name-fields overlap (Clash #9) + backend BE-U not confirmed | BE-U confirmed AND P8 closed |
| Bucket B3 (CR-005 #5 drop `Employee #<id>`) | Name-fields overlap (Clash #9) + BE-V not shipped | BE-V landed AND P8 closed |
| Bucket B4 (CR-005 #4 item-level Order Taken) | Lifecycle overlap (Clash #4) + BE-W not shipped | BE-W landed AND P0 + P4 closed |
| B2 Phase 2 (PG Status auto-reveal column) | Column overlap (Clash #2, #8) + BE-W2 not shipped | BE-W2 landed AND P4 closed |
| CR-008 Sub-CR #2 (Action time) | = Bucket A3 | See A3 |
| CR-008 Sub-CR #3 (Dispatch / Assign) | Missing endpoint contract (see §5) | Backend delivers Q-R1..Q-R5 contract |
| CR-008 Sub-CR #4 Phase B (navigation + post-login landing) | Routing overlap (Clash #7) + BE-F not shipped | BE-F landed AND P1 + P6 closed |
| CR-009 (Operations Audit Timeline) | Lifecycle overlap (Clash #4) + Clash #2 | BE-3 / BE-4 / BE-9 landed AND CR-005 Phase A + P4 closed |
| CR-010 (Roles & Permissions Consolidation) | Role overlap (Clash #9) | Current sprint closes AND P8 closed |
| CR-013 (GST config correction) | Order lifecycle / totals overlap (Clash #4, #6) | Independent ticket, can move after P1 closes |

---

## 5. Parked / Backend-Blocked List (DO NOT implement frontend until backend contract lands)

| Backend ask | Owned by | Owner CR(s) | What it unblocks | Status | FE pre-wiring? |
|---|---|---|---|---|---|
| **BE-1 P1** — `waiter_name` on `/order-logs-report` | Backend | CR-001, CR-004 | PUNCHED BY name cell — replace `Employee #<id>` fallback | `pending_backend_review_and_scheduling` | **Yes** — 1-line resolver flip once shipped. |
| **BE-1 P2** — `*_by_id` + `*_by_name` (actioned-by) | Backend | CR-001 | ACTIONED BY name cell | pending | Yes — 1-line flip. |
| **BE-1 P3** — `cancel_reason` on RM/SRM rows | Backend | CR-001 | Cancelled-tab Reason column | pending | Yes — 1-line flip. |
| **BE-1 P4** — `cancel_type` | Backend | CR-001 | Cancellation Status column | pending | Yes — col scoped, not yet rendered. |
| **BE-1 P5** — consistent `table_no` | Backend | CR-001 | TABLE NO cell | pending | Yes — fallback already wired. |
| **BE-1 P6** — `room_info` on `/order-logs-report` RM rows | Backend | CR-001, CR-004 Phase 2 cross-day | Drops 1+N detail-fetch in `/reports/rooms` | pending | Yes — call site ready to collapse. |
| **BE-1 G1** (withdrawn) — `is_room_settled` / `room_settled_at` on `transferToRoom` rows | Backend | CR-001 | Drops `getActiveSrmIds()` workaround (~5 LOC cleanup) | eligible for un-withdraw | Yes — cleanup-only patch. |
| **BE-1 G2** — in-house room filter on `/get-room-list` | Backend | CR-004 | Drops defensive checked-out client filter | ✅ shipped (per SESSION_TRACKER §3) | Already consumed by Bucket B (FE-1). |
| **BE-1 G3** — child `payment_method` / `payment_status` / `f_order_status` refresh on `/get-single-order-new(RM)` | Backend | CR-003, CR-004 Phase 2 (Bucket C, D-1) | Narrows Bucket D-1 SRM set; drops optimistic-removal Set in Bucket C | partial — children still return `null` after SRM mutation | No — FE fallback in place. |
| **BE-1 `order_id` (was OPT)** on `/get-room-list` | Backend | CR-004 | Bucket B FE-1 data source | ✅ shipped | Already consumed. |
| **BE-2** — `lodging_collected`, `discount_amount`, `discount_reason`, `payment_breakdown[]` on `/get-single-order-new` RM-parent | Backend | CR-004 Phase 2 follow-up | Replaces Rule-2 approximation; adds Discount column; SummaryBar Paid becomes money-in-till | `OPEN — P1` | No — FE uses Rule-2 approximation. **Do NOT wire until BE-2 ships.** |
| **BE-T** (CR-008 #2) — dedicated terminal-action timestamps (`merged_at` / `transferred_at` / `credited_at`) OR single `action_at` | Backend | CR-008 #2 / Bucket A3 | Action Time + Time Diff columns | pending | Parked. **Do NOT partial-ship with `updated_at` fallback** — owner rejected. |
| **BE-U** (CR-005 Phase A) — verify `is_auto_confirmed` + `order_from` populated on preprod | Backend | CR-005 Phase A / Bucket A4 | PUNCHED BY = `Customer`, ACTIONED BY = `Auto` for web orders | pending | Parked. |
| **BE-V** (CR-005 #5) — item-level `cancel_by_name` | Backend | CR-005 #5 / Bucket B3 | Drop `Employee #<id>` synthesis on item cancels | pending (owner confirmed NOT yet shipped 2026-05-02) | Parked. |
| **BE-W** (CR-005 #4) — `order_serve_at` / `kot_at` / per-item paid-stage fields (BE-3 / BE-4 / BE-9) | Backend | CR-005 #4 / Bucket B4 | Item-level "Order Taken" stage + order-level timeline | not live per owner (2026-05-02) | Parked. |
| **BE-W2** (CR-005 #1 Phase 2) — `snapshot_razorpay_status` on PG rows | Backend | CR-005 #1 Phase 2 | PG Status auto-revealing column | pending | Yes — column already wired with auto-reveal guard (zero FE edit at unblock). |
| **BE-A** (CR-008 #1) — delivery-fee formula + restaurant origin coords | Backend | CR-008 #1 follow-up | Distance-based fee compute | pending | No — current D1-Cap uses explicit cashier entry. |
| **BE-F** (CR-008 #4 Phase B) — `default_landing_screen` setting key | Backend | CR-008 #4 Phase B | Persistence of landing-screen preference beyond stay-on-order-entry | pending | Partial — D1 Phase A uses localStorage stub; Phase B parked. |
| **CR-008 Sub-CR #3 endpoint contract** (Q-R1..Q-R5) — dispatch / assign rider endpoints | Backend | CR-008 Sub-CR #3 | Entire delivery dispatch flow | **missing — zero endpoints exist in codebase** | None. Implementation agent MUST NOT draft any FE for this until contract posted. |

**Hard rule for the implementation agent:** do NOT start any of the parked items above as "speculative implementation against an expected backend contract". All items require either an explicit "shipped on preprod" confirmation in SESSION_TRACKER §3 OR a dated backend contract doc.

---

## 6. What Can Go To QA, What Can Be Accepted, What Must Remain Parked, What Must Not Be Implemented Yet

### 6.1 Accept now (audit-agent paperwork only)
- **CR-001** — QA passed with deferred backend; follow `QA_NEXT_AGENT_HANDOVER.md` Part B.
- **CR-003** — QA passed with deferred backend; follow same Part B.

### 6.2 Send to QA immediately (in the P-order of §2)
1. **P0 — CR-004 Phase 1 + Phase 2 Bucket B (FE-1)** — re-validate on Mantri + 18march. Expected outcome: flip CR-004 report from `qa_failed` → `qa_passed_with_deferred_backend_dependency`.
2. **P1 — CR-008 Sub-CR #1** — execute on Palm House (`owner@palmhouse.com`), produce `qa_reports/CR_008_SUB_1_QA_REPORT.md`.
3. **P2 — CR-004 Phase 2 Buckets A, B, C** — bundled. Bucket B is already in P0; A + C extend the pack with Paid column, SummaryBar Paid stat, Rent→Total relabel, Remove-from-Room.
4. **P3 — CR-006 A1 + B1** (bundled). Produce a single CR-006 QA report.
5. **P4 — CR-005 #1 / B2-split** — Audit Report PG columns.
6. **P5 — CR-007 / A2** — Order ID chip + Print Bill + BUG-PREPAID-MERGE-SHIFT fold.
7. **P6 — CR-008 #4 Phase A / D1** — Stay-on-Order-Entry toggle.
8. **P7 — A0a** — UI-COD-MASK preprod smoke.
9. **P8 — A0b** — ROLE-NAME-WIRE-FIX preprod smoke.

### 6.3 Must remain parked (backend-blocked) — do NOT implement frontend
- BE-1 P1–P6 + G1 (display-only; FE fallback in place)
- BE-2 (lodging payment breakdown)
- BE-T (Action Time + Time Diff — Bucket A3 / CR-008 Sub-CR #2)
- BE-U (web-order attribution — Bucket A4 / CR-005 Phase A)
- BE-V (item-level `cancel_by_name` — Bucket B3 / CR-005 #5)
- BE-W (item-level paid-stage + order timestamps — Bucket B4 / CR-005 #4)
- BE-W2 (`snapshot_razorpay_status` — B2 Phase 2 auto-reveal)
- BE-A (delivery-fee formula — CR-008 #1 follow-up)
- BE-F (default_landing_screen — CR-008 #4 Phase B)
- CR-008 Sub-CR #3 (dispatch / assign endpoint contract)

### 6.4 Must not be implemented yet (blocked by clash risk)
- **CR-002** — until P0 + P4 close and the owner re-asserts scope vs. CR-001.
- **Any new Audit Report column** — until P4 closes (column-config drift risk).
- **Rule-2 generalisation across OrderDetailSheet / reportTransform timeline** — until P0 + P1 close.
- **Post-login landing / Post-Cancel / Post-Merge routing** — until P1 + P6 close AND BE-F ships.
- **CR-009** — until CR-005 + P4 close.
- **CR-010** — until current sprint closes AND P8 closes.
- **CR-013** — may proceed after P1 closes (no clash beyond GST math); not a blocker.

### 6.5 Explicitly closed
- **CR-011** — not reproduced; keep closed. If recurs, capture trace at `f_order_status: 5` with `payment_type` case.
- **CR-012** — menu-config data ticket. Code already honours `max=N` at runtime. Not a code change.

---

## 7. Recommended Next Agents

| Order | Agent | Scope | Inputs |
|---|---|---|---|
| 1 | **Change Request QA Validation Agent** | Execute P0 → P8 in §2. Produce one `qa_reports/<BUCKET>_QA_REPORT.md` per bucket. For CR-004, overwrite the existing failed report with a re-validation addendum. | Credentials: `owner@18march.com` / `Qplazm@10`, `owner@mantri.com` / `Qplazm#10`, `owner@palmhouse.com` / `Qplazm@10`. Reference pack: §3 table + §4 clash matrix. |
| 2 | **Audit / Final Acceptance Agent** | Accept CR-001 + CR-003 now. Accept CR-004 Phase 4.1–4.5 once P0 closes green. Accept others per QA report. | `QA_NEXT_AGENT_HANDOVER.md` Part B. |
| 3 | **Backend Contract Agent** | Drive BE-1 (P1–P6 + G1 un-withdrawal), BE-2, BE-T, BE-U, BE-V, BE-W, BE-W2, BE-A, BE-F, and CR-008 Sub-CR #3 endpoint contract to scheduling. | §5 table. |
| 4 | **Documentation Update Agent** *(optional, only after P0 closes)* | Reconcile `CR_004_QA_HANDOVER.md` wording with shipped UI per `QA_NEXT_AGENT_HANDOVER.md` Part C. | §5 of `QA_NEXT_AGENT_HANDOVER.md`. |
| 5 | **Implementation Agent** | DO NOTHING on the items in §6.3 + §6.4. If P-order closes cleanly, next implementation target is CR-013 (GST config) — independent of all blockers. | §6.4. |

---

## 8. Clear Decision

| Verdict | Items |
|---|---|
| **Can go to QA now** | CR-004 Phase 1 re-validation + Phase 2 A/B/C (bundled, P0 + P2); CR-008 Sub-CR #1 (P1); CR-006 A1 + B1 bundle (P3); CR-005 #1 / B2-split (P4); CR-007 / A2 (P5); CR-008 #4 / D1 (P6); A0a (P7); A0b (P8). |
| **Can be accepted right now** | CR-001; CR-003 (both audit-agent paperwork only). |
| **Must remain parked** | BE-1, BE-2, BE-T, BE-U, BE-V, BE-W, BE-W2, BE-A, BE-F, CR-008 Sub-CR #3 contract (see §5). |
| **Must not be implemented yet** | CR-002; any new Audit Report column; Rule-2 generalisation beyond room scope; CR-008 #4 Phase B / navigation / post-login landing; CR-009; CR-010; Bucket A3 / A4 / B3 / B4 / B2 Phase 2. |
| **Closed — no action** | CR-011 (not reproduced); CR-012 (menu-config data — not code). |

---

## 9. Missing / Inconsistent Documents (reported, not acted upon)

During this consolidation, all documents referenced by the QA-handover and session-tracker pipeline **were located on disk**:

- ✅ `/app/memory/handover/CR_001_IMPLEMENTATION_HANDOVER.md`
- ✅ `/app/memory/handover/CR_003_IMPLEMENTATION_HANDOVER.md`
- ✅ `/app/memory/handover/CR_004_IMPLEMENTATION_HANDOVER.md`
- ✅ `/app/memory/handover/IMPLEMENTATION_SEQUENCE_INDEX.md`
- ✅ `/app/memory/handover/REPORTS_QA_HANDOVER_2026-05-01.md`
- ✅ `/app/memory/handover/REPORTS_FIELD_MAPPING_LIVE_AUDIT_2026-05-01.md`

**Gaps flagged (not missing, but needed):**

1. **No QA handover doc for CR-004 Phase 2 Buckets A / B / C.** Implementation handovers exist, but no `qa_handover/CR_004_PHASE2_QA_HANDOVER.md`. Recommend the next QA agent (or Documentation Update Agent) create one as part of P2.
2. **No QA report for CR-008 Sub-CR #1.** Handover exists (`qa_handover/CR_008_SUB_1_QA_HANDOVER.md`). Must be produced during P1.
3. **No QA handover OR QA report for A0a, A0b, A1, A2, B1, B2-split, D1.** Recommend the QA agent generate both for each as part of P3–P8 (or consolidate A1+B1 under one CR-006 doc, B2-split under CR-005 #1, A2 under CR-007, D1 under CR-008 #4 Phase A).
4. **`qa_handover/CR_004_QA_HANDOVER.md` wording drift** — uses the pre-fix labels "In-house / All"; shipped UI is "All / Paid / Unpaid" per `QA_NEXT_AGENT_HANDOVER.md` Part C. Reconcile after P0 closes.
5. **Legacy `CR_001_QA_REPORT.md` / `CR_003_QA_REPORT.md`** — still list BE-1 items as "deferred, tracked in `CR_004_BACKEND_EXT_sub_cr.md`". That is now redundant with `BE_1_BACKEND_ASKS_CONSOLIDATED.md`. Update pointers during Documentation Update Agent step.

---

## 10. Rules (binding on all downstream agents reading this doc)

- **No code change** was performed in this consolidation. This is a QA gate document only.
- **No item is marked passed** unless a QA report or manual validation evidence already exists in `/app/memory/change_requests/qa_reports/`.
- **No backend field is assumed shipped** unless called out in SESSION_TRACKER §3 as `✅ shipped` or verified via a dated live audit in `memory/handover/REPORTS_FIELD_MAPPING_LIVE_AUDIT_*.md`.
- **Clashes flagged in §4 are blocking** — any future implementation must cite the specific clash row it is NOT regressing and the QA artifact that proved it.
- **Parked items in §5 are immutable on the frontend** until the backend contract lands or the owner explicitly unparks.

— End of QA Consolidation —
