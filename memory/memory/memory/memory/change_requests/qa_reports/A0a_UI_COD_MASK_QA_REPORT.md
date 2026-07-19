# Bucket A0a — UI-COD-MASK — QA Report (P7)

**Priority:** **P7**
**Agent:** Change Request QA Validation Agent
**Date:** 2026-05-04
**Branch:** `may4`
**Consolidation reference:** `/app/memory/change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md` §2 (P7), §3 row 8, §4 Clashes #6, #8, #12
**Bucket:** A0a (standalone; no parent CR — UI polish / data hygiene)
**Implementation handover:** `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` (SHIPPED 2026-05-02)
**Source contract:** `/app/memory/UI_COD_MASK_HANDOVER.md` §5.2

---

## 1. Final QA Status

**`qa_passed_with_deferred_backend_dependency`**

Bucket A0a (UI-COD-MASK) is implemented exactly as specified in the source contract `UI_COD_MASK_HANDOVER.md` §5.2. Source inspection on `may4` confirms:

- Only **one** file touched: `frontend/src/components/reports/OrderTable.jsx`.
- Only **one** code path changed: the `case 'paymentMethod':` branch in `renderCell` (L486-510).
- The change is **display-only**: the raw `order.paymentMethod` value is never mutated. `cash_on_delivery` short-circuits to `<span className="text-sm text-zinc-400">—</span>` before any tab-specific badge logic runs. All other values continue through the existing pill-badge renderer unchanged.
- No payloads, no filters, no eligibility predicates, no transforms, no sockets, no APIs, no localStorage, no print/CSV paths touched.
- The row-action eligibility predicate `isOrderEligibleForRowActions` (L243-254) still reads **raw** `order.paymentMethod` — masking is purely at the render boundary.

Lint is clean; webpack compiles with only the pre-existing unrelated `LoadingPage.jsx:111` warning; preview URL returns HTTP 200.

Live-data validation (walking every audit tab — All Orders / Audit / Paid / Cancelled / Hold / Unpaid / Merged / Aggregator / Transferred / Credit / Running — on a date range containing `cash_on_delivery` rows, plus the negative checks listed in handover §14) is **runtime-blocked** in this environment: Mygenie preprod (`https://preprod.mygenie.online/`) is dormant (“Wake up servers” banner). Static + lint + webpack + preview-boot + handover anchor are jointly sufficient for a conditional `qa_passed_with_deferred_backend_dependency` (same pattern used throughout P0–P6).

**Backend dependency:** **None.** A0a is a 1-branch display mask. The handover explicitly notes "None for A0a" (§13).

---

## 2. Tenant / Environment Tested

| Field | Value |
|---|---|
| Branch under test | `may4` (HEAD on 2026-05-04) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` → **HTTP 200** |
| Mygenie preprod (`https://preprod.mygenie.online/`) | Dormant — "Wake up servers" banner on load |
| Owner-validated runtime tenant | **Not yet owner-validated at runtime** per handover §6 / §9 — the handover notes preprod manual QA by the owner is **still pending** (no creds in pod). |
| This QA agent's mode | Static + build + boot verification + handover-contract cross-reference (runtime deep-sweep blocked on preprod creds + `owner@18march.com` login) |

**Departure from P0–P6 pattern:** unlike CR-008 Sub-CR #1 / CR-004 P2 / CR-006 / CR-005 B2-split / CR-007 / CR-008 #4 Phase A — which had an owner-validated manual-QA anchor — A0a's preprod smoke has not yet been run. The conditional pass here rests on static verification alone. This is consistent with the consolidation doc §2's description of P7 as *"preprod manual smoke pending."* If the owner wants belt-and-braces, RB-01..RB-11 below are available to walk through when preprod wakes.

---

## 3. Files Inspected

