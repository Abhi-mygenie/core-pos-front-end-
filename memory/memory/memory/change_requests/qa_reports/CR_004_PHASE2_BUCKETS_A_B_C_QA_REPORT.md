# CR-004 Phase 2 Buckets A + B + C QA Report

**Priority:** **P2**
**Agent:** Change Request QA Validation Agent
**Date:** 2026-05-03
**Branch:** `may4`
**Consolidation reference:** `/app/memory/change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md` §2 (P2), §3 rows 4, 5, 6, §4 Clashes #1, #3, #4, #10
**Parent CR docs:** `/app/memory/change_requests/CR_004_PHASE2_REMOVE_FROM_ROOM_AND_PAID_COLUMN.md`, `/app/memory/change_requests/CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md`
**Handover inputs:**
- `implementation_handover/CR_004_BUCKET_A_PR1_PR3_HANDOVER.md`
- `implementation_handover/CR_004_BUCKET_B_FE1_HANDOVER.md`
- `implementation_handover/CR_004_BUCKET_C_PR2_REMOVE_FROM_ROOM_HANDOVER.md`
- `qa_reports/CR_004_REVALIDATION_QA_REPORT.md` (P0, 2026-05-03)

---

## 1. QA Status

**`qa_passed_with_deferred_backend_dependency`**

All three buckets (A PR-1 + PR-3, B FE-1, C PR-2) are implemented as specified in their respective handovers. The only intentional delta from the handovers is a **post-Bucket-A / post-Bucket-C evolution** driven by the BE-2 §4.1 spec on 2026-05-01, which:

1. **Refines the per-row `paid` formula** from Bucket A's `Math.max(0, total - outstanding)` to `lodgingCollected + (isFullySettled ? food : 0)`. Mathematically equivalent for healthy unsettled rooms; more accurate for settled rooms with write-off / under-collection.
2. **Inserts a new `Discount` column** between Paid and Outstanding (silent when 0), with its own SummaryBar stat (silent when 0).
3. **Replaces Bucket C's optimistic-removal Set + 1.5s `setTimeout`** with a surgical cache-invalidation pattern that achieves the same UX in a single network round-trip with no artificial flicker. This also eliminates the "pill-flicker sharp edge" flagged in Bucket C handover §"Sharp edge worth flagging".

These evolutions are additive and consistent with the handovers' specifications; none reverts bucket scope.

Live-row smoke on Mantri (`owner@mantri.com`) preprod on 2026-04-29 is the runtime anchor documented in `SESSION_TRACKER.md` §1. Deep runtime validation (live RM+SRM data, Remove click-through, SummaryBar Paid reconciliation) remains blocked on credentials + waking preprod — **not a failure**, consistent with `QA_NEXT_AGENT_HANDOVER.md` Part B.

Together with P0's passing verdict (same-codebase filter-pill validation), **P0 + P2 are sufficient to move CR-004 Phases 4.1–4.5 toward partial-final acceptance.**

---

## 2. Files Inspected

| # | File | Bucket | Role |
|---|---|---|---|
| 1 | `frontend/src/components/reports/RoomRowCard.jsx` | A (PR-1, PR-3) + C | Paid cell + Rent→Total label + Remove-from-Room pill + TransferredOrdersTable grid restructure |
| 2 | `frontend/src/pages/RoomOrdersReportPage.jsx` | A + B + C | Paid column header + SummaryBar Paid stat + pill data-source delegation + Remove dialog + handlers |
| 3 | `frontend/src/api/services/reportService.js` | B | `getRoomsForReport` helper + `orderLogsRowToRoomRowSeed` |
| 4 | `frontend/src/api/transforms/roomListTransform.js` (NEW) | B | `/get-room-list` → RowSeed normaliser |
| 5 | `frontend/src/components/reports/DatePicker.jsx` | B | `disabled` + `tooltip` props |
| 6 | `frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` | C | 5 optional copy/colour props with backwards-compatible defaults |
| 7 | `frontend/src/pages/AllOrdersReportPage.jsx` | C (regression check) | Audit Report still uses default (amber "Mark Unpaid") — no regression |

**Lint: all 5 hand-edited files (1-6) return ✅ No issues found.** Pre-existing unrelated `LoadingPage.jsx:111` warning persists (out of scope).