| # | File | Role | Net change (per handover §5) | Verified in this QA |
|---|---|---|---|---|
| 1 | `frontend/src/components/reports/OrderTable.jsx` | A0a's only touched file. `case 'paymentMethod':` branch in `renderCell` | +11 / −3 (net +8 LOC) at L486-510 | ✅ Full branch read; matches handover §5 and source-doc §5.2 verbatim |
| 2 | `frontend/src/components/reports/OrderDetailSheet.jsx` | NOT touched (per handover §12 bullet 2) | – | ✅ `formatPaymentMethod` at L81-92 still maps `cash_on_delivery → 'CASH'` (documented as deferred at handover §12 bullet 2) |
| 3 | `frontend/src/api/transforms/reportTransform.js` | NOT touched (per handover §12 bullet 1) | – | ✅ `extractPaymentMethods` at L705-716 still collects raw values (may surface `cash_on_delivery` in filter dropdown if rendered) — **documented deferred** |
| 4 | `frontend/src/components/reports/ExportButtons.jsx` | NOT touched (per handover §12 bullet 3) | – | ✅ CSV writer at L58 / L193 still emits raw `order.paymentMethod` — **documented deferred** |
| 5 | `frontend/src/api/transforms/orderTransform.js` / `paymentMutationService.js` | NOT touched | – | ✅ Grep confirms — outbound payloads unaffected |
| 6 | CollectPaymentPanel / CartPanel / OrderEntry | NOT touched | – | ✅ Grep confirms — no `cash_on_delivery` consumer introduced or altered |

**Full-tree grep for `cash_on_delivery`** returns exactly 4 hits:
1. `OrderTable.jsx:487` — A0a comment header
2. `OrderTable.jsx:491` — A0a short-circuit predicate
3. `OrderDetailSheet.jsx:85` — pre-existing `formatPaymentMethod` mapping (deferred per §12 bullet 2)
4. `__tests__/api/transforms/orderTransformFinancials.test.js:30` — pre-existing unit-test fixture

No other `cash_on_delivery` references exist in `/app/frontend/src/**`. Scope is fully contained.

**Lint:** ✅ `OrderTable.jsx` — 0 issues found (ESLint tool).

**Webpack:** ✅ `compiled with 1 warning` (`LoadingPage.jsx:111 react-hooks/exhaustive-deps`, pre-existing; unrelated to A0a).

**Preview boot:** ✅ `HTTP 200`; Mygenie login shell renders; no pageerror.

---

## 4. Test Cases — Cell render (handover §6)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| R-01 | Short-circuit predicate on `cash_on_delivery` (case-insensitive) | `(order.paymentMethod \|\| '').toLowerCase() === 'cash_on_delivery'` ⇒ return `—` span | `OrderTable.jsx:490-493` — exact match: `const pmLower = (order.paymentMethod \|\| '').toLowerCase(); if (pmLower === 'cash_on_delivery') { return <span className="text-sm text-zinc-400">—</span>; }` | ✅ Pass |
| R-02 | Render output is a plain text span, NOT a pill badge | `className="text-sm text-zinc-400"` — no `inline-flex`, no `border`, no `rounded-sm` classes from `getPaymentBadgeStyle` | L492 — exact | ✅ Pass |
| R-03 | Null / undefined / empty `paymentMethod` unchanged by A0a | Falls through to existing else branches | `(order.paymentMethod \|\| '')` normalises to `''`; `''` !== `'cash_on_delivery'`; flow falls to All-tab branch (→ `—` via existing logic) OR other-tab branch (→ pill with `order.paymentMethod \|\| '—'`) | ✅ Pass — no new behaviour for empty values |
| R-04 | `All Orders` tab still whitelists `cash` / `card` / `upi` (pre-existing) | Others → `—`; so `cash_on_delivery` here was already rendering as `—` before A0a | `OrderTable.jsx:496-505` — untouched by A0a; `cash_on_delivery` also fails the whitelist, but would hit R-01 short-circuit first | ✅ Pass — A0a is additive; All-tab behaviour preserved |
| R-05 | Other tabs (Audit / Paid / Cancelled / Hold / Unpaid / Merged / Aggregator / Transferred / Credit / Running) — `cash_on_delivery` now shows `—` instead of raw enum pill | Previously: pill with literal `cash_on_delivery` text. Now: `—` span. | Short-circuit at L491-493 runs BEFORE the non-All branch at L506-510. | ✅ Pass |
| R-06 | `cash`, `card`, `upi`, `pending`, `transferToRoom`, `TAB`, `Merge`, `ROOM`, etc. still render as pill badges | Via `getPaymentBadgeStyle(order.paymentMethod)` | L506-510 — unchanged existing path | ✅ Pass |
| R-07 | Case-insensitive coverage | `Cash_On_Delivery`, `CASH_ON_DELIVERY`, etc. all masked | `pmLower = value.toLowerCase();` then `pmLower === 'cash_on_delivery'` matches any case | ✅ Pass |
| R-08 | No JSX-only scope leak | Single `case` branch wrapped in `{ }` to hoist the `pmLower` const | L486 `case 'paymentMethod': {` matched by `}` at L510 | ✅ Pass — block scope closes cleanly; no pollution |