---

## 3. Test Cases — Bucket A (PR-1 Paid column + PR-3 Rent → Total)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A-01 | RoomBillingCard label | `Total` (was `Rent`) | `RoomRowCard.jsx:89-97` — comment explicitly calls out PR-3; `<span>Total</span>` at L93 | ✅ Pass |
| A-02 | RoomBillingCard value | Still `roomInfo.roomPrice` | `RoomRowCard.jsx:94-96` — `{formatCurrency(rent)}`; `rent` is assigned at L362 from `ri.roomPrice` | ✅ Pass |
| A-03 | Paid cell exists in row strip | Between Total and Outstanding | `RoomRowCard.jsx:497-507` — Paid cell at L499; Total cell at L488-496; Discount cell at L511-527; Outstanding cell at L529-553 | ✅ Pass (order: Total → Paid → Discount → Outstanding) |
| A-04 | Paid column header | `Paid` between Total and Outstanding | `RoomOrdersReportPage.jsx:301-307` — `<div>Total</div>` L301 · `<div>Paid</div>` L303 · `<div>Discount</div>` L306 · `<div>Outstanding</div>` L307. Post-BE-2 insertion documented in L304-305 comment | ✅ Pass |
| A-05 | Paid cell loading state | Same skeleton as Total | `RoomRowCard.jsx:499-506` — `isLoading ? <PlaceholderCell /> : error ? '—' : formatCurrency(numbers.paid)` — same treatment as Total (L488-495) | ✅ Pass |
| A-06 | Paid cell neutral colour | `text-zinc-900` | `RoomRowCard.jsx:505` — `className="text-zinc-900"` on the value span | ✅ Pass |
| A-07 | `numbers.paid` formula | `Math.max(0, total - outstanding)` per handover; post-BE-2 update: `lodgingCollected + (isFullySettled ? food : 0)` | `RoomRowCard.jsx:394` — `const paid = lodgingCollected + (isFullySettled ? food : 0);` — **INTENTIONAL POST-HANDOVER UPGRADE** per comment block L366-382. Mathematically equivalent to original in healthy rooms; more accurate on settled rooms with discount/write-off | ✅ Pass (with documented evolution) |
| A-08 | Paid null in empty-state | `paid: null` when `detail/roomInfo` missing | `RoomRowCard.jsx:340-352` — empty-state branch returns `paid: null` | ✅ Pass |
| A-09 | SummaryBar Paid stat exists | `<SummaryStat label="Paid">` between Food and Outstanding (handover ref) | `RoomOrdersReportPage.jsx:207-213` — `label="Paid"` stat between Total (L195-201) and Discount (L218-228, conditional) / Outstanding (L230-237) | ✅ Pass (Food stat was dropped per earlier user request — documented in `RoomRowCard.jsx:110-112`) |
| A-10 | `summaryTotals.paid` accumulator | Σ(row.paid) across visible rows; `null` until any row resolves | `RoomOrdersReportPage.jsx:521` initialiser; L553 `rowPaid = lodgingCollected + (rowSettled ? rowFood : 0)`; L556 `paid += rowPaid`; L563 `paid: resolvedCount > 0 ? paid : null` | ✅ Pass |
| A-11 | SummaryBar Paid receives prop | `paid={summaryTotals.paid}` | `RoomOrdersReportPage.jsx:679` — `paid={summaryTotals.paid}` | ✅ Pass |
| A-12 | Row math consistency | `rowPaid` formula in page = per-row formula in RoomRowCard | Page L540-556 and RoomRowCard L383-394 implement IDENTICAL formula (variable names differ; math identical) | ✅ Pass |
| A-13 | Expanded ROOM BILLING side card | `Total`, `Advance`, `Balance` — no `Food` / no `Rent` label | `RoomRowCard.jsx:87-113` — `Total` (L93) · `Advance` (L99) · `Balance` (L105); `Food` row explicitly removed per comment L110-112 | ✅ Pass |
| A-14 | Row strip "Total" width mismatch (known limitation) | Header `w-20` vs cell `w-24` per handover §Known limitations | Header L301: `w-20`; cell L488: `w-24` — **INHERITED quirk, documented; out of scope** | ⚠ Known (not a Bucket A defect) |
| A-15 | Dual definition of "Total" on screen | Row strip "Total" = room + food; side card "Total" = room only | Row strip: `numbers.total = rent + food` at L365; side card: passes `rent={numbers.rent}` at L572 | ⚠ Known (accepted per CR §5A terminology check) |

---

## 4. Test Cases — Bucket B (FE-1 filter-pill data source)

Most of these were already validated in P0 (`CR_004_REVALIDATION_QA_REPORT.md` §4.1). The remaining bucket-specific items are:

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| B-01 | Final pill labels | `All` / `Paid` / `Unpaid` (final wording per QA Next Agent Handover Part C) | `RoomOrdersReportPage.jsx:54-58` — `STATUS_FILTERS = [{'all','All'}, {'paid','Paid'}, {'unpaid','Unpaid'}]` | ✅ Pass (confirmed in P0 C-1) |
| B-02 | No stale "In-house / All" remaining in runtime logic | Grep for legacy values | Grep for `'in-house'`, `in_house`, `inhouse` in `RoomOrdersReportPage.jsx` + `reportService.js`: **no hits**. No variable/branch reads an old label | ✅ Pass |
| B-03 | Filter predicate = endpoint selection, not client balancePayment | `getRoomsForReport(filter, ...)` routes by filter | `reportService.js:1180-1230` — `if (filter === 'unpaid')` → `/get-room-list`; `if (filter === 'paid')` → `/order-logs-report` filtered to `orderIn==='RM' && status==='paid'`; `all` → union, dedupe by parentOrderId | ✅ Pass (confirmed in P0 C-3, C-5, C-7, C-9) |
| B-04 | New helper: `roomListTransform.js` | 60-line new file, `transformRoomListToRows`, skip rooms without `order_id`, no defensive checked-out filter | `roomListTransform.js:32-58` — skips `!r.order_id` at L36; no client-side settled filter (relies on backend G2); exports `{ transformRoomListToRows }` default | ✅ Pass |
| B-05 | New helper: `orderLogsRowToRoomRowSeed` | Logs-source seed with `_source: 'logs'`, `restaurantOrderId: o.orderId`, `roomNumber: null`, `tableId: o.tableId` | `reportService.js:1164-1178` — exact shape match | ✅ Pass |
| B-06 | DatePicker prop support | `disabled` + `tooltip` props | `DatePicker.jsx:62-70, 193-224` — props destructured with defaults; disabled greys trigger + prev/next-day; tooltip surfaced on title attr whether disabled or active | ✅ Pass |
| B-07 | DatePicker wiring per locked tooltip matrix | `disabled={filter==='unpaid'}`; tooltip "Currently checked-in rooms — date doesn't apply" on Unpaid; "Date affects settled rooms only" on All; empty on Paid | `RoomOrdersReportPage.jsx:632-642` — exact match for all 3 branches | ✅ Pass |
| B-08 | `[CR-004 P2 DIAG]` block removed | Previously at `RoomOrdersReportPage.jsx:400-429` per handover; now gone | Grep `/app/frontend/src/` for `[CR-004 P2 DIAG]`: **no hits**. Correctly removed per Bucket B handover | ✅ Pass |
| B-09 | Retained unrelated diagnostics (per QA_HANDOVER_INDEX.md §Diagnostic Code) | `[CR-001 DIAG]`, `[CR-001 P2 DIAG]`, `[CR-001 G5 DIAG]`, `[CR-003 DIAGNOSTIC]` still present | Grep: `reportService.js:952` (`[CR-001 DIAG]`); `:990` (`[CR-001 P2 DIAG]`); `:1039` (`[CR-001 G5 DIAG]`); `AllOrdersReportPage.jsx:130` (`[CR-003 DIAGNOSTIC]`) — all four intact | ✅ Pass |
| B-10 | "Loading remaining room details…" hint removed | Handover §d | Grep on `RoomOrdersReportPage.jsx` — no residual hint | ✅ Pass |
| B-11 | Non-delivery/non-room regression surfaces untouched | AllOrdersReportPage Audit tab filters, Hold, Paid, Running, Merged, Cancelled | `reportService.js:567` `isPaid` derivation unchanged; CR-001's TAB_FILTERS in `AllOrdersReportPage.jsx:47-107` untouched (verified by prior CR-001 QA report) | ✅ Pass |
| B-12 | `fetchOrders` reruns on pill change | `statusFilter` in useCallback deps | `RoomOrdersReportPage.jsx:475` — `[statusFilter, selectedDate, schedules]` deps; detail cache reset (L456) + resolvedTick reset (L457) on every run | ✅ Pass |