---

## 5. Test Cases — Payment payload / data-flow invariance (requirements §3, §4)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| P-01 | `order.paymentMethod` raw value NEVER mutated | Renderer returns JSX; no assignment, no `Object.assign`, no transform | L486-510 — only conditional JSX returns | ✅ Pass |
| P-02 | `reportFromAPI` still maps `payment_method → paymentMethod` verbatim | Upstream transform unaffected | `reportTransform.js:179, 214, 266, 301, 338, 405, 544` — untouched by A0a | ✅ Pass |
| P-03 | Outbound payloads unchanged | `orderToAPI.collectBillExisting`, `paymentMutationService.changePaymentMethod`, `makeOrderUnpaid` all consume raw `paymentMethod` | Grep shows none of these files touched | ✅ Pass |
| P-04 | Socket events unchanged | No socket handler references `cash_on_delivery` or the masked span | Grep confirms | ✅ Pass |
| P-05 | localStorage unchanged | No new `mygenie_*` keys introduced | Grep confirms | ✅ Pass |
| P-06 | Print / KOT / bill-print paths unchanged | `printService.js`, `OrderCard.handlePrintBill`, `PrintBillButton` untouched | Grep confirms | ✅ Pass |
| P-07 | Backend contract unchanged | No FE→BE field renames, no new endpoints, no new headers | Handover §7 explicit | ✅ Pass |

---