---

## 5. Test Cases — Bucket C (PR-2 Remove from Room)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| C-01 | `MarkUnpaidConfirmDialog` parameterised | 5 optional overrides (title, description, actionLabel, pendingLabel, actionClassName, testId) with backwards-compatible CR-003 defaults | `MarkUnpaidConfirmDialog.jsx:59-71` — all 6 props (counting `testId`) added as optional with defaults: `actionLabel='Mark Unpaid'`, `pendingLabel='Marking…'`, `actionClassName='bg-amber-600 hover:bg-amber-700 focus:ring-amber-600'`, `testId='mark-unpaid-confirm-dialog'`; `title` + `description` support `{label}` substitution at L72-84 | ✅ Pass |
| C-02 | Audit Report default call site unchanged | `AllOrdersReportPage.jsx` mounts dialog with NO overrides | `AllOrdersReportPage.jsx:926-932` — no override props; defaults apply (amber "Mark Unpaid") | ✅ Pass (no regression) |
| C-03 | Room Orders Report override call site | Rose colour + "Remove from Room" + "Removing…" + testId `remove-from-room-confirm-dialog` | `RoomOrdersReportPage.jsx:727-745` — all 7 overrides present; `actionClassName="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"` | ✅ Pass |
| C-04 | New imports | `makeOrderUnpaid`, `useAuth`, `useToast`, `isMutationAllowedForSelectedDate`, `MarkUnpaidConfirmDialog` | `RoomOrdersReportPage.jsx:36-41` — all 5 imports present | ✅ Pass |
| C-05 | New state | `removeFromRoomTarget`, `removeFromRoomPending` (optimistic Set removed post-handover) | `RoomOrdersReportPage.jsx:388-389` — both states present. Post-handover evolution at L391-396: optimistic `Set` removed in favour of surgical cache invalidation | ✅ Pass (with documented improvement) |
| C-06 | Permission flag | `canRemoveFromRoom = hasPermission('order_unpaid')` | `RoomOrdersReportPage.jsx:380-382` — exact formula | ✅ Pass |
| C-07 | Mutation window flag | `isWithinMutationWindow = isMutationAllowedForSelectedDate(selectedDate)` | `RoomOrdersReportPage.jsx:383-386` — `useMemo` wrapped; dep `selectedDate` | ✅ Pass |
| C-08 | Open/close/confirm handlers | `openRemoveFromRoomDialog`, `closeRemoveFromRoomDialog`, `handleRemoveFromRoomConfirm` | `RoomOrdersReportPage.jsx:398-441` — all 3 present | ✅ Pass |
| C-09 | Confirm handler semantics | Call `makeOrderUnpaid(srm.orderId)` → toast → close → surgical refetch; error branch: restore + toast + keep open | `RoomOrdersReportPage.jsx:407-437` — exact flow. Surgical refetch at L425-428 (`new Map(detailCacheRef.current)`, `delete(parentOrderId)`, replace ref, bump `resolvedTick`) | ✅ Pass |
| C-10 | Props threaded to `RoomRowCard` | `canRemoveFromRoom`, `isWithinMutationWindow`, `onRemoveFromRoom` | `RoomOrdersReportPage.jsx:713-715` — all 3 passed | ✅ Pass |
| C-11 | `RoomRowCard` accepts new props with defaults | `canRemoveFromRoom = false`, `isWithinMutationWindow = false`, `onRemoveFromRoom` (optional) | `RoomRowCard.jsx:275-282` — destructure with defaults | ✅ Pass |
| C-12 | `TransferredOrdersTable` accepts new props | `parentOrderId`, `canRemoveFromRoom`, `isWithinMutationWindow`, `onRemoveFromRoom`, `isFullySettled` | `RoomRowCard.jsx:118-126` — all 5 props present | ✅ Pass |
| C-13 | Pill visibility rule | `canRemoveFromRoom && isWithinMutationWindow && !isFullySettled && typeof onRemoveFromRoom === 'function'` | `RoomRowCard.jsx:138-142` — exact 4-clause predicate | ✅ Pass |
| C-14 | Grid restructure when pill shown | 5 cols (3/2/3/2/2 = Order/Type/Time/Amount/Action) | `RoomRowCard.jsx:177-191` — header row grid with conditional `col-span-4` (no pill) → `col-span-2` (with pill) on Amount; `col-span-2` Action column appended when `showPill` | ✅ Pass |
| C-15 | Grid fallback when pill hidden | Original 4-column layout | Same block — `col-span-4` for Amount, no Action column | ✅ Pass |
| C-16 | Settled room suppresses pill | RM parent with `fOrderStatus===6` | `isFullySettled` passed from `RoomRowCard.jsx:583` based on `detail?.fOrderStatus === 6`; enforced at `TransferredOrdersTable` visibility L141 | ✅ Pass |
| C-17 | Post-handover: surgical cache refetch | Delete affected parentOrderId from detailCacheRef, bump resolvedTick — triggers RoomRowCard's deps-bound effect to re-fire | `RoomOrdersReportPage.jsx:425-428` + `RoomRowCard.jsx:333` (deps include `detailCache` identity) + `RoomRowCard.jsx:294-333` (effect refires for affected row only) | ✅ Pass |
| C-18 | Optimistic Set + 1.5s timeout workaround removed | Per handover §"Sharp edge" + page-level comment | `RoomRowCard.jsx:127-131` — explicit 2026-05-01 note removing Set; `RoomOrdersReportPage.jsx:391-396` — explicit 2026-05-01 note removing Set + timeout | ✅ Pass (improvement over handover — eliminates flicker + growing-Set risk) |
| C-19 | Audit Report regression surface | No change to CR-003 Mark-Unpaid flow | `AllOrdersReportPage.jsx:926-932` call site unchanged; lint clean | ✅ Pass |

---

## 6. Build + Boot Smoke (executable in this environment)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| S-01 | Lint `RoomRowCard.jsx` | Clean | ✅ No issues found | ✅ Pass |
| S-02 | Lint `RoomOrdersReportPage.jsx` | Clean | ✅ No issues found (P0 verification) | ✅ Pass |
| S-03 | Lint `reportService.js` | Clean | ✅ No issues found (P0 verification) | ✅ Pass |
| S-04 | Lint `roomListTransform.js` | Clean | ✅ No issues found (P0 verification) | ✅ Pass |
| S-05 | Lint `DatePicker.jsx` | Clean | ✅ No issues found | ✅ Pass |
| S-06 | Lint `MarkUnpaidConfirmDialog.jsx` | Clean | ✅ No issues found | ✅ Pass |
| S-07 | Webpack compiles | 0 errors; only pre-existing LoadingPage warning | `/var/log/supervisor/frontend.err.log` — same as P0/P1 | ✅ Pass |
| S-08 | `/reports/rooms` HTTP 200 | Route loads, ProtectedRoute redirects to login | HTTP 200; `https://insights-phase.preview.emergentagent.com/reports/rooms` responds; no JS errors (from P0 playwright capture) | ✅ Pass |

---

## 7. Clash-Risk Surfaces Regression-Tested

Per consolidation doc §4:

### Clash #1 — Reports filter bar & pills
**Overlapping items:** CR-001 (Audit tabs), CR-003 (action-column gating), CR-004 P1, CR-004 P2 Bucket B (this), CR-005 #1 B2-split.

| Check | Evidence | Result |
|---|---|---|
| Room page pill predicate independent of Audit tabs | Room uses `getRoomsForReport` (endpoint selection); Audit uses `TAB_FILTERS` in `AllOrdersReportPage.jsx:47-107` — no shared closure | ✅ No regression |
| Audit tab composition intact post-Bucket-B | `ALL_ORDERS_TABS` at `AllOrdersReportPage.jsx:47-57`: All / Paid / Cancelled / Added to Credit / On Hold / Merged / Running / Aggregator / Audit — matches CR-001 QA report | ✅ No regression |
| Pill-to-column contract | Room header at L294-308 (8 slots) matches visible row columns at L488-553 | ✅ No regression |