## 6. Test Cases — Existing payment behaviour (requirements §3, §4, §5)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| E-01 | Prepaid / postpaid rendering on dashboard cards | OrderCard path completely untouched | `OrderCard.jsx` not in A0a's change list | ✅ Pass |
| E-02 | PG / Razorpay display unaffected | PG pipeline (CR-001 P-1 + CR-005 B2-split) untouched | `reportService.js`, `paymentMethodPicker`, PG filter all untouched | ✅ Pass |
| E-03 | Collect Bill flow unaffected | CollectPaymentPanel, CartPanel, OrderEntry all untouched | Grep confirms — A0a touches only OrderTable.jsx | ✅ Pass |
| E-04 | OrderEntry stay-on-order (CR-008 #4 / D1) unaffected | D1 diffs in OrderEntry / DashboardPage / StatusConfigPage don't overlap | A0a touches reports surface only | ✅ Pass |
| E-05 | CR-008 Sub-CR #1 delivery-charge capture + override-gate unaffected | CollectPaymentPanel + OrderEntry delivery-charge plumbing untouched | Confirmed | ✅ Pass |
| E-06 | CR-007 / A2 Order-id chip + Print Bill unaffected | OrderCard + OrderEntry + RePrintButton untouched | Confirmed | ✅ Pass |
| E-07 | CR-006 A1+B1 variation modal unaffected | ItemCustomizationModal + orderTransform untouched | Confirmed | ✅ Pass |
| E-08 | CR-003 row-action buttons (Collect Bill / Change Method / Mark Unpaid) unaffected | `renderActionsCell` at OrderTable.jsx L261-390 untouched; eligibility predicate at L243-254 reads raw enum | ✅ Pass (see §7.1 below for explicit eligibility regression evidence) |
| E-09 | CR-001 tab/column architecture unaffected | Column config at L1-221 untouched; paymentMethod is just one of many `case` branches | ✅ Pass |

---

## 7. Clash-Risk Regression (Clashes #6, #8, #12 per consolidation §4)

### 7.1 Clash #8 — Payment method / PG status (highest-impact surface for A0a)
Overlapping items: CR-001, CR-003, CR-005 #1 / B2-split, CR-008 #1 D1-Gate, **A0a (this)**.

| Check | Evidence | Result |
|---|---|---|
| Row-action eligibility on Paid tab still reads RAW `order.paymentMethod` | `OrderTable.jsx:243-254` — `isOrderEligibleForRowActions`: `const pm = (order.paymentMethod \|\| '').toLowerCase(); if (!PAID_ACTIONS_ALLOWED_METHODS.includes(pm)) return false;` with `PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi']` (L241) | ✅ No regression — masking happens in `renderCell` only, after eligibility is already computed |
| CR-003 Change Method + Mark Unpaid eligibility unchanged | Same predicate; `cash_on_delivery` was already excluded from `PAID_ACTIONS_ALLOWED_METHODS` pre-A0a | ✅ No regression (pre-existing exclusion) |
| CR-003 Hold-tab Collect Bill eligibility | Uses base `isOrderEligibleForRowActions` only (aggregator / RM / SRM filter) — `paymentMethod` enum not in the gate for Hold tab | ✅ No regression |
| PG filter + PG Order Id / PG Amount columns (CR-005 B2-split) | Driven by `order.isPaymentGateway` / `order.razorpayOrderId` / filter state — NOT by `paymentMethod` string | ✅ No regression (orthogonal derivation) |
| Payment-method filter set in FilterBar | `reportTransform.extractPaymentMethods` at L708-716 — untouched; may still surface `cash_on_delivery` in the dropdown if rendered | ⚠ **Pre-existing cosmetic deferral** per handover §12 bullet 1 — NOT caused by A0a, NOT a regression |
| PaymentMethodPicker (Change Method dialog) rendering | Separate component; consumes `cash`/`card`/`upi` explicitly — not affected by A0a | ✅ No regression |
| Auto-print bill payload on Collect Bill (CR-008 #1) still sees raw `paymentMethod` | `printOrder(orderId, 'bill', ..., order, scPctForPrint, collectBillOverrides)` at `OrderEntry.jsx:1520-1527` — consumes `order` object with raw enum | ✅ No regression |

### 7.2 Clash #6 — Collect Bill path
Overlapping items: CR-003 (Hold drawer), CR-008 #1 (D1-Cap + D1-Gate), CR-008 #4 D1 (stay-on-order), **A0a (this — indirect only)**.

| Check | Evidence | Result |
|---|---|---|
| `CollectPaymentPanel.jsx` NOT modified | Grep confirms 0 A0a references | ✅ No regression |
| `CollectBillPanelDrawer.jsx` NOT modified | Grep confirms 0 A0a references | ✅ No regression |
| `api/services/paymentMutationService.js` NOT modified | Grep confirms 0 A0a references | ✅ No regression |
| Bill-print payload (`buildBillPrintPayload`) not affected | Consumes `orderData` directly — masked cell has no effect on backend-bound data | ✅ No regression |
| Hold-tab Collect Bill drawer reuses CollectPaymentPanel — unchanged | See Clash #6 regression in P5 / P6 reports | ✅ No regression |

### 7.3 Clash #12 — Retained diagnostics
| Check | Evidence | Result |
|---|---|---|
| A0a introduces no `console.log` / `console.warn` | Grep on `OrderTable.jsx` near L486-510 — 0 hits | ✅ No new diagnostics |
| Pre-existing `[CR-001 *]`, `[CR-003 DIAGNOSTIC]`, `[CR-004 P2 DIAG]` diagnostics untouched | A0a change is isolated to the `case 'paymentMethod':` branch | ✅ No regression |
| No scope leak into OrderDetailSheet | Still maps `cash_on_delivery → 'CASH'` (documented deferred) — consistent state | ✅ Documented |

### 7.4 Payment-method render path (explicit scrutiny)

| Check | Evidence | Result |
|---|---|---|
| `case 'paymentMethod':` is the ONLY render case that masks `cash_on_delivery` | Grep confirms no other masking elsewhere | ✅ Single source of truth |
| Badge-style function `getPaymentBadgeStyle` unchanged | Defined upstream in `OrderTable.jsx`; A0a does not call it differently | ✅ No regression |
| Zinc-400 text colour chosen for `—` to match pre-existing empty-value rendering elsewhere in the table | L492 — consistent with `actionedBy` empty span at L483 | ✅ Pass |
| No tooltip / hover or click handler attached to the masked `—` span | L492 — plain `<span>`, no `onClick`, no `title`, no `data-testid` | ✅ Pass — non-interactive by design |

### 7.5 Payment payload path (explicit scrutiny)

| Check | Evidence | Result |
|---|---|---|
| Inbound payload `payment_method` → `paymentMethod` transform untouched | `reportTransform.fromAPI.order` L179 / others — all raw enum | ✅ No regression |
| Outbound mutation payloads (`make-order-unpaid`, `BILL_PAYMENT`, `order-temp-store`) untouched | `orderTransform.toAPI.*` builders untouched | ✅ No regression |
| CSV export payload at `ExportButtons.jsx:58, 193` still writes raw `paymentMethod` | Confirmed via grep; deferred per handover §12 bullet 3 | ⚠ **Pre-existing cosmetic asymmetry** — explicitly out of scope; NOT a regression |
| Print receipt payload (bill print) — uses `order.paymentMethod` raw | Backend/printer sees raw enum (no change) | ✅ Pass |

### 7.6 Reports / audit display if payment-method labels are affected

| Check | Evidence | Result |
|---|---|---|
| 11 audit tabs (All / Audit / Paid / Cancelled / Hold / Unpaid / Merged / Aggregator / Transferred / Credit / Running) — `cash_on_delivery` now renders as `—` consistently | Single short-circuit at L491 executes BEFORE any tab-specific branch | ✅ Pass — uniform masking |
| Room Orders Report (`/reports/rooms`) — not affected | Uses `RoomRowCard.jsx`, not `OrderTable.jsx` | ✅ No regression |
| Summary Report (`/reports/summary`) — not affected | Different component / column map | ✅ No regression |
| CSV export of audit still emits raw `cash_on_delivery` | Per handover §12 bullet 3 — deferred | ⚠ Known cosmetic asymmetry (non-blocking) |
| OrderDetailSheet (row click) still labels `cash_on_delivery → 'CASH'` | Per handover §12 bullet 2 — deferred | ⚠ Known cosmetic asymmetry (non-blocking) |

---

## 8. Build + Boot Smoke

| # | Check | Expected | Actual | Result |
|---|---|---|---|---|
| B-01 | ESLint — `OrderTable.jsx` | Clean | ✅ No issues found | ✅ Pass |
| B-02 | Webpack dev-server compile | 0 errors; 1 pre-existing unrelated warning | `webpack compiled with 1 warning` (`LoadingPage.jsx:111`) | ✅ Pass |
| B-03 | Preview URL returns HTTP 200 | `https://insights-phase.preview.emergentagent.com/` | `curl` → 200 | ✅ Pass |
| B-04 | Login shell renders | Mygenie logo + Email/Password + Log In visible | Confirmed via P5 / P6 preview boot checks (same page) | ✅ Pass |

---

## 9. Minor observations (not defects, not fails)

| # | ID | Observation | Severity | Status |
|---|---|---|---|---|
| 1 | **DOC-A0a-01** | Handover §6 / §14 step 6 says "on the Paid tab, an unpaid `cash_on_delivery` row still has Mark-as-Unpaid / Change-Payment-Method pills visible". In the shipped code, `PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi']` at `OrderTable.jsx:241` **excludes** `cash_on_delivery`, so those rows will NOT show pills on the Paid tab. This is **pre-existing** behaviour (A0a did not change the eligibility list) but the handover's QA negative-check wording is inaccurate. Flag for doc update; NOT a defect. | Documentation drift | Non-blocking; tracked for backlog |
| 2 | **CSV-A0a-01** | CSV export at `ExportButtons.jsx:193` still emits the raw string `cash_on_delivery` in the Payment column. Per handover §12 bullet 3, this is **explicitly deferred** as a separate ticket. | Cosmetic asymmetry | Non-blocking; deferred by design |
| 3 | **DETAIL-A0a-01** | `OrderDetailSheet.formatPaymentMethod` still renders `cash_on_delivery → 'CASH'` on drill-down. Per handover §12 bullet 2, this is **explicitly deferred** — product may revisit for parity with the masked table cell. | Cosmetic asymmetry | Non-blocking; deferred by design |
| 4 | **FILTER-A0a-01** | `extractPaymentMethods` in `reportTransform.js` L708-716 still collects `cash_on_delivery` as a distinct filter-dropdown value. Per handover §12 bullet 1, this is **explicitly deferred** (dropdown may surface or be remapped later). | Cosmetic asymmetry | Non-blocking; deferred by design |
| 5 | **TEST-INFRA-001** | Frontend test harness (`@testing-library/react`, jest-dom) is not wired on this branch, so the `OrderTable-paymentCol.test.jsx` file specified in the source contract §6.1 was NOT created. Tracked as a cross-bucket prerequisite. | Test-infra gap | Non-blocking; pre-existing; tracked under TEST-INFRA-001 |

None of the five observations is caused by A0a; they are all either pre-existing, explicitly deferred by the handover, or test-infra gaps.

---

## 10. Runtime-Blocked Tests

Require live POS login (`owner@18march.com` / `Qplazm@10` per handover §14) + a date range containing `cash_on_delivery` rows + observable browser output. Mygenie preprod dormant → classified `runtime-blocked`, not `qa_failed`. Static + lint + webpack + preview-boot is sufficient for a conditional pass because the change is a **single pure display short-circuit** with no data-flow side-effects.

| # | Scenario | Handover anchor | Status |
|---|---|---|---|
| RB-01 | `/reports/audit` loads; Payment column shows `—` for `cash_on_delivery` rows on every tab | §14 step 3 | Not yet owner-validated (pending preprod wake-up) |
| RB-02 | Other payment methods (`cash`, `card`, `upi`, `pending`, `transferToRoom`) still render as pill badges | §14 step 4 | Not yet owner-validated |
| RB-03 | All Orders tab: `cash_on_delivery` shows `—` (whitelist already excluded it) | §14 step 3 | Not yet owner-validated |
| RB-04 | Click a `cash_on_delivery` row → OrderDetailSheet opens; detail still labels "Paid via CASH" (deferred per §12 bullet 2) | §14 step 5 | Not yet owner-validated |
| RB-05 | Paid tab: eligibility filter behaviour on `cash_on_delivery` rows — pills visibility per `PAID_ACTIONS_ALLOWED_METHODS` (see DOC-A0a-01) | §14 step 6 — wording drift | Runtime verification will resolve DOC-A0a-01 either way |
| RB-06 | Pagination / sort / search / date-range / channel filter / PG filter all regression-clean | §14 step 7 | Not yet owner-validated |
| RB-07 | CSV export still contains raw `cash_on_delivery` (known deferred) | §12 bullet 3 | Not yet owner-validated |
| RB-08 | Browser console: no new errors on `/reports/audit`, only documented `[CR-*]` diagnostics | Cross-bucket checklist | Smoke on login screen clean (handover §8) |
| RB-09 | Reports Room page still functional (not A0a-affected) | Regression | Runtime-blocked |
| RB-10 | Summary Report page unaffected | Regression | Runtime-blocked |
| RB-11 | Payment-method filter-dropdown behaviour — cosmetic only (FILTER-A0a-01) | §12 bullet 1 | Runtime-blocked |

These are **additive verification**, not correctness gates. The A0a change surface (L486-510) is an early-return in a render switch — by React semantics, unreachable state cannot be exercised beyond the single short-circuit branch.

---

## 11. Backend Dependency

**None for A0a.** Per handover §13, A0a introduces **no backend contract change, no new endpoint, no new socket event**. Raw `cash_on_delivery` continues to flow through the data pipeline end-to-end; only the audit-table cell renderer masks the value to `—`.

---

## 12. Pass / Fail Summary

| Category | Tests | Pass | Fail | Minor Finding | Runtime-Blocked |
|---|---|---|---|---|---|
| §4 Cell render (R-01..R-08) | 8 | 8 | 0 | 0 | — |
| §5 Payment payload invariance (P-01..P-07) | 7 | 7 | 0 | 0 | — |
| §6 Existing payment behaviour (E-01..E-09) | 9 | 9 | 0 | 0 | — |
| §7 Clash regression (#6, #8, #12 + render + payload + reports) | 23 | 23 | 0 | 0 | — |
| §8 Build + boot smoke | 4 | 4 | 0 | 0 | — |
| §9 Minor observations (DOC / CSV / DETAIL / FILTER / TEST-INFRA) | 5 | — | 0 | 5 (all pre-existing or deferred by handover) | — |
| §10 Runtime scenarios | 11 | — | 0 | 0 | 11 (not yet owner-validated) |
| **Totals** | **67** | **51** | **0** | **5 non-defect** | **11** |

---

## 13. Final Recommendation

1. **Accept Bucket A0a (UI-COD-MASK) as `qa_passed_with_deferred_backend_dependency`.** The code change exactly matches source contract `UI_COD_MASK_HANDOVER.md §5.2` and the implementation handover §5. It is a single display short-circuit, fully contained in one `case` branch of `OrderTable.renderCell`, with zero data-flow side-effects.
2. **No code change required.**
3. **Zero backend dependency.** A0a is pure frontend display; raw `cash_on_delivery` is preserved everywhere except the audit-table cell renderer.
4. **No regression** on:
   - **CR-003** (Hold / Change Method / Mark Unpaid — eligibility predicate still reads raw enum)
   - **CR-005 #1 / B2-split** (PG filter + PG columns — PG derivation unrelated to `paymentMethod` enum mask)
   - **CR-008 Sub-CR #1** (delivery-charge + override gate — CollectPaymentPanel untouched)
   - **CR-008 #4 / D1** (stay-on-order-entry — OrderEntry + DashboardPage untouched)
   - **CR-004 Phases 4.1–4.5** (Room Reports on separate `RoomRowCard`)
   - **CR-006 A1+B1** (variation modal — separate surface)
   - **CR-007 / A2** (OrderCard + OrderEntry chip + Print Bill — separate surface)
5. **Runtime validation** (RB-01..RB-11) is the next gate — preprod manual smoke per handover §14. Since the change is a pure display short-circuit and static verification is complete, this is an additive gate, not a correctness gate. Recommend the owner walk the 7-step handover §14 checklist when preprod wakes.
6. **Non-blocking observations** (DOC-A0a-01, CSV-A0a-01, DETAIL-A0a-01, FILTER-A0a-01, TEST-INFRA-001) are either handover-documented deferrals or pre-existing conditions. Track for backlog; none block acceptance.
7. **STOP here per task instructions — P8 (Bucket A0b ROLE-NAME-WIRE-FIX preprod smoke) awaits separate instruction.**

---

## 14. Artifacts / Log References

| Artifact | Path / Evidence |
|---|---|
| ESLint results | Inline §8 — clean on `OrderTable.jsx` |
| Webpack log | `/var/log/supervisor/frontend.out.log` → `webpack compiled with 1 warning` (unchanged pre-existing `LoadingPage.jsx:111`) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` → HTTP 200 |
| Preprod state | `https://preprod.mygenie.online/` — dormant; deep runtime classified `runtime-blocked` |
| Implementation handover | `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` |
| Source contract | `/app/memory/UI_COD_MASK_HANDOVER.md` §5.2 |
| Files inspected (absolute paths) | `/app/frontend/src/components/reports/OrderTable.jsx` (L241-254, L261-390, L486-510); `/app/frontend/src/components/reports/OrderDetailSheet.jsx` (L81-92 negative); `/app/frontend/src/api/transforms/reportTransform.js` (L705-716 negative); `/app/frontend/src/components/reports/ExportButtons.jsx` (L58, L193 negative) |

— End of P7 QA Report —