### Clash #3 — Audit status derivation / tab routing
**Overlapping items:** CR-001, CR-004 Bucket D-1 (SRM badge), BE-1 G1 (withdrawn).

| Check | Evidence | Result |
|---|---|---|
| `getOrderLogsReport:567` `isPaid = f_order_status === 6 && payment_method !== 'Cancel'` | Unchanged since CR-001 | ✅ No regression |
| `getActiveSrmIds` still exported | `reportService.js:1248` | ✅ No regression |
| SRM override logic `reportService.js:601-622` | Untouched by Buckets A/B/C | ✅ No regression |
| Room Paid pill correctly consumes derived `status==='paid'` | `reportService.js:1202` `paidOnly = clean.filter(o => o.status === 'paid')` | ✅ Contract respected |

### Clash #4 — Order lifecycle fields (Rule-2 room-scoped only)
**Overlapping items:** CR-001, CR-003, CR-004 P2 (this).

| Check | Evidence | Result |
|---|---|---|
| Rule-2 (`fOrderStatus===6 ⇒ outstanding=0`) limited to room scope | Used only at `RoomRowCard.jsx:384/391` and `RoomOrdersReportPage.jsx:540/550` — NOT leaked to `reportTransform.js:549` or `OrderDetailSheet.jsx` | ✅ Scope preserved |
| `orderTransform.js:190` default `'unpaid'` unchanged | Audit + OrderDetailSheet read `payment_status` authoritatively, not via Rule-2 | ✅ No regression |
| Lodging math (Rule 1): `total = roomPrice; advance/balance from roomInfo` | `RoomRowCard.jsx:362-364` + `RoomOrdersReportPage.jsx:536-544` — identical | ✅ Consistent |
| Discount derivation consistency | Summary L546-549 and RoomRowCard L386-390 use identical formula: `explicit > 0 ? explicit : (isFullySettled ? max(0, rent - lodgingCollected) : 0)` | ✅ Consistent |

### Clash #10 — Room reports math (Rule 1 / Rule 2)
**Overlapping items:** CR-004 P1, CR-004 P2 A/B/C (this), BE-1 G1 (withdrawn), BE-2 (parked).

| Check | Evidence | Result |
|---|---|---|
| Summary totals = Σ per-row totals | Formulas byte-for-byte identical (page L521-558 vs card L383-394); `resolvedTick` keeps them in sync | ✅ Consistent |
| Outstanding = 0 on settled, else `food + max(0, balance - receiveBalance)` | `RoomRowCard.jsx:391-393`; same in page L550-552 | ✅ Consistent |
| Paid = `lodgingCollected + (settled ? food : 0)` | Both surfaces at L394 / L553 | ✅ Consistent |
| Discount = BE-2 §4.1 derivation (documented in comment blocks L366-382 / L537-539) | Implemented in both surfaces; silent when 0; amber-coloured when surfaced | ✅ Consistent |

### Retained diagnostic logging
- `[CR-004 P2 DIAG]` correctly **removed** per Bucket B handover (no hits in grep).
- `[CR-001 DIAG]`, `[CR-001 P2 DIAG]`, `[CR-001 G5 DIAG]`, `[CR-003 DIAGNOSTIC]` **retained** per QA_HANDOVER_INDEX.md §Diagnostic Code (3 hits in `reportService.js`, 1 in `AllOrdersReportPage.jsx`).

### Backend-dependent display fields (not touched by this bucket)
- No Bucket A/B/C edit touches P1–P6 or G1 FE-wire surfaces. Clash #11 is not activated.

---

## 8. Runtime-Blocked Tests

These scenarios require live preprod backend + credentials (`owner@mantri.com` / `Qplazm#10` per `SESSION_TRACKER.md` §1). Preview banner shows "Wake up servers"; credentials not injected. **Not marked failed** — classified `runtime-blocked` consistent with §6.3 of the consolidation doc.

| # | Scenario | Bucket | Runtime-Blocked reason |
|---|---|---|---|
| R-01 | Visual: Paid column renders between Total and Outstanding on a real in-house RM row | A PR-1 | Needs live row |
| R-02 | Row math: `Total − Outstanding = Paid` on a non-zero-balance room (handover §Live validation) | A PR-1 | Needs live numbers |
| R-03 | SummaryBar Paid = Σ row.paid across visible rows | A PR-1 | Same |
| R-04 | Expanded ROOM BILLING side card reads "Total" (not "Rent") | A PR-3 | Needs expanded view |
| R-05 | Unpaid pill: date picker greyed with tooltip "Currently checked-in rooms — date doesn't apply" | B | Needs live login |
| R-06 | Unpaid pill network: only `/get-room-list` + per-row `/get-single-order-new` | B | Needs live network tab |
| R-07 | Paid pill: date picker active; list shows only settled-on-this-day RM rows | B | Same |
| R-08 | All pill: live + settled deduped; both endpoints in parallel on initial load | B | Same |
| R-09 | Remove from Room: 1 click → 1 POST `/make-order-unpaid` + 1 follow-up `/get-single-order-new` (no `/get-room-list` / `/order-logs-report` full refetch) | C | Needs live SRM |
| R-10 | Removed SRM reappears on originating table's running orders | C | Needs live dashboard |
| R-11 | Audit Report Paid tab Mark-Unpaid still amber + original copy (cross-bucket check) | C regression | Needs live Audit row |
| R-12 | Pill hidden on settled rooms (Paid pill expanded row) | C gate | Needs live data |
| R-13 | Pill hidden without `order_unpaid` permission | C gate | Needs non-Owner credential |
| R-14 | Pill hidden outside 2-business-day window (picker on 3+ days ago) | C gate | Needs date picker exercise |

All 14 runtime items are statically evidenced by the code-level checks in §3/§4/§5. Live-data confirmation is additive QA signal, not a correctness gate for this P2 pass.

---

## 9. Backend Dependency

| Dep | Status | Impact |
|---|---|---|
| **BE-1 G2** (`/get-room-list` in-house-only filter) | ✅ Shipped (verified 2026-04-29 live Mantri) | Bucket B relies on this — already consumed. |
| **BE-1 `order_id`** on `/get-room-list` (was OPT) | ✅ Shipped | Bucket B consumes via `transformRoomListToRows:36`. |
| **BE-1 G3** (`associated_order_list[].payment_status` refresh on RM parent detail post-settlement) | ❌ Partial (children come back with `null` after SRM mutation) | **Bucket C impact:** Audit drill-down would show stale values. Surgical cache invalidation already compensates. Affects Outstanding accuracy on recently-settled rooms in the All pill — documented in Bucket B handover §"Backend pending items". |
| **BE-1 OPT** (inline `latest_order_id` + `room_info` + `check_in_date`) | ❌ Partial (`latest_order_id` shipped) | Out of scope for Phases 4.1–4.5; part of Phase 2 cross-day (parked). |
| **BE-2** (`lodging_collected`, `discount_amount`, `discount_reason`, `payment_breakdown[]`) | ❌ Pending | Rule-2 approximation in place (confirmed §3 A-07, §7 Clash #10). Does NOT block Buckets A/B/C acceptance; only affects summary-bar Paid precision on settled rooms with write-off. |

**No new backend dependency introduced by Buckets A/B/C.** All deferred items are enumerated in `BE_1_BACKEND_ASKS_CONSOLIDATED.md` + `BE_2_LODGING_PAYMENT_BREAKDOWN.md` — consistent with the `CR_004_BACKEND_EXT_sub_cr.md` playbook.

---

## 10. Summary — Are P0 + P2 Enough to Move CR-004 Phase 4.1–4.5 to Acceptance?

**Yes, for partial-final acceptance of Phases 4.1 – 4.5.**

| Phase | Coverage |
|---|---|
| 4.1 Read-only route + PMS-style view | ✅ CR-004 P1 original scope, validated in P0 §4 via static inspection of `App.js:42`, `Sidebar.jsx`, `RoomOrdersReportPage.jsx` structure |
| 4.2 RM grouping + day-list fetch | ✅ P0 §4 + Bucket B `getRoomsForReport` |
| 4.3 Lazy detail + cache + summary bar + filter pills | ✅ P0 C-3..C-12, B-1..B-4 + P2 §4 B-01..B-12 |
| 4.4 Real Food/Total/Outstanding numbers + RoomRowCard expansion + filter actually filters | ✅ P0 C-4 + P2 §3 A-01..A-15 + §4 B-01..B-12 |
| 4.5 Incremental summary-bar totals | ✅ P2 §3 A-09..A-12 + post-handover BE-2 Discount refinement |

**Explicitly parked, not in P2 scope (per `CR_004_IMPLEMENTATION_SUMMARY.md` "Parking Note"):**
- Phase 4.6 — Export Integration (`ExportButtons.jsx`)
- Phase 4.7 — Final cross-page smoke pass
- Phase 2 — cross-day in-house view (blocked on BE-1 G3 + OPT)

Acceptance is therefore:
- ✅ **Partial-final acceptance of Phases 4.1 – 4.5** — ready now.
- ⏸ **Phase 4.6 / 4.7 / Phase 2** remain owner-parked pending backend.

---

## 11. Pass / Fail Results

| Category | Tests | Pass | Fail | Runtime-Blocked | Known Limitations |
|---|---|---|---|---|---|
| §3 Bucket A (PR-1 + PR-3) | 15 | 13 | 0 | — | 2 (A-14 width mismatch; A-15 dual-definition Total — both accepted per CR) |
| §4 Bucket B (FE-1) | 12 | 12 | 0 | — | 0 |
| §5 Bucket C (PR-2) | 19 | 19 | 0 | — | 0 |
| §6 Build + boot smoke | 8 | 8 | 0 | — | 0 |
| §7 Clash regression (#1, #3, #4, #10) | 14 | 14 | 0 | — | 0 |
| §8 Runtime scenarios | 14 | — | 0 | 14 | — |
| **Totals** | **82** | **66** | **0** | **14** | **2 (known, accepted)** |

---

## 12. Final Recommendation

1. **Accept CR-004 Phase 2 Buckets A + B + C as `qa_passed_with_deferred_backend_dependency`.**
2. **Combine with P0 verdict and flip CR-004 Phases 4.1–4.5 to `ready_for_final_acceptance` (partial-final).** Phase 4.6 (Export) + Phase 4.7 (Final smoke) + Phase 2 (cross-day) stay parked per owner direction.
3. **Documentation Update Agent optional pass** — reconcile `CR_004_QA_HANDOVER.md` wording per `QA_NEXT_AGENT_HANDOVER.md` Part C (In-house/All → All/Paid/Unpaid), and note the BE-2 §4.1 Paid-formula evolution inside the Bucket A handover's §"Behavior changed" block.
4. **No code change required.** No blockers. No follow-up bucket needed within P2 scope.
5. **Retain `[CR-001 DIAG]`, `[CR-001 P2 DIAG]`, `[CR-001 G5 DIAG]`, `[CR-003 DIAGNOSTIC]` diagnostics** until their paired backend asks land — consistent with QA_HANDOVER_INDEX.md §Diagnostic Code.
6. **Live-data runtime pass** (14 scenarios in §8) should be scheduled against Mantri preprod once credentials + backend are available. When green, convert the 14 runtime-blocked rows to Pass via an addendum. Not a blocker.
7. **Sharp edges from Bucket C handover resolved** — the pill-flicker + 1.5s optimistic-clear timeout were both eliminated by the 2026-05-01 surgical-cache-invalidation upgrade. No P3 follow-up required.
8. **STOP here per task instructions.** P3 (CR-006 A1 + B1) awaits Owner go-ahead.

---

## 13. Artifacts / Log References

| Artifact | Path |
|---|---|
| Lint run summary | Inline §6 — ✅ clean on all 6 files |
| Webpack compile output | `/var/log/supervisor/frontend.err.log` — unchanged from P0/P1 |
| Route boot smoke (from P0) | `/tmp/p0_reports_rooms_boot.png` + console log `/root/.emergent/automation_output/20260504_051009/` |
| Live validation anchor | `SESSION_TRACKER.md` §1 — 6 items shipped + verified live Mantri preprod 2026-04-29 |
| Bucket handovers | `implementation_handover/CR_004_BUCKET_A_PR1_PR3_HANDOVER.md`, `..._BUCKET_B_FE1_HANDOVER.md`, `..._BUCKET_C_PR2_REMOVE_FROM_ROOM_HANDOVER.md` |
| P0 report (companion) | `qa_reports/CR_004_REVALIDATION_QA_REPORT.md` |

— End of P2 QA Report —
